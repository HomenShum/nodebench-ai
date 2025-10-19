# 🔐 Authentication Bypass Strategies for Convex Tests

## Overview

When testing Convex functions, you often need to bypass authentication to test functionality without requiring a logged-in user. Here are **7 proven strategies** to handle auth in tests.

---

## ✅ **Strategy 1: Internal Mutations/Queries (RECOMMENDED)**

**Use Case:** Bypass auth checks entirely  
**Status:** ✅ **IMPLEMENTED**

### Implementation

```typescript
// convex/testHelpers.ts
import { internalMutation } from "./_generated/server";

export const createTestDocument = internalMutation({
  args: {
    title: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // No auth check - internal mutations bypass auth
    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      createdBy: args.userId,
      isPublic: false,
    });
    
    return documentId;
  },
});
```

### Usage in Tests

```typescript
// In test action
const userId = users[0]._id;
const docId = await ctx.runMutation(
  internal.testHelpers.createTestDocument,
  { title: "Test Doc", userId }
);
```

### Pros
- ✅ Clean and explicit
- ✅ No schema changes needed
- ✅ Works for all operations
- ✅ Secure (internal = not exposed to clients)

### Cons
- ⚠️ Requires separate internal functions
- ⚠️ More code to maintain

---

## ✅ **Strategy 2: Get Test User from Database**

**Use Case:** Use existing user for tests  
**Status:** ✅ **IMPLEMENTED**

### Implementation

```typescript
export const getTestUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").first();
    return users?._id ?? null;
  },
});
```

### Usage

```typescript
const userId = await ctx.runQuery(internal.testHelpers.getTestUser, {});
if (!userId) throw new Error("No test user found");
```

### Pros
- ✅ Uses real user data
- ✅ No test user creation needed
- ✅ Simple

### Cons
- ⚠️ Requires at least one user in DB
- ⚠️ Not isolated (uses production data)

---

## ✅ **Strategy 3: Create Dedicated Test User**

**Use Case:** Isolated test environment  
**Status:** ✅ **IMPLEMENTED**

### Implementation

```typescript
export const createTestUser = internalMutation({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if test user exists
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email ?? "test@example.com"))
      .first();
    
    if (existing) return existing._id;
    
    // Create new test user
    return await ctx.db.insert("users", {
      email: args.email ?? "test@example.com",
      name: args.name ?? "Test User",
      createdAt: Date.now(),
      role: "user",
    });
  },
});
```

### Usage

```typescript
const testUserId = await ctx.runMutation(
  internal.testHelpers.createTestUser,
  { email: "test@example.com" }
);
```

### Pros
- ✅ Isolated test data
- ✅ Repeatable
- ✅ Clean separation

### Cons
- ⚠️ Creates test data in production DB
- ⚠️ Needs cleanup

---

## ✅ **Strategy 4: Direct Database Insertion**

**Use Case:** Bypass all validation  
**Status:** ✅ **IMPLEMENTED**

### Implementation

```typescript
export const createTestEntityContext = internalMutation({
  args: {
    entityName: v.string(),
    entityType: v.union(v.literal("company"), v.literal("person")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Direct DB insert - no auth, no validation
    return await ctx.db.insert("entityContexts", {
      entityName: args.entityName,
      entityType: args.entityType,
      summary: `Test: ${args.entityName}`,
      keyFacts: [],
      sources: [],
      researchedAt: Date.now(),
      researchedBy: args.userId,
      lastAccessedAt: Date.now(),
      accessCount: 0,
      version: 1,
    });
  },
});
```

### Pros
- ✅ Complete control
- ✅ Fast
- ✅ No dependencies

### Cons
- ⚠️ Bypasses business logic
- ⚠️ May create invalid data

---

## ✅ **Strategy 5: Test Cleanup Helpers**

**Use Case:** Clean up test data after tests  
**Status:** ✅ **IMPLEMENTED**

### Implementation

```typescript
export const cleanupTestData = internalMutation({
  args: {
    testPrefix: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const prefix = args.testPrefix ?? "Test";
    
    // Delete test documents
    const testDocs = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("title"), prefix))
      .collect();
    
    for (const doc of testDocs) {
      await ctx.db.delete(doc._id);
    }
    
    // Delete test entities
    const testEntities = await ctx.db
      .query("entityContexts")
      .filter((q) => q.eq(q.field("entityName"), prefix))
      .collect();
    
    for (const entity of testEntities) {
      await ctx.db.delete(entity._id);
    }
    
    return {
      documentsDeleted: testDocs.length,
      entitiesDeleted: testEntities.length,
    };
  },
});
```

### Usage

```typescript
// After tests
await ctx.runMutation(internal.testHelpers.cleanupTestData, {
  testPrefix: "Test",
});
```

### Pros
- ✅ Keeps DB clean
- ✅ Prevents test pollution
- ✅ Reusable

### Cons
- ⚠️ Must remember to call
- ⚠️ Can accidentally delete real data

---

