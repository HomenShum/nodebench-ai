/**
 * MCP Bridge Tools — Connect to external MCP servers and proxy their tools.
 *
 * Allows nodebench-mcp to act as a gateway to other MCP servers like:
 * - Microsoft Playwright MCP (@playwright/mcp) — browser automation via accessibility tree
 * - Mobile MCP (@mobilenext/mobile-mcp) — iOS/Android device automation
 * - Any custom MCP server via command + args
 *
 * Architecture:
 * - connect_mcp_driver spawns an external MCP server as a child process
 * - Communicates via the MCP protocol over stdio (StdioClientTransport)
 * - list_driver_tools shows all tools available from connected drivers
 * - call_driver_tool proxies tool calls to the connected driver
 * - disconnect_driver cleanly shuts down a driver
 *
 * This means users only need ONE MCP server configured (nodebench-mcp)
 * instead of three separate ones. The bridge handles lifecycle management.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { McpTool } from "../types.js";

// ── System Probing Helpers ──────────────────────────────────────────────

function tryExec(cmd: string, timeoutMs = 5000): string | null {
  try {
    return execSync(cmd, { timeout: timeoutMs, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch { return null; }
}

function probeSystem() {
  const platform = process.platform; // "win32" | "darwin" | "linux"
  const arch = process.arch;
  const nodeVersion = process.version;

  // ── Android SDK ────────────────────────────────────────────────
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || null;
  const adbVersion = tryExec("adb version");
  const adbAvailable = !!adbVersion;
  const emulatorAvailable = !!tryExec("emulator -list-avds");
  const runningDevices = adbAvailable ? (tryExec("adb devices") ?? "").split("\n").filter(l => l.includes("\tdevice")).length : 0;

  // ── iOS Tools ──────────────────────────────────────────────────
  const goIosVersion = tryExec("ios version") ?? tryExec("go-ios version");
  const goIosAvailable = !!goIosVersion;
  const xcodeAvailable = platform === "darwin" ? !!tryExec("xcode-select -p") : false;
  const xcrunAvailable = platform === "darwin" ? !!tryExec("xcrun simctl help") : false;
  const bootedSims = platform === "darwin" && xcrunAvailable
    ? (tryExec("xcrun simctl list devices booted") ?? "").split("\n").filter(l => l.includes("Booted")).length
    : 0;

  // ── Playwright ─────────────────────────────────────────────────
  let playwrightInstalled = false;
  try { require.resolve("playwright"); playwrightInstalled = true; } catch { /* not installed */ }
  const chromiumExists = playwrightInstalled && existsSync(
    join(process.env.HOME ?? process.env.USERPROFILE ?? "", ".cache", "ms-playwright")
  );

  return {
    platform, arch, nodeVersion,
    android: {
      androidHome,
      adbAvailable,
      adbVersion: adbVersion?.split("\n")[0] ?? null,
      emulatorAvailable,
      runningDevices,
    },
    ios: {
      goIosAvailable,
      goIosVersion: goIosVersion ?? null,
      xcodeAvailable,
      xcrunAvailable,
      bootedSims,
      supported: platform === "darwin",
    },
    playwright: {
      installed: playwrightInstalled,
      browsersInstalled: chromiumExists,
    },
  };
}

type Probe = ReturnType<typeof probeSystem>;

