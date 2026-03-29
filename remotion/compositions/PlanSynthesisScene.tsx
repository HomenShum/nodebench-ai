import React from "react";
import { interpolate, useCurrentFrame, Sequence } from "remotion";
import { RetroBackground, RetroBadge, RetroProgress } from "../components/RetroBackground";
import { PixelText, ScanlineOverlay } from "../components/PixelText";

/**
 * PlanSynthesisScene — 10-second showcase of the Plan Synthesis feature.
 * Shows: query input -> context assembly -> phased plan output.
 */

const PHASES = [
  { id: "P1", title: "Research & Design", effort: "DAYS", color: "#60a5fa" },
  { id: "P2", title: "Backend Implementation", effort: "DAYS", color: "#4ade80" },
  { id: "P3", title: "Frontend Implementation", effort: "DAYS", color: "#c084fc" },
  { id: "P4", title: "Testing & QA", effort: "DAYS", color: "#fbbf24" },
  { id: "P5", title: "Deploy & Verify", effort: "HRS", color: "#f87171" },
];

const CONTEXT_SOURCES = [
  { label: "FOUNDER PROFILE", icon: ">" },
  { label: "ACTIVE INITIATIVES", icon: ">" },
  { label: "CODEBASE READINESS", icon: ">" },
  { label: "COMPETITOR INTEL", icon: ">" },
];

export const PlanSynthesisScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Wedge alignment progress animation
  const wedgeProgress = interpolate(frame, [120, 180], [0, 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <RetroBackground>
      {/* Section header */}
      <PixelText
        text="// PLAN SYNTHESIS"
        fontSize={10}
        color="rgba(255,255,255,0.3)"
        startFrame={0}
        framesPerChar={1}
        cursor={false}
        x={40}
        y={30}
      />

      {/* Query input simulation */}
      <Sequence from={10}>
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 70,
            width: 700,
            padding: "12px 16px",
            border: "2px solid rgba(217,119,87,0.4)",
            borderRadius: 4,
            backgroundColor: "rgba(217,119,87,0.05)",
          }}
        >
          <PixelText
            text='> "Plan a real-time notification system"'
            fontSize={12}
            color="#d97757"
            startFrame={0}
            framesPerChar={1}
            x={0}
            y={0}
          />
        </div>
      </Sequence>

      {/* Context assembly — left column */}
      <Sequence from={60}>
        <PixelText
          text="CONTEXT ASSEMBLY"
          fontSize={8}
          color="rgba(255,255,255,0.4)"
          startFrame={0}
          framesPerChar={1}
          cursor={false}
          x={40}
          y={140}
        />
        {CONTEXT_SOURCES.map((src, i) => (
          <Sequence key={src.label} from={i * 10}>
            <PixelText
              text={`${src.icon} ${src.label}`}
              fontSize={9}
              color="#4ade80"
              startFrame={0}
              framesPerChar={1}
              cursor={false}
              x={50}
              y={170 + i * 28}
            />
          </Sequence>
        ))}
      </Sequence>

      {/* Wedge alignment — right side */}
      <Sequence from={120}>
        <RetroProgress
          progress={wedgeProgress}
          x={800}
          y={150}
          width={400}
          color="#d97757"
          label="WEDGE ALIGNMENT"
        />
        <PixelText
          text={`${Math.round(wedgeProgress * 100)}%`}
          fontSize={20}
          color="#d97757"
          startFrame={40}
          framesPerChar={2}
          cursor={false}
          x={1100}
          y={140}
        />
      </Sequence>

      {/* Phase timeline — staggered reveal */}
      <Sequence from={150}>
        <PixelText
          text="IMPLEMENTATION PHASES"
          fontSize={8}
          color="rgba(255,255,255,0.4)"
          startFrame={0}
          framesPerChar={1}
          cursor={false}
          x={40}
          y={330}
        />
        {PHASES.map((phase, i) => {
          const phaseOpacity = interpolate(
            frame - 150,
            [i * 15, i * 15 + 10],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return (
            <div
              key={phase.id}
              style={{
                position: "absolute",
                left: 50,
                top: 360 + i * 55,
                opacity: phaseOpacity,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {/* Phase number circle */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: `2px solid ${phase.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 10,
                  color: phase.color,
                }}
              >
                {i + 1}
              </div>

              {/* Connector line */}
              {i < PHASES.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    top: 30,
                    width: 2,
                    height: 25,
                    backgroundColor: `${phase.color}30`,
                  }}
                />
              )}

              {/* Phase info */}
              <div>
                <div
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 9,
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  {phase.title}
                </div>
                <div
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 7,
                    color: `${phase.color}80`,
                    marginTop: 4,
                  }}
                >
                  {phase.effort}
                </div>
              </div>

              {/* Effort badge */}
              <div
                style={{
                  marginLeft: "auto",
                  padding: "2px 8px",
                  border: `1px solid ${phase.color}40`,
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 7,
                  color: phase.color,
                }}
              >
                {phase.id}
              </div>
            </div>
          );
        })}
      </Sequence>

      {/* Delegation packet badge */}
      <Sequence from={240}>
        <RetroBadge label="DELEGATE TO AGENT" color="#d97757" x={800} y={500} />
        <RetroBadge label="COPY MARKDOWN" color="rgba(255,255,255,0.4)" x={800} y={540} />
      </Sequence>

      {/* Risks count */}
      <Sequence from={200}>
        <div
          style={{
            position: "absolute",
            right: 80,
            top: 300,
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 8,
              color: "rgba(255,255,255,0.3)",
              marginBottom: 8,
            }}
          >
            IDENTIFIED RISKS
          </div>
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 32,
              color: "#fbbf24",
            }}
          >
            4
          </div>
        </div>
      </Sequence>

      <ScanlineOverlay opacity={0.04} />
    </RetroBackground>
  );
};
