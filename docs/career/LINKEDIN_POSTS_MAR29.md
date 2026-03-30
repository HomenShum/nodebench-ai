# LinkedIn Posts — March 29, 2026

## Fact Sheet (verified)
- **nodebench-mcp v2.70.0**: 350 tools, 57 domains, starts with 15, MIT
- **ta-studio-mcp v1.5.0**: 9 tools, Playwright web + ADB Android, MIT
- NodeBench site: nodebenchai.com | TA Studio site: retention.sh
- Both npm-installable, both open-source

## Style Rules
- ONE product per post
- Lead with a problem everyone recognizes
- Show the output/result BEFORE the install command
- Explain MCP in one plain sentence the first time
- No jargon without immediate translation
- Short paragraphs, punchy

---

## POST A: NodeBench (TO POST — replaces origin story)

Every week I do the same thing.

I open 6 tabs. I search for what happened in my market. I check what competitors shipped. I scan for funding rounds, product launches, regulatory changes. I pull it into a doc, try to figure out what matters and what's noise, then decide what to do next.

It takes 3-4 hours. Sometimes a full day if I'm going deep on a company.

I used to do this at JPMorgan for deals. Now I do it as a founder. The process is identical -- different sources, same loop: gather everything, synthesize, decide.

So I automated it.

I built an open-source tool that plugs into AI coding assistants (Claude Code, Cursor, Windsurf) and lets your AI do the research loop for you. You ask a question in plain English. It comes back with a structured answer.

Some examples of what I ask it:

"What happened in the QA automation market this week?"
-- It returns a packet: 4 signals, 2 competitor moves, 1 funding round, 3 risk flags. Each with a source link.

"Build me a decision memo on whether to pivot to usage-based pricing."
-- It gathers context, structures the pros/cons, and gives me a shareable URL I can send to my co-founder.

"What changed since Monday?"
-- A weekly reset: what happened, what matters, what to do next. Takes 30 seconds instead of 3 hours.

This is how we researched the market for our QA product (retention.sh). The tool that helped us make better decisions faster became its own product.

It's called NodeBench. Open-source, free, MIT licensed.

If you use Claude Code or Cursor, you can install it in one line:
claude mcp add nodebench -- npx -y nodebench-mcp

If you don't, you can try it at nodebenchai.com -- no install needed.

npm: https://www.npmjs.com/package/nodebench-mcp
Source: https://github.com/HomenShum/nodebench-ai

---

## POST B: retention.sh (TO POST — separate day)

If you're building an app right now, your testing process probably looks like this:

1. Make a change
2. Manually click through the app to check if it broke
3. Push and hope

Or if you're more disciplined:

1. Make a change
2. Write a Playwright test for that specific change
3. Run the test suite (5-15 minutes)
4. Fix the flaky test that broke for no reason
5. Push

We ran into this at Meta. We were building an AI-powered QA system for 350,000+ manual test cases. The first version was burning 10-50 million AI tokens per test run. Our telemetry dashboard was crashing from out-of-memory errors. The approach looked unviable.

The fix was counterintuitive: we stopped giving the AI more information and started giving it better-structured information. We compressed every test trajectory so the AI could run the same 150-300 steps using 1-3 million tokens instead of 50 million.

We packaged that into retention.sh -- a tool that plugs into AI coding assistants and turns one command into a full QA pipeline.

How it works:

You type: "Run QA on my app at localhost:3000"

It opens your app in a real browser (Playwright). Clicks through flows. Takes screenshots at every step. Reports failures with the exact screenshot of what went wrong -- not "assertion error on line 47."

When something fails, you fix the bug and rerun just the failures. 10 seconds, $0. No re-running the full suite.

Works for web apps out of the box. Android native apps too (via device emulator).

If you use Claude Code or Cursor, install in one line:
npx ta-studio-mcp@latest

Or point your AI assistant at the setup guide:
https://retention.sh/agent-setup.txt

It reads the instructions and configures itself.

npm: https://www.npmjs.com/package/ta-studio-mcp
Site: https://retention.sh

---

## POST C: The Builder Stack (TO POST Apr 1-2 before hackathon)

I shipped two open-source tools this year. Same origin, different problems.

The first one: I was spending half a day every week doing market research manually. Scanning for competitor moves, funding rounds, product launches. Copying things into docs. Deciding what mattered. So I built a tool that does it in 30 seconds.

It's called NodeBench. You ask your AI assistant a question like "What happened in the QA market this week?" and it comes back with a structured packet -- signals, risks, competitor changes, each with source links. You can also ask it to write decision memos and share them via URL.

The second one: our QA process at Meta was burning 10-50 million AI tokens per test run. We got it down to 1-3 million by restructuring how the AI reads test trajectories. Then we packaged it so anyone can run a full QA pipeline with one command: type "test my app" and it clicks through your app in a real browser, screenshots every step, and reports exactly what broke.

That's retention.sh.

Both tools plug into AI coding assistants -- Claude Code, Cursor, Windsurf -- via something called MCP (Model Context Protocol). Think of it as a plugin system for AI assistants. You install the plugin, and your AI gains new capabilities.

Both are free, open-source, MIT licensed, and npm-installable:

Research and decision-making:
claude mcp add nodebench -- npx -y nodebench-mcp

QA automation:
npx ta-studio-mcp@latest

Both have setup guides your AI can read and self-configure:
https://www.nodebenchai.com/agent-setup.txt
https://retention.sh/agent-setup.txt

If you're building for the MCP Hackathon (Apr 4-17) or just want to skip 3 days of infrastructure setup -- try either one.

What are you building this week?

---

## WHAT CHANGED FROM THE OLD POSTS

| Issue | Old | New |
|-------|-----|-----|
| Hook | JPM banking jargon (PitchBook, CapIQ) | "Every week I do the same thing. I open 6 tabs." |
| MCP explanation | Assumed reader knows MCP | "a plugin system for AI assistants" |
| Output shown first? | No -- went straight to install command | Yes -- "4 signals, 2 competitor moves, 1 funding round" |
| Products per post | Mixed NodeBench + retention.sh | ONE product per post (A and B), combined only in C |
| Technical floor | Terminal commands in paragraph 3 | Install commands at the END, after the reader already gets it |
| Non-technical reader | Lost at "MCP server" | Can understand the whole post without coding |
| Visual payoff | None | Describes exact output format ("a packet: 4 signals, 2 competitor moves...") |

## POSTING SCHEDULE
- Delete or keep old origin story post (your call -- it's live but unclear)
- Post A (NodeBench): Today/tomorrow
- Post B (retention.sh): 1-2 days after A
- Post C (stack post): Apr 1-2 before hackathon
- Do NOT mention job search or "open to opportunities"
