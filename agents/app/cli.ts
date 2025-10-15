/*
  agents/app/cli.ts
  Minimal CLI to run agent demo scenarios end-to-end using local tools.

  Usage:
    npx tsx agents/app/cli.ts agents/app/demo_scenarios/task_spec_1.json
*/

import { promises as fs } from 'fs';
import path from 'path';
import { makePlan } from '../core/plan';
import { orchestrate } from '../core/orchestrator';
import { InMemoryStore } from '../core/memory';
import { Trace } from '../core/trace';
import { assertions } from '../core/eval';
import { executePlan } from '../core/execute';
import type { Tool, ToolsRegistry } from '../core/execute';

// Tools
import { searchTool } from '../tools/search';
import { fetchUrlTool } from '../tools/fetchUrl';
import { answerTool, summarizeTool } from '../tools/openai';
import { structuredTool } from '../tools/structured';
import { codeExecTool } from '../tools/codeExec';
import { filterImages, validateImageUrl } from '../tools/imageCollector';
import type { ImageMetadata } from '../tools/imageCollector';
import { analyzeImageMultiModel } from '../tools/visionAnalysis';
import type { VisualLLMAnalysis } from '../tools/visionAnalysis';
import { createContextStoreFromEnv } from '../data/contextStore';
import { buildTripPlanningGraph } from '../graphs/tripPlanning';

const DEFAULT_FILTERS = {
  validOnly: true,
  formats: ['jpeg', 'jpg', 'png'],
  maxSize: 500 * 1024, // 500 KB
};

const DEFAULT_VISION_PROMPT = `
Analyze this VR avatar image for quality issues.

Detect:
1. Visual artifacts (redlines, distortions, glitches)
2. Movement quality issues (frozen feet, static fingers)
3. Eye rendering problems (red lines, artifacts)
4. Clothing distortions

Rate on 1-5 scale:
- movementMotion (1=worst/frozen, 5=best/natural)
- visualQuality (1=worst/distorted, 5=best/clean)
- emotionalComfort (1=worst/unsettling, 5=best/comfortable)

Provide confidence score 0-1.
`.trim();

const DEFAULT_VISION_MODELS: Array<'gpt-5-mini' | 'gemini-2.5-flash'> = [
  'gpt-5-mini',
  'gemini-2.5-flash',
];

type DatasetPayload = {
  images: ImageMetadata[];
  summary?: Record<string, unknown>;
};

type FilterPayload = {
  dataset: DatasetPayload | ImageMetadata[];
  filters?: Partial<{
    minWidth: number;
    minHeight: number;
    maxSize: number;
    validOnly: boolean;
    formats: string[];
  }>;
};

type VisionPayload = {
  dataset: DatasetPayload | FilterResult;
  analysisPrompt?: string;
  models?: Array<'gpt-5-mini' | 'gemini-2.5-flash'>;
  apiKeys?: { openai?: string; google?: string };
};

type FilterResult = {
  images: ImageMetadata[];
  filters: Partial<FilterPayload['filters']>;
  summary: {
    total: number;
    kept: number;
    removed: number;
  };
};

type VisionSummary = {
  models: Array<'gpt-5-mini' | 'gemini-2.5-flash'>;
  skippedModels: Array<'gpt-5-mini' | 'gemini-2.5-flash'>;
  results: Record<string, VisualLLMAnalysis[]>;
  errors: Array<{ imageId: string; error: string }>;
  imagesAnalyzed: number;
};

function parseJson<T>(value: unknown): T | null {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeImages(input: unknown): ImageMetadata[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, index) => {
      const maybe = item as Record<string, any> | null;
      if (!maybe) return null;
      const url = typeof maybe.url === 'string' ? maybe.url : '';
      if (!url) return null;
      return {
        imageId: String(maybe.imageId ?? maybe.id ?? `image_${index + 1}`),
        url,
        name: typeof maybe.name === 'string' ? maybe.name : `Image ${index + 1}`,
        description: typeof maybe.description === 'string' ? maybe.description : '',
        source: typeof maybe.source === 'string' ? maybe.source : 'unknown',
        width: typeof maybe.width === 'number' ? maybe.width : undefined,
        height: typeof maybe.height === 'number' ? maybe.height : undefined,
        format: typeof maybe.format === 'string' ? maybe.format : undefined,
        size: typeof maybe.size === 'number' ? maybe.size : undefined,
        isValid: Boolean(maybe.isValid),
        validationError: typeof maybe.validationError === 'string' ? maybe.validationError : undefined,
      } as ImageMetadata;
    })
    .filter((img): img is ImageMetadata => Boolean(img));
}

