/**
 * X-Ray Workflow - Complete pipeline for finding and classifying medical X-ray images
 * 
 * This action orchestrates:
 * 1. Search for medical X-ray images using Linkup
 * 2. Store images in Convex for real-time display
 * 3. Classify images using vision LLMs
 * 4. Update classification results in Convex
 */

"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { searchMedicalXRayImages } from "../../agents/tools/imageSearch";
import { classifyXRayImagesBatch } from "../../agents/tools/xrayClassification";

export const runXRayWorkflow = action({
  args: {
    timelineId: v.id("agentTimelines"),
    taskId: v.optional(v.id("agentTasks")),
    condition: v.optional(v.string()),
    maxImages: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    imagesFound: v.number(),
    imagesClassified: v.number(),
    imageIds: v.array(v.id("agentImageResults")),
    classifications: v.array(v.any()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    success: boolean;
    imagesFound: number;
    imagesClassified: number;
    imageIds: Array<any>;
    classifications: Array<any>;
    error?: string;
  }> => {
    const { timelineId, taskId, condition, maxImages = 10 } = args;

    try {
      // Step 1: Search for medical X-ray images
      console.log(`[xrayWorkflow] Searching for medical X-ray images: ${condition || 'general'}`);
      const images = await searchMedicalXRayImages(condition, maxImages);
      console.log(`[xrayWorkflow] Found ${images.length} images`);

      if (images.length === 0) {
        return {
          success: false,
          imagesFound: 0,
          imagesClassified: 0,
          imageIds: [],
          classifications: [],
          error: 'No images found',
        };
      }

      // Step 2: Store images in Convex for real-time display
      console.log(`[xrayWorkflow] Storing ${images.length} images in Convex`);
      const imageIds: Array<any> = await ctx.runMutation(api.agentImageResults.addImageResultsBatch, {
        timelineId,
        taskId,
        images: images.map((img) => ({
          imageUrl: img.imageUrl,
          sourceUrl: img.sourceUrl,
          title: img.title,
          thumbnailUrl: img.thumbnailUrl,
          width: img.width,
          height: img.height,
          format: img.format,
          metadata: img.metadata,
        })),
      });
      console.log(`[xrayWorkflow] Stored ${imageIds.length} images`);

      // Step 3: Classify images using vision LLMs
      console.log(`[xrayWorkflow] Classifying ${images.length} images`);
      const imageUrls = images.map((img) => img.imageUrl);
      const classifications = await classifyXRayImagesBatch(imageUrls);
      console.log(`[xrayWorkflow] Classified ${classifications.length} images`);

      // Step 4: Update classification results in Convex
      console.log(`[xrayWorkflow] Updating classification results`);
      for (let i = 0; i < classifications.length; i++) {
        const classification = classifications[i];
        const imageId = imageIds[i];

        if (imageId && classification) {
          await ctx.runMutation(api.agentImageResults.updateImageClassification, {
            imageId,
            classification: classification.classification,
            classificationConfidence: classification.confidence,
            classificationDetails: {
              findings: classification.findings,
              modelResults: classification.modelResults,
              metadata: classification.metadata,
            },
          });
        }
      }
      console.log(`[xrayWorkflow] Updated ${classifications.length} classification results`);

      return {
        success: true,
        imagesFound: images.length,
        imagesClassified: classifications.length,
        imageIds,
        classifications: classifications.map((c) => ({
          imageUrl: c.imageUrl,
          classification: c.classification,
          confidence: c.confidence,
          findings: c.findings,
        })),
      };
    } catch (error) {
      console.error('[xrayWorkflow] Workflow failed:', error);
      return {
        success: false,
        imagesFound: 0,
        imagesClassified: 0,
        imageIds: [],
        classifications: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

/**
 * Simplified workflow for orchestrator integration
 */
export const searchAndClassifyXRays = action({
  args: {
    timelineId: v.id("agentTimelines"),
    taskId: v.optional(v.id("agentTasks")),
    query: v.string(),
    maxImages: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const result: any = await ctx.runAction(api.agents.xrayWorkflow.runXRayWorkflow, {
      timelineId: args.timelineId,
      taskId: args.taskId,
      condition: args.query,
      maxImages: args.maxImages || 10,
    });

    return {
      success: result.success,
      message: result.success
        ? `Found and classified ${result.imagesClassified} X-ray images`
        : `Workflow failed: ${result.error}`,
      data: {
        imagesFound: result.imagesFound,
        imagesClassified: result.imagesClassified,
        classifications: result.classifications,
      },
      sources: result.classifications.map((c: any) => ({
        url: c.imageUrl,
        title: c.classification,
        snippet: `Confidence: ${(c.confidence * 100).toFixed(1)}% | Severity: ${c.findings.severity}`,
      })),
    };
  },
});

