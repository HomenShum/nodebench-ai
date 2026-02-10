import { LayoutDashboard, Clock, FileText } from "lucide-react";
import type { AppMode } from "../types";

interface AppModeNavigationProps {
    appMode: AppMode;
    onModeChange: (mode: AppMode) => void;
}

/**
 * App Mode Navigation Component
 * Displays Workspace, Fast Agent, and Dossier navigation buttons
 * Styled to match Welcome Landing aesthetic
 */
export function AppModeNavigation({ appMode, onModeChange }: AppModeNavigationProps) {
    return (
        <div className="py-4 px-3 space-y-1">
            <div className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Workspace
            </div>

            <button
                onClick={() => onModeChange('workspace')}
                className={`group relative w-full flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer transition-colors ${appMode === 'workspace' ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <LayoutDashboard className={`w-4 h-4 shrink-0 transition-opacity ${appMode === 'workspace' ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`} />
                    <span className={`text-sm font-medium truncate transition-colors ${appMode === 'workspace' ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                        Dashboard
                    </span>
                </div>
            </button>

            <button
                onClick={() => onModeChange('fast-agent')}
                className={`group relative w-full flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer transition-colors ${appMode === 'fast-agent' ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Clock className={`w-4 h-4 shrink-0 transition-opacity ${appMode === 'fast-agent' ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`} />
                    <span className={`text-sm font-medium truncate transition-colors ${appMode === 'fast-agent' ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                        Recent Research
                    </span>
                </div>
            </button>

            <button
                onClick={() => onModeChange('dossier')}
                className={`group relative w-full flex items-center justify-between py-2 px-2.5 rounded-lg cursor-pointer transition-colors ${appMode === 'dossier' ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className={`w-4 h-4 shrink-0 transition-opacity ${appMode === 'dossier' ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`} />
                    <span className={`text-sm font-medium truncate transition-colors ${appMode === 'dossier' ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                        Saved Dossiers
                    </span>
                </div>
            </button>
        </div>
    );
}
