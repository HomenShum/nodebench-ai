import React from 'react';

interface Entity {
    text: string;
    type: 'company' | 'person' | 'topic' | 'region';
}

const ENTITIES: Record<string, Entity['type']> = {
    'OpenAI': 'company',
    'NVIDIA': 'company',
    'Microsoft': 'company',
    'Apple': 'company',
    'Google': 'company',
    'Anthropic': 'company',
    'Meta': 'company',
    'Tesla': 'company',
    'Sam Altman': 'person',
    'Jensen Huang': 'person',
    'AI': 'topic',
    'AGI': 'topic',
    'Large Language Model': 'topic',
    'LLM': 'topic',
    'Computing': 'topic',
    'US': 'region',
    'China': 'region',
    'EU': 'region',
    'Market': 'topic',
    'Economy': 'topic',
};

interface CrossLinkedTextProps {
    text: string;
    onAskAI?: (prompt: string) => void;
    className?: string;
}

export function CrossLinkedText({ text, onAskAI, className = "" }: CrossLinkedTextProps) {
    if (!text) return null;

    // Create a regex from the entity keys
    const entityNames = Object.keys(ENTITIES).sort((a, b) => b.length - a.length);
    const regex = new RegExp(`(\\b${entityNames.join('\\b|\\b')}\\b)`, 'gi');

    const parts = text.split(regex);

    return (
        <span className={className}>
            {parts.map((part, i) => {
                const lowerPart = part.toLowerCase();
                const matchedEntityKey = Object.keys(ENTITIES).find(
                    name => name.toLowerCase() === lowerPart
                );

                if (matchedEntityKey) {
                    const type = ENTITIES[matchedEntityKey];
                    return (
                        <span
                            key={i}
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onAskAI?.(`Provide a strategic deep-dive on: ${matchedEntityKey}`);
                            }}
                            onKeyDown={(e) => {
                                if (e.key !== "Enter" && e.key !== " ") return;
                                e.preventDefault();
                                e.stopPropagation();
                                onAskAI?.(`Provide a strategic deep-dive on: ${matchedEntityKey}`);
                            }}
                            className={`
                inline-flex items-center px-1.5 py-0.5 rounded-none border-b border-dashed 
                transition-all duration-300 font-bold tracking-tight cursor-pointer
                ${type === 'company' ? 'text-emerald-900 border-emerald-900/30 hover:bg-emerald-50' :
                                    type === 'person' ? 'text-indigo-900 border-indigo-900/30 hover:bg-indigo-50' :
                                        type === 'topic' ? 'text-stone-900 border-stone-900/30 hover:bg-stone-50' :
                                            'text-gray-900 border-gray-900/30 hover:bg-gray-50'}
              `}
                        >
                            {part}
                        </span>
                    );
                }

                return part;
            })}
        </span>
    );
}
