import fs from "node:fs";
import path from "node:path";

type VaultConfig = {
  vaultVersion: "v1";
  root: string;
  usersDir: string;
  masterDir: string;
  naming: {
    noteFile: "kebab-case";
    allowSpaces: false;
  };
  requiredFrontmatterKeys: string[];
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeIfMissing(filePath: string, content: string) {
  if (fs.existsSync(filePath)) return;
  fs.writeFileSync(filePath, content, "utf8");
}

export function initVault(rootDir = "vault") {
  const root = path.resolve(process.cwd(), rootDir);
  const config: VaultConfig = {
    vaultVersion: "v1",
    root: rootDir,
    usersDir: "users",
    masterDir: "master",
    naming: { noteFile: "kebab-case", allowSpaces: false },
    requiredFrontmatterKeys: ["noteId", "title", "createdAtIso", "updatedAtIso", "sources"],
  };

  ensureDir(root);
  ensureDir(path.join(root, config.usersDir));
  ensureDir(path.join(root, config.masterDir));
  ensureDir(path.join(root, config.masterDir, "notes"));
  ensureDir(path.join(root, config.masterDir, "assets"));

  writeIfMissing(
    path.join(root, ".vault.json"),
    JSON.stringify(config, null, 2) + "\n"
  );

  writeIfMissing(
    path.join(root, "SOP.md"),
    [
      "# Vault SOP",
      "",
      "Rules:",
      "- Notes are markdown with YAML frontmatter.",
      "- File names are kebab-case. No spaces.",
      "- Every note must include sources with url and publishedAtIso when applicable.",
      "- Do not use em dash or en dash in generated text.",
      "- Links must not break. Prefer relative links and Obsidian wikilinks.",
      "",
      "Folders:",
      "- vault/users/<user>/notes",
      "- vault/users/<user>/assets",
      "- vault/master/notes",
      "- vault/master/assets",
      "",
      "Quorum merge:",
      "- Each user writes to their own folder.",
      "- Merge script produces vault/master output plus merge report JSON.",
      "",
    ].join("\n")
  );

  writeIfMissing(
    path.join(root, "README.md"),
    [
      "# Vault",
      "",
      "File-based knowledge vault designed for Obsidian + Git.",
      "",
      "Commands:",
      "- npm run vault:init",
      "- npm run vault:health",
      "- npm run vault:merge",
      "",
    ].join("\n")
  );
}

const invokedAsScript = process.argv.some((a) => typeof a === "string" && a.replace(/\\/g, "/").endsWith("init-vault.ts"));
if (invokedAsScript) {
  const rootArg = process.argv[2] || "vault";
  initVault(rootArg);
  console.log(`[vault:init] ok root=${rootArg}`);
}
