import React from "react";
import { Sequence } from "remotion";
import { IntroScene } from "./IntroScene";
import { PlanSynthesisScene } from "./PlanSynthesisScene";
import { RetroBackground } from "../components/RetroBackground";
import { PixelText, ScanlineOverlay } from "../components/PixelText";
import { RetroBadge } from "../components/RetroBackground";

/**
 * FounderDemoVideo — Full 60-second retro 8-bit founder demo.
 *
 * Timeline (30fps, 1800 frames):
 *   0-150   (0-5s)    IntroScene — logo + tagline
 *   150-450 (5-15s)   SearchScene — entity search demo
 *   450-750 (15-25s)  PlanSynthesisScene — plan generation
 *   750-1050 (25-35s) DelegationScene — agent handoff
 *   1050-1500 (35-50s) CoordinationScene — multi-agent
 *   1500-1800 (50-60s) OutroScene — CTA
 */

/** Search demo — shows entity intelligence query flow */
const SearchScene: React.FC = () => (
  <RetroBackground>
    <PixelText
      text="// ENTITY INTELLIGENCE"
      fontSize={10}
      color="rgba(255,255,255,0.3)"
      startFrame={0}
      framesPerChar={1}
      cursor={false}
      x={40}
      y={30}
    />
    <PixelText
      text='> "Analyze Anthropic vs OpenAI"'
      fontSize={14}
      color="#d97757"
      startFrame={10}
      framesPerChar={1}
      x={60}
      y={80}
    />
    <PixelText
      text="SIGNALS DETECTED: 5"
      fontSize={9}
      color="#4ade80"
      startFrame={60}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={160}
    />
    <PixelText
      text="CONTRADICTIONS: 2"
      fontSize={9}
      color="#fbbf24"
      startFrame={80}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={190}
    />
    <PixelText
      text="SOURCES CITED: 23"
      fontSize={9}
      color="#60a5fa"
      startFrame={100}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={220}
    />
    <PixelText
      text="CONFIDENCE: 82%"
      fontSize={14}
      color="#d97757"
      startFrame={120}
      framesPerChar={2}
      x={60}
      y={300}
    />
    <RetroBadge label="GROUNDED" color="#4ade80" x={60} y={380} />
    <RetroBadge label="VERIFIED" color="#60a5fa" x={200} y={380} />
    <RetroBadge label="6 ROLE LENSES" color="#c084fc" x={340} y={380} />
    <PixelText
      text="Every claim traced to source. Every source citable."
      fontSize={9}
      color="rgba(255,255,255,0.4)"
      startFrame={160}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={460}
    />
    <ScanlineOverlay opacity={0.04} />
  </RetroBackground>
);

/** Delegation demo — agent handoff flow */
const DelegationScene: React.FC = () => (
  <RetroBackground>
    <PixelText
      text="// AGENT DELEGATION"
      fontSize={10}
      color="rgba(255,255,255,0.3)"
      startFrame={0}
      framesPerChar={1}
      cursor={false}
      x={40}
      y={30}
    />
    <PixelText
      text="Plan approved. Delegating Phase 1..."
      fontSize={12}
      color="#d97757"
      startFrame={10}
      framesPerChar={1}
      x={60}
      y={100}
    />
    <PixelText
      text="TARGET: Claude Code"
      fontSize={9}
      color="#4ade80"
      startFrame={60}
      framesPerChar={1}
      cursor={false}
      x={80}
      y={180}
    />
    <PixelText
      text="SCOPE: Research & Design"
      fontSize={9}
      color="#60a5fa"
      startFrame={80}
      framesPerChar={1}
      cursor={false}
      x={80}
      y={210}
    />
    <PixelText
      text="PERMISSION: ask_first"
      fontSize={9}
      color="#fbbf24"
      startFrame={100}
      framesPerChar={1}
      cursor={false}
      x={80}
      y={240}
    />
    <PixelText
      text="CONTEXT PRESERVED: 3 items"
      fontSize={9}
      color="#c084fc"
      startFrame={120}
      framesPerChar={1}
      cursor={false}
      x={80}
      y={270}
    />
    <RetroBadge label="PACKET DISPATCHED" color="#4ade80" x={60} y={380} />
    <PixelText
      text="Agent knows your mission, wedge, and contradictions."
      fontSize={9}
      color="rgba(255,255,255,0.4)"
      startFrame={180}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={460}
    />
    <ScanlineOverlay opacity={0.04} />
  </RetroBackground>
);

