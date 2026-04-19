# Admin Mutation Wrapping Examples

This document provides complete examples of wrapping admin mutations with audit logging.

---

## Pattern Overview

```typescript
// 1. Import audit logging
import { internal } from "../../_generated/api";

// 2. In mutation handler, capture before state
const beforeState = await ctx.db.get(resourceId);

// 3. Perform the actual operation
await ctx.db.patch(resourceId, changes);

// 4. Log the action (with graceful error handling)
await ctx.runMutation(internal.domains.operations.adminAuditLog.logAdminActionInternal, {
  action: "descriptive_action_name",
  actionCategory: "appropriate_category",
  actor: userId,
  resourceType: "tableName",
  resourceId: resourceId,
  before: beforeState,
  after: { ...changes },
  reason: "Why this happened",
  metadata: { additional: "context" },
}).catch((err) => {
  console.warn('[MutationName] Failed to log audit entry:', err);
});
```

---

## Example 1: API Key Deletion (Security - P0)

**File:** `convex/domains/auth/apiKeys.ts`

**Current Code (Line 143-162):**

```typescript
export const deleteApiKey = mutation({
  args: { provider: v.string() },
  returns: v.null(),
  handler: async (ctx, { provider }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", userId).eq("provider", provider)
      )
      .first() as Doc<"userApiKeys"> | null;

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});
```

**Updated Code with Audit Logging:**

```typescript
import { internal } from "../../_generated/api"; // ADD THIS IMPORT

export const deleteApiKey = mutation({
  args: { provider: v.string() },
  returns: v.null(),
  handler: async (ctx, { provider }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", userId).eq("provider", provider)
      )
      .first() as Doc<"userApiKeys"> | null;

    if (existing) {
      // Capture state before deletion
      const keySnapshot = {
        _id: existing._id,
        userId: existing.userId,
        provider: existing.provider,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
        // Note: DO NOT log encryptedApiKey value for security
      };

      // Delete the key
      await ctx.db.delete(existing._id);

      // Log the security action
      await ctx.runMutation(internal.domains.operations.adminAuditLog.logAdminActionInternal, {
        action: "delete_api_key",
        actionCategory: "security_event",
        actor: userId,
        resourceType: "userApiKeys",
        resourceId: existing._id,
        before: keySnapshot,
        after: { deleted: true },
        reason: `User deleted API key for provider: ${provider}`,
        metadata: {
          provider,
          keyAge: existing.createdAt ? Date.now() - existing.createdAt : null,
        },
      }).catch((err) => {
        console.warn('[deleteApiKey] Failed to log audit entry:', err);
      });
    }
    return null;
  },
});
```

**Key Points:**
- ✅ Captures key metadata (not the actual encrypted key)
- ✅ Logs as "security_event" category
- ✅ Includes provider and key age for analysis
- ✅ Graceful error handling doesn't break deletion

---

## Example 2: API Key Creation/Update (Security - P0)

**File:** `convex/domains/auth/apiKeys.ts`

**Current Code (Line 83-101):**

```typescript
export const saveEncryptedApiKeyPublic = mutation({
  args: { provider: v.string(), encryptedApiKey: v.string() },
  returns: v.null(),
  handler: async (ctx, { provider, encryptedApiKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", provider))
      .first() as Doc<"userApiKeys"> | null;
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { encryptedApiKey, updatedAt: now });
    } else {
      await ctx.db.insert("userApiKeys", { userId, provider, encryptedApiKey, createdAt: now, updatedAt: now });
    }
    return null;
  },
});
```

**Updated Code with Audit Logging:**

