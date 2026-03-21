# Usability Scorecard

The structural quality of the app (build, design, accessibility) is necessary but not sufficient. This scorecard measures whether a real person can actually USE the product to accomplish something valuable.

## When to run
- After any deep diligence or QA dogfood pass
- Before any demo, launch, or investor meeting
- When the structural score is 5/5 but adoption isn't happening

## The 60-Second Test

Start a timer. Open the app as a new user (incognito, no auth). Can you:

| Action | Target | NodeBench Status |
|--------|--------|-----------------|
| Understand what it does | < 3 seconds | ⬜ |
| Take a meaningful action | < 10 seconds | ⬜ |
| See a valuable result | < 30 seconds | ⬜ |
| Want to do it again | < 60 seconds | ⬜ |

If any of these fail, the product is a museum, not a tool.

## 10 Usability Dimensions

### 1. Time to Value (0-10)
How many seconds from first touch to "this is useful"?
- 10: Instant (TikTok — content plays before you even think)
- 7: Under 10 seconds (ChatGPT — type, get answer)
- 5: Under 60 seconds (Linear — create an issue)
- 3: Under 5 minutes (requires setup, config, or onboarding)
- 1: Never gets there without a tutorial

### 2. Zero-Friction Entry (0-10)
Can I do the core thing without signing up, configuring, or reading docs?
- 10: No account needed, core value immediate (TikTok feed, Perplexity search)
- 7: Account needed but instant value after (ChatGPT)
- 5: Account + one config step (Linear project setup)
- 3: Account + multiple config steps
- 1: Requires API keys, env vars, or technical setup

### 3. Input Obviousness (0-10)
Is it immediately clear what to type, click, or do?
- 10: One input field with a great placeholder (ChatGPT: "Message ChatGPT")
- 7: One clear CTA + one input (Perplexity: search bar + suggestion chips)
- 5: Multiple options but clear hierarchy
- 3: Multiple equal-weight options, unclear which to try first
- 1: No clear entry point, just a dashboard of features

### 4. Output Quality (0-10)
When I do the thing, is the result actually useful?
- 10: The output is better than what I could do myself (ChatGPT code generation)
- 7: The output saves me significant time (Perplexity research summary)
- 5: The output is interesting but I'd need to refine it
- 3: The output is generic or obviously canned
- 1: The output is demo data / placeholder

### 5. Feedback Loop Speed (0-10)
How fast is the cycle of input → processing → output → next input?
- 10: Sub-second (TikTok swipe, Linear keyboard shortcuts)
- 7: 1-5 seconds (ChatGPT streaming response)
- 5: 5-30 seconds (complex analysis)
- 3: 30+ seconds with loading spinner
- 1: Background processing, come back later

### 6. Mobile Usability (0-10)
Can I use the core feature on my phone without pain?
- 10: Mobile-first, full functionality (TikTok, Instagram)
- 7: Responsive, core features work (ChatGPT mobile)
- 5: Responsive but cramped, some features hidden
- 3: Desktop-only, mobile is technically accessible but painful
- 1: Doesn't work on mobile

### 7. Voice / Hands-Free (0-10)
Can I interact without typing? (Increasingly important in 2026)
- 10: Full voice-first experience (OpenClaw remote command)
- 7: Voice input works for core actions
- 5: Voice-to-text works but limited to search
- 3: No voice but good keyboard shortcuts
- 1: Mouse-only interaction

### 8. Shareability (0-10)
Can I share what I found/created with someone who doesn't have the product?
- 10: One-click share, recipient sees full context (TikTok video link)
- 7: Shareable URL with good preview (Perplexity answer page)
- 5: Shareable URL but requires account to see
- 3: Export to PDF/image, manual sharing
- 1: No sharing mechanism

### 9. Return Hook (0-10)
Is there a reason to come back tomorrow?
- 10: Personalized feed that changes daily (TikTok, Twitter)
- 7: New data/insights every session (Perplexity Discover, Research Hub)
- 5: Useful when I have a question (ChatGPT)
- 3: Useful once, then done
- 1: No reason to return after initial exploration

### 10. "Show Someone" Factor (0-10)
Would I pull out my phone and show this to a friend/colleague?
- 10: "You HAVE to see this" (iPhone 2007 multitouch, ChatGPT first answer)
- 7: "This is pretty cool, check it out"
- 5: "Interesting tool, might be useful for you"
- 3: "It's a tool I use for work"
- 1: Would never mention it

## Scoring

| Score | Grade | Meaning |
|-------|-------|---------|
| 90-100 | S | Viral product. Word of mouth handles distribution. |
| 75-89 | A | Strong product. Users adopt willingly after seeing it. |
| 60-74 | B | Good product. Needs push marketing to drive adoption. |
| 45-59 | C | Functional but forgettable. Users won't evangelize. |
| 30-44 | D | Interesting tech demo. Not a product yet. |
| 0-29 | F | Science project. Rebuild the experience layer. |

## What Makes Products Spread

From deep research on iPhone, TikTok, ChatGPT, Linear, OpenClaw, Perplexity (Mar 2026):

### 5 Universal Principles

**1. VALUE BEFORE IDENTITY (Time-to-wow < 10 seconds)**
Every breakout product delivers value before asking anything. TikTok shows content before signup. Perplexity answers without registration. ChatGPT requires only typing. OpenClaw responds on Discord — no new app to install. The pattern: the first screen must already be doing the thing. For NodeBench: the first interaction should return a useful result, not a landing page. Show a live investigation result running.

