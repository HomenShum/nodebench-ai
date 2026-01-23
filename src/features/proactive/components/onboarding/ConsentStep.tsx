/**
 * Consent Step - Explain data access and get blanket consent
 */

import React from "react";
import { Shield, Lock, Eye, Database, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConsentStep({
  consentGranted,
  onConsentChange,
}: {
  consentGranted: boolean;
  onConsentChange: (granted: boolean) => void;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
          <Shield className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Privacy & Data Access
        </h3>
        <p className="text-[var(--text-secondary)]">
          We take your privacy seriously. Here's what we'll access and why.
        </p>
      </div>

      {/* Data access explanation */}
      <div className="space-y-4 mb-8">
        <DataAccessCard
          icon={Database}
          title="What we access"
          items={[
            "Gmail messages and threads",
            "Google Calendar events",
            "Slack messages (if connected)",
            "Your notes and documents in NodeBench",
          ]}
        />

        <DataAccessCard
          icon={Eye}
          title="What we do with it"
          items={[
            "Analyze content to detect opportunities (meetings, follow-ups, etc.)",
            "Extract entities (people, companies, topics)",
            "Generate briefings and summaries",
            "Track patterns to improve recommendations",
          ]}
        />

        <DataAccessCard
          icon={Lock}
          title="How we protect it"
          items={[
            "Data encrypted in transit and at rest",
            "90-day automatic retention policy",
            "No data shared with third parties",
            "You can revoke access anytime",
          ]}
        />
      </div>

      {/* Consent checkbox */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentGranted}
            onChange={(e) => onConsentChange(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-[var(--border-color)] text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-[var(--text-primary)]">
                I consent to proactive features
              </span>
              {consentGranted && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              By checking this box, I grant NodeBench permission to:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
              <li>• Access and analyze my connected accounts</li>
              <li>• Detect opportunities and generate suggestions</li>
              <li>• Send proactive notifications</li>
              <li>• Store activity data for 90 days (then anonymize)</li>
            </ul>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              You can revoke this consent anytime in Settings. Read our{" "}
              <a href="/privacy" className="text-blue-500 hover:underline">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="/terms" className="text-blue-500 hover:underline">
                Terms of Service
              </a>
              .
            </p>
          </div>
        </label>
      </div>

      {!consentGranted && (
        <div className="mt-4 text-center text-sm text-amber-600">
          <p>⚠️ You must grant consent to use proactive features</p>
        </div>
      )}
    </div>
  );
}

function DataAccessCard({
  icon: Icon,
  title,
  items,
}: {
  icon: any;
  title: string;
  items: string[];
}) {
  return (
    <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-blue-500" />
        <h4 className="font-semibold text-[var(--text-primary)]">{title}</h4>
      </div>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
            <span className="text-blue-500">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
