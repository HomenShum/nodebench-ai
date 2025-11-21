/**
 * NewsletterPreview - Email-ready preview of deal flow digest
 * 
 * Shows how the research results would appear in a daily email newsletter
 */

import React, { useState } from 'react';
import { Mail, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { CompanyDossier } from './CompanyDossierCard';

interface NewsletterPreviewProps {
  subject: string;
  previewText: string;
  headlineSummary: string;
  dossiers: CompanyDossier[];
  marketCommentary?: string;
  sources?: string[];
  defaultExpanded?: boolean;
}

export function NewsletterPreview({
  subject,
  previewText,
  headlineSummary,
  dossiers,
  marketCommentary,
  sources,
  defaultExpanded = false,
}: NewsletterPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const generateEmailBody = () => {
    let body = `${headlineSummary}\n\n`;
    
    if (dossiers.length > 0) {
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      dossiers.forEach((dossier, idx) => {
        body += `${idx + 1}. ${dossier.company} — ${dossier.round}`;
        if (dossier.amount_usd) {
          const amount = dossier.amount_usd >= 1000000 
            ? `$${(dossier.amount_usd / 1000000).toFixed(1)}M`
            : `$${(dossier.amount_usd / 1000).toFixed(0)}K`;
          body += ` (${amount})`;
        }
        body += `\n`;
        
        if (dossier.sector) {
          body += `   Sector: ${dossier.sector}\n`;
        }
        
        if (dossier.lead_investors && dossier.lead_investors.length > 0) {
          body += `   Led by: ${dossier.lead_investors.join(', ')}\n`;
        }
        
        if (dossier.why_funded && dossier.why_funded.length > 0) {
          body += `   Why it matters:\n`;
          dossier.why_funded.slice(0, 2).forEach(reason => {
            body += `   • ${reason}\n`;
          });
        }
        
        if (dossier.founders && dossier.founders.length > 0) {
          const founderNames = dossier.founders.map(f => f.name).join(', ');
          body += `   Founders: ${founderNames}\n`;
        }
        
        body += `\n`;
      });
    }
    
    if (marketCommentary) {
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      body += `Market Commentary:\n${marketCommentary}\n\n`;
    }
    
    if (sources && sources.length > 0) {
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      body += `Sources:\n`;
      sources.forEach((source, idx) => {
        body += `${idx + 1}. ${source}\n`;
      });
    }
    
    return body;
  };

  const handleCopy = async () => {
    const fullEmail = `Subject: ${subject}\n\n${generateEmailBody()}`;
    await navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div 
        className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 sm:px-6 py-3 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Email Newsletter Preview</h3>
            <p className="text-xs text-gray-600">How this would appear in your daily digest</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors inline-flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </div>
      </div>

      {/* Email Preview */}
      {isExpanded && (
        <div className="px-4 sm:px-6 py-4 bg-gray-50">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 text-xs sm:text-sm">
            {/* Subject & preview */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="text-[var(--text-tertiary)] uppercase tracking-wide font-medium mb-1">
                Daily digest subject
              </div>
              <div className="text-sm sm:text-base font-semibold text-gray-900">
                {subject}
              </div>
              {previewText && (
                <div className="mt-1 text-xs sm:text-sm text-gray-600">
                  {previewText}
                </div>
              )}
            </div>

            {/* Deals list */}
            {dossiers.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-700 mb-2">
                  Deals in this digest
                </div>
                <ul className="space-y-2">
                  {dossiers.slice(0, 5).map((dossier, idx) => {
                    const hasAmount = typeof dossier.amount_usd === 'number';
                    const amountLabel = hasAmount
                      ? (dossier.amount_usd! >= 1000000
                          ? `$${(dossier.amount_usd! / 1000000).toFixed(1)}M`
                          : `$${(dossier.amount_usd! / 1000).toFixed(0)}K`)
                      : null;

                    return (
                      <li
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {idx + 1}. {dossier.company}
                          {dossier.round && (
                            <span className="ml-1 text-xs font-normal text-gray-600">
                              • {dossier.round}
                            </span>
                          )}
                          {amountLabel && (
                            <span className="ml-1 text-xs font-normal text-gray-600">
                              ({amountLabel})
                            </span>
                          )}
                        </div>
                        {(dossier.lead_investors?.length || dossier.sector) && (
                          <div className="text-xs text-gray-600">
                            {dossier.sector && <span>{dossier.sector}</span>}
                            {dossier.sector && dossier.lead_investors?.length ? ' • ' : ''}
                            {dossier.lead_investors?.length
                              ? `Led by ${dossier.lead_investors.join(', ')}`
                              : null}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Market commentary */}
            {marketCommentary && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-700 mb-1">
                  Market commentary
                </div>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                  {marketCommentary}
                </p>
              </div>
            )}

            {/* Sources */}
            {sources && sources.length > 0 && (
              <div className="border-t border-gray-200 pt-3 mt-1">
                <div className="text-xs font-semibold text-gray-700 mb-1">
                  Sources included
                </div>
                <ul className="space-y-1">
                  {sources.slice(0, 5).map((source, idx) => (
                    <li key={idx} className="text-xs text-gray-600 break-all">
                      {idx + 1}. {source}
                    </li>
                  ))}
                  {sources.length > 5 && (
                    <li className="text-xs text-gray-500">
                      + {sources.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

