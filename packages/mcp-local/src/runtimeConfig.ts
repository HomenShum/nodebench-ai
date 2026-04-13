export type RuntimeFlags = {
  requestedPreset: string;
  enableAdminRuntime: boolean;
  enableDashboards: boolean;
  enableWatchdog: boolean;
  enableEmbedding: boolean;
  enableEngine: boolean;
  enableProfiling: boolean;
};

export function getRequestedPreset(cliArgs: string[], fallback = "default"): string {
  const presetIdx = cliArgs.indexOf("--preset");
  if (presetIdx !== -1 && cliArgs[presetIdx + 1] && !cliArgs[presetIdx + 1].startsWith("--")) {
    return cliArgs[presetIdx + 1];
  }
  return fallback;
}

export function resolveRuntimeFlags(cliArgs: string[], preset = "default"): RuntimeFlags {
  const requestedPreset = preset || "default";
  const enableAdminRuntime = cliArgs.includes("--admin");
  const enableDashboards = enableAdminRuntime || cliArgs.includes("--dashboards");
  const enableWatchdog = enableAdminRuntime || cliArgs.includes("--watchdog");
  const explicitlyEnableEmbedding = cliArgs.includes("--embedding");
  const explicitlyDisableEmbedding = cliArgs.includes("--no-embedding");
  const defaultLikePreset = requestedPreset === "default" || requestedPreset === "starter";
  const enableEmbedding = !explicitlyDisableEmbedding && (explicitlyEnableEmbedding || !defaultLikePreset);

  return {
    requestedPreset,
    enableAdminRuntime,
    enableDashboards,
    enableWatchdog,
    enableEmbedding,
    enableEngine: cliArgs.includes("--engine"),
    enableProfiling: cliArgs.includes("--profile"),
  };
}
