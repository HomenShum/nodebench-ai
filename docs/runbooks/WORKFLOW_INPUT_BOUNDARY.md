# Issue-comment and manual workflow input

A repository maintainer uses `@nodebench <company>` to request an intelligence packet on an issue or pull request. Comment text previously became shell source, then response values became a `sed` program. A quote or command substitution could change what the runner executed. The packet action now reads the GitHub event directly in a static JavaScript action, serializes the query as JSON, and formats parsed response data without a shell.

The packet request accepts 1–2,000 characters from the first query line after the last marker. Its repository-configured API must be a trusted HTTPS origin without credentials, a path, query or fragment. Redirects are refused, the request and response read have a 60-second budget, and the response is capped at 256 KiB. Failed HTTP, parsing, unsuccessful packets or failed GitHub posting fail the job. Missing or invalid confidence is displayed as unavailable. Bot comments cannot restart the packet workflow. No repository code is checked out by this privileged workflow.

The Attrition crawl now binds its manual URL through the environment instead of inserting it into shell source. Its existing API-routing and golden-query failure-suppression defects are separate open work; this change does not claim those gates are green.

Run `node --test scripts/nodebench-packet-contracts.node.mjs` with Bash available on PATH (Git for Windows Bash for local Windows verification). The scenarios execute the actual static action against a local HTTP fixture and capture attempted GitHub posts. They cover hostile text, burst and sustained requests, UTF-8 chunks, invalid configuration, HTTP/redirect/body/timeout failures and posting failure. No live search, provider request or public comment is performed by the scenarios.

The candidate fix is not default-branch protection until it is reviewed, integrated and read back from the default branch. Existing unrelated TypeScript, deployment, product and benchmark failures retain their status. The verification evidence does not certify provider quality or a live end-to-end research packet.

Reference: [GitHub script-injection guidance](https://docs.github.com/en/actions/concepts/security/script-injections).