```typescript
import { internal } from "../../_generated/api"; // ADD THIS IMPORT

export const saveEncryptedApiKeyPublic = mutation({
  args: { provider: v.string(), encryptedApiKey: v.string() },
  returns: v.null(),
  handler: async (ctx, { provider, encryptedApiKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", provider))
      .first() as Doc<"userApiKeys"> | null;

    const now = Date.now();
    const isUpdate = !!existing;

    if (existing) {
      // Update existing key
      const beforeState = {
        _id: existing._id,
        provider: existing.provider,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      };

      await ctx.db.patch(existing._id, { encryptedApiKey, updatedAt: now });

      // Log the update
      await ctx.runMutation(internal.domains.operations.adminAuditLog.logAdminActionInternal, {
        action: "update_api_key",
        actionCategory: "security_event",
        actor: userId,
        resourceType: "userApiKeys",
        resourceId: existing._id,
        before: beforeState,
        after: { provider, updatedAt: now },
        reason: `User updated API key for provider: ${provider}`,
        metadata: {
          provider,
          previousUpdateAge: existing.updatedAt ? now - existing.updatedAt : null,
        },
      }).catch((err) => {
        console.warn('[saveEncryptedApiKeyPublic] Failed to log audit entry:', err);
      });

    } else {
      // Create new key
      const newKeyId = await ctx.db.insert("userApiKeys", {
        userId,
        provider,
        encryptedApiKey,
        createdAt: now,
        updatedAt: now
      });

      // Log the creation
      await ctx.runMutation(internal.domains.operations.adminAuditLog.logAdminActionInternal, {
        action: "create_api_key",
        actionCategory: "security_event",
        actor: userId,
        resourceType: "userApiKeys",
        resourceId: newKeyId,
        before: null,
        after: { provider, createdAt: now },
        reason: `User created new API key for provider: ${provider}`,
        metadata: {
          provider,
          isFirstKey: true,
        },
      }).catch((err) => {
        console.warn('[saveEncryptedApiKeyPublic] Failed to log audit entry:', err);
      });
    }

    return null;
  },
});
```

**Key Points:**
- ✅ Handles both create and update cases
- ✅ Different actions for create vs update
- ✅ Tracks how long since last update
- ✅ Never logs the actual encrypted key value

---

## Example 3: Account Deletion (Data Management - P1)

**File:** `convex/domains/auth/account.ts` (hypothetical)

**Pattern:**

```typescript
import { internal } from "../../_generated/api";

export const deleteAccount = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    // Verify admin permissions (if needed)
    // const isAdmin = await verifyAdminRole(ctx, adminUserId);
    // if (!isAdmin) throw new Error("Not authorized");

    // Capture full account state
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const accountSnapshot = {
      _id: user._id,
      email: user.email,
      name: user.name,
      createdAt: user._creationTime,
      // ... other relevant fields
    };

    // Delete related data first
    const apiKeys = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const key of apiKeys) {
      await ctx.db.delete(key._id);
    }

    // Delete the user account
    await ctx.db.delete(userId);

    // Log the deletion
    await ctx.runMutation(internal.domains.operations.adminAuditLog.logAdminActionInternal, {
      action: "delete_user_account",
      actionCategory: "deletion",
      actor: adminUserId,
      resourceType: "users",
      resourceId: userId,
      before: accountSnapshot,
      after: { deleted: true },
      reason: "User account deletion requested",
      metadata: {
        deletedApiKeysCount: apiKeys.length,
        accountAge: user._creationTime ? Date.now() - user._creationTime : null,
      },
    }).catch((err) => {
      console.warn('[deleteAccount] Failed to log audit entry:', err);
    });

    return null;
  },
});
```

**Key Points:**
- ✅ Captures complete account state
- ✅ Logs related deletions (API keys count)
- ✅ Uses "deletion" category
- ✅ Includes account age for analysis

---

## Example 4: Configuration Change (Config - P0)

**Pattern for System Config Updates:**

