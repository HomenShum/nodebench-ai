import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const manifestPath = path.join(__dirname, "thin-workspace.manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const args = new Set(process.argv.slice(2));
const targetArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const targetDir = path.resolve(repoRoot, "..", targetArg || "nodebench-clean");
const force = args.has("--force");
const excludedDevDependencies = new Set([
  "@chromatic-com/storybook",
  "@storybook/addon-a11y",
  "@storybook/addon-docs",
  "@storybook/addon-onboarding",
  "@storybook/addon-vitest",
  "@storybook/react-vite",
  "eslint-plugin-storybook",
  "storybook",
]);

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function copyEntry(relativePath) {
  const source = path.join(repoRoot, relativePath);
  if (!fs.existsSync(source)) return null;
  const destination = path.join(targetDir, relativePath);
  ensureParentDir(destination);
  fs.cpSync(source, destination, { recursive: true });
  return relativePath;
}

function readJsonc(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const withoutBlockComments = raw.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(/^\s*\/\/.*$/gm, "");
  return JSON.parse(withoutLineComments);
}

function buildThinPackageJson() {
  const fullPackage = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const supportedScripts = Object.fromEntries(
    Object.entries(fullPackage.scripts).filter(([name]) => manifest.supportedScripts.includes(name)),
  );
  const thinDevDependencies = Object.fromEntries(
    Object.entries(fullPackage.devDependencies).filter(([name]) => !excludedDevDependencies.has(name)),
  );

  return {
    name: manifest.name,
    private: true,
    version: fullPackage.version,
    description: "Production-thin NodeBench workspace for the public web product.",
    type: fullPackage.type,
    packageManager: fullPackage.packageManager,
    scripts: {
      ...supportedScripts,
      typecheck: "tsc --noEmit",
      verify: "npm run typecheck && npm run build",
      preview: "vite preview",
    },
    dependencies: fullPackage.dependencies,
    devDependencies: thinDevDependencies,
    vitest: fullPackage.vitest,
    engines: fullPackage.engines,
  };
}

function rewriteTsConfigApp() {
  const tsconfigPath = path.join(targetDir, "tsconfig.app.json");
  if (!fs.existsSync(tsconfigPath)) return;

  const tsconfig = readJsonc(tsconfigPath);
  tsconfig.exclude = [
    "src/**/*.test.ts",
    "src/**/*.test.tsx",
    "src/**/__tests__/**",
    "src/**/*.stories.ts",
    "src/**/*.stories.tsx",
    "src/test/**",
  ];
  fs.writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
}

function writeManifestFile(copiedEntries) {
  const manifestDoc = `# nodebench-clean\n\nGenerated from \`nodebench-ai\` on ${new Date().toISOString()}.\n\n## Intent\n\nThis is the production-thin handoff workspace for the public NodeBench web product. The source repo stays untouched as the full reference archive.\n\n## Included\n\n${copiedEntries.map((entry) => `- \`${entry}\``).join("\n")}\n\n## Excluded on purpose\n\n- \`apps/\`\n- all \`packages/\` except the required \`packages/mcp-local\` runtime slice\n- \`node_modules/\`\n- \`.tmp/\` and other generated artifacts\n- internal archive directories not needed for the public web product handoff\n- broad test, storybook, eval, and dogfood scaffolding not required for first-run setup\n\n## Why \`packages/mcp-local\` stays\n\nThe current public search runtime still imports \`packages/mcp-local/src\` directly from the Express/Vercel search layer and Convex search pipeline. Excluding it would make the clean repo fail to build.\n\n## Supported commands\n\n- \`npm run typecheck\`\n- \`npm run build\`\n- \`npm run verify\`\n${manifest.supportedScripts.map((script) => `- \`npm run ${script}\``).join("\n")}\n`;
  fs.writeFileSync(path.join(targetDir, "MANIFEST.md"), manifestDoc);
}

