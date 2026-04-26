# Security Policy

## Reporting a vulnerability

Do not open a public GitHub issue for a security vulnerability.

Report privately through GitHub Security Advisories when available, or contact the maintainer listed in `package.json`.

Please include:

- affected area or route
- reproduction steps
- expected impact
- whether credentials, user data, private captures, Convex rows, or MCP calls are involved
- any logs or screenshots with secrets removed

## Scope

Security-sensitive areas include:

- Convex mutations/actions and owner scoping
- MCP gateway/tool execution and audit ledger
- search/fetch routes, URL handling, and SSRF boundaries
- private captures, notebooks, reports, exports, and shared context
- API keys, environment variables, OAuth tokens, and webhook secrets

## Project security rules

- Private captures stay private by default.
- Team/tenant memory must be explicitly scoped.
- Public source cache may be reused only when it does not expose private user context.
- Normal users should see product-level provider status, not raw provider credentials or internal routing details.
- Do not commit `.env*`, logs with secrets, production dumps, or screenshots containing private data.
