import Anthropic from "@anthropic-ai/sdk";

async function test() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY environment variable is not set");
    process.exit(1);
  }

  console.log("Testing Anthropic API directly...");
  console.log("API Key prefix:", apiKey.slice(0, 10) + "...");

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{ role: "user", content: "What is 2+2?" }],
    });

    console.log("✅ SUCCESS! Response received:");
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("❌ FAILED:", error);
  }
}

test();

