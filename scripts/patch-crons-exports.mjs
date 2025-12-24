import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(
  root,
  "node_modules",
  "@convex-dev",
  "crons",
  "package.json",
);

if (!fs.existsSync(packagePath)) {
  console.log(
    "[patch-crons-exports] @convex-dev/crons not installed, skipping.",
  );
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const exportsField = pkg.exports;

if (!exportsField || typeof exportsField !== "object") {
  console.log("[patch-crons-exports] No exports field found, skipping.");
  process.exit(0);
}

const componentSourcePath = "./src/component/convex.config.ts";
const componentSourceExists = fs.existsSync(
  path.join(
    root,
    "node_modules",
    "@convex-dev",
    "crons",
    "src",
    "component",
    "convex.config.ts",
  ),
);
const configTargets = ["./convex.config", "./convex.config.js"];
let changed = false;

const setIfMissing = (obj, key, value) => {
  if (obj[key] !== value) {
    obj[key] = value;
    changed = true;
  }
};

for (const target of configTargets) {
  const entry = exportsField[target];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    continue;
  }

  if (componentSourceExists) {
    setIfMissing(entry, "@convex-dev/component-source", componentSourcePath);
  }
  setIfMissing(entry, "convex", "./dist/component/convex.config.js");
  setIfMissing(entry, "module", "./dist/component/convex.config.js");
  setIfMissing(entry, "types", "./dist/component/convex.config.d.ts");
  setIfMissing(entry, "default", "./dist/component/convex.config.js");
}

if (changed) {
  pkg.exports = exportsField;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");
  console.log("[patch-crons-exports] Updated @convex-dev/crons exports.");
} else {
  console.log("[patch-crons-exports] No changes needed.");
}