function writeContributingFile() {
  const content = `# Contributing\n\n## Scope\n\nThis workspace is the public NodeBench product slice. Keep the main user loop stable:\n\nHome -> Chat -> Reports -> Nudges -> Me\n\n## Rules\n\n- Do not reintroduce internal builder, admin, debug, or MCP-control surfaces into the main nav.\n- Prefer editing the public product path before touching legacy references in the archive repo.\n- Run \`npm run verify\` before handoff.\n- Deploy Convex before Vercel whenever Convex functions change.\n- If you need something from the old repo, copy it over intentionally and record why in \`MANIFEST.md\`.\n\n## Reference repo\n\nThe full legacy/reference repo lives alongside this folder. Pull missing implementation details from there intentionally instead of widening this workspace by default.\n`;
  fs.writeFileSync(path.join(targetDir, "CONTRIBUTING.md"), content);
}

function writeThinReadme() {
  const content = `# NodeBench Clean\n\nProduction-thin handoff workspace for the public NodeBench web product.\n\n## What this repo is\n\nA reduced copy of the main repo focused on the public product workflow:\n\n- Home\n- Chat\n- Reports\n- Nudges\n- Me\n- Entity memory pages\n\n## What this repo is not\n\n- the full MCP/package monorepo\n- the builder control tower archive\n- the historical scratch/docs artifact store\n- every internal evaluation and dogfood harness from the reference repo\n\n## Setup\n\n\`\`\`bash\nnpm install\ncp .env.example .env.local\n# set VITE_CONVEX_URL from `npx convex dev`\n# set GEMINI_API_KEY for the search pipeline\nnpm run dev\n\`\`\`\n\nIf \`VITE_CONVEX_URL\` is missing, the app will intentionally stop on the setup screen instead of failing deeper in the product.\n\n## Verify\n\n\`\`\`bash\nnpm run typecheck\nnpm run build\n\`\`\`\n\n## Why one package remains\n\nThis clean workspace still includes \`packages/mcp-local/src\` because the current public search runtime imports it directly. That package is not optional until the server runtime is refactored away from it.\n\nSee [MANIFEST.md](./MANIFEST.md) for the exact included surface area.\n`;
  fs.writeFileSync(path.join(targetDir, "README.md"), content);
}

function writeThinEnvExample() {
  const content = `# NodeBench Clean environment\n# Copy this file to .env.local before running the app.\n\n# Required for the UI to connect to Convex.\n# Get this from: npx convex dev\nVITE_CONVEX_URL=https://your-project.convex.cloud\n\n# Required for the public search pipeline.\nGEMINI_API_KEY=\n\n# Required when deploying Convex from this repo.\nCONVEX_DEPLOY_KEY=\n\n# Recommended web search provider.\nLINKUP_API_KEY=\n\n# Optional model providers.\nOPENAI_API_KEY=\nANTHROPIC_API_KEY=\n\n# Optional voice surface.\nELEVENLABS_API_KEY=\n\n# Optional QA replay backend.\nATTRITION_URL=https://attrition-7xtb75zi5q-uc.a.run.app\n`;
  fs.writeFileSync(path.join(targetDir, ".env.example"), content);
}

function writeNpmrc() {
  const content = `legacy-peer-deps=true\naudit=false\nfund=false\n`;
  fs.writeFileSync(path.join(targetDir, ".npmrc"), content);
}

if (fs.existsSync(targetDir)) {
  if (!force) {
    console.error(`Target already exists: ${targetDir}\nRe-run with --force to replace it.`);
    process.exit(1);
  }
  fs.rmSync(targetDir, { recursive: true, force: true });
}

fs.mkdirSync(targetDir, { recursive: true });

const copiedEntries = manifest.include
  .map(copyEntry)
  .filter(Boolean);

fs.writeFileSync(
  path.join(targetDir, "package.json"),
  `${JSON.stringify(buildThinPackageJson(), null, 2)}\n`,
);
writeThinReadme();
writeManifestFile(copiedEntries);
writeContributingFile();
rewriteTsConfigApp();
writeThinEnvExample();
writeNpmrc();

console.log(`Created thin workspace at ${targetDir}`);
