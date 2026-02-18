import type { McpTool } from "../types.js";
export declare function getActiveSessions(): Map<string, {
    policyName: string;
    startTime: number;
    driverName?: string;
}>;
export declare const sessionTools: McpTool[];