function generateSetupInstructions(probe: Probe) {
  const steps: Array<{ area: string; status: "ready" | "missing" | "partial" | "unsupported"; steps: string[] }> = [];
  const p = probe.platform;

  // ── Node.js ────────────────────────────────────────────────────
  const nodeMajor = parseInt(probe.nodeVersion.slice(1));
  if (nodeMajor < 18) {
    steps.push({ area: "Node.js", status: "missing", steps: [
      `Current: ${probe.nodeVersion}. Mobile MCP and Playwright MCP require Node 18+.`,
      "Install via: https://nodejs.org/ or use nvm/fnm to upgrade.",
    ]});
  }

  // ── Playwright (web) ──────────────────────────────────────────
  if (!probe.playwright.installed) {
    steps.push({ area: "Playwright (web automation)", status: "missing", steps: [
      "The MCP Bridge can auto-download @playwright/mcp via npx (no install needed).",
      "For the built-in dive driver: npm install playwright && npx playwright install chromium",
    ]});
  } else if (!probe.playwright.browsersInstalled) {
    steps.push({ area: "Playwright browsers", status: "partial", steps: [
      "Playwright is installed but browsers may be missing.",
      "Run: npx playwright install chromium",
    ]});
  } else {
    steps.push({ area: "Playwright (web automation)", status: "ready", steps: ["Playwright + Chromium detected. Ready to use."] });
  }

  // ── Android ───────────────────────────────────────────────────
  if (!probe.android.adbAvailable) {
    const androidSteps: string[] = [];
    if (!probe.android.androidHome) {
      if (p === "win32") {
        androidSteps.push(
          "Option A (Android Studio — full IDE):",
          "  1. Download: https://developer.android.com/studio",
          "  2. Install and open Android Studio",
          "  3. SDK Manager > install 'Android SDK Platform-Tools'",
          "  4. Set environment variable: ANDROID_HOME = C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk",
          "  5. Add to PATH: %ANDROID_HOME%\\platform-tools",
          "",
          "Option B (Command-line tools only — lighter):",
          "  1. Download: https://developer.android.com/studio#command-line-tools-only",
          "  2. Extract to a folder (e.g. C:\\android-sdk)",
          "  3. Run: sdkmanager --sdk_root=C:\\android-sdk \"platform-tools\" \"emulator\" \"system-images;android-34;google_apis;x86_64\"",
          "  4. Set ANDROID_HOME=C:\\android-sdk and add platform-tools to PATH",
          "",
          "Option C (Chocolatey — one-line):",
          "  choco install android-sdk",
          "  Then set ANDROID_HOME and PATH as above.",
        );
      } else if (p === "darwin") {
        androidSteps.push(
          "Option A (Homebrew — recommended):",
          "  brew install --cask android-commandlinetools",
          "  sdkmanager \"platform-tools\" \"emulator\" \"system-images;android-34;google_apis;arm64-v8a\"",
          "  export ANDROID_HOME=$HOME/Library/Android/sdk",
          "  export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator",
          "",
          "Option B (Android Studio):",
          "  brew install --cask android-studio",
          "  Open Android Studio > SDK Manager > install Platform-Tools",
        );
      } else {
        androidSteps.push(
          "Install via package manager or Android Studio:",
          "  sudo apt install android-sdk  # Debian/Ubuntu",
          "  Or download: https://developer.android.com/studio#command-line-tools-only",
          "  sdkmanager \"platform-tools\" \"emulator\"",
          "  export ANDROID_HOME=$HOME/Android/Sdk",
          "  export PATH=$PATH:$ANDROID_HOME/platform-tools",
        );
      }
    } else {
      androidSteps.push(
        `ANDROID_HOME is set (${probe.android.androidHome}) but adb is not in PATH.`,
        p === "win32"
          ? `Add to PATH: ${probe.android.androidHome}\\platform-tools`
          : `Add to PATH: ${probe.android.androidHome}/platform-tools`,
      );
    }
    steps.push({ area: "Android SDK (adb)", status: "missing", steps: androidSteps });
  } else {
    const status = probe.android.runningDevices > 0 ? "ready" as const : "partial" as const;
    const info = [`adb: ${probe.android.adbVersion}`, `ANDROID_HOME: ${probe.android.androidHome ?? "(not set, but adb works)"}`];
    if (probe.android.runningDevices > 0) {
      info.push(`${probe.android.runningDevices} device(s) connected and ready.`);
    } else {
      info.push(
        "No devices connected. To create/start an emulator:",
        "  avdmanager create avd -n Pixel_8 -k \"system-images;android-34;google_apis;x86_64\" --device pixel_8",
        "  emulator -avd Pixel_8",
        "Or connect a physical device via USB with USB debugging enabled.",
      );
    }
    steps.push({ area: "Android SDK (adb)", status, steps: info });
  }

  // ── iOS ──────────────────────────────────────────────────────
  if (p !== "darwin") {
    // go-ios still works on non-macOS for USB-connected devices
    if (!probe.ios.goIosAvailable) {
      steps.push({ area: "iOS (go-ios)", status: "partial", steps: [
        "iOS Simulators require macOS with Xcode. Physical iOS devices can work on any platform via go-ios.",
        "Install go-ios: npm install -g go-ios",
        "Then connect an iOS device via USB and trust the computer on the device.",
        "Verify: ios list",
      ]});
    } else {
      steps.push({ area: "iOS (go-ios)", status: "ready", steps: [
        `go-ios: ${probe.ios.goIosVersion}`,
        "Connect an iOS device via USB for physical device testing.",
        "iOS Simulators are only available on macOS with Xcode.",
      ]});
    }
  } else {
    // macOS
    const iosSteps: string[] = [];
    if (!probe.ios.xcodeAvailable) {
      iosSteps.push(
        "Install Xcode from the Mac App Store (required for iOS Simulators).",
        "After install: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer",
        "Then: xcodebuild -runFirstLaunch",
      );
    }
    if (!probe.ios.goIosAvailable) {
      iosSteps.push(
        "For physical iOS device support, install go-ios:",
        "  npm install -g go-ios",
        "  Verify: ios list",
      );
    }
    if (probe.ios.xcodeAvailable && probe.ios.bootedSims === 0) {
      iosSteps.push(
        "Xcode is installed but no simulator is booted.",
        "Boot one: xcrun simctl boot \"iPhone 16\"",
        "Or open Simulator.app from Xcode > Open Developer Tool > Simulator",
      );
    }
    if (probe.ios.xcodeAvailable && probe.ios.bootedSims > 0) {
      iosSteps.push(`${probe.ios.bootedSims} simulator(s) booted and ready.`);
    }
    const status = (probe.ios.xcodeAvailable && (probe.ios.bootedSims > 0 || probe.ios.goIosAvailable)) ? "ready" as const : "missing" as const;
    steps.push({ area: "iOS (Xcode + go-ios)", status, steps: iosSteps.length > 0 ? iosSteps : ["iOS development tools detected and ready."] });
  }

  return steps;
}

