# Demo Video Variants — Tradeoff Analysis

## Quick Reference

| Dimension | Variant A: 30-Second Hook | Variant B: Founder Story | Variant C: Side-by-Side |
|-----------|--------------------------|--------------------------|-------------------------|
| **Length** | 42s | 2:00 | 58s |
| **Narration clips** | 2 | 9 | 6 |
| **Speech duration** | ~7s | ~65s | ~34s |
| **Pattern** | TikTok / Manus | Notion / Superhuman | Perplexity / Linear |
| **Primary channel** | Twitter, LinkedIn, Reels | Product Hunt, landing page, investor decks | Paid ads, retargeting, landing page |
| **Vertical (9:16) cut** | Yes — designed for it | No — too complex for vertical | Possible — would need re-framing |

---

## Dimension 1: Viral Potential

| Variant | Score | Rationale |
|---------|-------|-----------|
| **A** | 9/10 | Optimized for sharing. The streaming Decision Memo is a "holy shit" moment that screenshots well. Short enough to rewatch. The TikTok/Manus pattern works because the product output IS the content — no middleman narration diluting the impact. Risk: if the viewer doesn't understand what they're seeing, they scroll past. |
| **B** | 5/10 | Too long for organic sharing. Nobody shares a 2-minute video on Twitter. It gets SENT — forwarded in DMs, embedded in pitch decks, linked in Product Hunt launches. That's a different kind of viral: deliberate recommendation, not impulse sharing. |
| **C** | 7/10 | The before/after contrast is inherently shareable — people love transformation content. The chaos-to-clarity transition is a 3-second hook. But the ad framing makes it feel produced rather than organic, which reduces share impulse. |

**Winner: A** (pure viral), **B** (recommendation viral)

---

## Dimension 2: Depth of Understanding

| Variant | Score | Rationale |
|---------|-------|-----------|
| **A** | 3/10 | The viewer sees the product work but doesn't understand WHY or HOW. They know "you ask a question and get a decision packet" but not the agent orchestration, the daily loop, or the MCP infrastructure. This is intentional — depth is traded for impact. |
| **B** | 9/10 | Full loop demonstrated: morning check -> actions -> agent dispatch -> completion. The viewer understands the daily workflow, the agent approval model, and the intelligence layer. After watching, they can explain NodeBench to someone else. |
| **C** | 6/10 | Three features shown with immediate payoff. The viewer understands the WHAT (decisions, agents, intelligence) but not the HOW (daily loop, approval model, task dispatch). Enough to convert, not enough to evangelize. |

**Winner: B** by a wide margin.

---

## Dimension 3: Shareability

| Variant | Score | Rationale |
|---------|-------|-----------|
| **A** | 9/10 | Perfect for "look at this" sharing. The Decision Memo screenshot at 0:32 is the viral artifact. The video itself loops well on Twitter/LinkedIn. Vertical cut works for Instagram/TikTok. |
| **B** | 6/10 | Shareable as a recommendation ("you should watch this"), not as a clip. The "Your morning took four minutes" line is quotable. Good for embedding on landing pages where visitors are already interested. |
| **C** | 7/10 | The before/after split-screen is a strong thumbnail. The chaos-to-clarity transition GIFs well. But the ad-like structure makes people share it as "here's an ad I liked" rather than "look at this product." |

**Winner: A** for organic, **C** for paid amplification.

---

## Dimension 4: Conversion (Visitor -> Signup)

| Variant | Score | Rationale |
|---------|-------|-----------|
| **A** | 6/10 | Creates desire ("I want that") but doesn't explain enough to overcome hesitation. Works when the viewer is already primed (saw a tweet, heard about it). Poor cold-conversion — needs supporting context. |
| **B** | 8/10 | Builds enough understanding that the viewer can imagine themselves using it. The "4-minute morning" is a concrete benefit they can evaluate. The social proof scene adds credibility. Best for landing page hero where the next action is a signup form. |
| **C** | 9/10 | Designed for conversion. Problem-solution-proof-CTA is the canonical ad structure. The "Free to start. No credit card." CTA removes final friction. A/B testable for continuous optimization. Best for paid traffic where you're paying per impression. |

**Winner: C** for paid, **B** for organic landing page.

---

## Dimension 5: Production Effort

