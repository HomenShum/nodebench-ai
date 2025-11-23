import { ArrowRight, Search, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

interface MagicInputContainerProps {
    onRun: (prompt: string) => void;
    compact?: boolean;
    defaultValue?: string;
}

export default function MagicInputContainer({ onRun, compact = false, defaultValue = "" }: MagicInputContainerProps) {
    const [prompt, setPrompt] = useState(defaultValue);

    useEffect(() => {
        if (defaultValue) {
            setPrompt(defaultValue);
        }
    }, [defaultValue]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onRun(prompt);
        }
    };

    if (compact) {
        return (
            <div className="max-w-4xl mx-auto w-full">
                <div className="relative w-full h-12 group">
                    {/* Icon (Absolute Left) */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
                        <Sparkles className="w-4 h-4" />
                    </div>

                    {/* The Actual Input Field */}
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full h-full pl-10 pr-12 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 outline-none transition-all focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-sm"
                        placeholder="Ask anything..."
                    />

                    {/* Button (Absolute Right) */}
                    <button
                        type="button"
                        onClick={() => onRun(prompt)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-gray-900 hover:bg-black text-white rounded-md transition-all shadow-sm hover:shadow disabled:opacity-50"
                        title="Generate (Cmd+Enter)"
                    >
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto group relative z-20">
            <div className="absolute -inset-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-[2rem] blur-2xl opacity-50 group-hover:opacity-70 transition duration-1000"></div>

            <div className="relative flex items-center bg-white rounded-xl shadow-sm h-14 w-full overflow-hidden border border-gray-200">
                <div className="absolute left-4 text-gray-400 pointer-events-none">
                    <Search className="w-5 h-5" />
                </div>

                <input
                    type="text"
                    className="w-full h-full bg-transparent text-base text-gray-900 placeholder:text-gray-400 pl-12 pr-12 outline-none border-none ring-0 focus:ring-0"
                    placeholder="Ask anything about companies, markets, or docs..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />

                <div className="absolute right-2">
                    <button
                        type="button"
                        onClick={() => onRun(prompt)}
                        className="p-2 bg-gray-900 hover:bg-black text-white rounded-lg transition-all shadow hover:shadow-lg active:scale-95 flex items-center justify-center"
                        title="Run research (Cmd+Enter)"
                    >
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex justify-center gap-3 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-semibold">⌘</kbd>
                    <span>+</span>
                    <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-semibold">Enter</kbd>
                    <span className="ml-1">to run</span>
                </span>
            </div>
        </div>
    );
}
