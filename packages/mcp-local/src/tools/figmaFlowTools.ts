/**
 * Figma Flow Analysis tools — extract frames, cluster flows, visualize.
 *
 * Calls the figma_flow Python FastAPI server over HTTP.
 * Requires FIGMA_FLOW_SERVER_URL env var (e.g. http://localhost:8007).
 *
 * Pipeline:
 *   Phase 1: Extract frames (depth=3 tree traversal)
 *   Phase 2: Multi-signal clustering (section > prototype > name-prefix > spatial)
 *   Phase 3: Visualization (overlay or synthetic canvas)
 */

import type { McpTool } from "../types.js";

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function getFigmaFlowConfig(): { serverUrl: string } | null {
  const serverUrl = process.env.FIGMA_FLOW_SERVER_URL;
  if (!serverUrl) return null;
  return { serverUrl: serverUrl.replace(/\/$/, "") };
}

async function figmaFlowPost(
  toolName: string,
  params: Record<string, unknown>,
): Promise<any> {
  const config = getFigmaFlowConfig();
  if (!config) {
    return {
      error: true,
      message:
        "Figma flow server not configured. Set FIGMA_FLOW_SERVER_URL env var (e.g. http://localhost:8007).",
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
      message: `Figma flow server unreachable: ${e.message}`,
      suggestion: "Ensure the figma flow server is running on the configured URL.",
    };
  }
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export const figmaFlowTools: McpTool[] = [
  {
    name: "analyze_figma_flows",
    description:
      "Full Figma flow analysis pipeline: extract frames from Figma file (depth=3 tree traversal), cluster into flow groups via priority cascade (section > prototype > name-prefix > spatial), and generate overlay visualization. Returns FlowAnalysisResult with flow groups, clustering method, and visualization path. Requires FIGMA_FLOW_SERVER_URL and FIGMA_ACCESS_TOKEN.",
    inputSchema: {
      type: "object",
      properties: {
        fileKey: {
          type: "string",
          description:
            "Figma file key (from URL: figma.com/file/<KEY>/...)",
        },
        pageFilter: {
          type: "string",
          description:
            "Filter to a specific page name (optional, default: all pages)",
        },
        generateVisualization: {
          type: "boolean",
          description: "Generate overlay visualization image (default: true)",
        },
      },
      required: ["fileKey"],
    },
    handler: async (args: any) => {
      const start = Date.now();
      const result = await figmaFlowPost("analyze_figma_flows", {
        file_key: args.fileKey,
        page_filter: args.pageFilter,
        generate_visualization: args.generateVisualization ?? true,
      });
      return { ...result, latencyMs: Date.now() - start };
    },
  },

  {
    name: "extract_figma_frames",
    description:
      "Extract all frames from a Figma file using depth=3 tree traversal (DOCUMENT -> CANVAS -> SECTION -> FRAME). CRITICAL: uses depth=3 not depth=2 — depth=2 only gets SECTION nodes, missing the FRAME nodes inside them. Returns structured FigmaFrame objects with bounding boxes, section names, and transition targets.",
    inputSchema: {
      type: "object",
      properties: {
        fileKey: {
          type: "string",
          description: "Figma file key",
        },
        pageFilter: {
          type: "string",
          description:
            "Filter to specific page name (optional, default: all pages)",
        },
        includeComponents: {
          type: "boolean",
          description:
            "Include COMPONENT and INSTANCE nodes in addition to FRAME (default: true)",
        },
      },
      required: ["fileKey"],
    },
    handler: async (args: any) => {
      const start = Date.now();
      const result = await figmaFlowPost("extract_figma_frames", {
        file_key: args.fileKey,
        page_filter: args.pageFilter,
        include_components: args.includeComponents ?? true,
      });
      return { ...result, latencyMs: Date.now() - start };
    },
  },

  {
    name: "cluster_figma_flows",
    description:
      "Cluster Figma frames into flow groups using multi-signal priority cascade: 1) section-based grouping (highest priority), 2) prototype connection Union-Find, 3) name-prefix matching (e.g. 'Login / Screen 1'), 4) spatial proximity (Y-binning + X-gap splitting). Uses first signal that produces >= 2 groups.",
    inputSchema: {
      type: "object",
      properties: {
        frames: {
          type: "array",
          description:
            "Array of FigmaFrame objects (from extract_figma_frames)",
        },
        spatialMaxGap: {
          type: "number",
          description:
            "Max pixel gap for spatial clustering (default: 200)",
        },
        minPrefixLen: {
          type: "number",
          description:
            "Minimum name prefix length for name-prefix clustering (default: 3)",
        },
      },
      required: ["frames"],
    },
    handler: async (args: any) => {
      const start = Date.now();
      const result = await figmaFlowPost("cluster_figma_flows", {
        frames: args.frames,
        spatial_max_gap: args.spatialMaxGap ?? 200,
        min_prefix_len: args.minPrefixLen ?? 3,
      });
      return { ...result, latencyMs: Date.now() - start };
    },
  },

  {
    name: "render_flow_visualization",
    description:
      "Render flow visualization with colored bounding boxes for each flow group. Supports overlay on a rendered page image or synthetic dark canvas fallback. Handles wide Figma pages (>3:1 aspect ratio) and uses cross-platform fonts (Windows/macOS/Linux with PIL default fallback).",
    inputSchema: {
      type: "object",
      properties: {
        flowGroups: {
          type: "array",
          description:
            "Array of FlowGroup objects (from cluster_figma_flows)",
        },
        pageImagePath: {
          type: "string",
          description:
            "Path to rendered page image for overlay (optional, uses synthetic canvas if not provided)",
        },
        pageWidth: {
          type: "number",
          description: "Page width in pixels (for synthetic canvas)",
        },
        pageHeight: {
          type: "number",
          description: "Page height in pixels (for synthetic canvas)",
        },
        outputPath: {
          type: "string",
          description:
            "Output file path (default: /tmp/figma_flows.png)",
        },
      },
      required: ["flowGroups"],
    },
    handler: async (args: any) => {
      const start = Date.now();
      const result = await figmaFlowPost("render_flow_visualization", {
        flow_groups: args.flowGroups,
        page_image_path: args.pageImagePath,
        page_width: args.pageWidth ?? 0,
        page_height: args.pageHeight ?? 0,
        output_path: args.outputPath ?? "/tmp/figma_flows.png",
      });
      return { ...result, latencyMs: Date.now() - start };
    },
  },
];
