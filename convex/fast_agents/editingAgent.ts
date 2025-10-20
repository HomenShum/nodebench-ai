// Editing Agent - Generates document edits
"use node";

import { Id } from "../_generated/dataModel";
import OpenAI from "openai";

export interface EditInput {
  message: string;
  documentId: Id<"documents">;
  currentContent: string;
  currentTitle: string;
}

export interface EditProposal {
  type: "title" | "content" | "append" | "replace";
  target?: string; // For targeted edits
  newValue: string;
  reason: string;
}

export interface EditOutput {
  proposals: EditProposal[];
  explanation: string;
  confidence: number; // 0-1 confidence in the edits
}

/**
 * Generate document edits based on user request
 * Uses LLM to understand intent and generate appropriate edits
 */
export async function generateEdits(
  ctx: any,
  input: EditInput
): Promise<EditOutput> {
  const { message, documentId, currentContent, currentTitle } = input;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const client = new OpenAI({ apiKey });

    const prompt = `You are a document editing assistant. Analyze the user's request and generate edit proposals.

Current Document:
Title: "${currentTitle}"
Content Preview: ${currentContent.slice(0, 500)}...

User Request: "${message}"

Generate edit proposals in JSON format. Return an object with:
{
  "proposals": [
    {
      "type": "title" | "content" | "append" | "replace",
      "target": "optional section name for targeted edits",
      "newValue": "the new content or title",
      "reason": "why this edit is needed"
    }
  ],
  "explanation": "brief explanation of all edits",
  "confidence": 0.0-1.0
}

Be precise and only suggest edits that directly address the user's request.`;

    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Parse the response
    const textContent = response.choices[0]?.message?.content || "";
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse LLM response");
    }

    const result = JSON.parse(jsonMatch[0]) as EditOutput;
    return result;
  } catch (error) {
    console.error("[editingAgent] Error generating edits:", error);
    throw error;
  }
}

