/**
 * Data Access Agent
 * 
 * Specialist agent for calendar, tasks, and file operations.
 * Uses direct AI SDK generateText for reliable tool calling.
 */
"use node";

import { v } from "convex/values";
import { action } from "../../../_generated/server";
import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

import { getDataAccessSystemPrompt, type ListEventsInput, type ListTasksInput } from "./config";
import { executeListEvents, executeCreateEvent } from "./tools/calendarTools";
import { executeListTasks, executeCreateTask, executeUpdateTask } from "./tools/taskTools";
import { listEventsSchema, createEventSchema, listTasksSchema, createTaskSchema, updateTaskSchema } from "./config";

// Model name mapping: catalog names → real API model names
// Based on shared/llm/modelCatalog.ts
const MODEL_MAP: Record<string, string> = {
  // GPT-5.1 Series → gpt-4o (latest)
  'gpt-5.1': 'gpt-4o',
  'gpt-5.1-codex': 'gpt-4o',
  // GPT-5 Series → gpt-4o-mini
  'gpt-5-mini': 'gpt-4o-mini',
  'gpt-5-nano': 'gpt-4o-mini',
  'gpt-5': 'gpt-4o',
  // GPT-4.1 Series → gpt-4o-mini (fallback)
  'gpt-4.1-mini': 'gpt-4o-mini',
  'gpt-4.1-nano': 'gpt-4o-mini',
  'gpt-4.1': 'gpt-4o',
};

function getModel(modelName: string) {
  const resolved = MODEL_MAP[modelName] || modelName;
  if (resolved.startsWith("claude-")) return anthropic(resolved);
  if (resolved.startsWith("gemini-")) return google(resolved);
  return openai(resolved);
}

/**
 * Data Access Agent - Query with tools
 */
export const query = action({
  args: {
    prompt: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const modelName = args.model || "gpt-4o-mini";
    console.log(`[DataAccessAgent] Model: ${modelName}, Prompt: ${args.prompt.substring(0, 100)}...`);

    try {
      const result = await generateText({
        model: getModel(modelName),
        maxRetries: 3,
        stopWhen: stepCountIs(5),
        tools: {
          listEvents: {
            description: "List calendar events for a time range (today, tomorrow, week, month)",
            inputSchema: listEventsSchema,
            execute: async (input: ListEventsInput) => executeListEvents(ctx, input),
          },
          listTasks: {
            description: "List tasks/todos with optional filtering by time and status",
            inputSchema: listTasksSchema,
            execute: async (input: ListTasksInput) => executeListTasks(ctx, input),
          },
        },
        system: getDataAccessSystemPrompt(),
        prompt: args.prompt,
      });

      console.log(`[DataAccessAgent] Steps: ${result.steps?.length || 0}, Tool calls: ${result.toolCalls?.length || 0}`);
      return result.text || "No response generated.";
    } catch (error: any) {
      console.error(`[DataAccessAgent] Error:`, error);
      return `Error: ${error.message}`;
    }
  },
});

/**
 * Data Access Agent - Full capabilities (read + write)
 */
export const execute = action({
  args: {
    prompt: v.string(),
    model: v.optional(v.string()),
    allowWrites: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<string> => {
    const modelName = args.model || "gpt-4o-mini";
    const allowWrites = args.allowWrites ?? false;
    
    console.log(`[DataAccessAgent.execute] Model: ${modelName}, Writes: ${allowWrites}`);

    // Build tools based on permissions
    const tools: Record<string, any> = {
      listEvents: {
        description: "List calendar events for a time range",
        inputSchema: listEventsSchema,
        execute: async (input: ListEventsInput) => executeListEvents(ctx, input),
      },
      listTasks: {
        description: "List tasks/todos with filtering",
        inputSchema: listTasksSchema,
        execute: async (input: ListTasksInput) => executeListTasks(ctx, input),
      },
    };

    // Add write tools if allowed
    if (allowWrites) {
      tools.createEvent = {
        description: "Create a new calendar event",
        inputSchema: createEventSchema,
        execute: async (input: any) => executeCreateEvent(ctx, input),
      };
      tools.createTask = {
        description: "Create a new task",
        inputSchema: createTaskSchema,
        execute: async (input: any) => executeCreateTask(ctx, input),
      };
      tools.updateTask = {
        description: "Update an existing task",
        inputSchema: updateTaskSchema,
        execute: async (input: any) => executeUpdateTask(ctx, input),
      };
    }

    try {
      const result = await generateText({
        model: getModel(modelName),
        maxRetries: 3,
        stopWhen: stepCountIs(7),
        tools,
        system: getDataAccessSystemPrompt(),
        prompt: args.prompt,
      });

      return result.text || "No response generated.";
    } catch (error: any) {
      console.error(`[DataAccessAgent.execute] Error:`, error);
      return `Error: ${error.message}`;
    }
  },
});
