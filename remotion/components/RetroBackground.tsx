import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

/**
 * Retro 8-bit dark background with animated grid and vignette.
 */

// NES-inspired dark palette
const BG_COLOR = "#0a0a0f";
const GRID_COLOR = "rgba(217, 119, 87, 0.06)"; // terracotta at 6% opacity
const VIGNETTE_COLOR = "rgba(0, 0, 0, 0.4)";

interface RetroBackgroundProps {
  gridSize?: number;
  showGrid?: boolean;
  showVignette?: boolean;
  children?: React.ReactNode;
}

export const RetroBackground: React.FC<RetroBackgroundProps> = ({
  gridSize = 32,
  showGrid = true,
  showVignette = true,
  children,
}) => {
  const frame = useCurrentFrame();
  // Subtle grid drift animation
  const gridOffset = interpolate(frame, [0, 900], [0, gridSize], {
    extrapolateRight: "extend",
  });

  return (
    <div
      style={{
        position: "relative",
        width: 1280,
        height: 720,
        backgroundColor: BG_COLOR,
        overflow: "hidden",
      }}
    >
      {/* Animated pixel grid */}
      {showGrid && (
        <div
          style={{
            position: "absolute",
            inset: -gridSize,
            backgroundImage: `
              linear-gradient(${GRID_COLOR} 1px, transparent 1px),
              linear-gradient(90deg, ${GRID_COLOR} 1px, transparent 1px)
            `,
            backgroundSize: `${gridSize}px ${gridSize}px`,
            transform: `translate(${gridOffset % gridSize}px, ${gridOffset % gridSize}px)`,
          }}
        />
      )}

      {/* Corner vignette */}
      {showVignette && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at center, transparent 50%, ${VIGNETTE_COLOR} 100%)`,
            pointerEvents: "none",
            zIndex: 50,
          }}
        />
      )}

      {/* Content */}
      <div style={{ position: "relative", zIndex: 10 }}>
        {children}
      </div>
    </div>
  );
};

/**
 * Retro badge — pill-shaped status indicator.
 */
interface RetroBadgeProps {
  label: string;
  color?: string;
  x: number;
  y: number;
}

export const RetroBadge: React.FC<RetroBadgeProps> = ({
  label,
  color = "#d97757",
  x,
  y,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        padding: "4px 12px",
        border: `2px solid ${color}`,
        borderRadius: 4,
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 10,
        color,
        backgroundColor: `${color}15`,
        letterSpacing: 1,
      }}
    >
      {label}
    </div>
  );
};

/**
 * Progress bar in retro pixel style.
 */
interface RetroProgressProps {
  progress: number; // 0-1
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  label?: string;
}

export const RetroProgress: React.FC<RetroProgressProps> = ({
  progress,
  x,
  y,
  width = 300,
  height = 16,
  color = "#d97757",
  label,
}) => {
  const blockSize = 8;
  const filledBlocks = Math.floor((width / blockSize) * Math.min(1, progress));

  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      {label && (
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 8,
            color: "rgba(255,255,255,0.5)",
            marginBottom: 4,
            letterSpacing: 1,
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          width,
          height,
          border: `2px solid ${color}40`,
          display: "flex",
          gap: 1,
          padding: 1,
        }}
      >
        {Array.from({ length: filledBlocks }).map((_, i) => (
          <div
            key={i}
            style={{
              width: blockSize - 2,
              height: height - 6,
              backgroundColor: color,
              imageRendering: "pixelated",
            }}
          />
        ))}
      </div>
    </div>
  );
};
