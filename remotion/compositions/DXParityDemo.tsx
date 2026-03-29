import React from "react";
import { Sequence } from "remotion";
import { RetroBackground } from "../components/RetroBackground";
import { PixelText, ScanlineOverlay } from "../components/PixelText";
import { RetroBadge } from "../components/RetroBackground";

/**
 * DXParityDemo — 60-second demo of the new DX parity features.
 *
 * Timeline (30fps, 1800 frames):
 *   0-180   (0-6s)    Hook — "What if installing AI tools was one command?"
 *   180-480 (6-16s)   Install — curl install.sh demo
 *   480-780 (16-26s)  SiteMap — interactive crawl + drill-down
 *   780-1080 (26-36s) DiffCrawl — before/after comparison
 *   1080-1380 (36-46s) TestGen — suggest_tests + compare_savings
 *   1380-1800 (46-60s) Outro — marketplace badges + CTA
 */

const HookScene: React.FC = () => (
  <RetroBackground>
    <PixelText
      text="WHAT IF YOUR AI AGENT HAD"
      fontSize={12}
      color="rgba(255,255,255,0.5)"
      startFrame={0}
      framesPerChar={1}
      cursor={false}
      x={200}
      y={200}
    />
    <PixelText
      text="350 TOOLS"
      fontSize={28}
      color="#d97757"
      startFrame={30}
      framesPerChar={2}
      x={320}
      y={280}
    />
    <PixelText
      text="AND KNEW WHICH ONES TO USE?"
      fontSize={12}
      color="rgba(255,255,255,0.5)"
      startFrame={80}
      framesPerChar={1}
      cursor={false}
      x={200}
      y={380}
    />
    <RetroBadge text="NODEBENCH MCP" x={440} y={480} startFrame={120} />
    <ScanlineOverlay />
  </RetroBackground>
);

const InstallScene: React.FC = () => (
  <RetroBackground>
    <PixelText
      text="// ONE COMMAND TO INSTALL"
      fontSize={10}
      color="rgba(255,255,255,0.3)"
      startFrame={0}
      framesPerChar={1}
      cursor={false}
      x={40}
      y={30}
    />
    <PixelText
      text="$ curl -sL nodebenchai.com/install.sh | bash"
      fontSize={12}
      color="#d97757"
      startFrame={15}
      framesPerChar={1}
      x={60}
      y={80}
    />
    <PixelText
      text="OK  Node.js v22.3.0"
      fontSize={9}
      color="#4ade80"
      startFrame={60}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={140}
    />
    <PixelText
      text="OK  npm 10.8.1"
      fontSize={9}
      color="#4ade80"
      startFrame={75}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={170}
    />
    <PixelText
      text="OK  10 rules installed to ~/.claude/rules/"
      fontSize={9}
      color="#4ade80"
      startFrame={90}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={200}
    />
    <PixelText
      text="OK  .mcp.json written (preset: founder)"
      fontSize={9}
      color="#4ade80"
      startFrame={110}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={230}
    />
    <PixelText
      text="OK  .mcp.json added to .gitignore"
      fontSize={9}
      color="#4ade80"
      startFrame={125}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={260}
    />
    <PixelText
      text="NodeBench MCP installed successfully!"
      fontSize={14}
      color="#4ade80"
      startFrame={150}
      framesPerChar={1}
      x={60}
      y={340}
    />
    <PixelText
      text="TRY: discover_tools('analyze a company')"
      fontSize={10}
      color="#60a5fa"
      startFrame={200}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={420}
    />
    <ScanlineOverlay />
  </RetroBackground>
);

