export interface V2PassportScope {
  resource: string;
  action: string;
}

export interface V2PassportApprovalPolicy {
  mode: string;
  requires_human_approval: boolean;
  max_spend_usd?: number;
}

export interface V2Passport {
  passport_id: string;
  subject_type: "agent" | "user" | "service";
  subject_id: string;
  agent_id: string;
  created_at: string;
  revoked_at?: string;
  scopes: V2PassportScope[];
  approval_policy: V2PassportApprovalPolicy;
}

export interface V2Receipt {
  receipt_id: string;
  agent_id: string;
  passport_id: string;
  created_at: string;
  action_type: string;
  summary: string;
  policy: string;
  reversible: boolean;
  rollback_ref?: string;
  rolled_back_at?: string;
  evidence_refs: string[];
  trace_id: string;
  ui_context?: {
    surface: string;
    route: string;
    actor?: string;
  };
}

export interface V2IntentLedgerGoal {
  goal_id: string;
  text: string;
}

export interface V2IntentLedgerConstraint {
  constraint_id: string;
  text: string;
  severity: "hard" | "soft";
}

export interface V2IntentLedgerThreshold {
  key: string;
  value: number;
  unit: string;
}

export interface V2IntentLedgerEscalationRule {
  rule_id: string;
  condition: string;
  action: "ask_human" | "deny";
}

export interface V2IntentLedger {
  ledger_id: string;
  subject_id: string;
  version: number;
  updated_at: string;
  goals: V2IntentLedgerGoal[];
  constraints: V2IntentLedgerConstraint[];
  thresholds: V2IntentLedgerThreshold[];
  escalation_rules: V2IntentLedgerEscalationRule[];
}

const seededPassports: V2Passport[] = [
  {
    passport_id: "pass_demo_research",
    subject_type: "agent",
    subject_id: "agent_research_copilot",
    agent_id: "agent_research_copilot",
    created_at: "2026-03-10T09:00:00.000Z",
    scopes: [
      { resource: "web", action: "read" },
      { resource: "github", action: "comment" },
    ],
    approval_policy: {
      mode: "supervised",
      requires_human_approval: true,
      max_spend_usd: 50,
    },
  },
  {
    passport_id: "pass_demo_ops",
    subject_type: "agent",
    subject_id: "agent_ops_automation",
    agent_id: "agent_ops_automation",
    created_at: "2026-03-09T13:30:00.000Z",
    scopes: [
      { resource: "metrics", action: "read" },
      { resource: "receipts", action: "write" },
    ],
    approval_policy: {
      mode: "allow_scoped",
      requires_human_approval: false,
    },
  },
];

const seededReceipts: V2Receipt[] = [
  {
    receipt_id: "rcpt_demo_rollback",
    agent_id: "agent_research_copilot",
    passport_id: "pass_demo_research",
    created_at: "2026-03-12T16:40:00.000Z",
    action_type: "github_pr_comment",
    summary: "Drafted an incident follow-up comment with rollback support.",
    policy: "approval_required",
    reversible: true,
    rollback_ref: "rollback_demo_001",
    evidence_refs: ["ev_github_pr_2044", "ev_traceability_1"],
    trace_id: "trace_demo_receipt_rollback",
    ui_context: {
      surface: "control-plane",
      route: "/receipts",
      actor: "research-operator",
    },
  },
  {
    receipt_id: "rcpt_demo_denied",
    agent_id: "agent_research_copilot",
    passport_id: "pass_demo_research",
    created_at: "2026-03-11T08:15:00.000Z",
    action_type: "prod_db_write",
    summary: "Blocked a production write pending explicit human approval.",
    policy: "denied",
    reversible: false,
    evidence_refs: ["ev_guardrail_7"],
    trace_id: "trace_demo_receipt_denied",
    ui_context: {
      surface: "control-plane",
      route: "/receipts",
      actor: "ops-reviewer",
    },
  },
];

const seededLedgers: V2IntentLedger[] = [
  {
    ledger_id: "ledger_demo_primary",
    subject_id: "user_demo_001",
    version: 3,
    updated_at: "2026-03-08T12:00:00.000Z",
    goals: [{ goal_id: "goal_1", text: "Protect production data and customer funds." }],
    constraints: [{ constraint_id: "constraint_1", text: "Never write directly to prod without approval.", severity: "hard" }],
    thresholds: [{ key: "spend_limit", value: 50, unit: "usd" }],
    escalation_rules: [{ rule_id: "rule_1", condition: "production_write", action: "ask_human" }],
  },
];

export const passportStore = new Map<string, V2Passport>();
export const receiptStore = new Map<string, V2Receipt>();
export const intentLedgerStore = new Map<string, V2IntentLedger>();

export function resetControlPlaneV2DemoState(): void {
  passportStore.clear();
  receiptStore.clear();
  intentLedgerStore.clear();

  for (const passport of seededPassports) {
    passportStore.set(passport.passport_id, structuredClone(passport));
  }
  for (const receipt of seededReceipts) {
    receiptStore.set(receipt.receipt_id, structuredClone(receipt));
  }
  for (const ledger of seededLedgers) {
    intentLedgerStore.set(ledger.ledger_id, structuredClone(ledger));
  }
}

resetControlPlaneV2DemoState();