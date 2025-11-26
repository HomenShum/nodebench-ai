import { FastAgentPanel } from "../FastAgentPanel/FastAgentPanel";
import { Id } from "../../../convex/_generated/dataModel";
import { useEffect } from "react";

interface DeepAgentViewProps {
    activeSources: string[];
}

export function DeepAgentView({ activeSources }: DeepAgentViewProps) {
    // Force chatMode to 'agent-streaming' when mounting this view
    useEffect(() => {
        localStorage.setItem('fastAgentPanel.chatMode', 'agent-streaming');
        // Trigger a storage event to notify FastAgentPanel if it listens to it (it doesn't, but good practice)
        window.dispatchEvent(new Event('storage'));
    }, []);

    return (
        <div className="h-full w-full bg-[var(--bg-primary)]">
            <FastAgentPanel
                isOpen={true}
                onClose={() => { }}
                variant="sidebar"
            />
        </div>
    );
}
