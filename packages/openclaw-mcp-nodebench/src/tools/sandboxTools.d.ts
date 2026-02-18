import type { McpTool } from "../types.js";
export declare const DEFAULT_BLOCKED_SKILLS: string[];
export declare const SUSPICIOUS_ARG_PATTERNS: RegExp[];
export declare function computeEffectiveBlocklist(customBlocked: string[], allowedTools: string[]): string[];
export declare const sandboxTools: McpTool[];
