import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nodebench.app",
  appName: "NodeBench",
  webDir: "dist",
  ios: {
    contentInset: "always",
    backgroundColor: "#151413",
    scheme: "NodeBench",
  },
  android: {
    backgroundColor: "#151413",
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0c0f14",
      overlaysWebView: true,
    },
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: true,
    },
    Haptics: {},
  },
};

export default config;
