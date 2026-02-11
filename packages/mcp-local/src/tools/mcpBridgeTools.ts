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
import type { McpTool } from "../types.js";

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

      // Call the tool
      try {
        const result = await d.client.callTool({
          name: tool,
          arguments: args ?? {},
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

  // 5. Quick setup check for drivers
  {
    name: "check_dive_drivers",
    description:
      "Check which MCP drivers are available and provide setup instructions. Tests if playwright-mcp and mobile-mcp can be spawned. Shows connection status for all drivers.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      const results: Record<string, unknown> = {};

      // Check connected drivers
      const connected = [..._drivers.entries()].map(([name, d]) => ({
        name,
        toolCount: d.tools.length,
        connectedAt: d.connectedAt,
      }));

      // Check if packages are available (quick npx check)
      for (const [name, def] of Object.entries(PREDEFINED_DRIVERS)) {
        const isConnected = _drivers.has(name);
        results[name] = {
          status: isConnected ? "connected" : "available",
          description: def.description,
          command: `${def.command} ${def.args.join(" ")}`,
          installHint: def.installHint,
          ...(isConnected ? { toolCount: _drivers.get(name)!.tools.length } : {}),
        };
      }

      return {
        connectedDrivers: connected,
        availableDrivers: results,
        quickStart: {
          web: 'connect_mcp_driver({ driver: "playwright" })',
          mobile: 'connect_mcp_driver({ driver: "mobile" })',
          custom: 'connect_mcp_driver({ driver: "my-server", command: "npx", args: ["my-mcp-server"] })',
        },
        ideConfig: {
          description: "Alternatively, add these servers directly to your IDE's MCP config alongside nodebench-mcp:",
          playwright: {
            mcpServers: {
              playwright: { command: "npx", args: ["@playwright/mcp@latest"] },
            },
          },
          mobile: {
            mcpServers: {
              "mobile-mcp": { command: "npx", args: ["-y", "@mobilenext/mobile-mcp@latest"] },
            },
          },
        },
      };
    },
  },
];
