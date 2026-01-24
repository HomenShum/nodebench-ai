import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'NodeBench AI - Benchmark AI Research Agents';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          backgroundImage: 'radial-gradient(circle at 25% 25%, #1e3a5f 0%, transparent 50%), radial-gradient(circle at 75% 75%, #1e3a5f 0%, transparent 50%)',
        }}
      >
        {/* Logo / Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            borderRadius: 24,
            backgroundColor: '#3b82f6',
            marginBottom: 32,
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
            <line x1="12" y1="8" x2="12" y2="9" />
            <line x1="15" y1="12" x2="16" y2="12" />
            <line x1="12" y1="15" x2="12" y2="16" />
            <line x1="8" y1="12" x2="9" y2="12" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: 64,
            fontWeight: 700,
            color: 'white',
            marginBottom: 16,
            letterSpacing: '-0.02em',
          }}
        >
          NodeBench AI
        </div>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            color: '#94a3b8',
            marginBottom: 48,
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          Benchmark AI Research Agents on Knowledge Graphs
        </div>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: 32,
          }}
        >
          {['Node-Based Context', 'Agent Benchmarking', 'Research Workflows'].map((feature) => (
            <div
              key={feature}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                padding: '12px 24px',
                borderRadius: 9999,
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#3b82f6',
                }}
              />
              <span style={{ color: '#e2e8f0', fontSize: 18 }}>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
