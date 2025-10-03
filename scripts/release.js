#!/usr/bin/env node
/*
Release script: auto-generate notes and create a semver tag.

Usage examples:
  node scripts/release.js --version v0.9.2 --title "Hotfix: parsing" --push
  node scripts/release.js --auto-patch --title "Patch" --push

Behavior:
- Validates semver and ordering vs latest existing tag (vX.Y.Z only)
- Computes change log from previous tag (git log)
- Writes RELEASE_NOTES_vX.Y.Z.md with current month/year
- Creates an annotated tag with -F notes file; optionally pushes tag
*/
const { execSync } = require('node:child_process');
const { writeFileSync, existsSync } = require('node:fs');
const path = require('node:path');

function sh(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { push: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--version' && args[i+1]) out.version = args[++i];
    else if (a === '--title' && args[i+1]) out.title = args[++i];
    else if (a === '--push') out.push = true;
    else if (a === '--auto-patch') out.autoPatch = true;
  }
  return out;
}

function isSemver(v) {
  return /^v\d+\.\d+\.\d+$/.test(v);
}

function cmpSemver(a, b) {
  const [A, B] = [a, b].map(v => v.replace(/^v/, '').split('.').map(n => parseInt(n, 10)));
  for (let i = 0; i < 3; i++) {
    if (A[i] !== B[i]) return A[i] - B[i];
  }
  return 0;
}

function nextPatch(v) {
  const [M, m, p] = v.replace(/^v/, '').split('.').map(n => parseInt(n, 10));
  return `v${M}.${m}.${p + 1}`;
}

function monthYear() {
  const d = new Date();
  const month = d.toLocaleString('en-US', { month: 'long' });
  const year = d.getUTCFullYear();
  return `${month} ${year}`;
}

function main() {
  const args = parseArgs();
  const tags = sh("git tag -l 'v[0-9]*' | sort -V").split('\n').filter(Boolean);
  const latest = tags.length ? tags[tags.length - 1] : null;

  let version = args.version;
  if (!version) {
    if (args.autoPatch && latest) version = nextPatch(latest);
    else {
      console.error('Error: --version vX.Y.Z (or --auto-patch) is required');
      process.exit(1);
    }
  }
  if (!isSemver(version)) {
    console.error(`Error: Invalid semver: ${version}`);
    process.exit(1);
  }
  if (latest && cmpSemver(version, latest) <= 0) {
    console.error(`Error: Version ${version} must be greater than latest ${latest}`);
    process.exit(1);
  }

  // Determine previous range for changelog
  const prev = latest;
  const range = prev ? `${prev}..HEAD` : '';
  const logCmd = prev
    ? `git log --oneline ${range}`
    : `git log --oneline`;
  const changes = sh(logCmd).split('\n').map(l => `- ${l}`).join('\n');

  const title = args.title || version;
  const notesName = `RELEASE_NOTES_${version}.md`;
  const notesPath = path.join(process.cwd(), notesName);
  const dateStr = monthYear();
  const notes = `# Release Notes ${version} - ${title}\n\n**Release Date:** ${dateStr}  \n**Branch:** main\n\n## Changes since ${prev || 'initial commit'}\n${changes}\n`;

  if (existsSync(notesPath)) {
    console.error(`Error: Notes file already exists: ${notesName}`);
    process.exit(1);
  }
  writeFileSync(notesPath, notes);
  console.log(`Wrote ${notesName}`);

  // Create annotated tag with file as message
  sh(`git add ${notesName}`);
  sh(`git commit -m "docs: add ${notesName}"`);
  console.log(`Committed ${notesName}`);

  sh(`git tag -a ${version} -F ${notesName}`);
  console.log(`Created tag ${version}`);

  if (args.push) {
    sh(`git push origin HEAD:main`);
    sh(`git push origin ${version}`);
    console.log('Pushed commit and tag to origin');
  }
}

main();

