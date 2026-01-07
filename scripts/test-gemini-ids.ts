import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const MODEL_IDS = [
  "gemini-2.5-pro",
  "gemini-2.5-pro-latest",
  "gemini-2.5-pro-001",
  "gemini-2.5-pro-preview",
  "gemini-pro-2.5",
  "gemini-2.0-pro",
];

async function testModel(modelId: string) {
  try {
    const result = await generateText({
      model: google(modelId),
      prompt: "Say: OK",
      maxTokens: 10,
    });
    console.log("✅ " + modelId + ': "' + result.text + '"');
    return true;
  } catch (e: any) {
    const msg = e.message || "unknown error";
    console.log("❌ " + modelId + ": " + msg.substring(0, 80));
    return false;
  }
}

async function main() {
  console.log("Testing Gemini model IDs...\n");
  for (const id of MODEL_IDS) {
    await testModel(id);
  }
}

main();