function coerceDataset(value: unknown): DatasetPayload {
  if (!value) return { images: [] };
  if (Array.isArray(value)) {
    return { images: normalizeImages(value) };
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.images)) {
      return {
        images: normalizeImages(obj.images),
        summary: typeof obj.summary === 'object' ? (obj.summary as Record<string, unknown>) : undefined,
      };
    }
  }
  return { images: [] };
}

const imageValidationTool: Tool = async (args, ctx) => {
  const dataset = coerceDataset(args?.images ?? args?.dataset ?? args?.payload ?? args);
  const { images } = dataset;
  ctx.trace.info('tool.image.validate.start', { total: images.length });

  const enriched: ImageMetadata[] = [];
  let validCount = 0;
  let invalidCount = 0;
  const errors: Array<{ imageId: string; error: string }> = [];

  for (const image of images) {
    if (!image.url) {
      errors.push({ imageId: image.imageId, error: 'Missing URL' });
      continue;
    }
    try {
      const validation = await validateImageUrl(image.url);
      const contentType = validation.contentType || '';
      const format = contentType.startsWith('image/') ? contentType.split('/').pop() : image.format;
      const item: ImageMetadata = {
        ...image,
        format: format || image.format,
        size: validation.size ?? image.size,
        isValid: Boolean(validation.isValid),
        validationError: validation.isValid ? undefined : validation.error,
      };
      if (validation.isValid) validCount += 1;
      else invalidCount += 1;
      enriched.push(item);
    } catch (error) {
      errors.push({ imageId: image.imageId, error: error instanceof Error ? error.message : String(error) });
      enriched.push({
        ...image,
        isValid: false,
        validationError: error instanceof Error ? error.message : String(error),
      });
      invalidCount += 1;
    }
  }

  const summary = {
    total: images.length,
    valid: validCount,
    invalid: invalidCount,
    errors,
  };
  ctx.memory.putDoc(`image_validation_summary_${Date.now()}`, JSON.stringify(summary));
  ctx.trace.info('tool.image.validate.done', summary);
  return { images: enriched, summary } satisfies DatasetPayload & { summary: typeof summary };
};

const imageFilteringTool: Tool = async (args, ctx) => {
  const payload = args as FilterPayload;
  const dataset = coerceDataset(payload?.dataset ?? payload?.images ?? payload);
  const filters = payload?.filters && typeof payload.filters === 'object' ? payload.filters : {};

  const normalizedFilters = {
    minWidth: typeof filters.minWidth === 'number' ? filters.minWidth : undefined,
    minHeight: typeof filters.minHeight === 'number' ? filters.minHeight : undefined,
    maxSize:
      typeof filters.maxSize === 'number'
        ? filters.maxSize
        : DEFAULT_FILTERS.maxSize,
    validOnly:
      typeof filters.validOnly === 'boolean'
        ? filters.validOnly
        : DEFAULT_FILTERS.validOnly,
    formats: Array.isArray(filters.formats) && filters.formats.length
      ? filters.formats.map((f) => String(f).toLowerCase())
      : DEFAULT_FILTERS.formats,
  };

  ctx.trace.info('tool.image.filter.start', {
    total: dataset.images.length,
    filters: normalizedFilters,
  });

  const filtered = filterImages(dataset.images, normalizedFilters);
  const summary = {
    total: dataset.images.length,
    kept: filtered.length,
    removed: dataset.images.length - filtered.length,
  };

  const result: FilterResult = {
    images: filtered,
    filters: normalizedFilters,
    summary,
  };

  ctx.memory.putDoc(`image_filter_summary_${Date.now()}`, JSON.stringify(summary));
  ctx.trace.info('tool.image.filter.done', summary);
  return result;
};

