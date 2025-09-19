export type AgentType = "orchestrator" | "main" | "leaf";

export type AgentNode = {
  id: string;
  name: string;
  agentType?: AgentType;
  startTime?: number;
  duration?: number;
  progress?: number;
  status?: "pending" | "running" | "complete" | "paused";
  outputSizeBytes?: number;
  dependencies?: string[];
  children?: AgentNode[];
};

export type AgentSystem = {
  orchestrator: AgentNode & { children: AgentNode[] };
  links?: Array<{ id?: string; source: string; target: string; type?: "e2e" | "s2s" | "s2e" | "e2s" }>;
};

export type AddTaskPayload = {
  parentId: string | null;
  name: string;
  startTimeSec: number;
  durationSec: number;
  dependencies: string[];
  assigneeId?: string;
  agentType?: AgentType;
};

// Helper to immutably add a new task node into AgentSystem based on AddTaskPayload
export function addTaskToAgentSystem(agentSystem: AgentSystem, payload: AddTaskPayload): AgentSystem {
  const makeId = (base: string) => `${base.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`;
  const newNode: AgentNode = {
    id: makeId(payload.name),
    name: payload.name,
    startTime: payload.startTimeSec,
    duration: payload.durationSec,
    progress: 0,
    status: "pending",
    dependencies: payload.dependencies,
    children: [],
    agentType: payload.agentType ?? "leaf",
  } as AgentNode & { agentType: AgentType } as AgentNode;
  (newNode as any).assignedAgentId = payload.assigneeId || null;

  type NodeWithChildren = AgentNode & { children: AgentNode[] };
  const clone = (n: AgentNode): NodeWithChildren => ({
    ...n,
    children: [...(n.children || []).map(clone)],
  });

  const addUnder = (n: NodeWithChildren, parentId: string): NodeWithChildren => {
    if (n.id === parentId) {
      const children = [...n.children, newNode];
      return { ...n, children };
    }
    return { ...n, children: n.children.map((c) => addUnder(c as NodeWithChildren, parentId)) };
  };

  const root = clone(agentSystem.orchestrator);
  const targetParentId = payload.parentId ?? root.id;
  const updated = addUnder(root, targetParentId);

  return { ...agentSystem, orchestrator: updated };
}

// Helper to add a dependency link between two tasks
export function addDependencyToAgentSystem(agentSystem: AgentSystem, sourceId: string, targetId: string): AgentSystem {
  const existingLinks = agentSystem.links || [];
  const linkExists = existingLinks.some(link => link.source === sourceId && link.target === targetId);
  
  if (linkExists) {
    return agentSystem; // Don't add duplicate links
  }

  const newLink = {
    id: `${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: "e2e" as const,
  };

  return {
    ...agentSystem,
    links: [...existingLinks, newLink],
  };
}
