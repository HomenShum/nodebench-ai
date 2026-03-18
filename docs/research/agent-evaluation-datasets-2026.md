# Agent Evaluation Datasets & Frameworks Research (January 2026)

Comprehensive research on open-source datasets, benchmarks, and evaluation frameworks for testing AI agents against ground truth, evaluating agent steps and outputs.

---

## Executive Summary

The 2026 agent evaluation landscape has matured significantly, with major players (Anthropic, Google, OpenAI, LangChain, Cursor, Manus) converging on key patterns:

1. **Trajectory-based evaluation** - Not just final answers, but agent steps and tool selections
2. **Ground truth datasets** - Curated examples with expected outputs/behaviors
3. **LLM-as-a-Judge** - Using frontier models to evaluate other models
4. **Dynamic context discovery** - Token-efficient approaches to context management
5. **Multi-turn evaluation** - Semantic intent, outcomes, and trajectory analysis

---

## 1. Open Source Ground Truth Datasets

### 1.1 FACTS Grounding (Google DeepMind)

**Source:** [FACTS Grounding Blog Post](https://deepmind.google/blog/facts-grounding-a-new-benchmark-for-evaluating-the-factuality-of-large-language-models/)

**Purpose:** Factuality evaluation with document grounding

**Dataset Details:**
- 1,719 examples total
- 860 public examples (released for community use)
- 859 private examples (held out for leaderboard integrity)
- Each example includes: document, system instruction, user request

**Evaluation Method:**
- Uses three frontier LLM judges: Gemini 1.5 Pro, GPT-4o, Claude 3.5 Sonnet
- Two-stage evaluation:
  1. Eligibility check (response addresses request)
  2. Factual accuracy (grounded in document, no hallucinations)

**Key Insight:** FACTS Score metric - Gemini 3 Pro leads with 68.8%, showing 55% error reduction vs 2.5 Pro on search tasks.

---

### 1.2 DeepSearchQA (Google)

**Source:** [Deep Research Agent Blog](https://blog.google/technology/developers/deep-research-agent-gemini-api/)

**Purpose:** Agent search task benchmark with multi-step reasoning

**Dataset Details:**
- 200+ prompt subset for public evaluation
- Diagnostic tool for "thinking time" benefits
- Measures pass@1 vs pass@8 (parallel trajectory exploration)

**Key Features:**
- Released dataset, leaderboard, and starter Colab
- Technical report with methodology

---

### 1.3 AgentBench (THUDM - ICLR'24)

**Source:** [GitHub - THUDM/AgentBench](https://github.com/THUDM/AgentBench)

**Purpose:** Comprehensive benchmark for LLM-as-Agent across diverse environments

**Docker Images Available:**
- `longinyu/agentbench-ltp` - Long-term planning
- `longinyu/agentbench-webshop` - Web shopping tasks
- `longinyu/agentbench-mind2web` - Web navigation
- `longinyu/agentbench-card_game` - Game playing
- `longinyu/agentbench-alfworld` - Interactive fiction

**Key Insight:** First benchmark designed to evaluate LLM-as-Agent across spectrum of environments.

---

### 1.4 AgentTrek

**Source:** [AgentTrek Website](https://agenttrek.github.io/)

**Purpose:** Large-scale multimodal agent trajectory dataset from web tutorials

**Dataset Types:**
- **Text-based Trajectories:** Step-by-step instructions + HTML observations
- **Visual-based Trajectories:** Screenshots + actions

**Evaluation Targets:**
- VLM models on Mind2Web and ScreenSpot
- LLM models on WebArena

**Key Insight:** Bridges the gap between tutorial-style instructions and agent execution.

---

### 1.5 SWE-agent-trajectories (Hugging Face)

**Source:** [Hugging Face Dataset](https://huggingface.co/datasets/nebius/SWE-agent-trajectories)

**Purpose:** Code agent trajectories for software engineering tasks

**Collection Methodology:**
1. Collect issue-resolution instances (SWE-bench style)
2. Generate trajectories for solving collected issues

**Key Insight:** Provides ground truth for code agent step-by-step execution.

---

### 1.6 OpenCUA / AgentNet Dataset

**Source:** [Open Source Announcement](https://eu.36kr.com/en/p/3422013601860997)

**Purpose:** Computer-using tasks across operating systems

**Dataset Details:**
- 22,625 manually annotated tasks
- ~12,000 Windows tasks
- ~5,000 macOS tasks
- ~5,000 Ubuntu tasks
- Screen resolutions: 720p to 4K
- Average trajectory: 18.6 steps

**Key Features:**
- Desktop-level trajectory dataset
- Authenticity, complexity, diversity, multi-modality

---

### 1.7 GAIA Benchmark

**Source:** [GAIA Benchmark Guide](https://www.chatbench.org/gaia-benchmark-for-autonomous-ai-agents/)

**Purpose:** Real-world multi-step task evaluation for General AI Assistants

**Developers:** Meta AI, Hugging Face, AutoGPT team

**Key Results:**
- Manus AI outperformed OpenAI Deep Research by 10%+ in some categories
- Tests reasoning, tool usage, and automation capabilities
- Multiple difficulty levels

---

### 1.8 SWE-bench Verified

**Source:** [SWE-bench Website](https://www.vals.ai/benchmarks/swebench)

**Purpose:** Software engineering task evaluation

**Dataset Details:**
- 500 human-validated test cases
- GitHub issue resolution from popular Python repos
- Released by OpenAI (August 2024)

**Leaderboard (2026):**
1. Gemini 3 Flash: 78%
2. GPT 5.2: 75.40%
3. Claude Opus 4.5: 74.60%

---

### 1.9 Terminal-Bench

**Purpose:** Terminal/CLI task evaluation

**Key Results:**
- Best AI tools achieve ~60% overall accuracy
- Easy tasks: 65% accuracy
- Hard tasks: 16% accuracy
- Claude Opus 4.5 leads with 59.3%

---

## 2. Evaluation Frameworks

### 2.1 OpenAI Evals

**Source:** [GitHub - openai/evals](https://github.com/openai/evals)

**Key Features:**
- Open-source framework + benchmark registry
- YAML-defined evals
- Large library covering QA, reasoning, code generation, content filtering
- CLI (`oaieval`) or API execution
- Automatic scoring (accuracy, multiple choice, pass/fail)

**Agent Evals:** [Agent Evals Documentation](https://platform.openai.com/docs/guides/agent-evals)
- Datasets, graders, and evaluation run tracking
- External model comparison
- Large-scale evaluation support

---

### 2.2 LangSmith

**Source:** [LangSmith Evaluation Docs](https://docs.langchain.com/langsmith/evaluation)

**Key Features:**
- Datasets as ground truth collections
- `client.create_dataset` and `client.create_examples` API
- Debug traces saved to datasets
- Offline and online evaluation modes

**Agent-Specific Features:**
- `intermediate_steps` comparison against ground truth
- `expected_steps` in dataset for trajectory evaluation
- `reference_key` for QA ground truth

**Multi-turn Evals (New 2026):**
- Semantic intent measurement
- Semantic outcomes (task completion + why not)
- Agent trajectory analysis (tool calls, decisions)

**Source:** [Multi-turn Evals Blog](https://blog.langchain.com/insights-agent-multiturn-evals-langsmith/)

---

### 2.3 Ragas

**Source:** [Ragas Documentation](https://docs.ragas.io/)

**Key Features:**
- Reference-free evaluation (no ground truth needed for most metrics)
- Only `context_recall` requires human-annotated ground truth
- Synthetic test generation (up to 90% reduction in manual curation)

**Core Metrics:**
- `context_precision` - Retrieval quality
- `context_recall` - Ground truth coverage
- `faithfulness` - Answer grounded in context
- `answer_relevancy` - Response addresses query

**Agent Task Accuracy:**
- Tool call validation
- RAG and text-to-SQL evaluation
- Actual vs ground truth comparison

**Integrations:** Langfuse, Amazon Bedrock, LlamaIndex

---

### 2.4 Arize Phoenix

**Source:** [Arize Phoenix](https://arize.com/phoenix/)

**Key Features:**
- Open-source observability and evaluation SDK
- OpenTelemetry tracing via OpenInference
- LLM-as-judge evaluation

**Auto-instrumentors for:**
- LangChain
- LlamaIndex
- DSPy
- OpenAI Agents

---

### 2.5 Promptfoo

**Source:** [Promptfoo](https://promptfoo.dev/)

**Key Features:**
- Declarative YAML configuration
- Assertion types from string matching to LLM-as-judge rubrics
- Side-by-side output matrix
- Multi-provider support (OpenAI, Anthropic, Google, HuggingFace, custom)

**Note:** Anthropic uses a version of Promptfoo for many product evals.

---

### 2.6 Inspect (UK AI Safety Institute)

**Source:** [Inspect Website](https://inspect.aisi.org.uk/)

**Key Features:**
- Ready-to-run evaluations for popular LLM benchmarks
- Agent Bridge for 3rd party frameworks

**Framework Support:**
- OpenAI Agents SDK
- LangChain
- Pydantic AI

---

### 2.7 Opik (Comet)

**Source:** [Opik Trajectory Evaluation](https://www.comet.com/docs/opik/evaluation/evaluate_agent_trajectory)

**Key Features:**
- Trajectory evaluation (not just final output)
- Tool selection error detection
- Reasoning path optimization
- Pre-production behavioral analysis

**Key Insight:** "Evaluating agents requires more than checking the final output. You need to assess the trajectory — the steps your agent takes."

---

### 2.8 Braintrust

**Key Features:**
- Combines offline evaluation with production observability
- `autoevals` library with pre-built scorers
- Factuality, relevance, and other common dimensions

---

### 2.9 Langfuse

**Source:** [Langfuse Evaluation Guide](https://langfuse.com/guides/cookbook/example_pydantic_ai_mcp_agent_evaluation)

**Key Features:**
- Tracing for OpenAI agent SDK
- Online and offline evaluation
- Integration with Hugging Face Datasets

---

## 3. Industry Approaches & Best Practices

### 3.1 Anthropic's Approach

**Evals Philosophy:** [Demystifying Evals for AI Agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

**Key Practices:**
- Uses Promptfoo variant for product evals
- Developed open-source framework for automated alignment auditing
- Generated 300,000+ queries testing value trade-offs
- Tested models from Anthropic, OpenAI, Google DeepMind, xAI

**Safety Evaluations:**
- Novel "capacity for sabotage" evaluations
- Tests for sandbagging ML experiments and research decisions
- Zero-shot prompted monitors for detection

**Task Horizons:**
- Claude achieves 50% success on tasks up to 3.5 hours
- High reliability on even longer tasks

---

### 3.2 Google's Approach

**FACTS Benchmark Suite:** [Latest Blog](https://deepmind.google/blog/facts-benchmark-suite-systematically-evaluating-the-factuality-of-large-language-models/)

**Key Practices:**
- Three-judge LLM evaluation (Gemini, GPT, Claude)
- Public/private split to prevent contamination
- FACTS Score as primary metric

**WebVoyager Benchmark:**
- Project Mariner achieved 83.5% on real-world web tasks

---

### 3.3 Cursor's Dynamic Context Discovery

**Source:** [Cursor Blog](https://cursor.com/blog/dynamic-context-discovery)

**Key Insight:** 46.9% token reduction by loading MCP tools on-demand

**Five Techniques:**
1. **Tool outputs to files** - Large JSON responses written to files, read with `tail`
2. **Chat history files during summarization** - Restore missing info dynamically
3. **Agent Skills standard** - Domain-specific skills retrieved via grep/semantic search
4. **Selective MCP loading** - Only tool names upfront, full details on-demand
5. **Terminal sessions as files** - Terminal output preserved for later retrieval

**Tradeoffs:**
- Additional latency for context discovery tool calls
- Requires models capable of recognizing needed context
- May not help when most context is actually needed

---

### 3.4 Manus AI's Approach

**Key Achievement:** State-of-the-art on GAIA benchmark, outperforming OpenAI Deep Research

**Architecture:**
- Claude as primary LLM
- Context length managed by specialized agents for different aspects
- Mitigates context overflow on complex multi-step tasks

**Benchmark Performance:**
- First on Meta's Remote Labour Index
- 18.6 average steps per trajectory in internal benchmarks

---

### 3.5 State of Agent Engineering (LangChain)

**Source:** [State of Agent Engineering](https://www.langchain.com/state-of-agent-engineering)

**Key Statistics:**
- 89% of respondents have implemented observability
- 52.4% run offline evaluations on test sets
- Observability outpaces eval adoption

---

## 4. Key Evaluation Metrics (2026 Consensus)

### 4.1 Trajectory Evaluation

**From ICLR Blogposts 2026:** [A Hitchhiker's Guide to Agent Evaluation](https://iclr-blogposts.github.io/2026/blog/2026/agent-evaluation/)

**Key Patterns:**
- **Intermediate checkpoints** - Partial credit for completing subtasks
- **LLM-as-a-Judge** - Large model scores multi-step output
- **Agent-as-a-Judge** - Multiple AI agents vote on success (Zhuge et al. 2024)

---

### 4.2 Groundedness Metrics

**Context Quality:**
- Context precision
- Context recall (requires ground truth)

**Answer Quality:**
- Faithfulness (grounded in context)
- Answer relevancy (addresses query)

---

### 4.3 Multi-turn Metrics

**LangSmith Dimensions:**
- Semantic intent
- Semantic outcomes
- Agent trajectory

---

### 4.4 Token Efficiency

**Cursor Reference:**
- 46.9% reduction with dynamic MCP loading
- Measured via A/B testing

---

## 5. Recommended Integration for NodeBench

### Phase 1: Core Eval Alignment

1. **Adopt FACTS Grounding public set**
   - Download 860 public examples
   - Adapt for persona-specific groundedness scoring
   - Use multi-judge pattern (devstral + gemini-3-flash)

2. **Implement LangSmith `intermediate_steps` pattern**
   - Add `expected_steps` to ground truth scenarios
   - Compare agent trajectory against expected tool calls

### Phase 2: Agent Step Testing

1. **Create AgentBench-style test cases**
   - Define persona-specific environments
   - Build task specifications with checkpoints

2. **Build SWE-bench-like scenarios**
   - Tool-calling validation cases
   - Expected tool sequence verification

### Phase 3: Production Monitoring

1. **Integrate Ragas metrics**
   - Reference-free groundedness for production
   - Context precision/recall for RAG quality

2. **Add trajectory checkpoints (Opik-style)**
   - Tool selection tracking
   - Reasoning path analysis

### Phase 4: Token Efficiency Measurement

1. **Implement Cursor's patterns**
   - Resource_link for large outputs
   - Selective schema hydration
   - Measure token reduction vs baseline

2. **A/B testing framework**
   - Static context vs dynamic discovery
   - Track quality AND efficiency metrics

---

## 6. Dataset Download Links

| Dataset | Download Link |
|---------|---------------|
| FACTS Grounding | [Google AI GitHub](https://github.com/google-deepmind/facts-grounding) |
| AgentBench | [THUDM GitHub](https://github.com/THUDM/AgentBench) |
| SWE-agent-trajectories | [Hugging Face](https://huggingface.co/datasets/nebius/SWE-agent-trajectories) |
| SWE-bench Verified | [OpenAI Release](https://github.com/openai/swe-bench-verified) |
| GAIA | [Hugging Face](https://huggingface.co/datasets/gaia-benchmark/GAIA) |

---

## 7. References

### Research Papers & Blog Posts

- [Anthropic: Demystifying Evals for AI Agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [Google: FACTS Grounding Benchmark](https://deepmind.google/blog/facts-grounding-a-new-benchmark-for-evaluating-the-factuality-of-large-language-models/)
- [Cursor: Dynamic Context Discovery](https://cursor.com/blog/dynamic-context-discovery)
- [LangChain: State of Agent Engineering](https://www.langchain.com/state-of-agent-engineering)
- [ICLR 2026: A Hitchhiker's Guide to Agent Evaluation](https://iclr-blogposts.github.io/2026/blog/2026/agent-evaluation/)
- [InfoQ: Cursor Dynamic Context Discovery](https://www.infoq.com/news/2026/01/cursor-dynamic-context-discovery/)

### Framework Documentation

- [OpenAI Evals](https://github.com/openai/evals)
- [LangSmith Evaluation](https://docs.langchain.com/langsmith/evaluation)
- [Ragas Documentation](https://docs.ragas.io/)
- [Inspect (UK AISI)](https://inspect.aisi.org.uk/)
- [Opik Trajectory Evaluation](https://www.comet.com/docs/opik/evaluation/evaluate_agent_trajectory)

---

*Research compiled: January 19, 2026*
*Sources: Web search across Anthropic, Google, OpenAI, LangChain, Cursor, Manus AI documentation and announcements*