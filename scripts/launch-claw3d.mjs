#!/usr/bin/env node
/**
 * launch-claw3d.mjs — Start Claw3D pointed at NodeBench's command bridge.
 *
 * Claw3D runs on port 3000 and connects to NodeBench's WebSocket bridge
 * at ws://localhost:3100/bridge for agent state.
 *
 * Usage:
 *   node scripts/launch-claw3d.mjs [--port 3000] [--gateway ws://localhost:3100/bridge]
 *
 * Then view at:
 *   - Standalone: http://localhost:3000/office
 *   - In NodeBench: http://localhost:5191/founder/3dclaw (iframe)
 */

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

const PORT = getArg("--port", "3000");
const GATEWAY_URL = getArg("--gateway", "ws://localhost:3100/bridge");
const claw3dDir = resolve(import.meta.dirname, "../vendor/claw3d");

if (!existsSync(resolve(claw3dDir, "package.json"))) {
  console.error("[claw3d] Claw3D not found at vendor/claw3d/");
  console.error("  Clone it: git clone --depth 1 https://github.com/iamlukethedev/Claw3D.git vendor/claw3d");
  process.exit(1);
}

console.log("[claw3d] Starting Claw3D...");
console.log(`  Port:    ${PORT}`);
console.log(`  Gateway: ${GATEWAY_URL}`);
console.log(`  Dir:     ${claw3dDir}`);
console.log();
console.log(`  Standalone:  http://localhost:${PORT}/office`);
console.log(`  In NodeBench: http://localhost:5191/founder/3dclaw`);
console.log();

const child = spawn("npm", ["run", "dev"], {
  cwd: claw3dDir,
  env: {
    ...process.env,
    PORT,
    CLAW3D_GATEWAY_URL: GATEWAY_URL,
    CLAW3D_GATEWAY_TOKEN: process.env.NODEBENCH_DEV_KEY || "test-dev-key-e2e",
  },
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
});
process.on("SIGTERM", () => {
  child.kill("SIGTERM");
});
