$payload = '{"anonymousSessionId":"8dce4242-33a0-40f6-bed3-2b4156343efe","query":"Tell me about Stripe"}'
& npx convex run "domains/product/entities:resolveOrCreateEntityForChat" $payload 2>&1 | Select-Object -Last 40
