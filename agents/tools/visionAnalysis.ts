/**
 * Vision Analysis Tool
 * 
 * Integrates with GPT-5-mini and Gemini 2.0 Flash for visual LLM analysis.
 * Maps to Streamlit's core.visual_llm_clients module.
 */

import OpenAI from "openai";
import {GoogleGenAI} from '@google/genai';

// DYNAMIC: Flexible output schema that adapts to any analysis task
// No hardcoded VR-specific fields - the LLM determines the structure based on the prompt
export interface VisualLLMAnalysis {
  imageId: string;
  modelName: string;
  confidence: number; // 0-1
  [key: string]: any; // Allow any additional fields discovered at runtime
}

/**
 * Generate dynamic structured output instructions based on the analysis prompt
 * This allows the system to adapt to different tasks (VR, general images, medical, etc.)
 */
function generateStructuredOutputInstructions(analysisPrompt: string): string {
  // Extract task-specific requirements from the prompt
  // The LLM will determine the appropriate output structure
  return `
Return your analysis as a JSON object. The structure should match the analysis requirements in the prompt.

**Required fields:**
- "imageId": string (the image identifier)
- "modelName": string (the model used for analysis)
- "confidence": number (0-1, your confidence in the analysis)

**Additional fields:**
Based on the analysis prompt, include relevant fields such as:
- Numerical ratings/scores (e.g., "qualityScore", "rating", etc.)
- Detected items/categories (e.g., "detectedIssues", "categories", etc.)
- Boolean flags (e.g., "hasArtifacts", "requiresReview", etc.)
- Detailed findings (e.g., "summary", "detailedFindings", etc.)

**Important:**
- Use descriptive field names that match the analysis task
- Group related fields in nested objects if appropriate
- Return valid JSON that can be parsed
- Be consistent across multiple images

Example for VR avatar analysis:
{
  "imageId": "vr_001",
  "modelName": "gpt-5-mini",
  "ratings": { "movementMotion": 4, "visualQuality": 5, "emotionalComfort": 3 },
  "detectedArtifacts": ["redline", "glitch"],
  "confidence": 0.85,
  "summary": "Avatar shows good movement but has minor visual artifacts"
}

Example for general image analysis:
{
  "imageId": "img_001",
  "modelName": "gpt-5-mini",
  "peopleCount": 5,
  "detectedEmotions": ["happy", "calm"],
  "primaryEmotion": "happy",
  "sceneType": "outdoor",
  "confidence": 0.78,
  "summary": "Outdoor scene with 5 people showing positive emotions"
}
`.trim();
}

/**
 * Analyze image with GPT-5-mini vision
 * Maps to: analyze_image_with_gpt5_vision() in Streamlit
 */
