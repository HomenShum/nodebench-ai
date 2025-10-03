/**
 * Agent Image Results - Store and retrieve images found during agent execution
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Add an image result to a timeline
 */
export const addImageResult = mutation({
  args: {
    timelineId: v.id("agentTimelines"),
    taskId: v.optional(v.id("agentTasks")),
    imageUrl: v.string(),
    sourceUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    format: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.id("agentImageResults"),
  handler: async (ctx, args) => {
    const imageId = await ctx.db.insert("agentImageResults", {
      timelineId: args.timelineId,
      taskId: args.taskId,
      imageUrl: args.imageUrl,
      sourceUrl: args.sourceUrl,
      title: args.title,
      thumbnailUrl: args.thumbnailUrl,
      width: args.width,
      height: args.height,
      format: args.format,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
    return imageId;
  },
});

/**
 * Update image classification results
 */
export const updateImageClassification = mutation({
  args: {
    imageId: v.id("agentImageResults"),
    classification: v.string(),
    classificationConfidence: v.optional(v.number()),
    classificationDetails: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.imageId, {
      classification: args.classification,
      classificationConfidence: args.classificationConfidence,
      classificationDetails: args.classificationDetails,
    });
    return null;
  },
});

/**
 * Get all images for a timeline
 */
export const getImagesByTimeline = query({
  args: {
    timelineId: v.id("agentTimelines"),
  },
  returns: v.array(
    v.object({
      _id: v.id("agentImageResults"),
      _creationTime: v.number(),
      timelineId: v.id("agentTimelines"),
      taskId: v.optional(v.id("agentTasks")),
      imageUrl: v.string(),
      sourceUrl: v.optional(v.string()),
      title: v.optional(v.string()),
      thumbnailUrl: v.optional(v.string()),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      format: v.optional(v.string()),
      classification: v.optional(v.string()),
      classificationConfidence: v.optional(v.number()),
      classificationDetails: v.optional(v.any()),
      metadata: v.optional(v.any()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("agentImageResults")
      .withIndex("by_timeline", (q) => q.eq("timelineId", args.timelineId))
      .order("desc")
      .collect();
    return images;
  },
});

/**
 * Get images for a specific task
 */
export const getImagesByTask = query({
  args: {
    taskId: v.id("agentTasks"),
  },
  returns: v.array(
    v.object({
      _id: v.id("agentImageResults"),
      _creationTime: v.number(),
      timelineId: v.id("agentTimelines"),
      taskId: v.optional(v.id("agentTasks")),
      imageUrl: v.string(),
      sourceUrl: v.optional(v.string()),
      title: v.optional(v.string()),
      thumbnailUrl: v.optional(v.string()),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      format: v.optional(v.string()),
      classification: v.optional(v.string()),
      classificationConfidence: v.optional(v.number()),
      classificationDetails: v.optional(v.any()),
      metadata: v.optional(v.any()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("agentImageResults")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect();
    return images;
  },
});

/**
 * Delete an image result
 */
export const deleteImageResult = mutation({
  args: {
    imageId: v.id("agentImageResults"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.imageId);
    return null;
  },
});

/**
 * Batch add multiple images
 */
export const addImageResultsBatch = mutation({
  args: {
    timelineId: v.id("agentTimelines"),
    taskId: v.optional(v.id("agentTasks")),
    images: v.array(
      v.object({
        imageUrl: v.string(),
        sourceUrl: v.optional(v.string()),
        title: v.optional(v.string()),
        thumbnailUrl: v.optional(v.string()),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        format: v.optional(v.string()),
        metadata: v.optional(v.any()),
      })
    ),
  },
  returns: v.array(v.id("agentImageResults")),
  handler: async (ctx, args) => {
    const imageIds = [];
    for (const image of args.images) {
      const imageId = await ctx.db.insert("agentImageResults", {
        timelineId: args.timelineId,
        taskId: args.taskId,
        imageUrl: image.imageUrl,
        sourceUrl: image.sourceUrl,
        title: image.title,
        thumbnailUrl: image.thumbnailUrl,
        width: image.width,
        height: image.height,
        format: image.format,
        metadata: image.metadata,
        createdAt: Date.now(),
      });
      imageIds.push(imageId);
    }
    return imageIds;
  },
});