| Variant | Score (lower = harder) | Rationale |
|---------|----------------------|-----------|
| **A** | 7/10 (easiest) | Needs: 2 narration clips, 1 title card, 3-4 UI screenshots, the streaming animation (hardest part). The streaming Decision Memo effect requires either screen recording of a real agent response or frame-by-frame animation. Everything else is simple. |
| **B** | 3/10 (hardest) | Needs: 9 narration clips, 4 chaos mockup screenshots (Slack/email/GitHub/Sheets), 8+ UI screenshots across 4 routes, the collapse/expand transition animation, social proof info card, final montage compositing. Most frames and most complex editing. |
| **C** | 5/10 (moderate) | Needs: 6 narration clips, the 2x2 split-screen composite (4 mockups), the collapse-expand transition, 5-6 UI screenshots, label overlays, 3-frame montage. The transition effect is the hardest production element. |

**Winner: A** for speed-to-ship.

---

## Dimension 6: Reusability

| Variant | Score | Rationale |
|---------|-------|-----------|
| **A** | 8/10 | The 42-second format works everywhere: Twitter video, LinkedIn native, Instagram Reels (vertical cut), TikTok, landing page inline, email embed. One asset, many placements. |
| **B** | 5/10 | Too long for social. Works for: landing page hero, Product Hunt launch, investor deck embed, sales call opener. Limited placement options but high value per placement. |
| **C** | 9/10 | The most versatile. Full 58s for landing page. Cut to 30s (Scenes 1-3 + CTA) for paid ads. Individual feature hits (Scenes 4-6) work as standalone 10-second clips. The modular structure means one production yields 4+ usable assets. |

**Winner: C** for total asset yield.

---

## Strategic Recommendation

### Ship Order: A -> C -> B

**1. Ship Variant A first (1-2 days production)**
- Fastest to produce.
- Tests the core hypothesis: is the streaming Decision Memo visually compelling enough to generate shares?
- If A gets traction on Twitter/LinkedIn, you know the product's visual output is the distribution engine.
- If A doesn't get traction, the problem isn't the video — it's that the product output needs to be more visually striking.

**2. Ship Variant C second (3-4 days production)**
- Use for paid acquisition once A proves organic interest.
- The modular structure yields multiple assets from one production run.
- A/B test the 30-second cut vs 58-second full version.
- The before/after contrast works as a landing page hero if B is too long.

**3. Ship Variant B last (5-7 days production)**
- Highest production effort, highest depth.
- Use for Product Hunt launch, landing page hero, and investor meetings.
- Only invest in B after A and C validate that people care about the product.

### Decision Framework

| If you need... | Use... |
|----------------|--------|
| Twitter/LinkedIn buzz in 48 hours | Variant A |
| Product Hunt launch video | Variant B |
| Landing page hero (above the fold) | Variant B (full) or C (if page has supporting copy) |
| Paid ads (Meta, LinkedIn Ads, Google) | Variant C |
| Investor deck embed | Variant B |
| Cold outreach email embed | Variant A |
| Retargeting ads | Variant C (30-second cut) |
| Internal team alignment | Variant B |
| Feature-specific marketing | Variant C (individual scenes) |

### What the Original Video Lacks

The existing 3:31 video passes quality metrics but misses three viral mechanics:

1. **No dopamine spike** — The original has a consistent, even pace. Viral content has CONTRAST: tension-release, before-after, slow-fast. All three variants introduce contrast mechanics.

2. **No screenshot moment** — The original has no single frame that communicates the value prop in a still image. Variant A's Decision Memo frame and Variant C's before/after split are designed to be screenshotted and shared without the video.

3. **No loop structure** — The original is linear: watch once, understand, done. Variant A is designed to be rewatched (42s loops on Twitter). Variant C's rapid feature hits reward repeat viewing. Only B is linear like the original, but it earns it with emotional arc.

---

## Audio Asset Summary

| Variant | Clips | Total Speech | New Audio Required |
|---------|-------|-------------|-------------------|
| A | 2 | ~7s | 2 new clips |
| B | 9 | ~65s | 9 new clips |
| C | 6 | ~34s | 6 new clips |
| **Total** | **17** | **~106s** | **17 new ElevenLabs generations** |

All clips use Eric voice (ID: `cjVigY5qzO86Huf0OWal`) with the same settings as the original 20 clips.
