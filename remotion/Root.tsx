import { Composition } from "remotion";
import { FounderDemoVideo } from "./compositions/FounderDemo";
import { IntroScene } from "./compositions/IntroScene";
import { PlanSynthesisScene } from "./compositions/PlanSynthesisScene";
import { DXParityDemo } from "./compositions/DXParityDemo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Full founder demo — 60s @ 30fps */}
      <Composition
        id="FounderDemo"
        component={FounderDemoVideo}
        durationInFrames={1800}
        fps={30}
        width={1280}
        height={720}
      />

      {/* DX Parity demo — install, site_map, diff_crawl, savings — 60s @ 30fps */}
      <Composition
        id="DXParityDemo"
        component={DXParityDemo}
        durationInFrames={1800}
        fps={30}
        width={1280}
        height={720}
      />

      {/* Individual scenes for preview */}
      <Composition
        id="Intro"
        component={IntroScene}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
      />

      <Composition
        id="PlanSynthesis"
        component={PlanSynthesisScene}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
