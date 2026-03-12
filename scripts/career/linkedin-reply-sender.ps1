# LinkedIn Reply Sender — Opens thread + copies draft to clipboard
# Usage: powershell -ExecutionPolicy Bypass -File linkedin-reply-sender.ps1
# Flow: For each recruiter, copies draft reply → opens LinkedIn thread → waits for you to paste & send → press Enter for next

$replies = @(
    @{
        Name = "Rebecca Graham (1Five)"
        Tier = 1
        URL = "https://www.linkedin.com/messaging/"
        Draft = "Hi Rebecca, thanks for reaching out. I'm open to learning more -- could you share details on the role and company? For context, my current focus is on agentic AI infrastructure: I build and audit production systems where AI agents make autonomous tool calls at scale. Happy to jump on a quick call if it's in that space. Best, Homen"
    },
    @{
        Name = "Chris Cross (Bayesian Health)"
        Tier = 1
        URL = "https://www.linkedin.com/messaging/thread/2-Mjg4Zjc0MmItYTY4YS00MDhhLTliNWUtYjI3OGU5ZTQ4YTkyXzEwMA==/"
        Draft = "Hi Chris, this caught my attention -- clinical AI with published outcomes and system-wide deployment is rare. My background spans JP Morgan healthcare banking and production AI systems [I build agent infrastructure that handles 200+ autonomous tool calls with bounded resource management]. I'd be interested in learning more about the engineering challenges at Bayesian Health -- are you building agent-based clinical decision support, or is this more traditional ML pipeline work? Happy to connect this week."
    },
    @{
        Name = "Bryce Reading (205K-280K + equity)"
        Tier = 1
        URL = "https://www.linkedin.com/messaging/"
        Draft = "Hi Bryce, appreciate the outreach and the specific reference to my agent systems work. The comp range and focus on hierarchical agent orchestration align well with what I'm building. Could you share more about the company and the specific reliability/infrastructure challenges they're solving? I'm particularly interested in roles where the engineering problem is making agent tool calls trustworthy at production scale -- bounded resources, honest observability, timeout budgets. Happy to chat this week."
    },
    @{
        Name = "Job Abraria (AI Implementation Engineer)"
        Tier = 1
        URL = "https://www.linkedin.com/messaging/thread/2-ZGI5MTU4ZGUtNWZlNi00MWZmLTljMzMtMmUxYmE4NGQwOTE4XzEwMA==/"
        Draft = "Hi Job, thanks for reaching out. The intersection of reinforcement learning and LLM operations is exactly where agent reliability engineering lives -- I've been building production systems that handle autonomous agent loops with bounded resources and honest failure signals. Could you share more about the client and the specific systems they're building? I'd want to understand whether this is greenfield agent infrastructure or augmenting existing automation. Best, Homen"
    },
    @{
        Name = "Leigh Obery (Foundational AI Engineer)"
        Tier = 1
        URL = "https://www.linkedin.com/messaging/thread/2-Y2NkNTdjYmItYjE5Yy00NTI1LWIwZmItNTZlNjYxMjUwYjE2XzEwMA==/"
        Draft = "Hi Leigh, a foundational AI role at an early-stage startup with high ownership is interesting. Could you share more about what the company is building? My sweet spot is agent infrastructure -- making AI tool calls reliable, bounded, and auditable at production scale. I've built a 275-tool MCP server with progressive discovery, eval harnesses, and production reliability audits. If the startup is in the agentic AI space, I'd love to learn more."
    },
    @{
        Name = "Jim Campbell (Sequoia/a16z/GC/YC)"
        Tier = 1
        URL = "https://www.linkedin.com/messaging/"
        Draft = "Hi Jim, apologies for the delayed response -- I've been heads-down building. Your portfolio access [Sequoia, a16z, GC, YC] is exactly the ecosystem I'm targeting. I'm focused on agentic AI infrastructure -- specifically the reliability layer: making agent tool calls trustworthy, bounded, and observable at scale. I've built a 275-tool MCP server, production reliability audits, and eval harnesses. Are any of your portfolio companies hiring for agent infrastructure or AgentOps roles? Happy to chat about fit."
    },
    @{
        Name = "Meg Marks (AI/ML Tech Lead, 200k+ equity)"
        Tier = 1
        URL = "https://www.linkedin.com/messaging/thread/2-ZjNmNWM0YmItZGQ2MC00ODQ2LTkxMDgtYWM3MmUyZTRjMmJlXzEwMA==/"
        Draft = "Hi Meg, apologies for the late reply. I'm interested in the AI and ML Tech Lead role -- could you share more about the company and what they're building? My focus has been on agentic AI infrastructure and reliability engineering, with a background in banking/finance. The fully remote + equity structure is appealing. Happy to jump on a call if the company is in the agent/tool orchestration space."
    },
    @{
        Name = "Preston Topper (SR. AI Engineer)"
        Tier = 2
        URL = "https://www.linkedin.com/messaging/thread/2-MDQ5ODFmNTYtYjJmNy00ZTBlLWJlNTQtYzM4ZjUxNzgxNTgxXzEwMA==/"
        Draft = "Hi Preston, thanks for reaching out. The hands-on startup environment working directly with the founder sounds appealing. Could you share more about what the company is building and the team size? I'm strongest in agentic AI infrastructure -- production reliability, MCP servers, eval systems. If the role involves building agent-facing tooling, I'd be very interested."
    },
    @{
        Name = "Anita Sahagun (ML Engineer, Hot Startup)"
        Tier = 2
        URL = "https://www.linkedin.com/messaging/"
        Draft = "Hi Anita, thanks for the outreach. Could you share more about the startup and what the ML Engineer role involves? I'm focused on agentic AI infrastructure and production reliability -- happy to chat if there's fit."
    },
    @{
        Name = "Nitali Sharma (META)"
        Tier = 2
        URL = "https://www.linkedin.com/messaging/thread/2-MmYxNzRkZmUtNjllNy00MGE4LTllNzctYmJiNDEyZDllZmVlXzEwMA==/"
        Draft = "Hi Nitali, thanks for the follow-up and for checking -- I appreciate the diligence. I'm not actually at Meta, but I understand the confusion from my profile. I'm open to the right opportunities in agentic AI infrastructure. If you have roles in that space, I'd be happy to discuss."
    },
    @{
        Name = "Crew Weingard (AI Engineer, Fortune 500)"
        Tier = 2
        URL = "https://www.linkedin.com/messaging/"
        Draft = "Hi Crew, thanks for reaching out. Could you share more about the Fortune 500 client and the scope of the AI Engineer contract? I'm primarily looking for full-time roles in agentic AI infrastructure, but I'm open to discussing if the project is substantial and in the agent/tool reliability space."
    },
    @{
        Name = "Corrin Covington (AI Engineer, LexisNexis)"
        Tier = 2
        URL = "https://www.linkedin.com/messaging/"
        Draft = "Hi Corrin, thanks for thinking of me. LexisNexis has interesting data challenges. Could you share more about the AI work -- is it NLP/search focused or more on the agentic automation side? I'm primarily seeking full-time roles but happy to learn more."
    },
    @{
        Name = "Laura Masterson (AI Application Developer)"
        Tier = 2
        URL = "https://www.linkedin.com/messaging/"
        Draft = "Hi Laura, thanks for reaching out. The comp range is below my target -- I'm focused on senior agentic AI infrastructure roles in the 170K-280K range. If your client has roles at that level, I'd be happy to discuss. Best, Homen"
    },
    @{
        Name = "Enoch Cheng (AI Engineer, Edtech)"
        Tier = 2
        URL = "https://www.linkedin.com/messaging/thread/2-MDExM2YzY2ItNmU3OC00OTQyLTkwMTAtYmVhNGFjNjcwMmZmXzEwMA==/"
        Draft = "Hi Enoch, thanks for the outreach. The intelligent learning platform concept is interesting. Could you share more about the AI stack -- are they building with agent frameworks, or is this more traditional ML/NLP? My expertise is in agentic AI infrastructure. Happy to explore if there's alignment."
    },
    @{
        Name = "Heath Hamaguchi (Senior Full Stack Engineer)"
        Tier = 2
        URL = "https://www.linkedin.com/messaging/"
        Draft = "Hi Heath, thanks for reaching out. I'm primarily focused on agentic AI infrastructure roles rather than general full-stack positions. If you come across roles specifically in agent reliability, MCP engineering, or AI tool orchestration, I'd love to hear about them."
    },
    @{
        Name = "Josh Pierce (GenAI Engineer, AT&T)"
        Tier = 2
        URL = "https://www.linkedin.com/messaging/"
        Draft = "Hi Josh, thanks for the outreach. AT&T's scale is interesting for GenAI deployment. Could you share more about what the team is building -- is this customer-facing agent systems, internal automation, or infrastructure? I'm strongest in agent reliability and tool orchestration. Happy to discuss."
    }
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LinkedIn Reply Sender — 16 Drafts" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "For each recruiter:" -ForegroundColor Yellow
Write-Host "  1. Draft reply is copied to your clipboard" -ForegroundColor Yellow
Write-Host "  2. LinkedIn thread opens in your browser" -ForegroundColor Yellow
Write-Host "  3. Click the message box, Ctrl+V to paste" -ForegroundColor Yellow
Write-Host "  4. Review, send, then press Enter here for next" -ForegroundColor Yellow
Write-Host ""

$sent = 0
$skipped = 0

foreach ($r in $replies) {
    $tierLabel = if ($r.Tier -eq 1) { "[TIER 1 - HIGH PRIORITY]" } else { "[TIER 2 - REPLY THIS WEEK]" }
    $tierColor = if ($r.Tier -eq 1) { "Red" } else { "DarkYellow" }

    Write-Host "----------------------------------------" -ForegroundColor DarkGray
    Write-Host "$tierLabel $($r.Name)" -ForegroundColor $tierColor
    Write-Host ""
    Write-Host "Draft:" -ForegroundColor Gray
    Write-Host $r.Draft -ForegroundColor White
    Write-Host ""

    $action = Read-Host "Press ENTER to copy & open, 's' to skip, 'q' to quit"

    if ($action -eq 'q') {
        Write-Host "Stopped. Sent: $sent, Skipped: $skipped, Remaining: $($replies.Count - $sent - $skipped)" -ForegroundColor Cyan
        break
    }
    if ($action -eq 's') {
        $skipped++
        Write-Host "  Skipped." -ForegroundColor DarkGray
        continue
    }

    # Copy draft to clipboard
    Set-Clipboard -Value $r.Draft
    Write-Host "  Copied to clipboard!" -ForegroundColor Green

    # Open LinkedIn thread
    Start-Process $r.URL
    Write-Host "  Opened LinkedIn thread." -ForegroundColor Green

    # Wait for user to paste and send
    Read-Host "  Press ENTER after you've sent the reply"
    $sent++
    Write-Host "  Done! ($sent sent)" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Complete! Sent: $sent | Skipped: $skipped" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
