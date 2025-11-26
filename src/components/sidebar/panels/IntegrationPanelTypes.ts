import { Id } from "../../../../convex/_generated/dataModel";

/**
 * Integration Panel Component
 * Displays all integration tools (Flow, Tools, MCP, SMS, Email, Gmail, Slack, Discord, Webhook)
 * Uses SortableList for drag-and-drop icon reordering
 */

export interface IntegrationConfig {
    id: string;
    icon: any;
    label: string;
    title?: string;
    isActive?: boolean;
}

export interface IntegrationPanelProps {
    // Icon ordering
    iconOrder: string[];
    onIconOrderChange: (newOrder: string[]) => void;
    onIconClick: (e: React.MouseEvent, config: IntegrationConfig) => void;
    getIconConfig: (iconId: string) => IntegrationConfig | null;

    // Panel visibility states
    showFlowPanel: boolean;
    showToolsPanel: boolean;
    showSmsPanel: boolean;
    showEmailPanel: boolean;
    showGmailPanel: boolean;
    showSlackPanel: boolean;
    showDiscordPanel: boolean;
    showMcpPanel: boolean;

    // Flow panel state
    flowCommand: string;
    setFlowCommand: (cmd: string) => void;
    isFlowRunning: boolean;
    activeFlows: Array<{
        id: string;
        command: string;
        status: 'pending' | 'running' | 'completed' | 'failed';
        createdAt: number;
        designDocId?: Id<"documents">;
    }>;
    onExecuteFlow: (command: string) => void;
    onFlowClick: (flowId: string, designDocId?: Id<"documents">) => void;

    // Tools panel
    toolsList: any[] | undefined;
    mcpToolsAll: any[];
    selectedContextFileIds: Id<"files">[];
    onAnalyzeSelectedFiles: () => void;
    onCallMcpTool: (toolId: Id<"mcpTools">, serverId: string, toolName: string, parameters: any) => void;

    // Communication panels
    smsTo: string;
    setSmsTo: (to: string) => void;
    smsMessage: string;
    setSmsMessage: (msg: string) => void;
    onSendSms: () => void;

    emailTo: string;
    setEmailTo: (to: string) => void;
    emailSubject: string;
    setEmailSubject: (subject: string) => void;
    emailBody: string;
    setEmailBody: (body: string) => void;
    onSendEmail: () => void;

    gmailConnection: any;
    gmailLoading: boolean;
    gmailMessages: any[];
    onFetchGmailInbox: () => void;
    onConnectGoogle: () => void;

    slackChannel: string;
    setSlackChannel: (channel: string) => void;
    slackMessage: string;
    setSlackMessage: (msg: string) => void;
    onSendSlack: () => void;

    discordChannel: string;
    setDiscordChannel: (channel: string) => void;
    discordMessage: string;
    setDiscordMessage: (msg: string) => void;
    onSendDiscord: () => void;

    // Close handlers
    setShowFlowPanel: (show: boolean) => void;
    setShowToolsPanel: (show: boolean) => void;
    setShowSmsPanel: (show: boolean) => void;
    setShowEmailPanel: (show: boolean) => void;
    setShowGmailPanel: (show: boolean) => void;
    setShowSlackPanel: (show: boolean) => void;
    setShowDiscordPanel: (show: boolean) => void;
    setShowMcpPanel: (show: boolean) => void;

    // Drag handlers
    onIconsDragStart: () => void;
    onIconsDragEnd: () => void;
}

// This file defines the props interface
// The actual implementation will be in a separate component file
// to keep this manageable and focused
