export type ArtifactPacketType = "weekly_reset" | "pre_delegation" | "important_change";

export type ArtifactPacketPriority = "high" | "medium" | "low";

export type ArtifactPacketSeverity = "high" | "medium" | "low";

export interface ArtifactPacketCanonicalEntity {
  name: string;
  mission: string;
  wedge: string;
  companyState: string;
  foundingMode: string;
  identityConfidence: number;
}

export interface ArtifactPacketNearbyEntity {
  id: string;
  name: string;
  relationship: string;
  whyItMatters: string;
}

export interface ArtifactPacketContradiction {
  id: string;
  title: string;
  detail: string;
  severity: ArtifactPacketSeverity;
}

export interface ArtifactPacketEvidence {
  id: string;
  title: string;
  detail: string;
  source: string;
  pageIndex?: number;
}

export interface ArtifactPacketAction {
  id: string;
  label: string;
  whyNow: string;
  priority: ArtifactPacketPriority;
  linkedInitiativeId?: string;
}

export interface ArtifactPacketProvenance {
  generatedAt: string;
  sourceCount: number;
  triggerLabel: string;
}

export interface FounderArtifactPacket {
  packetId: string;
  packetType: ArtifactPacketType;
  audience: string;
  objective: string;
  canonicalEntity: ArtifactPacketCanonicalEntity;
  nearbyEntities: ArtifactPacketNearbyEntity[];
  whatChanged: string;
  contradictions: ArtifactPacketContradiction[];
  risks: string[];
  keyEvidence: ArtifactPacketEvidence[];
  operatingMemo: string;
  nextActions: ArtifactPacketAction[];
  recommendedFraming: string;
  tablesNeeded: string[];
  visualsSuggested: string[];
  provenance: ArtifactPacketProvenance;
  agentInstructions: string;
}

export interface FounderPacketCompanyInput {
  name: string;
  canonicalMission: string;
  wedge: string;
  companyState: string;
  foundingMode: string;
  identityConfidence: number;
}

export interface FounderPacketChangeInput {
  id: string;
  description: string;
  relativeTime?: string;
  timestamp?: string;
  type?: string;
  source?: string;
  linkedInitiativeId?: string;
}

export interface FounderPacketInterventionInput {
  id: string;
  title: string;
  linkedInitiative: string;
  linkedInitiativeId: string;
  priorityScore: number;
  confidence: number;
}

export interface FounderPacketInitiativeInput {
  id: string;
  title: string;
  status: string;
  risk: string;
  priorityScore: number;
  objective: string;
}

export interface FounderPacketAgentInput {
  id: string;
  name: string;
  status: string;
  currentGoal: string;
}

export interface FounderPacketDailyMemoInput {
  whatMatters: string[];
  whatToDoNext: string[];
  unresolved: string[];
  generatedAt: string;
}

export interface FounderPacketSourceInput {
  company: FounderPacketCompanyInput;
  changes: FounderPacketChangeInput[];
  interventions: FounderPacketInterventionInput[];
  initiatives: FounderPacketInitiativeInput[];
  agents: FounderPacketAgentInput[];
  dailyMemo: FounderPacketDailyMemoInput;
  nearbyEntities: ArtifactPacketNearbyEntity[];
}
