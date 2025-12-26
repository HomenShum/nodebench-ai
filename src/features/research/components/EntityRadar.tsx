"use client";

import React from "react";
import { motion } from "framer-motion";
import { Building2, User, Zap, Box } from "lucide-react";
import type { EntityGraph, GraphNode } from "@/features/research/types";

const IconMap: Record<string, typeof Building2> = {
  company: Building2,
  person: User,
  concept: Zap,
  product: Box,
};

function getNodeIcon(node: GraphNode) {
  const type = node.type ?? "concept";
  return IconMap[type] ?? Box;
}

export const EntityRadar: React.FC<{ graph: EntityGraph | null }> = ({ graph }) => {
  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-900/10 bg-white/70 p-6 text-xs text-stone-400">
        No entity relationships detected yet.
      </div>
    );
  }

  const width = 400;
  const height = 260;
  const center = { x: width / 2, y: height / 2 };
  const radius = 90;

  const focusId = graph.focusNodeId || graph.nodes[0]?.id;
  const centerNode = graph.nodes.find((node) => node.id === focusId) ?? graph.nodes[0];
  const otherNodes = graph.nodes.filter((node) => node.id !== centerNode.id);

  const positionedNodes = otherNodes.map((node, idx) => {
    const angle = (idx / Math.max(otherNodes.length, 1)) * 2 * Math.PI;
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);
    return { node, x, y };
  });

  const edges = graph.edges ?? [];

  return (
    <div className="relative rounded-xl border border-emerald-900/10 bg-white/80 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-900/60">
          Entity Influence Map
        </div>
        <div className="text-[9px] font-mono text-stone-400">GraphRAG</div>
      </div>

      <div className="relative h-[260px]">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {positionedNodes.map(({ node, x, y }, idx) => {
            const edge = edges.find(
              (edge) =>
                (edge.source === centerNode.id && edge.target === node.id) ||
                (edge.target === centerNode.id && edge.source === node.id),
            );
            return (
              <g key={`edge-${node.id}-${idx}`}>
                <motion.line
                  x1={center.x}
                  y1={center.y}
                  x2={x}
                  y2={y}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8 }}
                />
                {edge?.relationship && (
                  <text
                    x={(center.x + x) / 2}
                    y={(center.y + y) / 2 - 4}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="9"
                  >
                    {edge.relationship}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {positionedNodes.map(({ node, x, y }, idx) => {
          const Icon = getNodeIcon(node);
          const left = (x / width) * 100;
          const top = (y / height) * 100;
          return (
            <motion.div
              key={`node-${node.id}`}
              className="absolute flex flex-col items-center gap-1"
              style={{ left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -50%)" }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <Icon className="w-4 h-4 text-emerald-900" />
              </div>
              <span className="text-[9px] text-stone-600 font-semibold text-center max-w-[80px]">
                {node.label}
              </span>
            </motion.div>
          );
        })}

        <motion.div
          className="absolute left-1/2 top-1/2 flex flex-col items-center"
          style={{ transform: "translate(-50%, -50%)" }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-12 h-12 rounded-full bg-emerald-900 flex items-center justify-center shadow-lg border-4 border-emerald-50">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-900">
            {centerNode.label}
          </span>
        </motion.div>
      </div>
    </div>
  );
};

export default EntityRadar;
