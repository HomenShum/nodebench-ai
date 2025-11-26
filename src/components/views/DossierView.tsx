import { useState } from "react";
import LiveDossierDocument from "./LiveDossierDocument";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Loader2, Plus } from "lucide-react";

interface DossierViewProps {
    activeSources: string[];
}

export function DossierView({ activeSources }: DossierViewProps) {
    // For now, we'll just show the most recent streaming thread as the active dossier
    // In a real implementation, we'd have a list of dossiers to select from
    const threads = useQuery(api.fastAgentPanelStreaming.listThreads);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

    // Auto-select first thread if available and none selected
    if (!selectedThreadId && threads && threads.length > 0) {
        setSelectedThreadId(threads[0]._id);
    }

    return (
        <div className="h-full w-full bg-gray-50 overflow-y-auto">
            <div className="max-w-5xl mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-serif font-bold text-gray-900">Dossiers</h2>
                    {/* Thread selector could go here */}
                </div>

                {selectedThreadId ? (
                    <LiveDossierDocument
                        threadId={selectedThreadId}
                        isLoading={!threads}
                    // onRunFollowUp logic would need to be connected to an agent runner
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-[600px] text-gray-400">
                        {threads === undefined ? (
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        ) : (
                            <>
                                <p>No dossiers found.</p>
                                <p className="text-sm">Start a Deep Agent session to generate one.</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
