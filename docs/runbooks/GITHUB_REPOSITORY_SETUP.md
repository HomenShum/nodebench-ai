# GitHub Repository Setup

This runbook keeps repository settings aligned with the files in this repo.

## Required baseline

- `main` is protected.
- Pull requests are required before merge.
- Required status checks:
  - `CI / Typecheck`
  - `CI / Runtime smoke`
  - `CI / Build`
- Code owner review is required.
- Stale reviews are dismissed when new commits are pushed.
- Conversations must be resolved before merge.
- Force pushes and branch deletion are blocked on `main`.
- Delete branches after merge is enabled.
- Dependabot alerts and security updates are enabled.

## Apply with GitHub CLI

Prerequisites:

- GitHub CLI is installed.
- `gh auth status` succeeds for an account with repository admin access.

Dry run:

```powershell
node scripts/github/configureRepoSettings.mjs
```

Apply:

```powershell
node scripts/github/configureRepoSettings.mjs --apply
```

The script configures repository metadata, topics, vulnerability alerts,
Dependabot security updates, and `main` branch protection.

## Manual fallback

If GitHub CLI auth is unavailable, set these in GitHub:

1. Settings -> General:
   - Description: `Entity intelligence workspace for chat-first research, living reports, Convex runtime state, and MCP tools.`
   - Website: `https://www.nodebenchai.com`
   - Enable Issues and Discussions.
   - Disable Wiki unless maintainers need it.
   - Enable "Automatically delete head branches".
2. Settings -> Branches -> Add branch protection rule:
   - Branch name pattern: `main`
   - Require a pull request before merging.
   - Require approvals: `1`
   - Dismiss stale pull request approvals when new commits are pushed.
   - Require review from Code Owners.
   - Require status checks to pass before merging.
   - Require branches to be up to date before merging.
   - Required checks: `CI / Typecheck`, `CI / Runtime smoke`, `CI / Build`.
   - Require conversation resolution before merging.
   - Do not allow force pushes.
   - Do not allow deletions.
3. Settings -> Code security and analysis:
   - Enable Dependabot alerts.
   - Enable Dependabot security updates.
   - Enable private vulnerability reporting or Security Advisories where available.
