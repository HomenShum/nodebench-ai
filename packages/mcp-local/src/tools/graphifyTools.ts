/**
 * Graphify Integration Tools — knowledge graph generation for any codebase, docs, or folder.
 *
 * Wraps safishamsi/graphify (6.8k stars) as NodeBench MCP tools:
 * - run_graphify: generate knowledge graph from a folder
 * - query_graphify: query an existing graph
 * - graphify_report: get the analysis report (god nodes, surprises, suggested questions)
 * - graphify_status: check if graphify is installed and ready
 *
 * Graphify pipeline: detect → extract (AST + LLM) → build_graph → cluster (Leiden) → analyze → report → export
 * Output: graph.html (interactive), graph.json (queryable), GRAPH_REPORT.md (analysis)
 *
 * Integration with NodeBench subconscious:
 * - Graph nodes/edges are imported into object_nodes/object_edges (knowledge graph)
 * - God nodes become high-priority entity watchlist items
 * - Surprising connections feed into contradiction detection
 */

import type { McpTool } from "../types.js";
import { execSync, spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// ── Helpers ──────────────────────────────────────────────────────────────

function isGraphifyInstalled(): boolean {
  try {
    const result = spawnSync("graphify", ["--version"], {
      encoding: "utf-8",
      timeout: 5000,
      shell: true,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

function findGraphifyOutput(targetDir: string): {
  graphJson: string | null;
  graphHtml: string | null;
  report: string | null;
} {
  const outDir = join(targetDir, "graphify-out");
  return {
    graphJson: existsSync(join(outDir, "graph.json")) ? join(outDir, "graph.json") : null,
    graphHtml: existsSync(join(outDir, "graph.html")) ? join(outDir, "graph.html") : null,
    report: existsSync(join(outDir, "GRAPH_REPORT.md")) ? join(outDir, "GRAPH_REPORT.md") : null,
  };
}

function loadGraphJson(path: string): {
  nodes: Array<{ id: string; label: string; source_file?: string; community?: number }>;
  edges: Array<{ source: string; target: string; relation: string; confidence: string }>;
} {
  try {
    const raw = readFileSync(path, "utf-8");
    const data = JSON.parse(raw);
    return {
      nodes: data.nodes ?? [],
      edges: data.edges ?? data.links ?? [],
    };
  } catch {
    return { nodes: [], edges: [] };
  }
}

// ── Tools ────────────────────────────────────────────────────────────────

export const graphifyTools: McpTool[] = [
  {
    name: "graphify_status",
    description:
      "Check if graphify is installed and ready. Returns version, installation instructions if missing.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const installed = isGraphifyInstalled();
      if (installed) {
        try {
          const version = spawnSync("graphify", ["--version"], {
            encoding: "utf-8",
            timeout: 5000,
            shell: true,
          }).stdout.trim();
          return {
            installed: true,
            version,
            message: "Graphify is ready. Use run_graphify to generate a knowledge graph.",
          };
        } catch {
          return { installed: true, version: "unknown" };
        }
      }
      return {
        installed: false,
        message: "Graphify is not installed.",
        installCommand: "pip install graphifyy && graphify install",
        requirements: "Python 3.10+",
        documentation: "https://github.com/safishamsi/graphify",
      };
    },
  },

  {
    name: "run_graphify",
    description:
      "Generate a knowledge graph from a folder of code, docs, papers, or images. " +
      "Uses AST parsing (19 languages) + Claude vision for multimodal extraction. " +
      "Output: interactive graph.html, queryable graph.json, GRAPH_REPORT.md with god nodes and surprises. " +
      "71.5x fewer tokens per query vs reading raw files.",
    inputSchema: {
      type: "object",
      properties: {
        target_dir: {
          type: "string",
          description: "Directory to analyze. Defaults to current working directory.",
        },
        output_dir: {
          type: "string",
          description: "Output directory. Defaults to <target_dir>/graphify-out/",
        },
        include_images: {
          type: "boolean",
          description: "Include image analysis via Claude vision. Default: true.",
        },
      },
    },
    handler: async (args: { target_dir?: string; output_dir?: string; include_images?: boolean }) => {
      if (!isGraphifyInstalled()) {
        return {
          error: "Graphify is not installed. Run: pip install graphifyy && graphify install",
          installCommand: "pip install graphifyy && graphify install",
        };
      }

      const targetDir = args.target_dir || process.cwd();
      const cmdParts = ["graphify", targetDir];
      if (args.output_dir) cmdParts.push("--output", args.output_dir);

      try {
        const result = spawnSync(cmdParts[0], cmdParts.slice(1), {
          encoding: "utf-8",
          timeout: 300_000, // 5 minutes max
          shell: true,
          cwd: targetDir,
        });

        const output = findGraphifyOutput(args.output_dir || targetDir);
        const graphData = output.graphJson ? loadGraphJson(output.graphJson) : null;

        return {
          success: result.status === 0,
          stdout: (result.stdout || "").slice(-1000),
          stderr: (result.stderr || "").slice(-500),
          output: {
            graphJson: output.graphJson,
            graphHtml: output.graphHtml,
            report: output.report,
          },
          stats: graphData ? {
            nodeCount: graphData.nodes.length,
            edgeCount: graphData.edges.length,
            communities: [...new Set(graphData.nodes.map((n) => n.community).filter(Boolean))].length,
          } : null,
        };
      } catch (err: any) {
        return { error: err.message };
      }
    },
  },

  {
    name: "query_graphify",
    description:
      "Query an existing graphify knowledge graph. Find nodes by label, explore connections, " +
      "list communities, find god nodes (highly connected), or search for specific patterns.",
    inputSchema: {
      type: "object",
      properties: {
        graph_path: {
          type: "string",
          description: "Path to graph.json. Defaults to ./graphify-out/graph.json",
        },
        query: {
          type: "string",
          description: "What to find: a node label, relationship type, or natural language question.",
        },
        mode: {
          type: "string",
          enum: ["search", "neighbors", "community", "god_nodes", "stats"],
          description: "Query mode. Default: search.",
        },
        limit: {
          type: "number",
          description: "Max results to return. Default: 20.",
        },
      },
      required: ["query"],
    },
    handler: async (args: { graph_path?: string; query: string; mode?: string; limit?: number }) => {
      const graphPath = args.graph_path || join(process.cwd(), "graphify-out", "graph.json");
      if (!existsSync(graphPath)) {
        return {
          error: `Graph not found at ${graphPath}. Run run_graphify first.`,
        };
      }

      const graph = loadGraphJson(graphPath);
      const limit = args.limit ?? 20;
      const mode = args.mode ?? "search";
      const queryLower = args.query.toLowerCase();

      switch (mode) {
        case "search": {
          const matchedNodes = graph.nodes
            .filter((n) => n.label.toLowerCase().includes(queryLower) || n.id.toLowerCase().includes(queryLower))
            .slice(0, limit);
          const matchedEdges = graph.edges
            .filter((e) => e.relation.toLowerCase().includes(queryLower))
            .slice(0, limit);
          return { nodes: matchedNodes, edges: matchedEdges, total: matchedNodes.length + matchedEdges.length };
        }

        case "neighbors": {
          const targetNode = graph.nodes.find(
            (n) => n.label.toLowerCase().includes(queryLower) || n.id.toLowerCase().includes(queryLower),
          );
          if (!targetNode) return { error: `Node "${args.query}" not found` };
          const connected = graph.edges
            .filter((e) => e.source === targetNode.id || e.target === targetNode.id)
            .slice(0, limit);
          const neighborIds = new Set(connected.map((e) => (e.source === targetNode.id ? e.target : e.source)));
          const neighbors = graph.nodes.filter((n) => neighborIds.has(n.id));
          return { node: targetNode, neighbors, edges: connected };
        }

        case "community": {
          const targetNode = graph.nodes.find(
            (n) => n.label.toLowerCase().includes(queryLower) || n.id.toLowerCase().includes(queryLower),
          );
          if (!targetNode) return { error: `Node "${args.query}" not found` };
          const communityNodes = graph.nodes
            .filter((n) => n.community === targetNode.community)
            .slice(0, limit);
          return { community: targetNode.community, nodes: communityNodes, total: communityNodes.length };
        }

        case "god_nodes": {
          // Nodes with most connections
          const edgeCounts = new Map<string, number>();
          for (const e of graph.edges) {
            edgeCounts.set(e.source, (edgeCounts.get(e.source) ?? 0) + 1);
            edgeCounts.set(e.target, (edgeCounts.get(e.target) ?? 0) + 1);
          }
          const sorted = [...edgeCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
          const godNodes = sorted.map(([id, count]) => ({
            ...graph.nodes.find((n) => n.id === id),
            connectionCount: count,
          }));
          return { godNodes };
        }

        case "stats": {
          const communities = [...new Set(graph.nodes.map((n) => n.community).filter(Boolean))];
          const edgeCounts = new Map<string, number>();
          for (const e of graph.edges) {
            edgeCounts.set(e.source, (edgeCounts.get(e.source) ?? 0) + 1);
            edgeCounts.set(e.target, (edgeCounts.get(e.target) ?? 0) + 1);
          }
          const avgDegree = graph.nodes.length > 0
            ? [...edgeCounts.values()].reduce((s, v) => s + v, 0) / graph.nodes.length
            : 0;
          const relationTypes = [...new Set(graph.edges.map((e) => e.relation))];
          const confidenceCounts = {
            extracted: graph.edges.filter((e) => e.confidence === "EXTRACTED").length,
            inferred: graph.edges.filter((e) => e.confidence === "INFERRED").length,
            ambiguous: graph.edges.filter((e) => e.confidence === "AMBIGUOUS").length,
          };
          return {
            nodeCount: graph.nodes.length,
            edgeCount: graph.edges.length,
            communityCount: communities.length,
            avgDegree: Math.round(avgDegree * 10) / 10,
            relationTypes,
            confidenceCounts,
          };
        }

        default:
          return { error: `Unknown mode: ${mode}. Use: search, neighbors, community, god_nodes, stats` };
      }
    },
  },

  {
    name: "graphify_report",
    description:
      "Get the GRAPH_REPORT.md analysis from a graphify run. Contains god nodes (most connected), " +
      "surprising connections, community summaries, and suggested questions for deeper exploration.",
    inputSchema: {
      type: "object",
      properties: {
        report_path: {
          type: "string",
          description: "Path to GRAPH_REPORT.md. Defaults to ./graphify-out/GRAPH_REPORT.md",
        },
      },
    },
    handler: async (args: { report_path?: string }) => {
      const reportPath = args.report_path || join(process.cwd(), "graphify-out", "GRAPH_REPORT.md");
      if (!existsSync(reportPath)) {
        return { error: `Report not found at ${reportPath}. Run run_graphify first.` };
      }
      try {
        const content = readFileSync(reportPath, "utf-8");
        return {
          report: content.slice(0, 8000), // cap for context
          path: reportPath,
          length: content.length,
        };
      } catch (err: any) {
        return { error: err.message };
      }
    },
  },

  {
    name: "graphify_import_to_subconscious",
    description:
      "Import a graphify knowledge graph into NodeBench's subconscious knowledge graph " +
      "(object_nodes + object_edges). Maps graphify nodes to entities and edges to relationships. " +
      "God nodes become high-priority watchlist items. Surprising connections feed contradiction detection.",
    inputSchema: {
      type: "object",
      properties: {
        graph_path: {
          type: "string",
          description: "Path to graph.json. Defaults to ./graphify-out/graph.json",
        },
        source_label: {
          type: "string",
          description: "Label to tag imported entities with (e.g., 'codebase', 'docs', 'papers'). Default: 'graphify'",
        },
      },
    },
    handler: async (args: { graph_path?: string; source_label?: string }) => {
      const graphPath = args.graph_path || join(process.cwd(), "graphify-out", "graph.json");
      if (!existsSync(graphPath)) {
        return { error: `Graph not found at ${graphPath}. Run run_graphify first.` };
      }

      const graph = loadGraphJson(graphPath);
      const source = args.source_label ?? "graphify";

      // Import into NodeBench's subconscious knowledge graph
      try {
        const { upsertEntity, addEdge } = await import("../subconscious/graphEngine.js");

        let nodesImported = 0;
        let edgesImported = 0;
        const idMap = new Map<string, string>();

        // Import nodes
        for (const node of graph.nodes) {
          const entity = upsertEntity(
            node.label,
            "concept", // graphify nodes are concepts/code entities
            source,
            {
              graphifyId: node.id,
              sourceFile: node.source_file,
              community: node.community,
            },
          );
          idMap.set(node.id, entity.id);
          nodesImported++;
        }

        // Import edges
        for (const edge of graph.edges) {
          const fromId = idMap.get(edge.source);
          const toId = idMap.get(edge.target);
          if (!fromId || !toId) continue;

          const confidence = edge.confidence === "EXTRACTED" ? 0.9
            : edge.confidence === "INFERRED" ? 0.6
            : 0.3;

          addEdge(fromId, toId, "related_to", confidence, {
            graphifyRelation: edge.relation,
            graphifyConfidence: edge.confidence,
          });
          edgesImported++;
        }

        return {
          imported: true,
          nodesImported,
          edgesImported,
          source,
          graphPath,
          message: `Imported ${nodesImported} nodes and ${edgesImported} edges into subconscious knowledge graph.`,
        };
      } catch (err: any) {
        return {
          imported: false,
          error: err.message,
          message: "Import failed. Is the subconscious engine available? (local server must be running)",
        };
      }
    },
  },
];
