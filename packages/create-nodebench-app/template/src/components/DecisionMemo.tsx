import { useState } from "react";

interface MemoData {
  title: string;
  context: string;
  options: string;
  recommendation: string;
  risks: string;
  nextSteps: string;
}

export function DecisionMemo() {
  const [memo, setMemo] = useState<MemoData>({
    title: "",
    context: "",
    options: "",
    recommendation: "",
    risks: "",
    nextSteps: "",
  });
  const [saved, setSaved] = useState(false);

  const update = (field: keyof MemoData, value: string) => {
    setMemo((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    // In production, this would call NodeBench's export_artifact_packet tool
    const markdown = `# Decision Memo: ${memo.title}

## Context
${memo.context}

## Options Considered
${memo.options}

## Recommendation
${memo.recommendation}

## Risks & Mitigations
${memo.risks}

## Next Steps
${memo.nextSteps}

---
*Generated with NodeBench Decision Intelligence*
*${new Date().toISOString().split("T")[0]}*
`;
    // Copy to clipboard
    navigator.clipboard.writeText(markdown).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const handleExport = () => {
    const markdown = `# Decision Memo: ${memo.title}\n\n## Context\n${memo.context}\n\n## Options\n${memo.options}\n\n## Recommendation\n${memo.recommendation}\n\n## Risks\n${memo.risks}\n\n## Next Steps\n${memo.nextSteps}\n`;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memo-${memo.title.toLowerCase().replace(/\s+/g, "-") || "untitled"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">Decision Memo</div>
        <div className="memo-section">
          <div className="memo-label">Title</div>
          <input
            className="input"
            placeholder="What decision are you making?"
            value={memo.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>

        <div className="memo-section">
          <div className="memo-label">Context</div>
          <textarea
            className="memo-content"
            placeholder="What's the situation? What triggered this decision?"
            value={memo.context}
            onChange={(e) => update("context", e.target.value)}
          />
        </div>

        <div className="memo-section">
          <div className="memo-label">Options Considered</div>
          <textarea
            className="memo-content"
            placeholder="What are the alternatives? List each with pros/cons."
            value={memo.options}
            onChange={(e) => update("options", e.target.value)}
          />
        </div>

        <div className="memo-section">
          <div className="memo-label">Recommendation</div>
          <textarea
            className="memo-content"
            placeholder="What do you recommend and why?"
            value={memo.recommendation}
            onChange={(e) => update("recommendation", e.target.value)}
          />
        </div>

        <div className="memo-section">
          <div className="memo-label">Risks & Mitigations</div>
          <textarea
            className="memo-content"
            placeholder="What could go wrong? How do you mitigate each risk?"
            value={memo.risks}
            onChange={(e) => update("risks", e.target.value)}
          />
        </div>

        <div className="memo-section">
          <div className="memo-label">Next Steps</div>
          <textarea
            className="memo-content"
            placeholder="What happens after this decision is made?"
            value={memo.nextSteps}
            onChange={(e) => update("nextSteps", e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn" onClick={handleSave}>
            {saved ? "Copied to clipboard!" : "Copy as Markdown"}
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>
            Export .md file
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">NodeBench MCP Tools for Decisions</div>
        <div className="result-item">
          <div className="result-body">
            <code>deep_sim_scenario({"{"} question: '...' {"}"})</code>
            <br />
            Simulate outcomes before deciding
          </div>
        </div>
        <div className="result-item">
          <div className="result-body">
            <code>export_artifact_packet({"{"} format: 'markdown' {"}"})</code>
            <br />
            Export structured memo for investors/team
          </div>
        </div>
        <div className="result-item">
          <div className="result-body">
            <code>founder_packet_validate({"{"} {"}"})</code>
            <br />
            Check for contradictions and completeness
          </div>
        </div>
      </div>
    </div>
  );
}