function generateQuickSetupScript(probe: Probe): string {
  const lines: string[] = [];
  const p = probe.platform;

  if (p === "win32") {
    lines.push("# Windows setup (run in PowerShell as Administrator)");
    if (!probe.android.adbAvailable) {
      lines.push("");
      lines.push("# --- Android SDK (via command-line tools) ---");
      lines.push("# Download from: https://developer.android.com/studio#command-line-tools-only");
      lines.push('# After extracting, run:');
      lines.push('# sdkmanager "platform-tools" "emulator" "system-images;android-34;google_apis;x86_64"');
      lines.push('[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\\Android\\Sdk", "User")');
      lines.push('$env:PATH += ";$env:LOCALAPPDATA\\Android\\Sdk\\platform-tools;$env:LOCALAPPDATA\\Android\\Sdk\\emulator"');
    }
    if (!probe.ios.goIosAvailable) {
      lines.push("");
      lines.push("# --- go-ios (for physical iOS devices over USB) ---");
      lines.push("npm install -g go-ios");
    }
    if (!probe.playwright.installed) {
      lines.push("");
      lines.push("# --- Playwright (optional, for built-in dive driver) ---");
      lines.push("npm install playwright && npx playwright install chromium");
    }
  } else if (p === "darwin") {
    lines.push("#!/bin/bash");
    lines.push("# macOS setup");
    if (!probe.android.adbAvailable) {
      lines.push("");
      lines.push("# --- Android SDK ---");
      lines.push("brew install --cask android-commandlinetools");
      lines.push('sdkmanager "platform-tools" "emulator" "system-images;android-34;google_apis;arm64-v8a"');
      lines.push('export ANDROID_HOME=$HOME/Library/Android/sdk');
      lines.push('export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator');
      lines.push('echo \'export ANDROID_HOME=$HOME/Library/Android/sdk\' >> ~/.zshrc');
      lines.push('echo \'export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator\' >> ~/.zshrc');
    }
    if (!probe.ios.xcodeAvailable) {
      lines.push("");
      lines.push("# --- Xcode (required for iOS Simulators) ---");
      lines.push("# Install from Mac App Store, then:");
      lines.push("sudo xcode-select -s /Applications/Xcode.app/Contents/Developer");
      lines.push("xcodebuild -runFirstLaunch");
    }
    if (!probe.ios.goIosAvailable) {
      lines.push("");
      lines.push("# --- go-ios (for physical iOS devices) ---");
      lines.push("npm install -g go-ios");
    }
    if (!probe.playwright.installed) {
      lines.push("");
      lines.push("# --- Playwright ---");
      lines.push("npm install playwright && npx playwright install chromium");
    }
  } else {
    lines.push("#!/bin/bash");
    lines.push("# Linux setup");
    if (!probe.android.adbAvailable) {
      lines.push("");
      lines.push("# --- Android SDK ---");
      lines.push("sudo apt install android-sdk  # or download from developer.android.com");
      lines.push('export ANDROID_HOME=$HOME/Android/Sdk');
      lines.push('export PATH=$PATH:$ANDROID_HOME/platform-tools');
    }
    if (!probe.ios.goIosAvailable) {
      lines.push("");
      lines.push("# --- go-ios ---");
      lines.push("npm install -g go-ios");
    }
    if (!probe.playwright.installed) {
      lines.push("");
      lines.push("# --- Playwright ---");
      lines.push("npm install playwright && npx playwright install chromium");
    }
  }

  return lines.join("\n");
}

