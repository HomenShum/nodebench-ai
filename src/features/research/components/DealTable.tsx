import React from 'react';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import type { Deal } from '../hooks/useDealData';

interface DealTableProps {
    deals: Deal[];
    onDealClick: (dealId: string, companyName: string) => void;
}

const SECTOR_COLORS: Record<string, string> = {
    'Biotech': 'bg-purple-100 text-purple-900 border-purple-200',
    'Fintech': 'bg-blue-100 text-blue-900 border-blue-200',
    'AI/ML': 'bg-emerald-100 text-emerald-900 border-emerald-200',
    'HealthTech': 'bg-rose-100 text-rose-900 border-rose-200',
    'Space': 'bg-indigo-100 text-indigo-900 border-indigo-200',
    'Other': 'bg-stone-100 text-stone-700 border-stone-200',
};

const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-emerald-700 font-bold';
    if (score >= 60) return 'text-blue-700 font-semibold';
    if (score >= 40) return 'text-amber-700';
    return 'text-stone-500';
};

const formatAmount = (amount: number, currency: string): string => {
    const symbol = currency === 'EUR' ? '€' : '$';
    return `${symbol}${amount}M`;
};

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export function DealTable({ deals, onDealClick }: DealTableProps) {
    if (deals.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="text-stone-400 text-sm mb-2">No deals match your current filters</div>
                <div className="text-stone-300 text-xs">Try adjusting your filter criteria</div>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-stone-200">
                        <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Company</th>
                        <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Sector</th>
                        <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Stage</th>
                        <th className="text-right py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Amount</th>
                        <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Lead</th>
                        <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Date</th>
                        <th className="text-center py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                            <div className="flex items-center justify-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                <span>Score</span>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {deals.map((deal) => {
                        const sectorColor = SECTOR_COLORS[deal.sector] || SECTOR_COLORS.Other;
                        const scoreColor = getScoreColor(deal.bankerScore);

                        return (
                            <tr
                                key={deal.id}
                                onClick={() => onDealClick(deal.id, deal.companyName)}
                                className="border-b border-stone-100 hover:bg-stone-50 cursor-pointer transition-colors group"
                            >
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-stone-900 group-hover:text-emerald-900 transition-colors">
                                            {deal.companyName}
                                        </span>
                                        <ArrowUpRight className="w-3 h-3 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="text-[10px] text-stone-400 mt-0.5">{deal.hqLocation}</div>
                                </td>
                                <td className="py-4 px-4">
                                    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight border ${sectorColor}`}>
                                        {deal.sector}
                                    </span>
                                </td>
                                <td className="py-4 px-4">
                                    <span className="text-xs font-medium text-stone-700">{deal.stage}</span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <span className="text-sm font-bold text-stone-900 font-mono">
                                        {formatAmount(deal.amount, deal.currency)}
                                    </span>
                                </td>
                                <td className="py-4 px-4">
                                    <span className="text-xs text-stone-600">{deal.leadInvestor}</span>
                                </td>
                                <td className="py-4 px-4">
                                    <span className="text-xs text-stone-500 font-mono">{formatDate(deal.announcedDate)}</span>
                                </td>
                                <td className="py-4 px-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <span className={`text-2xl font-serif font-semibold ${scoreColor}`}>
                                            {deal.bankerScore}
                                        </span>
                                        <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${deal.bankerScore >= 80 ? 'bg-emerald-600' : deal.bankerScore >= 60 ? 'bg-blue-600' : 'bg-amber-500'}`}
                                                style={{ width: `${deal.bankerScore}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
