/**
 * Schema Migration Fixture — For Tier 3 eval task t3_schema_migration
 *
 * This fixture represents a "before" schema state that the agent must
 * migrate by adding 3 new tables, creating indexes, and updating
 * existing tables with new fields.
 *
 * Acceptance criteria:
 * - Agent takes schema snapshot before changes
 * - 3 new tables added with correct validators
 * - At least 2 indexes per new table
 * - Existing `documents` table gets new `teamId` field
 * - Schema snapshot after shows the diff
 * - Post-migration audit shows 0 critical issues
 */

// The agent should add these 3 tables to schema.ts:

export const TABLES_TO_ADD = [
  {
    name: "teams",
    fields: {
      name: "v.string()",
      slug: "v.string()",
      ownerId: "v.id('users')",
      plan: "v.union(v.literal('free'), v.literal('pro'), v.literal('enterprise'))",
      memberCount: "v.number()",
      createdAt: "v.number()",
    },
    indexes: [
      { name: "by_slug", fields: ["slug"] },
      { name: "by_ownerId", fields: ["ownerId"] },
    ],
  },
  {
    name: "teamMembers",
    fields: {
      teamId: "v.id('teams')",
      userId: "v.id('users')",
      role: "v.union(v.literal('owner'), v.literal('admin'), v.literal('member'), v.literal('viewer'))",
      joinedAt: "v.number()",
      invitedBy: "v.optional(v.id('users'))",
    },
    indexes: [
      { name: "by_teamId_and_userId", fields: ["teamId", "userId"] },
      { name: "by_userId", fields: ["userId"] },
      { name: "by_teamId_and_role", fields: ["teamId", "role"] },
    ],
  },
  {
    name: "teamInvites",
    fields: {
      teamId: "v.id('teams')",
      email: "v.string()",
      role: "v.union(v.literal('admin'), v.literal('member'), v.literal('viewer'))",
      token: "v.string()",
      expiresAt: "v.number()",
      status: "v.union(v.literal('pending'), v.literal('accepted'), v.literal('expired'))",
      invitedBy: "v.id('users')",
      createdAt: "v.number()",
    },
    indexes: [
      { name: "by_token", fields: ["token"] },
      { name: "by_teamId_and_status", fields: ["teamId", "status"] },
      { name: "by_email_and_status", fields: ["email", "status"] },
    ],
  },
];

// The agent should add this field to the existing `documents` table:
export const FIELDS_TO_ADD_TO_DOCUMENTS = {
  teamId: "v.optional(v.id('teams'))",
};

// Expected outcome after migration:
export const EXPECTED_OUTCOME = {
  newTableCount: 3,
  newIndexCount: 8, // 2 + 3 + 3
  documentsFieldAdded: "teamId",
  noBreakingChanges: true,
  typecheckPasses: true,
};