/** Coordination demo — multi-agent presence */
const CoordinationScene: React.FC = () => (
  <RetroBackground>
    <PixelText
      text="// COORDINATION HUB"
      fontSize={10}
      color="rgba(255,255,255,0.3)"
      startFrame={0}
      framesPerChar={1}
      cursor={false}
      x={40}
      y={30}
    />
    <PixelText
      text="4 peers connected. Shared context live."
      fontSize={12}
      color="#d97757"
      startFrame={10}
      framesPerChar={1}
      x={60}
      y={100}
    />

    {/* Peer list */}
    {[
      { name: "Founder", role: "compiler", color: "#d97757", status: "active" },
      { name: "Claude Code", role: "runner", color: "#4ade80", status: "active" },
      { name: "Market Scanner", role: "observer", color: "#60a5fa", status: "idle" },
      { name: "QA Agent", role: "judge", color: "#c084fc", status: "waiting" },
    ].map((peer, i) => (
      <Sequence key={peer.name} from={40 + i * 20}>
        <div
          style={{
            position: "absolute",
            left: 80,
            top: 180 + i * 60,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: peer.status === "active" ? "#4ade80" : peer.status === "idle" ? "#fbbf24" : "#60a5fa",
            }}
          />
          <div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: peer.color }}>
              {peer.name}
            </div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
              {peer.role.toUpperCase()}
            </div>
          </div>
        </div>
      </Sequence>
    ))}

    <PixelText
      text="One truth. Many agents. Zero drift."
      fontSize={10}
      color="rgba(255,255,255,0.5)"
      startFrame={200}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={500}
    />
    <ScanlineOverlay opacity={0.04} />
  </RetroBackground>
);

/** Outro — CTA */
const OutroScene: React.FC = () => (
  <RetroBackground showGrid={false}>
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "35%",
        transform: "translate(-50%, -50%)",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 36,
        color: "#d97757",
        letterSpacing: 6,
        textAlign: "center",
        textShadow: "3px 3px 0 rgba(217,119,87,0.3)",
      }}
    >
      NODEBENCH
    </div>
    <PixelText
      text="Operating Intelligence for Founders"
      fontSize={12}
      color="rgba(255,255,255,0.6)"
      startFrame={15}
      framesPerChar={1}
      x={430}
      y={310}
    />
    <PixelText
      text="nodebenchai.com"
      fontSize={14}
      color="#d97757"
      startFrame={60}
      framesPerChar={2}
      x={490}
      y={400}
    />
    <RetroBadge label="TRY FREE" color="#4ade80" x={560} y={470} />
    <ScanlineOverlay opacity={0.03} />
  </RetroBackground>
);

/** Main composition — sequences all scenes */
export const FounderDemoVideo: React.FC = () => {
  return (
    <>
      <Sequence from={0} durationInFrames={150}>
        <IntroScene />
      </Sequence>
      <Sequence from={150} durationInFrames={300}>
        <SearchScene />
      </Sequence>
      <Sequence from={450} durationInFrames={300}>
        <PlanSynthesisScene />
      </Sequence>
      <Sequence from={750} durationInFrames={300}>
        <DelegationScene />
      </Sequence>
      <Sequence from={1050} durationInFrames={450}>
        <CoordinationScene />
      </Sequence>
      <Sequence from={1500} durationInFrames={300}>
        <OutroScene />
      </Sequence>
    </>
  );
};
