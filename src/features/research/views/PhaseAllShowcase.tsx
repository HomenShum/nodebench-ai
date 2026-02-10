/**
 * PhaseAllShowcase - Demo page for AI-2027.com-like components
 * 
 * Showcases all Phase All components:
 * - Phase 1: Citation & Provenance (FootnoteMarker, FootnotesSection)
 * - Phase 2: Timeline Strip
 * - Phase 3: Entity Linking
 * - Phase 4: Multi-Source Research Agent (backend only)
 * - Phase 5: Research Supplements
 * - Phase 6: Email Digest Preview
 */

import React, { useState } from 'react';
import { ArrowLeft, FileText, Users, Clock, Mail, BookOpen, Layers } from 'lucide-react';

// Phase All Components
import { FootnoteMarker } from '../components/FootnoteMarker';
import { FootnotesSection } from '../components/FootnotesSection';
import { TimelineStrip, type TimelineEvent } from '../components/TimelineStrip';
import { EntityLink } from '../components/EntityLink';
import { InteractiveSpanParser } from '../components/InteractiveSpanParser';
import { ResearchSupplementView, type ResearchSupplement } from '../components/ResearchSupplement';
import { EmailDigestPreview, type EmailDigest } from '../components/EmailDigestPreview';

// Types
import {
  createCitationLibrary,
  addCitation,
  createEntityLibrary,
  addEntity,
  type Citation,
  type Entity
} from '../types/index';

interface PhaseAllShowcaseProps {
  onBack?: () => void;
}

// Sample data for demonstration - using immutable pattern
let sampleCitations = createCitationLibrary();
sampleCitations = addCitation(sampleCitations, {
  id: 'arxiv-001',
  label: 'AI Safety Research',
  type: 'source',
  fullText: 'Comprehensive analysis of AI alignment challenges in large language models.',
  url: 'https://arxiv.org/abs/2024.12345',
});
sampleCitations = addCitation(sampleCitations, {
  id: 'sec-10k',
  label: 'OpenAI Annual Report',
  type: 'data',
  fullText: 'Financial disclosures and operational metrics from the 2024 annual report.',
  url: 'https://sec.gov/openai/10k',
});
sampleCitations = addCitation(sampleCitations, {
  id: 'quote-altman',
  label: 'Sam Altman Interview',
  type: 'quote',
  fullText: '"AGI will be the most transformative technology in human history."',
  url: 'https://techcrunch.com/interview',
});

let sampleEntities = createEntityLibrary();
sampleEntities = addEntity(sampleEntities, {
  id: 'openai',
  name: 'OpenAI',
  type: 'company',
  description: 'AI research laboratory focused on ensuring AGI benefits humanity',
  ticker: 'Private',
  dossierId: 'doc-openai-dossier',
});
sampleEntities = addEntity(sampleEntities, {
  id: 'sam-altman',
  name: 'Sam Altman',
  type: 'person',
  description: 'CEO of OpenAI, former president of Y Combinator',
  role: 'CEO',
  affiliation: 'OpenAI',
});
sampleEntities = addEntity(sampleEntities, {
  id: 'gpt-5',
  name: 'GPT-5',
  type: 'product',
  description: 'Next-generation large language model',
});
sampleEntities = addEntity(sampleEntities, {
  id: 'transformer',
  name: 'Transformer Architecture',
  type: 'technology',
  description: 'Neural network architecture using self-attention mechanisms',
});

const sampleTimelineEvents: TimelineEvent[] = [
  { id: '1', date: '2024-01-15', label: 'GPT-4 Turbo Launch', phase: 'past' },
  { id: '2', date: '2024-06-01', label: 'Sora Video Model', phase: 'past' },
  { id: '3', date: '2024-12-21', label: 'Current Analysis', description: 'Today\'s intelligence brief', phase: 'present', isCurrent: true },
  { id: '4', date: '2025-03-01', label: 'GPT-5 Expected', description: 'Projected release window', phase: 'future' },
  { id: '5', date: '2025-06-01', label: 'AGI Milestone?', description: 'Industry speculation', phase: 'future' },
];

const sampleSupplement: ResearchSupplement = {
  id: 'supp-001',
  parentId: 'brief-2024-12-21',
  title: 'Deep Dive: AI Market Dynamics',
  description: 'Comprehensive analysis of AI market trends and competitive dynamics',
  status: 'complete',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sections: [
    {
      id: 'sec-1',
      title: 'Market Overview',
      type: 'deep_dive',
      content: 'The AI market continues to show exponential growth...',
      defaultExpanded: true,
      citationIds: ['arxiv-001'],
    },
    {
      id: 'sec-2',
      title: 'Competitive Landscape',
      type: 'comparison',
      content: 'Key players include OpenAI, Anthropic, Google DeepMind...',
      citationIds: ['sec-10k'],
    },
  ],
};