const SiteMapScene: React.FC = () => (
  <RetroBackground>
    <PixelText
      text="// INTERACTIVE SITE MAP"
      fontSize={10}
      color="rgba(255,255,255,0.3)"
      startFrame={0}
      framesPerChar={1}
      cursor={false}
      x={40}
      y={30}
    />
    <PixelText
      text='> site_map({ url: "https://myapp.com" })'
      fontSize={12}
      color="#d97757"
      startFrame={10}
      framesPerChar={1}
      x={60}
      y={80}
    />
    <PixelText
      text="CRAWLED: 6 screens, 42 elements"
      fontSize={9}
      color="#4ade80"
      startFrame={60}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={150}
    />
    <PixelText
      text="[0] /         Home       (15 elements)"
      fontSize={9}
      color="rgba(255,255,255,0.7)"
      startFrame={80}
      framesPerChar={1}
      cursor={false}
      x={80}
      y={190}
    />
    <PixelText
      text="[1] /dash     Dashboard  (12 elements)"
      fontSize={9}
      color="rgba(255,255,255,0.7)"
      startFrame={90}
      framesPerChar={1}
      cursor={false}
      x={80}
      y={215}
    />
    <PixelText
      text="[2] /search   Search     (8 elements)"
      fontSize={9}
      color="rgba(255,255,255,0.7)"
      startFrame={100}
      framesPerChar={1}
      cursor={false}
      x={80}
      y={240}
    />
    <PixelText
      text='> site_map({ action: "findings" })'
      fontSize={12}
      color="#d97757"
      startFrame={140}
      framesPerChar={1}
      x={60}
      y={310}
    />
    <PixelText
      text="ERROR  HTTP 404: /api/health"
      fontSize={9}
      color="#ef4444"
      startFrame={190}
      framesPerChar={1}
      cursor={false}
      x={80}
      y={370}
    />
    <PixelText
      text="WARN   No elements on /pricing"
      fontSize={9}
      color="#fbbf24"
      startFrame={205}
      framesPerChar={1}
      cursor={false}
      x={80}
      y={395}
    />
    <PixelText
      text="INFO   SPA detected"
      fontSize={9}
      color="#60a5fa"
      startFrame={220}
      framesPerChar={1}
      cursor={false}
      x={80}
      y={420}
    />
    <ScanlineOverlay />
  </RetroBackground>
);

const DiffCrawlScene: React.FC = () => (
  <RetroBackground>
    <PixelText
      text="// BEFORE / AFTER PROOF"
      fontSize={10}
      color="rgba(255,255,255,0.3)"
      startFrame={0}
      framesPerChar={1}
      cursor={false}
      x={40}
      y={30}
    />
    <PixelText
      text='> diff_crawl({ url: "...", baseline_id: "sm_abc" })'
      fontSize={11}
      color="#d97757"
      startFrame={10}
      framesPerChar={1}
      x={60}
      y={80}
    />
    <PixelText
      text="BASELINE: 6 pages  |  CURRENT: 7 pages"
      fontSize={9}
      color="rgba(255,255,255,0.6)"
      startFrame={60}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={150}
    />
    <PixelText
      text="+1 ADDED:   /settings"
      fontSize={10}
      color="#4ade80"
      startFrame={80}
      framesPerChar={1}
      cursor={false}
      x={80}
      y={200}
    />
    <PixelText
      text=" 0 REMOVED"
      fontSize={10}
      color="rgba(255,255,255,0.4)"
      startFrame={95}
      framesPerChar={1}
      cursor={false}
      x={80}
      y={230}
    />
    <PixelText
      text=" 2 CHANGED: /dash (+3 elements), /search (title)"
      fontSize={10}
      color="#fbbf24"
      startFrame={110}
      framesPerChar={1}
      cursor={false}
      x={80}
      y={260}
    />
    <PixelText
      text="NEW FINDINGS: 0  |  RESOLVED: 1"
      fontSize={10}
      color="#4ade80"
      startFrame={150}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={340}
    />
    <RetroBadge text="REGRESSION-FREE" x={420} y={420} startFrame={180} />
    <ScanlineOverlay />
  </RetroBackground>
);