```typescript
import { internal } from "../../_generated/api";

export const updateSystemConfig = mutation({
  args: {
    configKey: v.string(),
    newValue: v.any(),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    // Verify admin permissions
    // ... admin check logic ...

    // Get current config
    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", args.configKey))
      .first();

    const beforeValue = existing?.value;

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.newValue,
        updatedAt: Date.now(),
        updatedBy: adminUserId,
      });
    } else {
      await ctx.db.insert("systemConfig", {
        key: args.configKey,
        value: args.newValue,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        updatedBy: adminUserId,
      });
    }

    // Log the config change
    await ctx.runMutation(internal.domains.operations.adminAuditLog.logAdminActionInternal, {
      action: existing ? "update_system_config" : "create_system_config",
      actionCategory: "config_change",
      actor: adminUserId,
      resourceType: "systemConfig",
      resourceId: existing?._id || args.configKey,
      before: { key: args.configKey, value: beforeValue },
      after: { key: args.configKey, value: args.newValue },
      reason: args.reason || `Config ${args.configKey} ${existing ? 'updated' : 'created'}`,
      metadata: {
        configKey: args.configKey,
        valueType: typeof args.newValue,
        wasCreated: !existing,
      },
    }).catch((err) => {
      console.warn('[updateSystemConfig] Failed to log audit entry:', err);
    });

    return null;
  },
});
```

**Key Points:**
- ✅ Tracks config key and value type
- ✅ Before/after comparison
- ✅ Optional reason parameter
- ✅ Uses "config_change" category

---

## Bulk Wrapping Script

For wrapping multiple mutations quickly, use this helper:

```typescript
// utils/auditHelper.ts
import { internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

export async function logMutationAudit(
  ctx: any,
  params: {
    action: string;
    category: "user_management" | "config_change" | "data_correction" | "permission_change" | "deletion" | "access_grant" | "security_event";
    actor: Id<"users">;
    resourceType: string;
    resourceId?: string | Id<any>;
    before?: any;
    after: any;
    reason?: string;
    metadata?: any;
  }
) {
  await ctx.runMutation(internal.domains.operations.adminAuditLog.logAdminActionInternal, {
    action: params.action,
    actionCategory: params.category,
    actor: params.actor,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    before: params.before,
    after: params.after,
    reason: params.reason,
    metadata: params.metadata,
  }).catch((err: any) => {
    console.warn(`[${params.action}] Failed to log audit entry:`, err);
  });
}

// Usage in mutations:
await logMutationAudit(ctx, {
  action: "delete_api_key",
  category: "security_event",
  actor: userId,
  resourceType: "userApiKeys",
  resourceId: existing._id,
  before: keySnapshot,
  after: { deleted: true },
  reason: `User deleted API key for provider: ${provider}`,
  metadata: { provider },
});
```

---

## Priority Wrapping List

### Immediate (Security - P0):
1. ✅ `deleteExpiredGoogleAccount` (emailAdmin.ts) - **Done**
2. ⚠️ `deleteApiKey` (apiKeys.ts) - **Example above**
3. ⚠️ `saveEncryptedApiKeyPublic` (apiKeys.ts) - **Example above**
4. ⚠️ `saveEncryptedApiKey` (apiKeys.ts - internal) - **Similar pattern**

### High Priority (P1):
5. ⚠️ `deleteAccount` (account.ts) - **Example above**
6. ⚠️ `updateAccount` (account.ts) - **Similar pattern**
7. ⚠️ `seedAdmins` (seedAdmins.ts) - **Admin management**

### Medium Priority (P2):
8. Config mutations (if they exist)
9. Permission mutations (if they exist)
10. Data correction mutations (if they exist)

---

## Testing Checklist

After wrapping each mutation:

- [ ] Mutation still works correctly
- [ ] Audit log entry created
- [ ] Before/after states captured correctly
- [ ] Error handling doesn't break mutation
- [ ] No sensitive data logged (passwords, keys, etc.)
- [ ] Action category is appropriate
- [ ] Metadata includes useful context

---

## Verification

```bash
# Check audit log after wrapping
npx convex run domains:operations:adminAuditLog:getAuditLog '{"limit": 10}'

# Check specific action
npx convex run domains:operations:adminAuditLog:getAuditLog '{"action": "delete_api_key"}'

# Check by category
npx convex run domains:operations:adminAuditLog:getAuditLog '{"actionCategory": "security_event"}'

# Get stats
npx convex run domains:operations:adminAuditLog:getAuditStats '{}'
```

---

**Estimated Time per Mutation:** 10-15 minutes
**Total for 10 mutations:** 2-3 hours
**Priority: P0/P1** for security and user data mutations
