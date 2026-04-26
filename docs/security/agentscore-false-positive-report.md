---
status: draft
filed: false
target: agentscores.xyz feedback / contact channel
related: GitHub issue #8 (closed by PR #90 + nodebench-mcp@3.2.1)
---

# AgentScore False-Positive Report — `db.exec()` flagged as "unsafe eval"

This is a draft report to file with AgentScore once the contact channel
is identified (their site at agentscores.xyz, GitHub issues if they
have a public repo, or their detection-feedback email if listed).

The HIGH command-injection finding in the same scan was correct and
has already been remediated in `nodebench-mcp@3.2.1` (PR #90, commit
`5cc94006`). This report is only about the *other* HIGH finding,
"unsafe eval", which is a false positive.

## Report body (copy-paste)

> **Subject:** False-positive: "unsafe eval" detection on better-sqlite3 `db.exec()`
>
> **Package:** `nodebench-mcp@3.2.0` (now `3.2.1`)
> **Scan URL:** https://agentscores.xyz/report/nodebench-mcp
> **Finding:** `[HIGH] unsafe eval: Uses eval() with dynamic input`
>
> The detector appears to be matching the pattern `db.exec(\`SQL\`)`,
> where `db` is a `better-sqlite3` `Database` instance. This is a
> tagged-template SQLite SQL execution call — **not** JavaScript
> `eval()`. The two are semantically and syntactically distinct:
>
> ```js
> // What the detector is matching (BENIGN — SQLite SQL):
> db.exec(`CREATE TABLE foo (id INTEGER, name TEXT)`);
>
> // What "unsafe eval" should mean (DANGEROUS — JS eval):
> eval(userInput);
> new Function(userInput)();
> ```
>
> **Suggested detector improvement:** scope the "eval" pattern to
> bare `eval(` and `new Function(` calls. Exclude method-call
> patterns like `.exec(`, `.run(`, `.query(`, `.prepare(`. The popular
> Node SQL libraries — `better-sqlite3`, `pg`, `mysql2`, `sqlite3`,
> `knex`, `kysely`, `drizzle-orm`, `postgres` — all use these names
> for SQL operations, not JS evaluation.
>
> **Verification:** `grep -rE '(^|[^a-zA-Z_])eval\(|new Function\('`
> across `packages/mcp-local/src` returns **zero** matches. The 5
> occurrences flagged by the scan are all `db.exec(...)` SQLite SQL
> calls in the storage layer.
>
> The HIGH command-injection finding in the same scan was correct and
> has been fixed in `3.2.1` (refactored `execSync` template literals
> to argv-based `spawn`/`spawnSync`, no shell). Thanks for that
> catch — it surfaced 12+ real injection sites we hadn't audited.

## How to file

1. Open https://agentscores.xyz and look for a "feedback",
   "contact", or "report inaccurate finding" link.
2. If they expose a GitHub repo, open an issue there with the body
   above.
3. If they have a contact email, send the body above.

After filing, set `filed: true` in the frontmatter above and add the
URL of the filed issue / email reference for traceability.
