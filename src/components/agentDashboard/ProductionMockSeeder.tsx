import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { productionMocks } from "../../../agents/data/productionMocks";

interface ProductionMockSeederProps {
  documentId?: Id<"documents">;
  onSeeded?: (timelineId: Id<"agentTimelines">) => void;
}

export function ProductionMockSeeder({ documentId, onSeeded }: ProductionMockSeederProps) {
  const [selectedMock, setSelectedMock] = useState<string>("");
  const [isSeeding, setIsSeeding] = useState(false);
  const [lastResult, setLastResult] = useState<string>("");

  const seedMock = useAction(api.agents.seedProductionMocks.seedMock);
  const seedAllMocks = useAction(api.agents.seedProductionMocks.seedAllMocks);

  const handleSeedSingle = async () => {
    if (!documentId || !selectedMock) return;
    
    setIsSeeding(true);
    setLastResult("");
    try {
      const result = await seedMock({ documentId, mockId: selectedMock });
      setLastResult(`✅ Seeded "${productionMocks.find(m => m.timelineId === selectedMock)?.label}" with ${result.taskCount} tasks`);
      if (onSeeded) onSeeded(result.timelineId);
    } catch (err) {
      setLastResult(`❌ Error: ${(err as Error).message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSeedAll = async () => {
    if (!documentId) return;
    
    setIsSeeding(true);
    setLastResult("");
    try {
      const results = await seedAllMocks({ documentId });
      setLastResult(`✅ Seeded ${results.length} timelines:\n${results.map(r => `  • ${r.label} (${r.taskCount} tasks)`).join('\n')}`);
      if (onSeeded && results.length > 0) onSeeded(results[0].timelineId);
    } catch (err) {
      setLastResult(`❌ Error: ${(err as Error).message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="production-mock-seeder" style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', backgroundColor: '#f9fafb' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>🎬 Production Mock Scenarios</h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
          Select Scenario:
        </label>
        <select
          value={selectedMock}
          onChange={(e) => setSelectedMock(e.target.value)}
          disabled={isSeeding || !documentId}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
          }}
        >
          <option value="">-- Choose a scenario --</option>
          {productionMocks.map((mock) => (
            <option key={mock.timelineId} value={mock.timelineId}>
              {mock.label} ({mock.mode} • {mock.coordination} • {mock.tasks.length} tasks)
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={handleSeedSingle}
          disabled={isSeeding || !documentId || !selectedMock}
          style={{
            flex: 1,
            padding: '0.5rem 1rem',
            backgroundColor: selectedMock && !isSeeding ? '#6366F1' : '#d1d5db',
            color: '#fff',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: selectedMock && !isSeeding ? 'pointer' : 'not-allowed',
          }}
        >
          {isSeeding ? '⏳ Seeding...' : '🚀 Seed Selected'}
        </button>
        
        <button
          onClick={handleSeedAll}
          disabled={isSeeding || !documentId}
          style={{
            flex: 1,
            padding: '0.5rem 1rem',
            backgroundColor: !isSeeding && documentId ? '#10B981' : '#d1d5db',
            color: '#fff',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: !isSeeding && documentId ? 'pointer' : 'not-allowed',
          }}
        >
          {isSeeding ? '⏳ Seeding...' : '🎯 Seed All ({productionMocks.length})'}
        </button>
      </div>

      {!documentId && (
        <div style={{ padding: '0.75rem', backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
          ⚠️ Please select or create a document first
        </div>
      )}

      {lastResult && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: lastResult.startsWith('✅') ? '#D1FAE5' : '#FEE2E2',
          border: `1px solid ${lastResult.startsWith('✅') ? '#6EE7B7' : '#FCA5A5'}`,
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          whiteSpace: 'pre-wrap',
        }}>
          {lastResult}
        </div>
      )}

      <details style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 500, marginBottom: '0.5rem' }}>
          📋 Available Scenarios ({productionMocks.length})
        </summary>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          {productionMocks.map((mock) => (
            <li key={mock.timelineId} style={{ marginBottom: '0.5rem' }}>
              <strong>{mock.label}</strong>
              <div style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                {mock.goal}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                Mode: {mock.mode} • Coordination: {mock.coordination} • Tasks: {mock.tasks.length} • Links: {mock.links.length}
              </div>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

