/**
 * CompanyDossierCard - Banker-facing company dossier display
 * 
 * Shows funding round details with founder analysis and investment thesis
 */

import React from 'react';
import { Building2, TrendingUp, Users, MapPin, ExternalLink, DollarSign, Briefcase, Award, AlertCircle } from 'lucide-react';

export interface CompanyDossier {
  company: string;
  round: string;
  amount_usd?: number;
  date?: string;
  sector?: string;
  lead_investors?: string[];
  why_funded?: string[];
  founders?: Array<{
    name: string;
    highlights?: string[];
  }>;
  notable_risks?: string[];
  source_url?: string;
  description?: string;
  location?: string;
}

interface CompanyDossierCardProps {
  dossier: CompanyDossier;
  onViewFull?: () => void;
  onAddToWatchlist?: () => void;
}

export function CompanyDossierCard({ dossier, onViewFull, onAddToWatchlist }: CompanyDossierCardProps) {
  const formatAmount = (amount?: number) => {
    if (!amount) return 'Undisclosed';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <h3 className="text-lg font-bold text-gray-900 truncate">{dossier.company}</h3>
            </div>
            {dossier.location && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <MapPin className="h-3.5 w-3.5" />
                <span>{dossier.location}</span>
              </div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              {dossier.round}
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{formatAmount(dossier.amount_usd)}</div>
            {dossier.date && <div className="text-xs text-gray-500 mt-0.5">{dossier.date}</div>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 py-4 space-y-4">
        {/* Description */}
        {dossier.description && (
          <p className="text-sm text-gray-700 leading-relaxed">{dossier.description}</p>
        )}

        {/* Why Funded */}
        {dossier.why_funded && dossier.why_funded.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-green-600" />
              <h4 className="text-sm font-semibold text-gray-900">Why This Matters</h4>
            </div>
            <ul className="space-y-1.5">
              {dossier.why_funded.slice(0, 3).map((reason, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-green-600 mt-0.5 flex-shrink-0">✓</span>
                  <span className="flex-1">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Founders */}
        {dossier.founders && dossier.founders.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-gray-900">Founders</h4>
            </div>
            <div className="space-y-2">
              {dossier.founders.slice(0, 2).map((founder, idx) => (
                <div key={idx} className="text-sm">
                  <div className="font-medium text-gray-900">{founder.name}</div>
                  {founder.highlights && founder.highlights.length > 0 && (
                    <div className="text-gray-600 text-xs mt-0.5">
                      {founder.highlights.join(' • ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Investors */}
        {dossier.lead_investors && dossier.lead_investors.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-purple-600" />
              <h4 className="text-sm font-semibold text-gray-900">Lead Investors</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {dossier.lead_investors.map((investor, idx) => (
                <span key={idx} className="px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium">
                  {investor}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Risks */}
        {dossier.notable_risks && dossier.notable_risks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <h4 className="text-sm font-semibold text-gray-900">Notable Risks</h4>
            </div>
            <ul className="space-y-1">
              {dossier.notable_risks.slice(0, 2).map((risk, idx) => (
                <li key={idx} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="text-amber-600 mt-0.5">⚠</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-2">
        {dossier.source_url && (
          <a
            href={dossier.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
          >
            Source <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {onAddToWatchlist && (
            <button
              onClick={onAddToWatchlist}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              Add to Watchlist
            </button>
          )}
          {onViewFull && (
            <button
              onClick={onViewFull}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Full Dossier
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

