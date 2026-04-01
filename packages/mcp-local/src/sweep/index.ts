/**
 * NodeBench Sweep Engine — Live signal intelligence layer.
 *
 * Pattern: Crucix's 27-source parallel sweep + delta engine
 * Architecture: Self-contained source modules, each exports collect()
 */

export type { SweepSignal, SweepResult, DeltaResult, SourceCollector } from "./types.js";
export { registerSource, runSweep, computeDelta, initSweepTables, getLatestSweep, getPreviousSweep, generateRecommendations } from "./engine.js";
export type { Recommendation } from "./engine.js";
