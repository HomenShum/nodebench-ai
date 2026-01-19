"use node";

/**
 * Gemini Video API Wrapper for Tool Router
 * 
 * Enables video transcription and content analysis using Gemini 1.5/2.0
 * for Instagram video ingestion pipeline.
 */

import { v } from "convex/values";
import { internalAction } from "../../../_generated/server";
import { internal } from "../../../_generated/api";
import { GoogleGenAI, createUserContent } from "@google/genai";
import { createHash } from "crypto";

const STORE_TO_STORAGE_CHARS = 250_000;
const MAX_INLINE_RAW_CONTENT_CHARS = 120_000;

function sha256Hex(input: string): string {
    return createHash("sha256").update(input).digest("hex");
}

function truncateForDb(input: string): string {
    if (input.length <= MAX_INLINE_RAW_CONTENT_CHARS) return input;
    return input.slice(0, MAX_INLINE_RAW_CONTENT_CHARS) + `\n\n<!-- TRUNCATED: ${input.length} chars -->\n`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface ExtractedClaim {
    claim: string;
    confidence: number;
    sourceTimestamp?: number;
    category?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Video Transcription
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Transcribe video content using Gemini 1.5/2.0 multimodal capabilities.
 * Routable through toolRouter for health-aware execution.
 */
export const transcribeVideo = internalAction({
    args: {
        videoUrl: v.string(),
        mimeType: v.optional(v.string()),
        extractClaims: v.optional(v.boolean()),
    },
    returns: v.object({
        success: v.boolean(),
        transcript: v.optional(v.string()),
        claims: v.optional(v.array(v.object({
            claim: v.string(),
            confidence: v.number(),
            sourceTimestamp: v.optional(v.number()),
            category: v.optional(v.string()),
        }))),
        error: v.optional(v.string()),
        durationSeconds: v.optional(v.number()),
    }),
    handler: async (ctx, args) => {
        console.log(`[geminiVideoWrapper] Transcribing video: ${args.videoUrl}`);

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: "Gemini API key not configured (GEMINI_API_KEY or GOOGLE_AI_API_KEY)",
            };
        }

        try {
            const ai = new GoogleGenAI({ apiKey });

            // For remote URLs, we need to either:
            // 1. Download and upload to Gemini File API
            // 2. Use inline base64 (for small videos)
            // Currently implementing URL-based approach with file upload

            const mimeType = args.mimeType || detectMimeType(args.videoUrl);

            // Download video to buffer
            const videoResponse = await fetch(args.videoUrl);
            if (!videoResponse.ok) {
                return {
                    success: false,
                    error: `Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`,
                };
            }

            const videoBlob = await videoResponse.blob();
            const videoBuffer = Buffer.from(await videoBlob.arrayBuffer());
            const videoBase64 = videoBuffer.toString("base64");

            // Transcription prompt
            const transcriptionPrompt = `Analyze this video and provide:
1. A complete, accurate transcription of all spoken content
2. Description of key visual elements and actions
3. Timestamps for major segments (approximate seconds from start)

Format your response as:
## Transcription
[Complete transcription of audio]

## Visual Summary
[Key visual elements and actions]

## Timestamps
- 0:00 - [description]
- [timestamp] - [description]`;

            // Use Gemini 1.5 Pro for video understanding
            const response = await ai.models.generateContent({
                model: "gemini-1.5-pro",
                contents: createUserContent([
                    { text: transcriptionPrompt },
                    {
                        inlineData: {
                            data: videoBase64,
                            mimeType,
                        },
                    },
                ]),
            });

            const transcriptText = response.text || "";

            // Persist transcript for citations / replayability (store large transcripts in Convex Storage)
            try {
                const contentHash = sha256Hex(transcriptText);
                let storageId: string | undefined;
                if (transcriptText.length >= STORE_TO_STORAGE_CHARS) {
                    const blob = new Blob([transcriptText], { type: "text/plain; charset=utf-8" });
                    storageId = await ctx.storage.store(blob);
                }

                const artifactResult = await ctx.runMutation(internal.domains.artifacts.sourceArtifacts.upsertSourceArtifact, {
                    sourceType: "video_transcript",
                    sourceUrl: args.videoUrl,
                    contentHash,
                    rawContent: storageId ? truncateForDb(transcriptText) : transcriptText,
                    rawStorageId: storageId as any,
                    mimeType: "text/plain; charset=utf-8",
                    sizeBytes: transcriptText.length,
                    title: "Video transcript",
                    extractedData: {
                        tool: "geminiTranscribe",
                        mimeType,
                        storageId,
                        contentLength: transcriptText.length,
                    },
                    fetchedAt: Date.now(),
                });

                await ctx.scheduler.runAfter(0, internal.domains.artifacts.evidenceIndexActions.indexArtifact, {
                    artifactId: artifactResult.id,
                });
            } catch (err) {
                console.warn("[geminiVideoWrapper] Failed to persist transcript as sourceArtifact", err);
            }

            // Extract claims if requested
            let claims: ExtractedClaim[] | undefined;
            if (args.extractClaims && transcriptText) {
                claims = await extractClaimsFromTranscript(ai, transcriptText);
            }

            // Estimate duration from timestamps in response (rough estimate)
            const durationMatch = transcriptText.match(/(\d+):(\d+)/g);
            let durationSeconds: number | undefined;
            if (durationMatch && durationMatch.length > 0) {
                const lastTimestamp = durationMatch[durationMatch.length - 1];
                const [mins, secs] = lastTimestamp.split(":").map(Number);
                durationSeconds = mins * 60 + secs;
            }

            return {
                success: true,
                transcript: transcriptText,
                claims,
                durationSeconds,
            };
        } catch (error) {
            console.error("[geminiVideoWrapper] Error:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// Claim Extraction
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract factual claims from video transcript for verification.
 */
async function extractClaimsFromTranscript(
    ai: GoogleGenAI,
    transcript: string
): Promise<ExtractedClaim[]> {
    const claimPrompt = `Analyze this video transcript and extract all factual claims made.
For each claim, provide:
- The exact claim being made
- Your confidence in correctly understanding the claim (0.0 to 1.0)
- Approximate timestamp if mentioned (in seconds)
- Category: "financial", "product", "health", "political", "scientific", "opinion"

Respond in JSON format:
{
  "claims": [
    {
      "claim": "exact claim text",
      "confidence": 0.85,
      "sourceTimestamp": 45,
      "category": "financial"
    }
  ]
}

Only extract concrete, verifiable claims. Skip opinions, questions, or vague statements.

Transcript:
${transcript.substring(0, 10000)}`; // Limit transcript length

    try {
        // Use faster Flash model for extraction
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: createUserContent([{ text: claimPrompt }]),
        });

        const responseText = response.text || "";

        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*"claims"[\s\S]*\}/);
        if (!jsonMatch) {
            console.log("[geminiVideoWrapper] No JSON found in claim extraction response");
            return [];
        }

        const parsed = JSON.parse(jsonMatch[0]);
        return (parsed.claims || []) as ExtractedClaim[];
    } catch (error) {
        console.error("[geminiVideoWrapper] Claim extraction error:", error);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Image Analysis
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyze image content and extract claims.
 */
export const analyzeImage = internalAction({
    args: {
        imageUrl: v.string(),
        extractClaims: v.optional(v.boolean()),
    },
    returns: v.object({
        success: v.boolean(),
        description: v.optional(v.string()),
        claims: v.optional(v.array(v.object({
            claim: v.string(),
            confidence: v.number(),
            category: v.optional(v.string()),
        }))),
        error: v.optional(v.string()),
    }),
    handler: async (ctx, args) => {
        console.log(`[geminiVideoWrapper] Analyzing image: ${args.imageUrl}`);

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: "Gemini API key not configured",
            };
        }

        try {
            const ai = new GoogleGenAI({ apiKey });

            // Download image
            const imageResponse = await fetch(args.imageUrl);
            if (!imageResponse.ok) {
                return {
                    success: false,
                    error: `Failed to fetch image: ${imageResponse.status}`,
                };
            }

            const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
            const imageBlob = await imageResponse.blob();
            const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());
            const imageBase64 = imageBuffer.toString("base64");

            const prompt = args.extractClaims
                ? `Analyze this image. Provide:
1. A detailed description of what's shown
2. Any text visible in the image
3. Any factual claims being made (e.g., product claims, statistics, assertions)

For claims, format as JSON at the end:
{"claims": [{"claim": "...", "confidence": 0.9, "category": "product"}]}`
                : "Describe this image in detail. Include any text visible and the context/purpose of the image.";

            const response = await ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: createUserContent([
                    { text: prompt },
                    { inlineData: { data: imageBase64, mimeType } },
                ]),
            });

            const responseText = response.text || "";

            // Extract claims if present
            let claims: ExtractedClaim[] | undefined;
            if (args.extractClaims) {
                const jsonMatch = responseText.match(/\{[\s\S]*"claims"[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const parsed = JSON.parse(jsonMatch[0]);
                        claims = parsed.claims;
                    } catch (e) {
                        // No valid JSON found
                    }
                }
            }

            // Persist image analysis for citations / replayability
            try {
                const contentHash = sha256Hex(responseText);
                let storageId: string | undefined;
                if (responseText.length >= STORE_TO_STORAGE_CHARS) {
                    const blob = new Blob([responseText], { type: "text/plain; charset=utf-8" });
                    storageId = await ctx.storage.store(blob);
                }

                const artifactResult = await ctx.runMutation(internal.domains.artifacts.sourceArtifacts.upsertSourceArtifact, {
                    sourceType: "api_response",
                    sourceUrl: args.imageUrl,
                    contentHash,
                    rawContent: storageId ? truncateForDb(responseText) : responseText,
                    rawStorageId: storageId as any,
                    mimeType: "text/plain; charset=utf-8",
                    sizeBytes: responseText.length,
                    title: "Image analysis",
                    extractedData: {
                        tool: "geminiAnalyzeImage",
                        storageId,
                        contentLength: responseText.length,
                    },
                    fetchedAt: Date.now(),
                });

                await ctx.scheduler.runAfter(0, internal.domains.artifacts.evidenceIndexActions.indexArtifact, {
                    artifactId: artifactResult.id,
                });
            } catch (err) {
                console.warn("[geminiVideoWrapper] Failed to persist image analysis as sourceArtifact", err);
            }

            return {
                success: true,
                description: responseText.replace(/\{[\s\S]*"claims"[\s\S]*\}/, "").trim(),
                claims,
            };
        } catch (error) {
            console.error("[geminiVideoWrapper] Error:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    },
});

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

function detectMimeType(url: string): string {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes(".mp4")) return "video/mp4";
    if (lowerUrl.includes(".webm")) return "video/webm";
    if (lowerUrl.includes(".mov")) return "video/quicktime";
    if (lowerUrl.includes(".avi")) return "video/x-msvideo";
    if (lowerUrl.includes(".mkv")) return "video/x-matroska";
    return "video/mp4"; // Default
}
