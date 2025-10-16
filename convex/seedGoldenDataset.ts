/**
 * Seed Golden Dataset for Agent Tool Evaluation
 * 
 * This script creates a comprehensive test dataset that supports all evaluation test cases.
 * Run with: npx convex run seedGoldenDataset:seedAll
 */

import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Seed all golden dataset tables
 */
export const seedAll = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("🌱 Starting Golden Dataset Seeding...\n");

    // Clear existing test data (optional - comment out if you want to keep existing data)
    await clearTestData(ctx);

    // Seed each category
    await seedDocuments(ctx);
    await seedMedia(ctx);
    await seedTasks(ctx);
    await seedEvents(ctx);
    await seedFolders(ctx);

    console.log("\n✅ Golden Dataset Seeding Complete!");
    return null;
  },
});

/**
 * Clear existing test data
 */
async function clearTestData(ctx: any) {
  console.log("🗑️  Clearing existing test data...");

  // Get the test user (same logic as getOrCreateTestUser)
  const testUser = await ctx.db
    .query("users")
    .first();

  if (!testUser) {
    console.log("   No test user found, skipping clear");
    return;
  }

  const testUserId = testUser._id;

  // Delete documents created by test user
  const docs = await ctx.db
    .query("documents")
    .filter((q: any) => q.eq(q.field("createdBy"), testUserId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
  console.log(`   ✓ Deleted ${docs.length} test documents`);

  // Delete files created by test user
  const files = await ctx.db
    .query("files")
    .filter((q: any) => q.eq(q.field("uploadedBy"), testUserId))
    .collect();
  for (const file of files) {
    await ctx.db.delete(file._id);
  }
  console.log(`   ✓ Deleted ${files.length} test files`);

  // Delete tasks created by test user
  const tasks = await ctx.db
    .query("tasks")
    .filter((q: any) => q.eq(q.field("userId"), testUserId))
    .collect();
  for (const task of tasks) {
    await ctx.db.delete(task._id);
  }
  console.log(`   ✓ Deleted ${tasks.length} test tasks`);

  // Delete events created by test user
  const events = await ctx.db
    .query("events")
    .filter((q: any) => q.eq(q.field("userId"), testUserId))
    .collect();
  for (const event of events) {
    await ctx.db.delete(event._id);
  }
  console.log(`   ✓ Deleted ${events.length} test events`);

  // Delete folders created by test user
  const folders = await ctx.db
    .query("folders")
    .filter((q: any) => q.eq(q.field("userId"), testUserId))
    .collect();
  for (const folder of folders) {
    await ctx.db.delete(folder._id);
  }
  console.log(`   ✓ Deleted ${folders.length} test folders`);
}

/**
 * Get or create a test user for seeding
 */
async function getOrCreateTestUser(ctx: any) {
  // Try to find an existing user
  const existingUser = await ctx.db
    .query("users")
    .first();

  if (existingUser) {
    console.log(`   Using existing user: ${existingUser._id}`);
    return existingUser._id;
  }

  // If no user exists, we can't create one (auth system handles that)
  // In this case, throw an error
  throw new Error("No users found in database. Please create a user account first before seeding data.");
}

/**
 * Seed Documents
 */
async function seedDocuments(ctx: any) {
  console.log("\n📄 Seeding Documents...");

  // Get or create a test user
  const testUser = await getOrCreateTestUser(ctx);

  const docs = [
    {
      title: "Revenue Report Q4 2024",
      content: "# Q4 2024 Revenue Report\n\n## Executive Summary\n\nTotal Revenue: $2.5M\nGrowth: +35% YoY\n\n## Key Metrics\n- New Customers: 150\n- Retention Rate: 92%\n- Average Deal Size: $16,667",
      createdBy: testUser,
      isPublic: false,
      isArchived: false,
    },
    {
      title: "Product Roadmap 2025",
      content: "# 2025 Product Roadmap\n\n## Q1 Goals\n- Launch AI Assistant\n- Mobile App Beta\n\n## Q2 Goals\n- Enterprise Features\n- API v2",
      createdBy: testUser,
      isPublic: false,
      isArchived: false,
    },
    {
      title: "Team Meeting Notes - Jan 15",
      content: "# Team Meeting - January 15, 2025\n\n## Attendees\n- Sarah (PM)\n- Mike (Eng)\n- Lisa (Design)\n\n## Action Items\n- [ ] Review mockups\n- [ ] Update timeline",
      createdBy: testUser,
      isPublic: false,
      isArchived: false,
    },
  ];

  for (const doc of docs) {
    const docId = await ctx.db.insert("documents", doc);
    console.log(`   ✓ Created: "${doc.title}" (${docId})`);
  }
}

/**
 * Seed Media Files
 */
async function seedMedia(ctx: any) {
  console.log("\n🖼️  Seeding Media Files...");

  // Get or create a test user
  const testUser = await getOrCreateTestUser(ctx);

  const mediaFiles = [
    {
      userId: testUser,
      storageId: "mock_storage_id_1", // Mock storage ID
      fileName: "modern-architecture-1.jpg",
      fileType: "image",
      mimeType: "image/jpeg",
      fileSize: 245678,
      tags: ["architecture", "modern", "building"],
      description: "Modern glass building with geometric design",
    },
    {
      userId: testUser,
      storageId: "mock_storage_id_2",
      fileName: "gothic-cathedral.jpg",
      fileType: "image",
      mimeType: "image/jpeg",
      fileSize: 189234,
      tags: ["architecture", "gothic", "historical"],
      description: "Gothic cathedral with intricate stonework",
    },
    {
      userId: testUser,
      storageId: "mock_storage_id_3",
      fileName: "sustainable-design.jpg",
      fileType: "image",
      mimeType: "image/jpeg",
      fileSize: 312456,
      tags: ["architecture", "sustainable", "green"],
      description: "Eco-friendly building with solar panels",
    },
    {
      userId: testUser,
      storageId: "mock_storage_id_4",
      fileName: "team-photo-2024.jpg",
      fileType: "image",
      mimeType: "image/jpeg",
      fileSize: 156789,
      tags: ["team", "photo"],
      description: "Annual team photo from company retreat",
    },
    {
      userId: testUser,
      storageId: "mock_storage_id_5",
      fileName: "product-demo.mp4",
      fileType: "video",
      mimeType: "video/mp4",
      fileSize: 5234567,
      tags: ["product", "demo", "video"],
      description: "Product demonstration video for customers",
    },
  ];

  for (const media of mediaFiles) {
    // Insert into files table
    const fileId = await ctx.db.insert("files", media);

    // Also create a document entry (like the real file upload flow does)
    // This makes the file searchable via documents.getSearch
    const documentFileType = media.fileType === "image" ? "jpg" : media.fileType === "video" ? "mp4" : media.fileType;
    await ctx.db.insert("documents", {
      title: media.fileName,
      isPublic: false,
      isArchived: false, // IMPORTANT: Must be false for search to work
      createdBy: testUser,
      lastEditedBy: testUser,
      documentType: "file",
      fileId: fileId,
      fileType: documentFileType,
      mimeType: media.mimeType,
      lastModified: Date.now(),
    });

    console.log(`   ✓ Created: "${media.fileName}" (${media.mimeType}, ${Math.round(media.fileSize / 1024)}KB)`);
  }
}

/**
 * Seed Tasks
 */
async function seedTasks(ctx: any) {
  console.log("\n✅ Seeding Tasks...");

  // Get or create a test user
  const testUser = await getOrCreateTestUser(ctx);

  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  const todayTimestamp = today.getTime();

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimestamp = tomorrow.getTime();

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekTimestamp = nextWeek.getTime();

  const now = Date.now();

  const tasks = [
    {
      userId: testUser,
      title: "Review Q4 revenue report",
      description: "Analyze the quarterly revenue report and prepare summary for board meeting",
      status: "todo" as const,
      priority: "high" as const,
      dueDate: todayTimestamp,
      tags: ["finance", "urgent"],
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: testUser,
      title: "Update product roadmap",
      description: "Incorporate feedback from customer interviews into 2025 roadmap",
      status: "in_progress" as const,
      priority: "high" as const,
      dueDate: todayTimestamp,
      tags: ["product", "planning"],
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: testUser,
      title: "Schedule team 1:1s",
      description: "Set up individual meetings with each team member for Q1 check-ins",
      status: "todo" as const,
      priority: "medium" as const,
      dueDate: tomorrowTimestamp,
      tags: ["management", "team"],
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: testUser,
      title: "Prepare investor update",
      description: "Draft monthly investor update email with key metrics and milestones",
      status: "todo" as const,
      priority: "high" as const,
      dueDate: nextWeekTimestamp,
      tags: ["investors", "communication"],
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: testUser,
      title: "Review design mockups",
      description: "Provide feedback on new feature designs from Lisa",
      status: "todo" as const,
      priority: "medium" as const,
      dueDate: todayTimestamp,
      tags: ["design", "product"],
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const task of tasks) {
    await ctx.db.insert("tasks", task);
    const dueLabel = task.dueDate === todayTimestamp ? "today" :
                     task.dueDate === tomorrowTimestamp ? "tomorrow" : "next week";
    console.log(`   ✓ Created: "${task.title}" (${task.priority}, due ${dueLabel})`);
  }
}

/**
 * Seed Events
 */
async function seedEvents(ctx: any) {
  console.log("\n📅 Seeding Events...");

  // Get or create a test user
  const testUser = await getOrCreateTestUser(ctx);

  const now = new Date();
  const nowMs = now.getTime();

  // Today's events
  const today9am = new Date(now);
  today9am.setHours(9, 0, 0, 0);

  const today2pm = new Date(now);
  today2pm.setHours(14, 0, 0, 0);

  // Tomorrow's events
  const tomorrow10am = new Date(now);
  tomorrow10am.setDate(tomorrow10am.getDate() + 1);
  tomorrow10am.setHours(10, 0, 0, 0);

  // This week's events
  const thursday3pm = new Date(now);
  thursday3pm.setDate(thursday3pm.getDate() + 3);
  thursday3pm.setHours(15, 0, 0, 0);

  const friday11am = new Date(now);
  friday11am.setDate(friday11am.getDate() + 4);
  friday11am.setHours(11, 0, 0, 0);

  const events = [
    {
      userId: testUser,
      title: "Team Standup",
      description: "Daily team sync - discuss blockers and priorities",
      startTime: today9am.getTime(),
      endTime: today9am.getTime() + 30 * 60 * 1000, // 30 minutes
      location: "Zoom - Main Room",
      tags: ["daily", "team"],
      createdAt: nowMs,
      updatedAt: nowMs,
    },
    {
      userId: testUser,
      title: "Product Review Meeting",
      description: "Review Q1 product roadmap with stakeholders",
      startTime: today2pm.getTime(),
      endTime: today2pm.getTime() + 60 * 60 * 1000, // 1 hour
      location: "Conference Room A",
      tags: ["product", "planning"],
      createdAt: nowMs,
      updatedAt: nowMs,
    },
    {
      userId: testUser,
      title: "1:1 with Sarah",
      description: "Quarterly check-in and career development discussion",
      startTime: tomorrow10am.getTime(),
      endTime: tomorrow10am.getTime() + 30 * 60 * 1000,
      location: "Office - Room 204",
      tags: ["1:1", "management"],
      createdAt: nowMs,
      updatedAt: nowMs,
    },
    {
      userId: testUser,
      title: "Board Meeting Prep",
      description: "Prepare materials and talking points for upcoming board meeting",
      startTime: thursday3pm.getTime(),
      endTime: thursday3pm.getTime() + 90 * 60 * 1000, // 1.5 hours
      location: "Executive Suite",
      tags: ["board", "executive"],
      createdAt: nowMs,
      updatedAt: nowMs,
    },
    {
      userId: testUser,
      title: "All-Hands Meeting",
      description: "Monthly company-wide update and Q&A",
      startTime: friday11am.getTime(),
      endTime: friday11am.getTime() + 60 * 60 * 1000,
      location: "Main Auditorium / Zoom",
      tags: ["all-hands", "company"],
      createdAt: nowMs,
      updatedAt: nowMs,
    },
  ];

  for (const event of events) {
    await ctx.db.insert("events", event);
    const startDate = new Date(event.startTime);
    const timeLabel = startDate.toLocaleString('en-US', {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit'
    });
    console.log(`   ✓ Created: "${event.title}" (${timeLabel}, ${event.location})`);
  }
}

/**
 * Seed Folders
 */
async function seedFolders(ctx: any) {
  console.log("\n📁 Seeding Folders...");

  // Get or create a test user
  const testUser = await getOrCreateTestUser(ctx);

  const now = Date.now();

  const folders = [
    {
      userId: testUser,
      name: "Finance Reports",
      color: "blue",
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: testUser,
      name: "Product Documentation",
      color: "green",
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: testUser,
      name: "Team Resources",
      color: "purple",
      createdAt: now,
      updatedAt: now,
    },
    {
      userId: testUser,
      name: "Marketing Assets",
      color: "orange",
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const folder of folders) {
    await ctx.db.insert("folders", folder);
    console.log(`   ✓ Created: "${folder.name}"`);
  }
}

/**
 * Get document IDs for testing
 */
export const getDocumentIds = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("documents"),
    title: v.string(),
  })),
  handler: async (ctx) => {
    const docs = await ctx.db.query("documents").collect();
    return docs.map(doc => ({ _id: doc._id, title: doc.title }));
  },
});

/**
 * Get the test user for evaluation
 * Returns the first user in the database (same logic as getOrCreateTestUser)
 */
export const getTestUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      email: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Get the first user (same as what seeding uses)
    const user = await ctx.db
      .query("users")
      .first();

    if (!user) return null;

    return {
      _id: user._id,
      name: user.name || "",
      email: user.email || "",
    };
  },
});
