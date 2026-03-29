import React from "react";
import { interpolate, useCurrentFrame, Sequence } from "remotion";
import { RetroBackground, RetroBadge } from "../components/RetroBackground";
import { PixelText, ScanlineOverlay } from "../components/PixelText";

/**
 * IntroScene — 5-second retro 8-bit title card.
 * "NODEBENCH" pixel-by-pixel reveal + tagline typewriter.
 */
export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Logo fade-in
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Logo scale bounce
  const logoScale = interpolate(frame, [0, 15, 25], [0.8, 1.05, 1.0], {
    extrapolateRight: "clamp",
  });

  return (
    <RetroBackground>
      {/* NODEBENCH logo */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "38%",
          transform: `translate(-50%, -50%) scale(${logoScale})`,
          opacity: logoOpacity,
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 48,
          color: "#d97757",
          letterSpacing: 8,
          textShadow: "4px 4px 0 rgba(217,119,87,0.3), 0 0 20px rgba(217,119,87,0.15)",
        }}
      >
        NODEBENCH
      </div>

      {/* Tagline — typewriter reveal */}
      <Sequence from={30}>
        <PixelText
          text="Operating Intelligence for Founders"
          fontSize={12}
          color="rgba(255,255,255,0.6)"
          startFrame={0}
          framesPerChar={1}
          x={640 - 210}
          y={370}
        />
      </Sequence>

      {/* Stats bar — fade in */}
      <Sequence from={60}>
        <RetroBadge label="350 MCP TOOLS" color="#4ade80" x={300} y={440} />
        <RetroBadge label="5 SURFACES" color="#60a5fa" x={500} y={440} />
        <RetroBadge label="6 ROLE LENSES" color="#c084fc" x={680} y={440} />
      </Sequence>

      {/* Version tag */}
      <Sequence from={90}>
        <PixelText
          text="v2.31 // 2026"
          fontSize={8}
          color="rgba(255,255,255,0.25)"
          startFrame={0}
          framesPerChar={1}
          cursor={false}
          x={580}
          y={520}
        />
      </Sequence>

      <ScanlineOverlay opacity={0.05} />
    </RetroBackground>
  );
};
