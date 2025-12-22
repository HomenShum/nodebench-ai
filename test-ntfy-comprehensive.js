// Comprehensive ntfy integration test
// Tests all notification types that replace SMS functionality

const NTFY_URL = "https://ntfy.sh";
const TOPIC = "nodebench";

async function sendNotification(payload) {
  const response = await fetch(`${NTFY_URL}/${TOPIC}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

async function testBasicNotification() {
  console.log("\n1️⃣  Testing Basic Notification...");
  const result = await sendNotification({
    message: "🎉 NodeBench ntfy integration test!",
    title: "Test Notification",
    priority: 3,
    tags: ["white_check_mark", "rocket"],
  });
  console.log("✅ Basic notification sent:", result.id);
}

async function testMeetingCreated() {
  console.log("\n2️⃣  Testing Meeting Created Notification...");
  const result = await sendNotification({
    message: "📅 New meeting: Team Standup\n⏰ Dec 22 at 10:00 AM",
    title: "Meeting Created",
    priority: 4,
    tags: ["calendar", "bell"],
  });
  console.log("✅ Meeting created notification sent:", result.id);
}

async function testMeetingReminder() {
  console.log("\n3️⃣  Testing Meeting Reminder Notification...");
  const result = await sendNotification({
    message: "⏰ Reminder: \"Team Standup\" starts in 15 minutes",
    title: "Meeting Reminder",
    priority: 5,
    tags: ["alarm_clock", "warning"],
  });
  console.log("✅ Meeting reminder sent:", result.id);
}

async function testMorningDigest() {
  console.log("\n4️⃣  Testing Morning Digest Notification...");
  const result = await sendNotification({
    message: `☀️ Good morning! You have 3 meetings today:

• 9:00 AM: Team Standup
• 2:00 PM: Client Review
• 4:30 PM: Sprint Planning`,
    title: "Morning Digest",
    priority: 3,
    tags: ["sunny", "calendar"],
  });
  console.log("✅ Morning digest sent:", result.id);
}

async function testHighPriorityAlert() {
  console.log("\n5️⃣  Testing High Priority Alert...");
  const result = await sendNotification({
    message: "🚨 URGENT: Production server down! Immediate action required.",
    title: "Critical Alert",
    priority: 5,
    tags: ["rotating_light", "fire", "warning"],
  });
  console.log("✅ High priority alert sent:", result.id);
}

async function testWithActions() {
  console.log("\n6️⃣  Testing Notification with Actions...");
  const result = await sendNotification({
    message: "Meeting request from John Doe for tomorrow at 2 PM",
    title: "Meeting Request",
    priority: 4,
    tags: ["calendar", "question"],
    actions: [
      {
        action: "view",
        label: "View Details",
        url: "https://nodebench.ai/calendar",
      },
    ],
  });
  console.log("✅ Notification with actions sent:", result.id);
}

async function testLongMessage() {
  console.log("\n7️⃣  Testing Long Message (SMS would cost multiple segments)...");
  const longMessage = `📊 Weekly Summary:

✅ Completed Tasks: 24
🔄 In Progress: 8
📅 Upcoming Meetings: 12
💰 Budget Status: On track

Top Achievements:
• Launched new feature
• Fixed critical bug
• Improved performance by 40%

Next Week Focus:
• Sprint planning
• Client presentations
• Code reviews`;

  const result = await sendNotification({
    message: longMessage,
    title: "Weekly Summary",
    priority: 3,
    tags: ["chart_with_upwards_trend", "memo"],
  });
  console.log("✅ Long message sent:", result.id);
  console.log(`   (Would have cost ${Math.ceil(longMessage.length / 160)} SMS segments = $${(Math.ceil(longMessage.length / 160) * 0.0079).toFixed(4)})`);
  console.log("   ntfy cost: $0.00 🎉");
}

async function runAllTests() {
  console.log("🧪 Starting Comprehensive ntfy Integration Tests");
  console.log("=" .repeat(60));
  console.log(`📱 Topic: ${TOPIC}`);
  console.log(`🌐 URL: ${NTFY_URL}/${TOPIC}`);
  console.log("=" .repeat(60));

  try {
    await testBasicNotification();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testMeetingCreated();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testMeetingReminder();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testMorningDigest();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testHighPriorityAlert();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testWithActions();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testLongMessage();

    console.log("\n" + "=".repeat(60));
    console.log("✅ All tests passed!");
    console.log("=" .repeat(60));
    console.log("\n📱 View all notifications at:");
    console.log(`   https://ntfy.sh/${TOPIC}`);
    console.log("\n💡 To receive on your phone:");
    console.log("   1. Install ntfy app (iOS/Android)");
    console.log(`   2. Subscribe to topic: ${TOPIC}`);
    console.log("   3. Enable notifications");
    
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
}

runAllTests();

