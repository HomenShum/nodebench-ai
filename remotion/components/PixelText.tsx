import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

/**
 * Retro 8-bit typewriter text component.
 * Renders text character-by-character with a blinking cursor.
 */

const PIXEL_FONT = "'Press Start 2P', 'Courier New', monospace";

interface PixelTextProps {
  text: string;
  fontSize?: number;
  color?: string;
  /** Frame at which to start the typewriter reveal */
  startFrame?: number;
  /** Frames per character reveal */
  framesPerChar?: number;
  /** Show blinking cursor */
  cursor?: boolean;
  x?: number;
  y?: number;
  maxWidth?: number;
}

export const PixelText: React.FC<PixelTextProps> = ({
  text,
  fontSize = 16,
  color = "#d97757",
  startFrame = 0,
  framesPerChar = 2,
  cursor = true,
  x = 0,
  y = 0,
  maxWidth,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const charsToShow = Math.min(text.length, Math.floor(elapsed / framesPerChar));
  const visibleText = text.slice(0, charsToShow);
  const showCursor = cursor && charsToShow < text.length && elapsed % 16 < 10;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        fontFamily: PIXEL_FONT,
        fontSize,
        color,
        lineHeight: 1.8,
        whiteSpace: "pre-wrap",
        maxWidth: maxWidth ?? "100%",
        imageRendering: "pixelated",
      }}
    >
      {visibleText}
      {showCursor && (
        <span style={{ color, opacity: 0.8 }}>_</span>
      )}
    </div>
  );
};

/**
 * Pixel block — a single colored square for building 8-bit graphics.
 */
interface PixelBlockProps {
  x: number;
  y: number;
  size?: number;
  color: string;
  delay?: number;
}

export const PixelBlock: React.FC<PixelBlockProps> = ({
  x,
  y,
  size = 8,
  color,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        backgroundColor: color,
        opacity,
        imageRendering: "pixelated",
      }}
    />
  );
};

/**
 * Scanline overlay for CRT retro effect.
 */
export const ScanlineOverlay: React.FC<{ opacity?: number }> = ({
  opacity = 0.08,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 0, 0, ${opacity}) 2px,
          rgba(0, 0, 0, ${opacity}) 4px
        )`,
        pointerEvents: "none",
        zIndex: 100,
      }}
    />
  );
};