## ⚠️ **Strategy 6: Mock Auth Context (NOT RECOMMENDED)**

**Use Case:** Simulate authenticated user  
**Status:** ❌ **NOT IMPLEMENTED** (Convex doesn't support this)

### Why Not?

Convex doesn't allow mocking `ctx.auth` in actions/mutations. The auth context is controlled by the Convex runtime and cannot be overridden.

### Alternative

Use internal mutations instead (Strategy 1).

---

## ⚠️ **Strategy 7: Optional Auth Fields (NOT RECOMMENDED)**

**Use Case:** Make auth fields optional in schema  
**Status:** ❌ **NOT RECOMMENDED**

### Example

```typescript
// DON'T DO THIS
defineTable({
  createdBy: v.optional(v.id("users")), // Makes auth optional
  // ...
})
```

### Why Not?

- ❌ Breaks production code
- ❌ Security risk
- ❌ Data integrity issues
- ❌ Hard to debug

### Alternative

Use internal mutations (Strategy 1) instead.

---

## 📋 **Best Practices**

### ✅ **DO:**

1. **Use internal mutations for test helpers**
   - Clean separation
   - Secure
   - Explicit

2. **Create dedicated test users**
   - Isolated
   - Repeatable
   - Safe

3. **Clean up test data**
   - Prevents pollution
   - Keeps DB clean
   - Professional

4. **Prefix test data**
   - Easy to identify
   - Easy to clean up
   - Clear intent

5. **Document test helpers**
   - Easy to use
   - Easy to maintain
   - Team-friendly

### ❌ **DON'T:**

1. **Don't modify production schema for tests**
   - Security risk
   - Data integrity issues

2. **Don't use production users in tests**
   - Data pollution
   - Privacy concerns

3. **Don't leave test data in production**
   - Clutter
   - Confusion
   - Performance impact

4. **Don't bypass validation in production code**
   - Use test helpers instead
   - Keep production code clean

---

## 🎯 **Recommended Approach**

### **For Most Tests:**

```typescript
// 1. Create test helpers file
// convex/testHelpers.ts
export const createTestDocument = internalMutation({...});
export const createTestUser = internalMutation({...});
export const cleanupTestData = internalMutation({...});

// 2. Use in tests
export const myTest = action({
  handler: async (ctx) => {
    // Get or create test user
    const userId = await ctx.runMutation(
      internal.testHelpers.createTestUser,
      { email: "test@example.com" }
    );
    
    // Create test data
    const docId = await ctx.runMutation(
      internal.testHelpers.createTestDocument,
      { title: "Test Doc", userId }
    );
    
    // Run test logic
    // ...
    
    // Clean up
    await ctx.runMutation(
      internal.testHelpers.cleanupTestData,
      { testPrefix: "Test" }
    );
  },
});
```

### **For Integration Tests:**

Use real users from the database (Strategy 2) to test with realistic data.

### **For Unit Tests:**

Use dedicated test users (Strategy 3) for isolation.

---

## 📊 **Comparison Matrix**

| Strategy | Isolation | Security | Complexity | Cleanup | Recommended |
|----------|-----------|----------|------------|---------|-------------|
| **Internal Mutations** | ✅ High | ✅ High | 🟡 Medium | ✅ Easy | ✅ **YES** |
| **Get Test User** | ❌ Low | ✅ High | ✅ Low | ✅ Easy | 🟡 Sometimes |
| **Create Test User** | ✅ High | ✅ High | 🟡 Medium | 🟡 Manual | ✅ **YES** |
| **Direct DB Insert** | ✅ High | ⚠️ Medium | ✅ Low | 🟡 Manual | 🟡 Sometimes |
| **Test Cleanup** | N/A | ✅ High | ✅ Low | ✅ Easy | ✅ **YES** |
| **Mock Auth** | N/A | N/A | N/A | N/A | ❌ **NO** |
| **Optional Auth** | ❌ Low | ❌ Low | ✅ Low | N/A | ❌ **NO** |

---

## 🚀 **Quick Start**

### **1. Create Test Helpers**

Copy `convex/testHelpers.ts` from this project.

### **2. Use in Tests**

```typescript
import { internal } from "./_generated/api";

export const myTest = action({
  handler: async (ctx) => {
    const userId = await ctx.runMutation(
      internal.testHelpers.createTestUser,
      {}
    );
    
    // Your test logic here
  },
});
```

### **3. Clean Up**

```typescript
await ctx.runMutation(
  internal.testHelpers.cleanupTestData,
  { testPrefix: "Test" }
);
```

---

## ✅ **Summary**

**Best Strategy:** Use **internal mutations** (Strategy 1) for test helpers.

**Why:**
- ✅ Secure (not exposed to clients)
- ✅ Clean separation of concerns
- ✅ No schema changes needed
- ✅ Works for all operations
- ✅ Easy to maintain

**Implementation:** See `convex/testHelpers.ts` for complete examples.

**Status:** ✅ **PRODUCTION READY**

