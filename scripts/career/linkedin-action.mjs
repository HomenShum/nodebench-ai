/**
 * LinkedIn Action — Single Playwright action with screenshot feedback.
 * Uses persistent Chrome profile (Chrome must be closed first).
 *
 * Usage:
 *   node linkedin-action.mjs <action> [args...]
 *
 * Actions:
 *   open                    — Open LinkedIn messaging, take screenshot
 *   screenshot [name]       — Take screenshot of current state
 *   goto <url>              — Navigate to URL
 *   thread <threadId>       — Open specific messaging thread
 *   search <name>           — Search messaging for a person
 *   type-and-send <text>    — Type message and click Send
 *   elements                — List visible interactive elements
 *   click <selector>        — Click an element
 *   reply <index>           — Execute full reply flow for recruiter by index (1-16)
 */
import { chromium } from 'playwright';
import { resolve } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

const ssDir = resolve('scripts/career/screenshots');
mkdirSync(ssDir, { recursive: true });

const action = process.argv[2];
const args = process.argv.slice(3);

const CHROME_PROFILE = resolve(process.env.LOCALAPPDATA, 'Google/Chrome/User Data');

// All 16 draft replies
const REPLIES = [
  { idx:1, tier:1, name:"Rebecca Graham", threadId:null, draft:`Hi Rebecca, thanks for reaching out. I'm open to learning more — could you share details on the role and company? For context, my current focus is on agentic AI infrastructure: I build and audit production systems where AI agents make autonomous tool calls at scale. Happy to jump on a quick call if it's in that space. Best, Homen` },
  { idx:2, tier:1, name:"Chris Cross", threadId:"2-Mjg4Zjc0MmItYTY4YS00MDhhLTliNWUtYjI3OGU5ZTQ4YTkyXzEwMA==", draft:`Hi Chris, this caught my attention — clinical AI with published outcomes and system-wide deployment is rare. My background spans JP Morgan healthcare banking and production AI systems (I build agent infrastructure that handles 200+ autonomous tool calls with bounded resource management). I'd be interested in learning more about the engineering challenges at Bayesian Health — are you building agent-based clinical decision support, or is this more traditional ML pipeline work? Happy to connect this week.` },
  { idx:3, tier:1, name:"Bryce Reading", threadId:null, draft:`Hi Bryce, appreciate the outreach and the specific reference to my agent systems work. The comp range and focus on hierarchical agent orchestration align well with what I'm building. Could you share more about the company and the specific reliability/infrastructure challenges they're solving? I'm particularly interested in roles where the engineering problem is making agent tool calls trustworthy at production scale — bounded resources, honest observability, timeout budgets. Happy to chat this week.` },
  { idx:4, tier:1, name:"Job Abraria", threadId:"2-ZGI5MTU4ZGUtNWZlNi00MWZmLTljMzMtMmUxYmE4NGQwOTE4XzEwMA==", draft:`Hi Job, thanks for reaching out. The intersection of reinforcement learning and LLM operations is exactly where agent reliability engineering lives — I've been building production systems that handle autonomous agent loops with bounded resources and honest failure signals. Could you share more about the client and the specific systems they're building? I'd want to understand whether this is greenfield agent infrastructure or augmenting existing automation. Best, Homen` },
  { idx:5, tier:1, name:"Leigh Obery", threadId:"2-Y2NkNTdjYmItYjE5Yy00NTI1LWIwZmItNTZlNjYxMjUwYjE2XzEwMA==", draft:`Hi Leigh, a foundational AI role at an early-stage startup with high ownership is interesting. Could you share more about what the company is building? My sweet spot is agent infrastructure — making AI tool calls reliable, bounded, and auditable at production scale. I've built a 275-tool MCP server with progressive discovery, eval harnesses, and production reliability audits. If the startup is in the agentic AI space, I'd love to learn more.` },
  { idx:6, tier:1, name:"Jim Campbell", threadId:null, draft:`Hi Jim, apologies for the delayed response — I've been heads-down building. Your portfolio access (Sequoia, a16z, GC, YC) is exactly the ecosystem I'm targeting. I'm focused on agentic AI infrastructure — specifically the reliability layer: making agent tool calls trustworthy, bounded, and observable at scale. I've built a 275-tool MCP server, production reliability audits, and eval harnesses. Are any of your portfolio companies hiring for agent infrastructure or AgentOps roles? Happy to chat about fit.` },
  { idx:7, tier:1, name:"Meg Marks", threadId:"2-ZjNmNWM0YmItZGQ2MC00ODQ2LTkxMDgtYWM3MmUyZTRjMmJlXzEwMA==", draft:`Hi Meg, apologies for the late reply. I'm interested in the AI and ML Tech Lead role — could you share more about the company and what they're building? My focus has been on agentic AI infrastructure and reliability engineering, with a background in banking/finance. The fully remote + equity structure is appealing. Happy to jump on a call if the company is in the agent/tool orchestration space.` },
  { idx:8, tier:2, name:"Preston Topper", threadId:"2-MDQ5ODFmNTYtYjJmNy00ZTBlLWJlNTQtYzM4ZjUxNzgxNTgxXzEwMA==", draft:`Hi Preston, thanks for reaching out. The hands-on startup environment working directly with the founder sounds appealing. Could you share more about what the company is building and the team size? I'm strongest in agentic AI infrastructure — production reliability, MCP servers, eval systems. If the role involves building agent-facing tooling, I'd be very interested.` },
  { idx:9, tier:2, name:"Anita Sahagun", threadId:null, draft:`Hi Anita, thanks for the outreach. Could you share more about the startup and what the ML Engineer role involves? I'm focused on agentic AI infrastructure and production reliability — happy to chat if there's fit.` },
  { idx:10, tier:2, name:"Nitali Sharma", threadId:"2-MmYxNzRkZmUtNjllNy00MGE4LTllNzctYmJiNDEyZDllZmVlXzEwMA==", draft:`Hi Nitali, thanks for the follow-up and for checking — I appreciate the diligence. I'm not actually at Meta, but I understand the confusion from my profile. I'm open to the right opportunities in agentic AI infrastructure. If you have roles in that space, I'd be happy to discuss.` },
  { idx:11, tier:2, name:"Crew Weingard", threadId:null, draft:`Hi Crew, thanks for reaching out. Could you share more about the Fortune 500 client and the scope of the AI Engineer contract? I'm primarily looking for full-time roles in agentic AI infrastructure, but I'm open to discussing if the project is substantial and in the agent/tool reliability space.` },
  { idx:12, tier:2, name:"Corrin Covington", threadId:null, draft:`Hi Corrin, thanks for thinking of me. LexisNexis has interesting data challenges. Could you share more about the AI work — is it NLP/search focused or more on the agentic automation side? I'm primarily seeking full-time roles but happy to learn more.` },
  { idx:13, tier:2, name:"Laura Masterson", threadId:null, draft:`Hi Laura, thanks for reaching out. The comp range is below my target — I'm focused on senior agentic AI infrastructure roles in the $170K-$280K range. If your client has roles at that level, I'd be happy to discuss. Best, Homen` },
  { idx:14, tier:2, name:"Enoch Cheng", threadId:"2-MDExM2YzY2ItNmU3OC00OTQyLTkwMTAtYmVhNGFjNjcwMmZmXzEwMA==", draft:`Hi Enoch, thanks for the outreach. The intelligent learning platform concept is interesting. Could you share more about the AI stack — are they building with agent frameworks, or is this more traditional ML/NLP? My expertise is in agentic AI infrastructure. Happy to explore if there's alignment.` },
  { idx:15, tier:2, name:"Heath Hamaguchi", threadId:null, draft:`Hi Heath, thanks for reaching out. I'm primarily focused on agentic AI infrastructure roles rather than general full-stack positions. If you come across roles specifically in agent reliability, MCP engineering, or AI tool orchestration, I'd love to hear about them.` },
  { idx:16, tier:2, name:"Josh Pierce", threadId:null, draft:`Hi Josh, thanks for the outreach. AT&T's scale is interesting for GenAI deployment. Could you share more about what the team is building — is this customer-facing agent systems, internal automation, or infrastructure? I'm strongest in agent reliability and tool orchestration. Happy to discuss.` },
];

