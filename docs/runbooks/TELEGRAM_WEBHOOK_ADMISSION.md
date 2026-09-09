# Telegram webhook admission

A person using the NodeBench bot should be able to start or stop notifications without another website visitor reading their history or controlling the bot. The Telegram HTTP route is the public entry point; chat storage and bot-management functions are internal Convex functions. A chat ID supplied to a public RPC is not proof of chat ownership.

## Entry point and configuration

`POST /telegram/webhook` requires a valid `TELEGRAM_WEBHOOK_SECRET` in the server environment and the matching `X-Telegram-Bot-Api-Secret-Token` request header. The configured value must contain 1–256 ASCII letters, digits, underscores or hyphens. Missing or invalid server configuration is an unavailable integration; missing or incorrect request authentication is denied before parsing the body or calling an action.

The deployment owner must configure this value through the existing secure environment workflow and arrange the existing internal `domains/integrations/telegram:setWebhook` action to register the same value with Telegram. `TELEGRAM_BOT_TOKEN` remains server-side. Neither value belongs in a browser bundle, Git, a screenshot, a test artifact or a handoff. This repair does not configure a real provider or deploy a schema.

The internal setup action accepts an HTTPS URL without embedded credentials and sends `secret_token` to Telegram. It retains pending messages. The two registered tables, `telegramUsers` and `telegramMessages`, use the existing schema definitions and indexes; this change does not backfill or inspect production records. Management, registration, history and notification-control functions are internal; the three existing callers in `telegramAgent.ts` use `internal` references.

Telegram documents the header, accepted secret characters and retry behavior in its [official Bot API](https://core.telegram.org/bots/api#setwebhook). A non-2xx response can cause Telegram to retry. This integration does not promise exactly-once outbound messages: a provider may accept a send before a later network failure or database error becomes visible. Evaluate delivery deduplication separately before adopting workflows that require exactly-once effects.

## Accepted work and failures

Only authenticated, bounded, structurally valid text messages and button callbacks are dispatched. Authentic unsupported update kinds are explicitly ignored. Invalid input, excessive bodies and failed processing receive unsuccessful HTTP responses. A provider's `sent:false` or `ok:false` must reach that failure path; an outgoing log must never imply a reply was sent when its send failed.

`/start` enables notifications and `/stop` disables them for the admitted chat. Help and status describe the implemented notification controls. Search, funding/news research and broadcast scaffolds are not evidence of working research or operational providers. Do not describe them as active based on a configured token or an HTTP 200 acknowledgment.

Provider requests use the fixed Telegram API host, reject redirects, have a finite deadline including body consumption, and reject oversized or malformed responses. History readers require a positive integer limit no greater than 100. No new in-memory cache, score, public route or provider dependency is introduced. There is no compare-and-swap hashing operation in this slice.

## Verification and adoption

1. Run the actual handlers with the registered schema in `backend/convex/domains/integrations/__tests__/telegramAdmission.test.ts`. The fixture provider must remain synthetic. Cases cover forged/unconfigured/malformed input, start/stop/start, independent chat histories, repeated/overlapping activity, delivery rejection, slow bodies, timeouts and oversized provider responses.
2. Run `node node_modules/vitest/vitest.mjs run backend/convex/domains/integrations/__tests__/telegramAdmission.test.ts --maxWorkers=1 --minWorkers=1 --no-file-parallelism`. The same file is part of CI's runtime smoke gate.
3. Run the unchanged generator contracts, backend typecheck and `npm run typecheck:app`. A reduction in Telegram diagnostics does not certify the remaining application or backend diagnostics.
4. Review the actual source diff and CI at the candidate commit. Coordinate any eventual schema deployment through the repository release workflow; never deploy out-of-band to shared Convex.
5. After the deployment owner configures the real provider, separately verify an authentic text/callback, a denied forged request, notification persistence and actual delivered messages. Local Convex emulation and synthetic provider responses do not certify production delivery, provider permissions, load capacity or a visual/UI quality grade.

The test HTTP router mounts the actual Telegram handler at the application path without initializing unrelated provider components. Convex-test allows direct calls to internal functions, so visibility is verified against the actual registered function flags, not inferred from its emulated calls. Overlapping scenarios exercise application/storage behavior in that emulator; they are not a benchmark of distributed production concurrency.