const TestGenScene: React.FC = () => (
  <RetroBackground>
    <PixelText
      text="// AUTO-GENERATED TESTS + ROI"
      fontSize={10}
      color="rgba(255,255,255,0.3)"
      startFrame={0}
      framesPerChar={1}
      cursor={false}
      x={40}
      y={30}
    />
    <PixelText
      text='> suggest_tests({ session_id: "sm_abc" })'
      fontSize={12}
      color="#d97757"
      startFrame={10}
      framesPerChar={1}
      x={60}
      y={80}
    />
    <PixelText
      text="TEST 1: Page availability (first-time visitor)"
      fontSize={9}
      color="rgba(255,255,255,0.7)"
      startFrame={50}
      framesPerChar={1}
      cursor={false}
      x={80}
      y={140}
    />
    <PixelText
      text="TEST 2: Navigation completeness (2 orphan pages)"
      fontSize={9}
      color="rgba(255,255,255,0.7)"
      startFrame={65}
      framesPerChar={1}
      cursor={false}
      x={80}
      y={165}
    />
    <PixelText
      text="TEST 3: Mobile responsiveness (375x812)"
      fontSize={9}
      color="rgba(255,255,255,0.7)"
      startFrame={80}
      framesPerChar={1}
      cursor={false}
      x={80}
      y={190}
    />
    <PixelText
      text='> compare_savings()'
      fontSize={12}
      color="#d97757"
      startFrame={120}
      framesPerChar={1}
      x={60}
      y={270}
    />
    <PixelText
      text="TOOL CALLS: 127  |  AVG LATENCY: 340ms"
      fontSize={9}
      color="rgba(255,255,255,0.6)"
      startFrame={160}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={330}
    />
    <PixelText
      text="TOON SAVINGS: 40% tokens saved"
      fontSize={9}
      color="#4ade80"
      startFrame={180}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={360}
    />
    <PixelText
      text="TIME SAVED: 10.6 hours vs manual"
      fontSize={9}
      color="#4ade80"
      startFrame={200}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={390}
    />
    <PixelText
      text="COST: $0.38 estimated"
      fontSize={9}
      color="#4ade80"
      startFrame={215}
      framesPerChar={1}
      cursor={false}
      x={60}
      y={420}
    />
    <ScanlineOverlay />
  </RetroBackground>
);

const OutroScene: React.FC = () => (
  <RetroBackground>
    <PixelText
      text="NODEBENCH"
      fontSize={32}
      color="#d97757"
      startFrame={0}
      framesPerChar={3}
      x={350}
      y={180}
    />
    <PixelText
      text="350 tools. Progressive discovery."
      fontSize={12}
      color="rgba(255,255,255,0.7)"
      startFrame={60}
      framesPerChar={1}
      cursor={false}
      x={270}
      y={300}
    />
    <PixelText
      text="Memory that compounds."
      fontSize={12}
      color="rgba(255,255,255,0.7)"
      startFrame={90}
      framesPerChar={1}
      cursor={false}
      x={370}
      y={340}
    />
    <PixelText
      text="$ npx nodebench-mcp"
      fontSize={14}
      color="#4ade80"
      startFrame={140}
      framesPerChar={1}
      x={350}
      y={430}
    />
    <RetroBadge text="CLAUDE PLUGIN" x={300} y={530} startFrame={200} />
    <RetroBadge text="CURSOR MARKETPLACE" x={520} y={530} startFrame={220} />
    <RetroBadge text="MIT LICENSE" x={410} y={580} startFrame={240} />
    <ScanlineOverlay />
  </RetroBackground>
);

/** Main composition — sequences all 6 scenes into 60 seconds */
export const DXParityDemo: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={180}>
      <HookScene />
    </Sequence>
    <Sequence from={180} durationInFrames={300}>
      <InstallScene />
    </Sequence>
    <Sequence from={480} durationInFrames={300}>
      <SiteMapScene />
    </Sequence>
    <Sequence from={780} durationInFrames={300}>
      <DiffCrawlScene />
    </Sequence>
    <Sequence from={1080} durationInFrames={300}>
      <TestGenScene />
    </Sequence>
    <Sequence from={1380} durationInFrames={420}>
      <OutroScene />
    </Sequence>
  </>
);