async function run() {
  console.log('Launching browser with Chrome profile...');
  const context = await chromium.launchPersistentContext(CHROME_PROFILE, {
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
    viewport: { width: 1280, height: 900 },
    slowMo: 400,
  });

  const page = context.pages()[0] || await context.newPage();

  async function ss(name = 'current') {
    const p = resolve(ssDir, `${name}.png`);
    await page.screenshot({ path: p });
    console.log(`SCREENSHOT:${p}`);
    return p;
  }

  try {
    switch (action) {
      case 'open': {
        await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);
        await ss('messaging-home');
        break;
      }

      case 'screenshot': {
        await ss(args[0] || `snap-${Date.now()}`);
        break;
      }

      case 'goto': {
        await page.goto(args[0], { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
        await ss('after-goto');
        break;
      }

      case 'thread': {
        const threadId = args[0];
        await page.goto(`https://www.linkedin.com/messaging/thread/${threadId}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);
        await ss('thread-open');
        break;
      }

      case 'search': {
        const name = args.join(' ');
        await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
        const searchInput = page.locator('input[placeholder*="Search messages"], input[aria-label*="Search messages"]').first();
        await searchInput.click();
        await searchInput.fill(name);
        await page.waitForTimeout(2500);
        await ss('search-results');
        break;
      }

      case 'type-and-send': {
        const text = args.join(' ');
        // Find message input
        const msgInput = page.locator('.msg-form__contenteditable, [contenteditable="true"][role="textbox"]').first();
        await msgInput.click();
        await page.waitForTimeout(500);
        // Use keyboard.type for contenteditable (fill doesn't always work)
        await page.keyboard.type(text, { delay: 10 });
        await page.waitForTimeout(1000);
        await ss('typed-message');
        // Click send
        const sendBtn = page.locator('button.msg-form__send-button, button.msg-form__send-btn, button:has-text("Send"):not([disabled])').first();
        await sendBtn.click({ timeout: 5000 });
        await page.waitForTimeout(2000);
        await ss('after-send');
        break;
      }

      case 'click': {
        await page.locator(args[0]).first().click({ timeout: 10000 });
        await page.waitForTimeout(1500);
        await ss('after-click');
        break;
      }

      case 'elements': {
        const els = await page.evaluate(() => {
          const items = document.querySelectorAll('button, input, a[href], [contenteditable="true"], [role="textbox"], [role="option"]');
          return Array.from(items).filter(e => e.offsetParent !== null).slice(0, 40).map((el, i) => ({
            i, tag: el.tagName.toLowerCase(),
            text: (el.textContent || '').trim().substring(0, 50),
            placeholder: el.getAttribute('placeholder') || '',
            role: el.getAttribute('role') || '',
            cls: (el.className || '').toString().substring(0, 40),
          }));
        });
        console.log(JSON.stringify(els, null, 2));
        break;
      }

      case 'reply': {
        const idx = parseInt(args[0]);
        const r = REPLIES.find(r => r.idx === idx);
        if (!r) { console.error(`No reply #${idx}`); break; }

        console.log(`\n=== Reply #${r.idx}: ${r.name} (Tier ${r.tier}) ===`);

        if (r.threadId) {
          // Direct thread navigation
          console.log(`Opening thread: ${r.threadId}`);
          await page.goto(`https://www.linkedin.com/messaging/thread/${r.threadId}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(3000);
        } else {
          // Search by name
          console.log(`Searching for: ${r.name}`);
          await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(2000);
          const searchInput = page.locator('input[placeholder*="Search messages"], input[aria-label*="Search messages"]').first();
          await searchInput.click();
          await searchInput.fill(r.name);
          await page.waitForTimeout(2500);
          // Click first conversation result
          const firstConvo = page.locator('.msg-conversation-listitem, li.msg-conversation-card').first();
          await firstConvo.click({ timeout: 8000 });
          await page.waitForTimeout(2000);
        }

        await ss(`reply-${r.idx}-thread`);

        // Type the message
        console.log('Typing message...');
        const msgInput = page.locator('.msg-form__contenteditable, [contenteditable="true"][role="textbox"]').first();
        await msgInput.click({ timeout: 8000 });
        await page.waitForTimeout(500);
        await page.keyboard.type(r.draft, { delay: 8 });
        await page.waitForTimeout(1000);
        await ss(`reply-${r.idx}-typed`);

        // Send
        console.log('Sending...');
        const sendBtn = page.locator('button.msg-form__send-button, button.msg-form__send-btn').first();
        await sendBtn.click({ timeout: 5000 });
        await page.waitForTimeout(2000);
        await ss(`reply-${r.idx}-sent`);
        console.log(`✅ Reply #${r.idx} sent to ${r.name}`);
        break;
      }

      case 'reply-all': {
        const startFrom = parseInt(args[0] || '1');
        const tierFilter = args[1] || 'all';
        const filtered = REPLIES.filter(r => r.idx >= startFrom && (tierFilter === 'all' || r.tier === parseInt(tierFilter)));

        console.log(`Sending ${filtered.length} replies starting from #${startFrom}...`);

        for (const r of filtered) {
          console.log(`\n=== Reply #${r.idx}: ${r.name} (Tier ${r.tier}) ===`);

          try {
            if (r.threadId) {
              await page.goto(`https://www.linkedin.com/messaging/thread/${r.threadId}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
              await page.waitForTimeout(3000);
            } else {
              await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded', timeout: 30000 });
              await page.waitForTimeout(2000);
              const searchInput = page.locator('input[placeholder*="Search messages"], input[aria-label*="Search messages"]').first();
              await searchInput.click();
              await searchInput.fill(r.name);
              await page.waitForTimeout(2500);
              const firstConvo = page.locator('.msg-conversation-listitem, li.msg-conversation-card').first();
              await firstConvo.click({ timeout: 8000 });
              await page.waitForTimeout(2000);
            }

            const msgInput = page.locator('.msg-form__contenteditable, [contenteditable="true"][role="textbox"]').first();
            await msgInput.click({ timeout: 8000 });
            await page.waitForTimeout(500);
            await page.keyboard.type(r.draft, { delay: 8 });
            await page.waitForTimeout(1000);

            const sendBtn = page.locator('button.msg-form__send-button, button.msg-form__send-btn').first();
            await sendBtn.click({ timeout: 5000 });
            await page.waitForTimeout(2000);
            await ss(`reply-${r.idx}-sent`);
            console.log(`✅ Reply #${r.idx} sent to ${r.name}`);

            // Random delay between replies (5-10s)
            const delay = 5000 + Math.random() * 5000;
            console.log(`Waiting ${(delay/1000).toFixed(1)}s...`);
            await page.waitForTimeout(delay);
          } catch (err) {
            console.error(`❌ Reply #${r.idx} failed: ${err.message}`);
            await ss(`reply-${r.idx}-error`);
          }
        }
        break;
      }

      default:
        console.log('Usage: node linkedin-action.mjs <open|screenshot|goto|thread|search|type-and-send|click|elements|reply|reply-all>');
    }
  } finally {
    await context.close();
  }
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