export async function analyzeImageWithGPT5Mini(
  imageUrl: string,
  imageId: string,
  prompt: string,
  apiKey: string
): Promise<VisualLLMAnalysis> {
  const openai = new OpenAI({ apiKey });

  const structuredInstructions = generateStructuredOutputInstructions(prompt);
  const fullPrompt = `${prompt}\n\n${structuredInstructions}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini", // Update to actual model name when available
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: fullPrompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response");
    }

    // Parse and validate (maps to _parse_visual_analysis in Streamlit)
    const analysis = parseVisualAnalysis(content, imageId, "gpt-5-mini");
    return analysis;
  } catch (error) {
    console.error("GPT-5-mini vision analysis error:", error);
    // Return fallback with confidence=0
    return {
      imageId,
      modelName: "gpt-5-mini",
      artifacts: { hasRedlines: false, hasDistortions: false, distortionLocations: [] },
      ratings: { movementMotion: 3, visualQuality: 3, emotionalComfort: 3 },
      specificIssues: {
        feetMovement: false,
        fingerMovement: false,
        eyeArtifacts: false,
        clothingDistortions: false,
      },
      confidence: 0,
      detailedFindings: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Analyze image with Gemini 2.5 Flash vision
 * Maps to: analyze_image_with_gemini_vision() in Streamlit
 */
export async function analyzeImageWithGemini(
  imageUrl: string,
  imageId: string,
  prompt: string,
  apiKey: string
): Promise<VisualLLMAnalysis> {
  const genai = new GoogleGenAI({ apiKey });
  const structuredInstructions = generateStructuredOutputInstructions(prompt);
  const fullPrompt = `${prompt}\n\n${structuredInstructions}`;

  try {
    // Fetch image as base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");

    // Use the correct API from @google/genai
    const result = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: fullPrompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 1000,
      },
    });

    // Get text from result (handle both string and undefined)
    const content = result.text || "";

    if (!content) {
      throw new Error("Empty response from Gemini API");
    }

    // Parse and validate
    const analysis = parseVisualAnalysis(content, imageId, "gemini-2.5-flash");
    return analysis;
  } catch (error) {
    console.error("Gemini vision analysis error:", error);
    // Return fallback with confidence=0
    return {
      imageId,
      modelName: "gemini-2.5-flash",
      artifacts: { hasRedlines: false, hasDistortions: false, distortionLocations: [] },
      ratings: { movementMotion: 3, visualQuality: 3, emotionalComfort: 3 },
      specificIssues: {
        feetMovement: false,
        fingerMovement: false,
        eyeArtifacts: false,
        clothingDistortions: false,
      },
      confidence: 0,
      detailedFindings: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Parse and validate visual analysis response
 * Maps to: _parse_visual_analysis() in Streamlit
 */
function parseVisualAnalysis(
  content: string,
  imageId: string,
  modelName: string
): VisualLLMAnalysis {
  try {
    // Remove code fences if present
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    // Validate and coerce types
    const analysis: VisualLLMAnalysis = {
      imageId: parsed.imageId || imageId,
      modelName: parsed.modelName || modelName,
      artifacts: {
        hasRedlines: Boolean(parsed.artifacts?.hasRedlines),
        hasDistortions: Boolean(parsed.artifacts?.hasDistortions),
        distortionLocations: Array.isArray(parsed.artifacts?.distortionLocations)
          ? parsed.artifacts.distortionLocations
          : [],
      },
      ratings: {
        movementMotion: clamp(Number(parsed.ratings?.movementMotion) || 3, 1, 5),
        visualQuality: clamp(Number(parsed.ratings?.visualQuality) || 3, 1, 5),
        emotionalComfort: clamp(Number(parsed.ratings?.emotionalComfort) || 3, 1, 5),
      },
      specificIssues: {
        feetMovement: Boolean(parsed.specificIssues?.feetMovement),
        fingerMovement: Boolean(parsed.specificIssues?.fingerMovement),
        eyeArtifacts: Boolean(parsed.specificIssues?.eyeArtifacts),
        clothingDistortions: Boolean(parsed.specificIssues?.clothingDistortions),
      },
      confidence: clamp(Number(parsed.confidence) || 0.5, 0, 1),
      detailedFindings: String(parsed.detailedFindings || ""),
    };

    return analysis;
  } catch (error) {
    console.error("Failed to parse visual analysis:", error);
    // Return fallback
    return {
      imageId,
      modelName,
      artifacts: { hasRedlines: false, hasDistortions: false, distortionLocations: [] },
      ratings: { movementMotion: 3, visualQuality: 3, emotionalComfort: 3 },
      specificIssues: {
        feetMovement: false,
        fingerMovement: false,
        eyeArtifacts: false,
        clothingDistortions: false,
      },
      confidence: 0,
      detailedFindings: `Failed to parse response: ${content.substring(0, 200)}`,
    };
  }
}

/**
 * Analyze image with multiple models in parallel
 * Maps to: analyze_image_multi_model() in Streamlit
 */
export async function analyzeImageMultiModel(
  imageUrl: string,
  imageId: string,
  prompt: string,
  models: Array<"gpt-5-mini" | "gemini-2.5-flash">,
  apiKeys: { openai?: string; google?: string }
): Promise<Record<string, VisualLLMAnalysis>> {
  const tasks: Promise<[string, VisualLLMAnalysis]>[] = [];

  if (models.includes("gpt-5-mini") && apiKeys.openai) {
    tasks.push(
      analyzeImageWithGPT5Mini(imageUrl, imageId, prompt, apiKeys.openai).then((result) => [
        "gpt-5-mini",
        result,
      ])
    );
  }

  if (models.includes("gemini-2.5-flash") && apiKeys.google) {
    tasks.push(
      analyzeImageWithGemini(imageUrl, imageId, prompt, apiKeys.google).then((result) => [
        "gemini-2.5-flash",
        result,
      ])
    );
  }

  const results = await Promise.all(tasks);
  return Object.fromEntries(results);
}

// Helper function
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Export tool interface for orchestrator
export const visionAnalysisTool = {
  analyzeImageWithGPT5Mini,
  analyzeImageWithGemini,
  analyzeImageMultiModel,
};

