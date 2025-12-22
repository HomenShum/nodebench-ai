// Simple test script to verify ntfy.sh integration
// Run with: node test-ntfy.js

async function testNtfy() {
  const NTFY_URL = "https://ntfy.sh/nodebench";
  
  const payload = {
    message: "🎉 NodeBench ntfy integration test!",
    title: "Test Notification",
    priority: 3,
    tags: ["white_check_mark", "rocket"],
  };

  console.log("Sending test notification to ntfy.sh/nodebench...");
  console.log("Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(NTFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("\n✅ Success! Response:", JSON.stringify(result, null, 2));
    console.log("\n📱 To see the notification:");
    console.log("1. Visit https://ntfy.sh/nodebench in your browser");
    console.log("2. Or install the ntfy app and subscribe to 'nodebench'");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

testNtfy();

