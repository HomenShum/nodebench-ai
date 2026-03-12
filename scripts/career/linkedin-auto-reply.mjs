/**
 * LinkedIn Auto-Reply via Playwright
 * Uses persistent Chrome context to reuse existing LinkedIn login session.
 *
 * Usage: node scripts/career/linkedin-auto-reply.mjs [--dry-run] [--tier 1|2|all] [--start N]
 */

import { chromium } from 'playwright';
import { resolve } from 'path';
import { homedir } from 'os';

const DRY_RUN = process.argv.includes('--dry-run');
const tierArg = process.argv.find((_, i, a) => a[i - 1] === '--tier') || 'all';
const startIdx = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--start') || '0');

const replies = [
  // === TIER 1: High Priority ===
  {
    idx: 1, tier: 1,
    name: "Rebecca Graham (1Five)",
    // No thread ID — search by name in messaging
    threadId: null,
    searchName: "Rebecca Graham",
    draft: `Hi Rebecca, thanks for reaching out. I'm open to learning more — could you share details on the role and company? For context, my current focus is on agentic AI infrastructure: I build and audit production systems where AI agents make autonomous tool calls at scale. Happy to jump on a quick call if it's in that space. Best, Homen`
  },
  {
    idx: 2, tier: 1,
    name: "Chris Cross (Bayesian Health)",
    threadId: "2-Mjg4Zjc0MmItYTY4YS00MDhhLTliNWUtYjI3OGU5ZTQ4YTkyXzEwMA==",
    draft: `Hi Chris, this caught my attention — clinical AI with published outcomes and system-wide deployment is rare. My background spans JP Morgan healthcare banking and production AI systems (I build agent infrastructure that handles 200+ autonomous tool calls with bounded resource management). I'd be interested in learning more about the engineering challenges at Bayesian Health — are you building agent-based clinical decision support, or is this more traditional ML pipeline work? Happy to connect this week.`
  },
  {
    idx: 3, tier: 1,
    name: "Bryce Reading ($205K-$280K + equity)",
    threadId: null,
    searchName: "Bryce Reading",
    draft: `Hi Bryce, appreciate the outreach and the specific reference to my agent systems work. The comp range and focus on hierarchical agent orchestration align well with what I'm building. Could you share more about the company and the specific reliability/infrastructure challenges they're solving? I'm particularly interested in roles where the engineering problem is making agent tool calls trustworthy at production scale — bounded resources, honest observability, timeout budgets. Happy to chat this week.`
  },
  {
    idx: 4, tier: 1,
    name: "Job Abraria (AI Implementation Engineer)",
    threadId: "2-ZGI5MTU4ZGUtNWZlNi00MWZmLTljMzMtMmUxYmE4NGQwOTE4XzEwMA==",
    draft: `Hi Job, thanks for reaching out. The intersection of reinforcement learning and LLM operations is exactly where agent reliability engineering lives — I've been building production systems that handle autonomous agent loops with bounded resources and honest failure signals. Could you share more about the client and the specific systems they're building? I'd want to understand whether this is greenfield agent infrastructure or augmenting existing automation. Best, Homen`
  },
  {
    idx: 5, tier: 1,
    name: "Leigh Obery (Foundational AI Engineer)",
    threadId: "2-Y2NkNTdjYmItYjE5Yy00NTI1LWIwZmItNTZlNjYxMjUwYjE2XzEwMA==",
    draft: `Hi Leigh, a foundational AI role at an early-stage startup with high ownership is interesting. Could you share more about what the company is building? My sweet spot is agent infrastructure — making AI tool calls reliable, bounded, and auditable at production scale. I've built a 275-tool MCP server with progressive discovery, eval harnesses, and production reliability audits. If the startup is in the agentic AI space, I'd love to learn more.`
  },
  {
    idx: 6, tier: 1,
    name: "Jim Campbell (Sequoia/a16z/GC/YC)",
    threadId: null,
    searchName: "Jim Campbell",
    draft: `Hi Jim, apologies for the delayed response — I've been heads-down building. Your portfolio access (Sequoia, a16z, GC, YC) is exactly the ecosystem I'm targeting. I'm focused on agentic AI infrastructure — specifically the reliability layer: making agent tool calls trustworthy, bounded, and observable at scale. I've built a 275-tool MCP server, production reliability audits, and eval harnesses. Are any of your portfolio companies hiring for agent infrastructure or AgentOps roles? Happy to chat about fit.`
  },
  {
    idx: 7, tier: 1,
    name: "Meg Marks (AI/ML Tech Lead, $200k+ equity)",
    threadId: "2-ZjNmNWM0YmItZGQ2MC00ODQ2LTkxMDgtYWM3MmUyZTRjMmJlXzEwMA==",
    draft: `Hi Meg, apologies for the late reply. I'm interested in the AI and ML Tech Lead role — could you share more about the company and what they're building? My focus has been on agentic AI infrastructure and reliability engineering, with a background in banking/finance. The fully remote + equity structure is appealing. Happy to jump on a call if the company is in the agent/tool orchestration space.`
  },

  // === TIER 2: Reply This Week ===
  {
    idx: 8, tier: 2,
    name: "Preston Topper (SR. AI Engineer)",
    threadId: "2-MDQ5ODFmNTYtYjJmNy00ZTBlLWJlNTQtYzM4ZjUxNzgxNTgxXzEwMA==",
    draft: `Hi Preston, thanks for reaching out. The hands-on startup environment working directly with the founder sounds appealing. Could you share more about what the company is building and the team size? I'm strongest in agentic AI infrastructure — production reliability, MCP servers, eval systems. If the role involves building agent-facing tooling, I'd be very interested.`
  },
  {
    idx: 9, tier: 2,
    name: "Anita Sahagun (ML Engineer, Hot Startup)",
    threadId: null,
    searchName: "Anita Sahagun",
    draft: `Hi Anita, thanks for the outreach. Could you share more about the startup and what the ML Engineer role involves? I'm focused on agentic AI infrastructure and production reliability — happy to chat if there's fit.`
  },
  {
    idx: 10, tier: 2,
    name: "Nitali Sharma (META)",
    threadId: "2-MmYxNzRkZmUtNjllNy00MGE4LTllNzctYmJiNDEyZDllZmVlXzEwMA==",
    draft: `Hi Nitali, thanks for the follow-up and for checking — I appreciate the diligence. I'm not actually at Meta, but I understand the confusion from my profile. I'm open to the right opportunities in agentic AI infrastructure. If you have roles in that space, I'd be happy to discuss.`
  },
  {
    idx: 11, tier: 2,
    name: "Crew Weingard (AI Engineer, Fortune 500)",
    threadId: null,
    searchName: "Crew Weingard",
    draft: `Hi Crew, thanks for reaching out. Could you share more about the Fortune 500 client and the scope of the AI Engineer contract? I'm primarily looking for full-time roles in agentic AI infrastructure, but I'm open to discussing if the project is substantial and in the agent/tool reliability space.`
  },
  {
    idx: 12, tier: 2,
    name: "Corrin Covington (AI Engineer, LexisNexis)",
    threadId: null,
    searchName: "Corrin Covington",
    draft: `Hi Corrin, thanks for thinking of me. LexisNexis has interesting data challenges. Could you share more about the AI work — is it NLP/search focused or more on the agentic automation side? I'm primarily seeking full-time roles but happy to learn more.`
  },
  {
    idx: 13, tier: 2,
    name: "Laura Masterson (AI Application Developer)",
    threadId: null,
    searchName: "Laura Masterson",
    draft: `Hi Laura, thanks for reaching out. The comp range is below my target — I'm focused on senior agentic AI infrastructure roles in the $170K-$280K range. If your client has roles at that level, I'd be happy to discuss. Best, Homen`
  },
  {
    idx: 14, tier: 2,
    name: "Enoch Cheng (AI Engineer, Edtech)",
    threadId: "2-MDExM2YzY2ItNmU3OC00OTQyLTkwMTAtYmVhNGFjNjcwMmZmXzEwMA==",
    draft: `Hi Enoch, thanks for the outreach. The intelligent learning platform concept is interesting. Could you share more about the AI stack — are they building with agent frameworks, or is this more traditional ML/NLP? My expertise is in agentic AI infrastructure. Happy to explore if there's alignment.`
  },
  {
    idx: 15, tier: 2,
    name: "Heath Hamaguchi (Senior Full Stack Engineer)",
    threadId: null,
    searchName: "Heath Hamaguchi",
    draft: `Hi Heath, thanks for reaching out. I'm primarily focused on agentic AI infrastructure roles rather than general full-stack positions. If you come across roles specifically in agent reliability, MCP engineering, or AI tool orchestration, I'd love to hear about them.`
  },
  {
    idx: 16, tier: 2,
    name: "Josh Pierce (GenAI Engineer, AT&T)",
    threadId: null,
    searchName: "Josh Pierce",
    draft: `Hi Josh, thanks for the outreach. AT&T's scale is interesting for GenAI deployment. Could you share more about what the team is building — is this customer-facing agent systems, internal automation, or infrastructure? I'm strongest in agent reliability and tool orchestration. Happy to discuss.`
  }
];

