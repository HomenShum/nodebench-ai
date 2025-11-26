import { FastAgentPanel } from "../FastAgentPanel/FastAgentPanel";
import { Id } from "../../../convex/_generated/dataModel";

interface FastAgentViewProps {
    activeSources: string[];
}

export function FastAgentView({ activeSources }: FastAgentViewProps) {
    return (
        <div className="h-full w-full bg-[var(--bg-primary)]">
            <FastAgentPanel
                isOpen={true}
                onClose={() => { }}
                variant="sidebar" // Reusing sidebar variant for now as it fits the container
            // We can pass activeSources via context or props if FastAgentPanel supports it later
            // For now, we just render the panel
            />
        </div>
    );
}
