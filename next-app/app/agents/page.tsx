import { AgentsClient } from './AgentsClient';

export const metadata = {
  title: 'Agents - NodeBench AI',
  description: 'AI agent interfaces for research, analysis, and automation',
};

/**
 * AgentsPage - Server Component wrapper for the Agents Hub
 *
 * This page uses the client/server component pattern:
 * 1. Server component provides metadata and static shell
 * 2. AgentsClient dynamically loads the Vite-based AgentsHub
 * 3. SSR disabled for the hub since it uses Convex reactive hooks
 *
 * The AgentsHub provides:
 * - Real-time agent status monitoring
 * - Command bar with /spawn syntax support
 * - Swarm visualization for parallel execution
 * - Human-in-the-loop approval queue
 * - Task history and telemetry
 */
export default function AgentsPage() {
  return <AgentsClient />;
}