// Filter by tier
const filtered = replies.filter(r => {
  if (tierArg !== 'all' && r.tier !== parseInt(tierArg)) return false;
  return r.idx > startIdx;
});

console.log(`\n🚀 LinkedIn Auto-Reply${DRY_RUN ? ' [DRY RUN]' : ''}`);
console.log(`   Sending ${filtered.length} replies (tier: ${tierArg}, starting after #${startIdx})\n`);

// Find Chrome user data directory
const chromeUserData = resolve(process.env.LOCALAPPDATA, 'Google/Chrome/User Data');

async function run() {
  console.log('📂 Launching browser with your Chrome profile...');
  console.log(`   Profile: ${chromeUserData}\n`);

  // Launch persistent context reusing Chrome login
  const context = await chromium.launchPersistentContext(chromeUserData, {
    headless: false,
    channel: 'chrome',
    args: [
      '--disable-blink-features=AutomationControlled',
    ],
    viewport: { width: 1280, height: 900 },
    // Slow down actions so LinkedIn doesn't flag as bot
    slowMo: 500,
  });

  const page = context.pages()[0] || await context.newPage();

  let sent = 0;
  let failed = 0;

  for (const r of filtered) {
    const tierLabel = r.tier === 1 ? '🔴 TIER 1' : '🟡 TIER 2';
    console.log(`\n${tierLabel} #${r.idx}: ${r.name}`);

    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would send: "${r.draft.substring(0, 80)}..."`);
      sent++;
      continue;
    }

    try {
      if (r.threadId) {
        // Direct thread navigation
        const url = `https://www.linkedin.com/messaging/thread/${r.threadId}/`;
        console.log(`   Opening thread: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } else {
        // Search for conversation by name
        console.log(`   Searching messaging for: ${r.searchName}`);
        await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Click search box in messaging
        const searchBox = page.locator('input[placeholder*="Search messages"]').first();
        if (await searchBox.isVisible({ timeout: 5000 })) {
          await searchBox.click();
          await searchBox.fill(r.searchName);
          await page.waitForTimeout(2000);

          // Click first result
          const firstResult = page.locator('.msg-conversation-listitem').first();
          if (await firstResult.isVisible({ timeout: 5000 })) {
            await firstResult.click();
            await page.waitForTimeout(1500);
          } else {
            console.log(`   ⚠️  No conversation found for "${r.searchName}" — skipping`);
            failed++;
            continue;
          }
        } else {
          console.log(`   ⚠️  Search box not found — skipping`);
          failed++;
          continue;
        }
      }

      // Wait for message input to appear
      await page.waitForTimeout(2000);

      // Try multiple selectors for the message input
      const messageInput = page.locator([
        '.msg-form__contenteditable',
        '[contenteditable="true"][role="textbox"]',
        '.msg-form__msg-content-container--is-active [contenteditable="true"]',
        'div.msg-form__contenteditable[contenteditable="true"]'
      ].join(', ')).first();

      if (await messageInput.isVisible({ timeout: 8000 })) {
        await messageInput.click();
        await page.waitForTimeout(500);

        // Type the draft reply
        await messageInput.fill(r.draft);
        await page.waitForTimeout(1000);

        // Click send button
        const sendButton = page.locator([
          'button.msg-form__send-button',
          'button[type="submit"].msg-form__send-button',
          '.msg-form__send-btn',
          'button:has-text("Send")'
        ].join(', ')).first();

        if (await sendButton.isVisible({ timeout: 5000 })) {
          await sendButton.click();
          console.log(`   ✅ Sent!`);
          sent++;

          // Wait between messages to avoid rate limiting
          const delay = 3000 + Math.random() * 4000; // 3-7 seconds
          console.log(`   ⏳ Waiting ${(delay / 1000).toFixed(1)}s before next...`);
          await page.waitForTimeout(delay);
        } else {
          console.log(`   ⚠️  Send button not found — message typed but not sent`);
          failed++;
        }
      } else {
        console.log(`   ⚠️  Message input not found — skipping`);
        failed++;
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Sent: ${sent} | ❌ Failed: ${failed} | Total: ${filtered.length}`);
  console.log(`${'='.repeat(50)}\n`);

  // Keep browser open so user can verify
  console.log('Browser left open for verification. Close manually when done.');
  // Don't close context — let user inspect
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