// ── Driver Registry ─────────────────────────────────────────────────────

interface ConnectedDriver {
  name: string;
  client: Client;
  transport: StdioClientTransport;
  tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>;
  connectedAt: string;
  command: string;
  args: string[];
}

const PREDEFINED_DRIVERS: Record<string, { command: string; args: string[]; description: string; installHint: string }> = {
  playwright: {
    command: "npx",
    args: ["-y", "@playwright/mcp@latest"],
    description: "Microsoft Playwright MCP — browser automation via accessibility tree snapshots. Tools: browser_navigate, browser_click, browser_type, browser_snapshot, browser_console_messages, browser_network_requests, etc.",
    installHint: "npm install -g @playwright/mcp (or just use npx, it auto-downloads)",
  },
  mobile: {
    command: "npx",
    args: ["-y", "@mobilenext/mobile-mcp@latest"],
    description: "Mobile MCP — iOS/Android automation for simulators, emulators, and real devices. Tools: mobile_take_screenshot, mobile_click_on_screen_at_coordinates, mobile_type_keys, mobile_launch_app, mobile_list_elements_on_screen, etc.",
    installHint: "npm install -g @mobilenext/mobile-mcp. Requires: iOS Simulator (Xcode) or Android Emulator (ADB)",
  },
};

// Active driver connections (singleton map)
const _drivers = new Map<string, ConnectedDriver>();

// ── Tools ────────────────────────────────────────────────────────────────

