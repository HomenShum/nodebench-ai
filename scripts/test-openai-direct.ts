import OpenAI from "openai";

async function test() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY environment variable is not set");
    process.exit(1);
  }

  console.log("Testing OpenAI API directly...");
  console.log("API Key prefix:", apiKey.slice(0, 15) + "...");

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
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

