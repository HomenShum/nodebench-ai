/**
 * Flicker Detection tools — Android UI flicker analysis via 4-layer pipeline.
 *
 * Calls the flicker_detection Python FastAPI server over HTTP.
 * Requires FLICKER_SERVER_URL env var (default: http://localhost:8006).
 *
 * Layers:
 *   L0: SurfaceFlinger + Logcat (jank metrics)
 *   L1: adb screenrecord (triggered recording)
 *   L2: Frame extraction + block-based SSIM analysis
 *   L3: Optional GPT semantic verification
 */

import type { McpTool } from "../types.js";

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function getFlickerConfig(): { serverUrl: string } | null {
  const serverUrl = process.env.FLICKER_SERVER_URL;
  if (!serverUrl) return null;
  return { serverUrl: serverUrl.replace(/\/$/, "") };
}

async function flickerPost(
  toolName: string,
  params: Record<string, unknown>,
): Promise<any> {
  const config = getFlickerConfig();
  if (!config) {
    return {
      error: true,
      message:
        "Flicker detection server not configured. Set FLICKER_SERVER_URL env var (e.g. http://localhost:8006).",
    };
  }

  try {
    const res = await fetch(`${config.serverUrl}/tools/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool_name: toolName, parameters: params }),
    });

    const data = (await res.json()) as any;
    if (!data.success) return { error: true, message: data.error, toolName };
    return data.data;
  } catch (e: any) {
    return {
      error: true,
      message: `Flicker server unreachable: ${e.message}`,
      suggestion: "Ensure the flicker detection server is running on the configured URL.",
    };
  }
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export const flickerDetectionTools: McpTool[] = [
  {
    name: "run_flicker_detection",
    description:
      "Run full 4-layer Android UI flicker detection pipeline: SurfaceFlinger stats + logcat (L0), screenrecord (L1), frame extraction + SSIM analysis with adaptive threshold (L2), optional semantic verification (L3). Returns FlickerReport with events, SSIM scores, timeline chart, and comparison images. Requires FLICKER_SERVER_URL and adb-connected device.",
    inputSchema: {
      type: "object",
      properties: {
        packageName: {
          type: "string",
          description: "Android package name to monitor (optional)",
        },
        deviceId: {
          type: "string",
          description: "ADB device ID (optional, uses default device)",
        },
        durationS: {
          type: "number",
          description: "Recording duration in seconds (default: 10, max: 180)",
        },
        fps: {
          type: "number",
          description: "Frame extraction rate (default: 15)",
        },
        enableSemantic: {
          type: "boolean",
          description:
            "Enable Layer 3 GPT semantic verification for HIGH/MEDIUM events (default: false, expensive)",
        },
        useSceneFilter: {
          type: "boolean",
          description:
            "Use ffmpeg scene detection for smart frame extraction (default: true)",
        },
      },
    },
    handler: async (args: any) => {
      const start = Date.now();
      const result = await flickerPost("run_flicker_detection", {
        package_name: args.packageName,
        device_id: args.deviceId ?? "",
        duration_s: args.durationS ?? 10,
        fps: args.fps ?? 15,
        enable_semantic: args.enableSemantic ?? false,
        use_scene_filter: args.useSceneFilter ?? true,
      });
      return { ...result, latencyMs: Date.now() - start };
    },
  },

  {
    name: "capture_surface_stats",
    description:
      "Capture Android SurfaceFlinger stats and logcat for jank analysis (Layer 0 only). Returns janky frame counts, missed vsync, slow UI thread metrics, and filtered logcat entries from Choreographer, SurfaceFlinger, WindowManager, ActivityManager, InputDispatcher. Requires FLICKER_SERVER_URL and adb-connected device.",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: {
          type: "string",
          description: "ADB device ID (optional)",
        },
        packageName: {
          type: "string",
          description: "Android package name (optional)",
        },
        logcatDurationS: {
          type: "number",
          description: "Logcat capture duration in seconds (default: 5)",
        },
      },
    },
    handler: async (args: any) => {
      const start = Date.now();
      const result = await flickerPost("capture_surface_stats", {
        device_id: args.deviceId ?? "",
        package_name: args.packageName,
        logcat_duration_s: args.logcatDurationS ?? 5,
      });
      return { ...result, latencyMs: Date.now() - start };
    },
  },

  {
    name: "extract_video_frames",
    description:
      "Record screen and extract key frames from an Android device (Layers 1+2). Uses adb screenrecord then ffmpeg scene-filtered JPEG extraction. CRITICAL: uses -pix_fmt yuvj420p for ffmpeg 8.x compatibility. Falls back to regular fps extraction if scene filter produces 0 frames.",
    inputSchema: {
      type: "object",
      properties: {
        deviceId: {
          type: "string",
          description: "ADB device ID (optional)",
        },
        durationS: {
          type: "number",
          description:
            "Recording duration in seconds (default: 10, max: 180)",
        },
        sceneThreshold: {
          type: "number",
          description:
            "ffmpeg scene detection threshold 0-1 (default: 0.08). Lower = more sensitive.",
        },
      },
    },
    handler: async (args: any) => {
      const start = Date.now();
      const result = await flickerPost("extract_video_frames", {
        device_id: args.deviceId ?? "",
        duration_s: args.durationS ?? 10,
        scene_threshold: args.sceneThreshold ?? 0.08,
      });
      return { ...result, latencyMs: Date.now() - start };
    },
  },

  {
    name: "compute_ssim_analysis",
    description:
      "Compute block-based SSIM analysis on a set of frame images. Uses 8x8 blocks with parallel ProcessPoolExecutor. Returns SSIM scores, adaptive threshold (max(0.70, median - 2*std)), flicker classification (rapid_oscillation / sustained_change / single_glitch), and severity (HIGH/MEDIUM/LOW).",
    inputSchema: {
      type: "object",
      properties: {
        framePaths: {
          type: "array",
          items: { type: "string" },
          description: "Array of frame image file paths (JPEG)",
        },
        blockSize: {
          type: "number",
          description: "SSIM block size in pixels (default: 8)",
        },
        maxWorkers: {
          type: "number",
          description: "Parallel worker count (default: 4)",
        },
      },
      required: ["framePaths"],
    },
    handler: async (args: any) => {
      const start = Date.now();
      const result = await flickerPost("compute_ssim_analysis", {
        frame_paths: args.framePaths,
        block_size: args.blockSize ?? 8,
        max_workers: args.maxWorkers ?? 4,
      });
      return { ...result, latencyMs: Date.now() - start };
    },
  },

  {
    name: "generate_flicker_report",
    description:
      "Generate visual flicker report from existing analysis data. Produces SSIM timeline chart (1200x400 PNG, PIL-based, no matplotlib) and side-by-side comparison images for flagged flicker events.",
    inputSchema: {
      type: "object",
      properties: {
        ssimScores: {
          type: "array",
          items: { type: "number" },
          description: "Array of SSIM scores from compute_ssim_analysis",
        },
        threshold: {
          type: "number",
          description: "Adaptive threshold used for flicker detection",
        },
        flickerIndices: {
          type: "array",
          items: { type: "number" },
          description: "Frame indices flagged as flicker events",
        },
        framePaths: {
          type: "array",
          items: { type: "string" },
          description: "Frame image paths for comparison image generation",
        },
        outputDir: {
          type: "string",
          description: "Output directory for report artifacts",
        },
      },
      required: ["ssimScores", "threshold"],
    },
    handler: async (args: any) => {
      const start = Date.now();
      const result = await flickerPost("generate_flicker_report", {
        ssim_scores: args.ssimScores,
        threshold: args.threshold,
        flicker_indices: args.flickerIndices ?? [],
        frame_paths: args.framePaths ?? [],
        output_dir: args.outputDir ?? "/tmp/flicker_detection/report",
      });
      return { ...result, latencyMs: Date.now() - start };
    },
  },
];