export const mcpBridgeTools: McpTool[] = [
  // 1. Connect to an external MCP driver
  {
    name: "connect_mcp_driver",
    description:
      "Connect to an external MCP server and make its tools available through nodebench-mcp. Predefined drivers: 'playwright' (Microsoft Playwright MCP for browser automation) and 'mobile' (Mobile MCP for iOS/Android). You can also connect to any custom MCP server by providing command + args. The driver is spawned as a child process and communicates via the MCP protocol. Once connected, use call_driver_tool to invoke any of its tools.",
    inputSchema: {
      type: "object",
      properties: {
        driver: {
          type: "string",
          description: "Predefined driver name ('playwright' or 'mobile') or a custom name for your own MCP server",
        },
        command: {
          type: "string",
          description: "Command to spawn the MCP server (only needed for custom drivers, e.g. 'npx', 'node', 'python'). Predefined drivers auto-fill this.",
        },
        args: {
          type: "array",
          items: { type: "string" },
          description: "Arguments for the command (only needed for custom drivers, e.g. ['@playwright/mcp@latest', '--headless']). Predefined drivers auto-fill this.",
        },
        extraArgs: {
          type: "array",
          items: { type: "string" },
          description: "Extra arguments to append to predefined driver commands (e.g. ['--headless', '--browser', 'firefox'] for playwright)",
        },
      },
      required: ["driver"],
    },
    handler: async (args) => {
      const { driver, command, args: cmdArgs, extraArgs } = args as {
        driver: string;
        command?: string;
        args?: string[];
        extraArgs?: string[];
      };

      // Check if already connected
      if (_drivers.has(driver)) {
        const existing = _drivers.get(driver)!;
        return {
          alreadyConnected: true,
          driver,
          toolCount: existing.tools.length,
          tools: existing.tools.map(t => t.name),
          connectedAt: existing.connectedAt,
          _hint: `Driver '${driver}' is already connected with ${existing.tools.length} tools. Use call_driver_tool to invoke them, or disconnect_driver to reconnect.`,
        };
      }

      // Resolve command and args
      const predefined = PREDEFINED_DRIVERS[driver];
      const finalCommand = command ?? predefined?.command;
      const finalArgs = [
        ...(cmdArgs ?? predefined?.args ?? []),
        ...(extraArgs ?? []),
      ];

      if (!finalCommand) {
        return {
          error: true,
          message: `Unknown driver '${driver}' and no command provided.`,
          availableDrivers: Object.entries(PREDEFINED_DRIVERS).map(([name, d]) => ({
            name,
            description: d.description,
            installHint: d.installHint,
          })),
          _hint: "Use a predefined driver name ('playwright' or 'mobile') or provide command + args for a custom MCP server.",
        };
      }

      // Spawn and connect
      try {
        const transport = new StdioClientTransport({
          command: finalCommand,
          args: finalArgs,
          env: { ...process.env } as Record<string, string>,
        });

        const client = new Client(
          { name: `nodebench-bridge-${driver}`, version: "1.0.0" },
        );

        await client.connect(transport);

        // List available tools
        const { tools } = await client.listTools();
        const toolList = tools.map(t => ({
          name: t.name,
          description: t.description ?? "",
          inputSchema: (t.inputSchema ?? {}) as Record<string, unknown>,
        }));

        const connectedDriver: ConnectedDriver = {
          name: driver,
          client,
          transport,
          tools: toolList,
          connectedAt: new Date().toISOString(),
          command: finalCommand,
          args: finalArgs,
        };

        _drivers.set(driver, connectedDriver);

        return {
          connected: true,
          driver,
          command: `${finalCommand} ${finalArgs.join(" ")}`,
          toolCount: toolList.length,
          tools: toolList.map(t => ({ name: t.name, description: t.description.slice(0, 100) })),
          _hint: `Driver '${driver}' connected with ${toolList.length} tools. Call them with: call_driver_tool({ driver: "${driver}", tool: "<tool_name>", args: {...} })`,
        };
      } catch (e: any) {
        return {
          error: true,
          message: `Failed to connect to '${driver}': ${e.message}`,
          command: `${finalCommand} ${finalArgs.join(" ")}`,
          ...(predefined ? { installHint: predefined.installHint } : {}),
          troubleshooting: [
            "1. Ensure the MCP server package is installed or accessible via npx",
            "2. Check that the command runs correctly in your terminal",
            `3. Try: ${finalCommand} ${finalArgs.join(" ")}`,
            "4. For playwright: npx @playwright/mcp@latest --help",
            "5. For mobile: npx @mobilenext/mobile-mcp@latest --help",
          ],
        };
      }
    },
  },

  // 2. List tools from connected drivers
  {
    name: "list_driver_tools",
    description:
      "List all tools available from connected MCP drivers. Shows tool names, descriptions, and input schemas. Use this to discover what a connected driver can do before calling its tools.",
    inputSchema: {
      type: "object",
      properties: {
        driver: {
          type: "string",
          description: "Driver name to list tools for (omit to list all connected drivers)",
        },
        verbose: {
          type: "boolean",
          description: "Include full input schemas (default: false — just names and short descriptions)",
        },
      },
    },
    handler: async (args) => {
      const { driver, verbose } = args as { driver?: string; verbose?: boolean };

      if (_drivers.size === 0) {
        return {
          connected: false,
          message: "No MCP drivers connected.",
          availableDrivers: Object.entries(PREDEFINED_DRIVERS).map(([name, d]) => ({
            name,
            description: d.description,
          })),
          _hint: 'Connect a driver first: connect_mcp_driver({ driver: "playwright" }) or connect_mcp_driver({ driver: "mobile" })',
        };
      }

      if (driver) {
        const d = _drivers.get(driver);
        if (!d) return { error: true, message: `Driver '${driver}' not connected. Connected: ${[..._drivers.keys()].join(", ")}` };

        return {
          driver,
          connectedAt: d.connectedAt,
          toolCount: d.tools.length,
          tools: verbose
            ? d.tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
            : d.tools.map(t => ({ name: t.name, description: t.description.slice(0, 120) })),
        };
      }

      // List all connected drivers
      const all: Record<string, unknown> = {};
      for (const [name, d] of _drivers) {
        all[name] = {
          connectedAt: d.connectedAt,
          toolCount: d.tools.length,
          tools: d.tools.map(t => t.name),
        };
      }
      return {
        connectedDrivers: _drivers.size,
        drivers: all,
        totalTools: [..._drivers.values()].reduce((s, d) => s + d.tools.length, 0),
      };
    },
  },

  // 3. Call a tool on a connected driver
  {
    name: "call_driver_tool",
    description:
      "Invoke a tool on a connected MCP driver. This proxies the call to the external MCP server (e.g. playwright-mcp or mobile-mcp) and returns the result. Use list_driver_tools to see available tools and their parameters first.",
    inputSchema: {
      type: "object",
      properties: {
        driver: {
          type: "string",
          description: "Driver name (e.g. 'playwright', 'mobile')",
        },
        tool: {
          type: "string",
          description: "Tool name to call (e.g. 'browser_navigate', 'mobile_take_screenshot')",
        },
        args: {
          type: "object",
          description: "Arguments to pass to the tool (matches the tool's inputSchema)",
        },
      },
      required: ["driver", "tool"],
    },
    handler: async (toolArgs) => {
      const { driver, tool, args } = toolArgs as {
        driver: string;
        tool: string;
        args?: Record<string, unknown>;
      };

      const d = _drivers.get(driver);
      if (!d) {
        // Auto-connect hint
        const predefined = PREDEFINED_DRIVERS[driver];
        return {
          error: true,
          message: `Driver '${driver}' not connected.`,
          connectedDrivers: [..._drivers.keys()],
          _hint: predefined
            ? `Connect first: connect_mcp_driver({ driver: "${driver}" })`
            : `Connect with: connect_mcp_driver({ driver: "${driver}", command: "...", args: [...] })`,
        };
      }

      // Validate tool exists
      const toolMeta = d.tools.find(t => t.name === tool);
      if (!toolMeta) {
        // Fuzzy match suggestion
        const suggestions = d.tools
          .filter(t => t.name.includes(tool) || tool.includes(t.name) || t.name.split("_").some(w => tool.includes(w)))
          .map(t => t.name)
          .slice(0, 5);

        return {
          error: true,
          message: `Tool '${tool}' not found on driver '${driver}'.`,
          availableTools: d.tools.map(t => t.name),
          suggestions: suggestions.length > 0 ? suggestions : undefined,
        };
      }

      // Auto-fill required fields from tool schema (handles mobile-mcp's noParams quirk)
      const finalArgs: Record<string, unknown> = { ...(args ?? {}) };
      const schema = toolMeta.inputSchema as any;
      if (schema?.required && schema?.properties) {
        for (const reqField of schema.required as string[]) {
          if (finalArgs[reqField] === undefined) {
            const propDef = schema.properties[reqField];
            if (propDef?.type === "object") {
              finalArgs[reqField] = {};
            } else if (propDef?.type === "string" && propDef?.default !== undefined) {
              finalArgs[reqField] = propDef.default;
            }
          }
        }
      }

      // Call the tool
      try {
        const result = await d.client.callTool({
          name: tool,
          arguments: finalArgs,
        });

        // Extract content
        const content = (result.content as any[]) ?? [];
        const textParts = content
          .filter((c: any) => c.type === "text")
          .map((c: any) => c.text);
        const imageParts = content
          .filter((c: any) => c.type === "image")
          .map((c: any) => ({ mimeType: c.mimeType, dataLength: c.data?.length ?? 0 }));

        return {
          driver,
          tool,
          success: !result.isError,
          content: textParts.length === 1 ? textParts[0] : textParts,
          ...(imageParts.length > 0 ? { images: imageParts } : {}),
          ...(result.structuredContent ? { structuredContent: result.structuredContent } : {}),
        };
      } catch (e: any) {
        return {
          error: true,
          driver,
          tool,
          message: `Tool call failed: ${e.message}`,
          _hint: "The driver process may have crashed. Try disconnect_driver + connect_mcp_driver to reconnect.",
        };
      }
    },
  },

  // 4. Disconnect a driver
  {
    name: "disconnect_driver",
    description:
      "Disconnect from an external MCP driver and shut down its child process. Use this to clean up or to reconnect with different settings.",
    inputSchema: {
      type: "object",
      properties: {
        driver: {
          type: "string",
          description: "Driver name to disconnect (omit to disconnect all)",
        },
      },
    },
    handler: async (args) => {
      const { driver } = args as { driver?: string };

      if (driver) {
        const d = _drivers.get(driver);
        if (!d) return { error: true, message: `Driver '${driver}' not connected.` };

        try {
          await d.client.close();
        } catch { /* ignore close errors */ }
        _drivers.delete(driver);

        return {
          disconnected: true,
          driver,
          _hint: `Driver '${driver}' disconnected. Reconnect with: connect_mcp_driver({ driver: "${driver}" })`,
        };
      }

      // Disconnect all
      const names = [..._drivers.keys()];
      for (const [name, d] of _drivers) {
        try { await d.client.close(); } catch { /* ignore */ }
      }
      _drivers.clear();

      return {
        disconnected: true,
        drivers: names,
        _hint: "All drivers disconnected.",
      };
    },
  },

  // 5. Setup wizard — probes system and provides platform-specific instructions
  {
    name: "check_dive_drivers",
    description:
      "Setup wizard for MCP automation drivers. Probes the system for Android SDK (ANDROID_HOME, adb, emulator), iOS tools (Xcode, go-ios, simulators), Playwright, and Node.js version. Returns a readiness report with per-area status (ready/partial/missing) and platform-specific setup instructions for Windows, macOS, or Linux. Also generates a copy-paste setup script. Run this first to see what's needed before connecting drivers.",
    inputSchema: {
      type: "object",
      properties: {
        generateScript: {
          type: "boolean",
          description: "Generate a copy-paste setup script for missing prerequisites (default: true)",
        },
      },
    },
    handler: async (args) => {
      const { generateScript } = args as { generateScript?: boolean };

      // Probe the system
      const probe = probeSystem();
      const setupSteps = generateSetupInstructions(probe);

      // Readiness summary
      const readyCount = setupSteps.filter(s => s.status === "ready").length;
      const totalAreas = setupSteps.length;
      const allReady = setupSteps.every(s => s.status === "ready");
      const missingAreas = setupSteps.filter(s => s.status === "missing").map(s => s.area);
      const partialAreas = setupSteps.filter(s => s.status === "partial").map(s => s.area);

      // Connected drivers
      const connected = [..._drivers.entries()].map(([name, d]) => ({
        name,
        toolCount: d.tools.length,
        connectedAt: d.connectedAt,
      }));

      // Driver availability
      const drivers: Record<string, unknown> = {};
      for (const [name, def] of Object.entries(PREDEFINED_DRIVERS)) {
        const isConnected = _drivers.has(name);
        drivers[name] = {
          status: isConnected ? "connected" : "available",
          toolCount: isConnected ? _drivers.get(name)!.tools.length : undefined,
          command: `${def.command} ${def.args.join(" ")}`,
        };
      }

      const result: Record<string, unknown> = {
        system: {
          platform: probe.platform,
          arch: probe.arch,
          nodeVersion: probe.nodeVersion,
        },
        readiness: {
          score: `${readyCount}/${totalAreas}`,
          allReady,
          missingAreas,
          partialAreas,
        },
        probeResults: {
          android: probe.android,
          ios: probe.ios,
          playwright: probe.playwright,
        },
        setupInstructions: setupSteps,
        connectedDrivers: connected,
        drivers,
        quickStart: {
          web: 'connect_mcp_driver({ driver: "playwright" })',
          webNote: "Works immediately — npx auto-downloads @playwright/mcp",
          mobile: 'connect_mcp_driver({ driver: "mobile" })',
          mobileNote: allReady
            ? "System ready — mobile driver should connect and find devices."
            : `Fix missing prerequisites first: ${missingAreas.join(", ")}`,
        },
      };

      // Generate setup script if requested (default: true)
      if (generateScript !== false && !allReady) {
        result.setupScript = {
          description: `Copy-paste ${probe.platform === "win32" ? "PowerShell" : "bash"} script to install missing prerequisites:`,
          script: generateQuickSetupScript(probe),
        };
      }

      // IDE config for alternative approach
      result.ideConfig = {
        description: "Alternative: add these MCP servers directly to your IDE config alongside nodebench-mcp:",
        playwright: { mcpServers: { playwright: { command: "npx", args: ["@playwright/mcp@latest"] } } },
        mobile: { mcpServers: { "mobile-mcp": { command: "npx", args: ["-y", "@mobilenext/mobile-mcp@latest"] } } },
      };

      result._hint = allReady
        ? "All prerequisites detected! Connect a driver: connect_mcp_driver({ driver: 'playwright' }) or connect_mcp_driver({ driver: 'mobile' })"
        : `${missingAreas.length} area(s) need setup. Follow the setupInstructions above, then re-run check_dive_drivers to verify.`;

      return result;
    },
  },
];