const visionParallelTool: Tool = async (args, ctx) => {
  const payload = args as VisionPayload;
  const dataset = coerceDataset(payload?.dataset ?? payload?.images ?? payload);
  const analysisPrompt = typeof payload?.analysisPrompt === 'string' && payload.analysisPrompt.trim().length
    ? payload.analysisPrompt
    : DEFAULT_VISION_PROMPT;

  const requestedModels = Array.isArray(payload?.models) && payload.models.length
    ? (payload.models as Array<'gpt-5-mini' | 'gemini-2.5-flash'>)
    : DEFAULT_VISION_MODELS;

  const envOpenAI = process.env.OPENAI_API_KEY || process.env.CONVEX_OPENAI_API_KEY;
  const envGoogle = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;

  const openaiKey = payload?.apiKeys?.openai || envOpenAI || '';
  const googleKey = payload?.apiKeys?.google || envGoogle || '';

  const availableModels = requestedModels.filter((model) => {
    if (model === 'gpt-5-mini') return Boolean(openaiKey);
    if (model === 'gemini-2.5-flash') return Boolean(googleKey);
    return false;
  });
  const skippedModels = requestedModels.filter((model) => !availableModels.includes(model));

  ctx.trace.info('tool.vision.multi.start', {
    totalImages: dataset.images.length,
    requestedModels,
    availableModels,
    skippedModels,
  });

  if (availableModels.length === 0) {
    const summary: VisionSummary = {
      models: [],
      skippedModels: requestedModels,
      results: {},
      errors: [{ imageId: 'all', error: 'No API keys configured for vision analysis' }],
      imagesAnalyzed: 0,
    };
    ctx.memory.putDoc(`vision_analysis_summary_${Date.now()}`, JSON.stringify(summary));
    return summary;
  }

  const results: Record<string, VisualLLMAnalysis[]> = {};
  const errors: Array<{ imageId: string; error: string }> = [];

  for (const model of availableModels) {
    results[model] = [];
  }

  for (const image of dataset.images) {
    if (!image.url) {
      errors.push({ imageId: image.imageId, error: 'Missing image URL' });
      continue;
    }
    try {
      const perModel = await analyzeImageMultiModel(
        image.url,
        image.imageId,
        analysisPrompt,
        availableModels,
        { openai: openaiKey || undefined, google: googleKey || undefined }
      );

      for (const model of availableModels) {
        const analysis = perModel[model];
        if (analysis) {
          results[model].push(analysis);
        }
      }
    } catch (error) {
      errors.push({
        imageId: image.imageId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const summary: VisionSummary = {
    models: availableModels,
    skippedModels,
    results,
    errors,
    imagesAnalyzed: dataset.images.length,
  };

  ctx.memory.putDoc(`vision_analysis_summary_${Date.now()}`, JSON.stringify(summary));
  ctx.trace.info('tool.vision.multi.done', {
    imagesAnalyzed: summary.imagesAnalyzed,
    models: summary.models,
    skippedModels: summary.skippedModels,
    errorCount: summary.errors.length,
  });

  return summary;
};

async function main() {
  const specPath = process.argv[2];
  if (!specPath) {
    console.error('Usage: cli.ts <path-to-task-spec.json>');
    process.exit(1);
  }
  const abs = path.resolve(process.cwd(), specPath);
  const raw = await fs.readFile(abs, 'utf-8');
  const taskSpec = JSON.parse(raw);

  const trace = new Trace();
  const memory = new InMemoryStore();
  const data = createContextStoreFromEnv() || null; // optional Convex store when AGENTS_DATA=convex

  const tools: ToolsRegistry = {
    'web.search': searchTool({ root: path.resolve(process.cwd(), 'agents/app/demo_scenarios') }),
    'web.fetch': fetchUrlTool(),
    'answer': answerTool,
    'summarize': summarizeTool,
    'structured': structuredTool,
    'code.exec': codeExecTool(),
    'image.validate': imageValidationTool,
    'image.filter': imageFilteringTool,
    'vision.multi': visionParallelTool,
  };

  trace.info('taskSpec.loaded', { path: abs, type: taskSpec.type, goal: taskSpec.goal });

  if (taskSpec.type === 'orchestrate') {
    trace.info('orchestrate.mode', { topic: taskSpec.topic || taskSpec.goal });

    // If tripPlanning input is provided, build the graph
    if (taskSpec.tripPlanning) {
      trace.info('tripPlanning.detected', taskSpec.tripPlanning);
      const graph = buildTripPlanningGraph(taskSpec.tripPlanning);
      taskSpec.graph = graph;
    }

    const orch = await orchestrate({ taskSpec, tools, trace, data });
    const summary = { success: orch.success, result: orch.result, artifacts: orch.artifacts, logsCount: trace.count() };
    console.log(JSON.stringify({ event: 'final', data: summary }));
    return;
  }

  const plan = makePlan({ taskSpec, state: { docs: memory.docsSnapshot() } });
  trace.info('plan.created', { groups: plan.groups.length, type: taskSpec.type });

  const execResult = await executePlan({ plan, tools, memory, trace, data, constraints: taskSpec.constraints });

  // Optional lightweight validation
  try {
    if (taskSpec.type === 'research') {
      assertions.assertIncludes(String(execResult.result || ''), taskSpec.input.query);
    }
  } catch (e) {
    trace.warn('validation.failed', { message: (e as Error).message });
  }

  const summary = {
    success: execResult.success,
    result: execResult.result,
    artifacts: memory.docsSnapshot(),
    logsCount: trace.count(),
  };

  // Emit final outputs
  console.log(JSON.stringify({ event: 'final', data: summary }));
}

main().catch((err) => {
  console.error(JSON.stringify({ event: 'error', data: { message: String(err?.message || err) } }));
  process.exit(1);
});