**2. MEET USERS WHERE THEY ARE (Zero new UI to learn)**
OpenClaw's breakthrough: Discord/Telegram as the interface. iPhone: your finger. ChatGPT: a text box. Linear: Cmd+K. None invented a new interaction paradigm — they used the most familiar pattern and made it do something new. For NodeBench: the MCP protocol IS "meet them where they are" — it works inside Claude Code, Cursor, Windsurf. The CLI subcommands extend this. Never ask users to leave their environment.

**3. THE OUTPUT IS THE DISTRIBUTION (Every result is shareable)**
ChatGPT conversations are screenshots. TikTok videos are watermarked. Perplexity answers have citations. The output format is designed to be shared outside the product, bringing new users in. For NodeBench: every Decision Memo, every investigation, every forecast review should produce a shareable artifact — a URL, a markdown report, a PR with evidence. The output IS the marketing.

**4. SPEED IS A FEATURE, NOT A METRIC (Performance as emotion)**
Linear won because it feels instant (sub-50ms). iPhone won because touch was zero-latency. ChatGPT won because streaming made waiting feel like watching someone think. Superhuman's entire roadmap was "more speed, more shortcuts." For NodeBench: tool dispatch < 200ms to first useful token. TOON encoding (40% fewer tokens) is in this direction. If a response takes > 2s, it's a product bug.

**5. THE PRODUCT IMPROVES ITSELF (Data/usage network effects)**
TikTok's algorithm gets better with every swipe. OpenClaw builds upon itself via self-modifying skills. The pattern: the product must get measurably better for each user over time, without extra work. For NodeBench: session memory, progressive discovery rankings, co-occurrence edges, skill freshness — these ARE the mechanism. The flywheel: use a tool → tool learns patterns → next suggestion is better → use more tools. Make this visible.

### Product-Specific Lessons

**OpenClaw:** Time-to-value ~5 min. Spread via Twitter screenshots of impossibly competent outputs. Key: uses EXISTING platforms (Discord/Telegram) as UI. Proactive "heartbeat" check-ins create the feeling of a living teammate. Self-improvement loop (agent configures its own tools, schedules its own crons) is the hook.

**iPhone:** Time-to-value ~5 seconds. "Slide to unlock" teaches the entire interaction model in one gesture. One physical button (Home) always returns to known state. Direct manipulation (pinch, flick, bounce) made digital feel physical. The demo WAS the product — every owner became a demo-giver.

**TikTok:** Time-to-value 0 seconds. First screen IS a playing video. Interest graph, not social graph (no cold start problem). 15-60s videos = extremely high signal volume per minute. Content itself is distribution (watermarked videos shared to other platforms). Key decision: For You Page as default, not Following feed.

**ChatGPT:** Time-to-value ~3 seconds. One text box, no modes. The "holy shit" moment is different for every user (writing, coding, ideas, debugging). 100M users in 2 months via screenshot-sharing of impressive outputs. Key: absence of UI IS the UI.

**Linear:** Time-to-value ~30 seconds. Sub-50ms response times make issue management "genuinely enjoyable" (370 ProductHunt reviews repeat "fast"). Keyboard-first. Opinionated defaults (tells you how to work, doesn't ask you to configure). Tribal spread: using Linear signals a modern engineering team.

**Perplexity:** Time-to-value ~5 seconds. Search box (most understood interaction pattern) but outputs synthesized answers with numbered citations. Follow-up questions create research sessions. Key: inline source citations differentiate from both ChatGPT (no attribution) and Google (no synthesis).

## How to Improve NodeBench's Usability Score

### Current estimated score: 42/100 (Grade D — interesting tech demo)

| Dimension | Current | Target | Gap |
|-----------|---------|--------|-----|
| Time to Value | 4 | 8 | Demo data, not real results |
| Zero-Friction Entry | 5 | 8 | Guest mode works but output is canned |
| Input Obviousness | 7 | 9 | Input bar is clear, but "Run Live Demo" goes to receipts, not results |
| Output Quality | 3 | 8 | Demo data is impressive but obviously fake |
| Feedback Loop Speed | 5 | 8 | Agent panel has demo conversations but no real backend |
| Mobile Usability | 6 | 8 | Responsive but cramped agent panel |
| Voice / Hands-Free | 4 | 7 | Browser speech works, server voice just restored |
| Shareability | 3 | 7 | No share mechanism for memos/investigations |
| Return Hook | 4 | 8 | Research Hub has daily brief but needs real data |
| "Show Someone" Factor | 5 | 9 | Architecture is impressive but experience isn't "wow" |

### Priority fixes to reach 75+ (Grade A):

1. **Live investigation on first click** — "Run Live Demo" should trigger a real DeepTrace investigation (not navigate to static receipts). Show the agent working in real-time.

2. **One-click share for Decision Memos** — Generate a shareable URL that renders the memo without requiring auth. This is the viral artifact.

3. **Daily brief with real data** — Connect Research Hub to live news/signal feeds so there's always fresh content. This is the return hook.

4. **Voice command for core actions** — "Investigate Acme AI" or "Run diligence on this company" via voice. This is the OpenClaw pattern.

5. **Mobile-first agent panel** — The Ask NodeBench panel should be the primary mobile interface, not a sidebar overlay.

## Related rules
- `pre_release_review` — structural quality gate
- `deep-diligence` — comprehensive audit
- `flywheel_continuous` — continuous improvement
- `product_design_dogfood` — Jony Ive design principles
