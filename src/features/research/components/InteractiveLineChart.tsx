"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import ChartTooltip from "./ChartTooltip";
import type { Annotation, ChartSeries, TrendLineConfig, TooltipPayload } from "@/features/research/types";

interface ChartProps {
  config: TrendLineConfig;
  annotations?: Annotation[];
  onAnnotationHover?: (note: Annotation | null) => void;
}

type HoveredPoint = {
  x: number;
  y: number;
  content: TooltipPayload;
};

const colorStyle = (series: ChartSeries) => {
  if (series.color && series.color.startsWith("#")) {
    return { className: "", stroke: series.color, fill: series.color };
  }
  // Return actual hex colors for SVG stroke/fill instead of Tailwind classes
  if (series.color === "accent") return { className: "text-indigo-600", stroke: "#4f46e5", fill: "#4f46e5" };
  if (series.color === "gray") return { className: "text-slate-400", stroke: "#94a3b8", fill: "#94a3b8" };
  if (series.color === "black") return { className: "text-slate-900", stroke: "#0f172a", fill: "#0f172a" };
  return { className: series.color ? series.color : "text-slate-800", stroke: "#1e293b", fill: "#1e293b" };
};

export const InteractiveLineChart: React.FC<ChartProps> = ({ config, annotations = [], onAnnotationHover }) => {
  const [hoveredData, setHoveredData] = useState<HoveredPoint | null>(null);

  if (!config?.series?.length) {
    return <div className="w-full h-full rounded-md bg-slate-50" />;
  }

  const width = 400;
  const height = 160;
  const paddingX = 20;
  const paddingY = 20;

  const allValues = useMemo(
    () => config.series.flatMap((s) => s.data.map((d) => d.value)),
    [config.series],
  );
  const minYRaw = Math.min(...allValues, 0);
  const maxYRaw = Math.max(...allValues, 1);
  const minY = typeof config.gridScale?.min === "number" ? config.gridScale.min : Math.min(0, minYRaw);
  const maxY =
    typeof config.gridScale?.max === "number"
      ? config.gridScale.max
      : Math.max(maxYRaw * 1.1, 1);
  const range = Math.max(maxY - minY, 1);

  const xSteps = Math.max(
    Math.max(...config.series.map((s) => s.data.length - 1)),
    config.xAxisLabels.length - 1,
    1,
  );

  const gridLines = [0.25, 0.5, 0.75];

  const getCoord = (index: number, value: number) => {
    const clampedIndex = Math.min(index, xSteps);
    const x = paddingX + (clampedIndex / xSteps) * (width - paddingX * 2);
    const y = height - paddingY - ((value - minY) / range) * (height - paddingY * 2);
    return { x, y };
  };

  const buildSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return "";
    if (pts.length < 3) {
      return pts
        .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
        .join(" ");
    }

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;

      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const renderSeries = (series: ChartSeries) => {
    const visibleEnd = Math.min(config.visibleEndIndex, series.data.length - 1);

    const buildPath = (endIndex: number) => {
      const slice = series.data.slice(0, Math.max(endIndex + 1, 2));
      const pointSet = slice.map((pt, i) => getCoord(i, pt.value));
      return buildSmoothPath(pointSet);
    };

    const fullPath = buildPath(series.data.length - 1);
    const visiblePath = buildPath(Math.max(visibleEnd, 0));
    const isGhost = series.type === "ghost";
    const { className, stroke, fill } = colorStyle(series);
    const dash = isGhost ? "6 6" : "0";

    return (
      <g key={series.id}>
        {/* Ghost baseline - shows "path traveled" (previous state) at low opacity */}
        <motion.path
          d={fullPath}
          fill="none"
          stroke={stroke}
          strokeWidth={isGhost ? 1.5 : 0}
          strokeDasharray={dash}
          className={className}
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: isGhost ? 0.25 : 0, pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />

        {/* Visible / confirmed segment - current state */}
        <motion.path
          d={visiblePath}
          fill="none"
          stroke={stroke}
          strokeWidth={isGhost ? 2 : 2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dash}
          className={className}
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: 1, pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />

        {/* Points */}
        {series.data.map((point, i) => {
          const { x, y } = getCoord(i, point.value);
          const isFocused = config.focusIndex === i;
          const isVisible = i <= visibleEnd;
          const dotOpacity = isVisible ? 1 : isGhost ? 0.35 : 0;

          if (!isVisible && !isGhost) return null;

          return (
            <g key={i}>
              <motion.circle
                cx={x}
                cy={y}
                r={isFocused ? 4 : 3}
                className={`fill-white stroke-2 ${className}`}
                style={{ opacity: dotOpacity }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05 }}
              />

              {isFocused && (
                <motion.circle
                  cx={x}
                  cy={y}
                  r={8}
                  className={className ? className.replace("text-", "fill-") : ""}
                  style={{ opacity: dotOpacity }}
                  fill={fill}
                  initial={{ opacity: 0.4, scale: 1 }}
                  animate={{ opacity: 0, scale: 2 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}

              <circle
                cx={x}
                cy={y}
                r={12}
                className="fill-transparent cursor-pointer"
                onMouseEnter={() => {
                  const fallbackTitle = config.xAxisLabels[i]
                    ? `${series.label} - ${config.xAxisLabels[i]}`
                    : series.label;
                  const tooltipContent: TooltipPayload = point.tooltip ?? {
                    title: fallbackTitle,
                    body: `Value: ${point.value}`,
                  };
                  setHoveredData({ x, y, content: tooltipContent });
                }}
                onMouseLeave={() => setHoveredData(null)}
              />
            </g>
          );
        })}
      </g>
    );
  };

  const resolveAnnotationCoord = (note: Annotation) => {
    if (note.position) {
      return {
        x: (note.position.x / 100) * width,
        y: (note.position.y / 100) * height,
      };
    }
    const target = typeof note.targetIndex === "number" ? note.targetIndex : note.associatedDataIndex;
    const primarySeries = config.series.find((s) => s.type === "solid") ?? config.series[0];
    const idx = primarySeries ? Math.min(Math.max(target ?? 0, 0), primarySeries.data.length - 1) : 0;
    const val = primarySeries?.data?.[idx]?.value ?? 0;
    return getCoord(idx, val);
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 pointer-events-none z-50">
        <ChartTooltip
          active={!!hoveredData}
          data={
            hoveredData
              ? {
                  id: "data-point",
                  title: hoveredData.content.title,
                  description: hoveredData.content.body,
                  position: {
                    x: (hoveredData.x / width) * 100,
                    y: (hoveredData.y / height) * 100,
                  },
                }
              : null
          }
        />
      </div>

      <svg viewBox={`-10 -10 ${width + 20} ${height + 20}`} className="w-full h-full overflow-visible">
        {/* Background grid */}
        {gridLines.map((ratio, idx) => {
          const y = paddingY + ratio * (height - paddingY * 2);
          return (
            <line
              key={idx}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              className="stroke-slate-100"
              strokeDasharray="2 2"
              strokeWidth={1}
            />
          );
        })}

        {/* Chart Title Label */}
        <text x="25" y="20" className="text-[10px] font-bold fill-slate-300 font-mono tracking-widest uppercase">
          {config.title || "Reliability Index"}
        </text>

        {config.xAxisLabels.map((label, i) => {
          const { x } = getCoord(i, 0);
          const muted = i > config.visibleEndIndex;
          return (
            <text
              key={i}
              x={x}
              y={height - 2}
              textAnchor="middle"
              className={`text-[8px] font-mono uppercase ${muted ? "fill-slate-200" : "fill-slate-400"}`}
            >
              {label}
            </text>
          );
        })}

        {config.series.map((series) => renderSeries(series))}

        {/* Dynamic Label at end of primary line */}
        {config.series.length > 0 && (() => {
          const primarySeries = config.series.find((s) => s.type === "solid") ?? config.series[0];
          const lastIdx = Math.min(config.visibleEndIndex, primarySeries.data.length - 1);
          const lastVal = primarySeries.data[lastIdx]?.value ?? 0;
          const { x, y } = getCoord(lastIdx, lastVal);
          return (
            <text
              x={x + 5}
              y={y - 8}
              className="text-[9px] font-bold fill-slate-700 font-mono"
            >
              {primarySeries.label}
            </text>
          );
        })()}

        {annotations.map((note) => {
          const { x, y } = resolveAnnotationCoord(note);
          return (
            <motion.g
              key={note.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <circle
                cx={x}
                cy={y}
                r="4"
                className="fill-white stroke-emerald-600 stroke-[2px] cursor-pointer hover:stroke-emerald-400 hover:scale-125 transition-all duration-300"
              />
              <circle
                cx={x}
                cy={y}
                r="16"
                className="fill-transparent cursor-pointer"
                onMouseEnter={() =>
                  onAnnotationHover?.({
                    ...note,
                    position: { x: (x / width) * 100, y: (y / height) * 100 },
                  })
                }
                onMouseLeave={() => onAnnotationHover?.(null)}
              />
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
};

export default InteractiveLineChart;