const sampleDigest: EmailDigest = {
  id: 'digest-001',
  userId: 'user-123',
  createdAt: new Date(),
  scheduledFor: new Date(),
  status: 'draft',
  topics: [
    { id: 't1', hashtag: '#ai', displayName: 'Artificial Intelligence', itemCount: 5, priority: 1 },
    { id: 't2', hashtag: '#openai', displayName: 'OpenAI News', itemCount: 3, priority: 2 },
  ],
  items: [
    { id: 'i1', topicId: 't1', title: 'GPT-5 Development Update', summary: 'Latest progress on next-gen model...', url: '#', source: 'TechCrunch', relevanceScore: 0.95, publishedAt: new Date() },
    { id: 'i2', topicId: 't1', title: 'AI Regulation Framework', summary: 'EU announces new AI governance...', url: '#', source: 'Reuters', relevanceScore: 0.88, publishedAt: new Date() },
    { id: 'i3', topicId: 't2', title: 'OpenAI Valuation Reaches $150B', summary: 'Latest funding round details...', url: '#', source: 'Bloomberg', relevanceScore: 0.92, publishedAt: new Date() },
  ],
  metrics: { totalItems: 8, topicsIncluded: 2, averageRelevance: 0.91 },
};

export function PhaseAllShowcase({ onBack }: PhaseAllShowcaseProps) {
  const [activeSection, setActiveSection] = useState<string>('all');

  const sections = [
    { id: 'all', label: 'All Phases', icon: Layers },
    { id: 'citations', label: 'Citations', icon: FileText },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'entities', label: 'Entities', icon: Users },
    { id: 'supplements', label: 'Supplements', icon: BookOpen },
    { id: 'digest', label: 'Email Digest', icon: Mail },
  ];

  const sampleTextWithTokens = `
According to recent research {{cite:arxiv-001}}, the development of @@entity:openai|OpenAI@@
has accelerated significantly. CEO @@entity:sam-altman|Sam Altman@@ stated {{cite:quote-altman}}
that @@entity:gpt-5|GPT-5@@ will leverage the @@entity:transformer|Transformer Architecture@@
in unprecedented ways. Financial data {{cite:sec-10k}} supports this trajectory.
  `.trim();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button type="button" onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">Phase All Showcase</h1>
              <p className="text-sm text-gray-500">AI-2027.com-like Visual Multi-Source Research Components</p>
            </div>
          </div>
          <div className="flex gap-2">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${activeSection === id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        {/* Phase 2: Timeline Strip */}
        {(activeSection === 'all' || activeSection === 'timeline') && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">
              Phase 2: Timeline Strip
            </h2>
            <TimelineStrip
              events={sampleTimelineEvents}
              activeEventId="3"
              onEventClick={(e) => console.log('Event clicked:', e)}
            />
          </section>
        )}

        {/* Phase 1: Citations */}
        {(activeSection === 'all' || activeSection === 'citations') && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">
              Phase 1: Citation & Provenance
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <p className="text-gray-700 leading-relaxed">
                Inline footnote markers: Research shows <FootnoteMarker citation={sampleCitations.citations['arxiv-001']} />
                that AI development is accelerating. Financial data <FootnoteMarker citation={sampleCitations.citations['sec-10k']} />
                confirms market growth. Industry leaders <FootnoteMarker citation={sampleCitations.citations['quote-altman']} />
                remain optimistic.
              </p>
              <FootnotesSection library={sampleCitations} />
            </div>
          </section>
        )}

        {/* Phase 3: Entity Linking */}
        {(activeSection === 'all' || activeSection === 'entities') && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">
              Phase 3: Entity Linking
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
              <div className="flex flex-wrap gap-3">
                {Object.values(sampleEntities.entities).map((entity) => (
                  <EntityLink key={entity.id} entity={entity} onClick={() => console.log('Entity:', entity)} />
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Interactive Span Parser Demo:</h3>
                <div className="text-gray-700 leading-relaxed">
                  <InteractiveSpanParser
                    text={sampleTextWithTokens}
                    citations={sampleCitations}
                    entities={sampleEntities}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Phase 5: Research Supplements */}
        {(activeSection === 'all' || activeSection === 'supplements') && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">
              Phase 5: Research Supplements
            </h2>
            <ResearchSupplementView supplement={sampleSupplement} />
          </section>
        )}

        {/* Phase 6: Email Digest */}
        {(activeSection === 'all' || activeSection === 'digest') && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2">
              Phase 6: Email Digest Preview
            </h2>
            <EmailDigestPreview digest={sampleDigest} />
          </section>
        )}
      </main>
    </div>
  );
}

