# LinkedIn 3-Post Thread: Automated UI QA with LLM-as-a-Judge

---

## Post 1 — The Signal

**Most UI QA systems fail not because the checks are wrong, but because the scoring is noisy.**

Over 91 rounds of building an automated QA pipeline for a 37-route React dashboard, I learned this the hard way. Here's what changed.

The setup: Playwright captures 148 screenshots (dark/light/mobile matrix) across every route. An LLM evaluates them. A rubric produces a score. Simple in theory. In practice, scores swung from 47 to 98 across consecutive runs — same code, same UI, different number.

The root cause wasn't the LLM. It was architecture.

**Two competing approaches to automated visual QA:**

1. **Regex-based filtering** — Write patterns to suppress false positives from the LLM's output. We wrote 120+ regex rules. Every time Gemini rephrased a known non-issue, we added another pattern. Classic whack-a-mole. Variance stayed high because the suppression layer was as unpredictable as the generation layer.

2. **Deterministic-first scoring** — Shift weight away from LLM judgment entirely. Make 60% of the score come from zero-variance Playwright checks (CLS, 404s, slow resources, mixed content, viewport meta). Let the LLM handle only what it's good at: classifying severity of genuine issues vs. design opinions vs. screenshot artifacts.

Approach 2 won. Not because the LLM got smarter, but because the architecture made the LLM's variance irrelevant to the final score.

The irony: 85 rounds of prompt-tuning and regex-writing produced marginal gains. The architectural shift — deterministic weighting + LLM-as-a-judge classification — collapsed variance in a single iteration.

Which approach does your QA pipeline lean on?

---

## Post 2 — The Analysis

**Here's the evidence from 91 iterations of an automated UI QA system.**

The pipeline: Playwright captures 148 screenshots across 37 routes (dark mode, light mode, mobile responsive). Gemini 2.0 Flash (temperature 0.1) evaluates each screenshot. A 3-layer rubric scores the results.

**Layer 1 — Deterministic (60% of score, zero variance):**
12 boolean Playwright checks. Pass or fail. No LLM involved.
- Console errors (excluding expected React dev warnings)
- CLS > 0.1 (after filtering React hydration shifts — these aren't real layout instability)
- HTTP 4xx/5xx responses (after filtering ERR_ABORTED on media files — browser cancellations aren't API failures)
- Slow resource loads > 3s
- Missing viewport meta tags
- Mixed content warnings

Two of these checks were permanently failing until we traced the root cause. ERR_ABORTED on .mp4 files was counting as API failures. CLS was measuring React hydration, not user-visible layout shift. Fixing the measurement was more impactful than fixing the UI.

**Layer 2 — Severity (30% of score, LLM-classified):**
Gemini classifies each visual issue into one of four buckets: genuine_bug, design_opinion, screenshot_artifact, mock_data. Only genuine_bug counts against the score. 25 design principles embedded as DESIGN_CONTEXT ground the classification so Gemini doesn't penalize intentional design choices.

9 hard regex filters still catch screenshot compression artifacts that even the LLM judge misclassifies — JPEG ringing near text edges, compression blocking on gradients. These are deterministic and narrow. They supplement the judge; they don't replace it.

**Layer 3 — Taste (10% of score, highest variance):**
Subjective polish assessment. Low weight because it's the least reproducible. Exists so the system can flag "technically correct but ugly" states.

**Result:** Score stabilized. Final: 100/100 after systematic iteration. The 60/30/10 weight split was the key decision — it made the score robust to LLM variance while still capturing genuine visual issues.

What's your split between deterministic and LLM-judged quality checks?

---

## Post 3 — The Agency

**If you're building automated QA with LLMs, here's what you can apply today.**

**1. Weight your rubric toward deterministic checks.**
Start at 60% deterministic, 30% LLM-classified, 10% subjective. Adjust from there. The goal: your score shouldn't change when the LLM rephrases the same observation differently. If re-running the same screenshot produces different scores, your deterministic weight is too low.

**2. Use the LLM as a classifier, not a scorer.**
Don't ask "rate this UI from 1-10." Ask "is this a genuine bug, a design opinion, a screenshot artifact, or expected mock data?" Classification is more stable than scoring because the output space is discrete. Temperature 0.1 helps. Grounding context (your design principles, your component library conventions) helps more.

**3. Audit your measurement layer before your UI layer.**
Two of our 12 Playwright checks were producing permanent false failures. ERR_ABORTED on browser-cancelled media loads isn't an API error. CLS during React hydration isn't layout instability. We spent rounds "fixing" UI that wasn't broken because the measurement was wrong. Trace from symptom to root cause. If the check is wrong, the fix is in the check.

**4. Keep a small, narrow regex layer for known LLM blind spots.**
9 patterns, not 120. JPEG compression artifacts near text edges. Gradient banding from screenshot compression. These are deterministic failure modes that even a well-prompted LLM judge misclassifies 30%+ of the time. Hard filters for hard problems. LLM classification for everything else.

**5. Capture the full responsive matrix.**
37 routes x 4 variants (dark/light/desktop/mobile) = 148 screenshots. Most visual bugs only appear in one variant. If you're only checking desktop dark mode, you're missing 75% of the surface area.

The meta-lesson: when your AI system is noisy, the fix is usually architectural, not prompt engineering. Move variance out of the scoring path. Make the deterministic layer carry the weight. Let the LLM do what it's good at — classification with grounding context — and nothing more.

Built this for NodeBench AI's dashboard QA. 91 rounds of iteration, mass-produced the hard way. What's your approach to keeping LLM-in-the-loop systems stable?
