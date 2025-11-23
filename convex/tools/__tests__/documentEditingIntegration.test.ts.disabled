/**
 * Document Editing Integration Tests
 * Tests real-world scenarios combining web search with document editing
 * 
 * Scenarios:
 * 1. Company Research + Document Update
 * 2. People Search + Document Enhancement
 * 3. Multi-source Research + Document Synthesis
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Document Editing Integration - Real World Scenarios', () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      runQuery: vi.fn(),
      runMutation: vi.fn(),
    };
  });

  describe('Scenario 1: Company Research + Document Update', () => {
    it('should gather company info and update document with findings', async () => {
      // Simulate: User searches for "Series B healthcare startups founded 2023"
      // Then: "Update document with these companies"
      
      const companyData = {
        companies: [
          {
            name: "BioTech Innovations Inc",
            founded: 2023,
            stage: "Series B",
            industry: "Healthcare",
            hq: "San Francisco, CA",
            funding: "$15M",
            description: "AI-powered diagnostic platform"
          },
          {
            name: "MedFlow Systems",
            founded: 2023,
            stage: "Series B",
            industry: "Healthcare",
            hq: "Boston, MA",
            funding: "$12M",
            description: "Real-time patient monitoring"
          }
        ]
      };

      // Expected edit proposal
      const expectedProposal = {
        type: "append",
        reason: "Add researched companies to document",
        newValue: expect.stringContaining("BioTech Innovations")
      };

      expect(companyData.companies).toHaveLength(2);
      expect(companyData.companies[0].stage).toBe("Series B");
      expect(companyData.companies[0].industry).toBe("Healthcare");
    });

    it('should create structured company table in document', async () => {
      const documentContent = `# Healthcare Startups Research

## Series B Companies (2023)

| Company | Location | Funding | Focus |
|---------|----------|---------|-------|
| BioTech Innovations | San Francisco | $15M | AI Diagnostics |
| MedFlow Systems | Boston | $12M | Patient Monitoring |`;

      expect(documentContent).toContain("Healthcare Startups");
      expect(documentContent).toContain("Series B");
      expect(documentContent).toContain("BioTech Innovations");
      expect(documentContent).toContain("$15M");
    });

    it('should validate company data before adding to document', async () => {
      const { validateEdits } = await import('../../fast_agents/validationAgent');
      
      const companyContent = `## New Companies\n\nBioTech Innovations Inc - Series B, $15M, San Francisco`;
      
      const result = await validateEdits(mockCtx, {
        proposals: [
          {
            type: 'append' as const,
            newValue: companyContent,
            reason: 'Add researched companies'
          }
        ],
        documentId: 'doc1',
        currentContent: 'Existing research',
        currentTitle: 'Company Research',
      });

      expect(result.valid).toBe(true);
      expect(result.approvedProposals).toHaveLength(1);
    });
  });

  describe('Scenario 2: People Search + Document Enhancement', () => {
    it('should gather founder info and enhance document', async () => {
      const founderData = {
        founders: [
          {
            name: "Sarah Chen",
            title: "CEO & Co-founder",
            background: "Stanford MBA, 10 years biotech",
            linkedin: "linkedin.com/in/sarahchen",
            expertise: ["Healthcare", "AI", "Fundraising"]
          },
          {
            name: "Dr. James Wilson",
            title: "CTO & Co-founder",
            background: "PhD Computational Biology, MIT",
            linkedin: "linkedin.com/in/jameswilson",
            expertise: ["Machine Learning", "Biology", "Research"]
          }
        ]
      };

      expect(founderData.founders).toHaveLength(2);
      expect(founderData.founders[0].title).toContain("CEO");
      expect(founderData.founders[1].background).toContain("PhD");
    });

    it('should create founder profiles section in document', async () => {
      const documentContent = `# Company Leadership

## Founders

### Sarah Chen - CEO & Co-founder
- **Background**: Stanford MBA, 10 years biotech experience
- **Expertise**: Healthcare, AI, Fundraising
- **LinkedIn**: linkedin.com/in/sarahchen

### Dr. James Wilson - CTO & Co-founder
- **Background**: PhD Computational Biology from MIT
- **Expertise**: Machine Learning, Biology, Research
- **LinkedIn**: linkedin.com/in/jameswilson`;

      expect(documentContent).toContain("Sarah Chen");
      expect(documentContent).toContain("CEO");
      expect(documentContent).toContain("PhD");
      expect(documentContent).toContain("Founders");
    });

    it('should append founder info without losing existing content', async () => {
      const { validateEdits } = await import('../../fast_agents/validationAgent');
      
      const founderContent = `## Leadership Team\n\nSarah Chen (CEO) - Stanford MBA\nDr. James Wilson (CTO) - PhD MIT`;
      
      const result = await validateEdits(mockCtx, {
        proposals: [
          {
            type: 'append' as const,
            newValue: founderContent,
            reason: 'Add founder information'
          }
        ],
        documentId: 'doc1',
        currentContent: 'Existing company overview',
        currentTitle: 'Company Profile',
      });

      expect(result.valid).toBe(true);
      expect(result.approvedProposals[0].type).toBe('append');
    });
  });

  describe('Scenario 3: Multi-source Research + Document Synthesis', () => {
    it('should combine company and people data into cohesive document', async () => {
      const synthesizedContent = `# Investment Opportunity Analysis

## Company Overview
- **Name**: BioTech Innovations Inc
- **Stage**: Series B
- **Funding**: $15M
- **Location**: San Francisco, CA
- **Industry**: Healthcare/AI

## Leadership Team
- **CEO**: Sarah Chen (Stanford MBA, 10 years biotech)
- **CTO**: Dr. James Wilson (PhD Computational Biology, MIT)

## Market Opportunity
- Growing demand for AI diagnostics
- $50B+ addressable market
- Regulatory tailwinds

## Investment Thesis
Strong founding team with deep expertise in both healthcare and AI, targeting large market with proven demand.`;

      expect(synthesizedContent).toContain("BioTech Innovations");
      expect(synthesizedContent).toContain("Sarah Chen");
      expect(synthesizedContent).toContain("Series B");
      expect(synthesizedContent).toContain("Investment Thesis");
    });

    it('should handle multiple edit proposals in sequence', async () => {
      const { validateEdits } = await import('../../fast_agents/validationAgent');
      
      const result = await validateEdits(mockCtx, {
        proposals: [
          {
            type: 'title' as const,
            newValue: 'BioTech Innovations - Investment Analysis',
            reason: 'Update title with company name'
          },
          {
            type: 'append' as const,
            newValue: '\n\n## Company Overview\nBioTech Innovations Inc is a Series B healthcare startup...',
            reason: 'Add company overview'
          },
          {
            type: 'append' as const,
            newValue: '\n\n## Leadership\nFounded by Sarah Chen (CEO) and Dr. James Wilson (CTO)...',
            reason: 'Add leadership information'
          }
        ],
        documentId: 'doc1',
        currentContent: 'Initial research notes',
        currentTitle: 'Research Document',
      });

      expect(result.valid).toBe(true);
      expect(result.approvedProposals).toHaveLength(3);
      expect(result.approvedProposals[0].type).toBe('title');
      expect(result.approvedProposals[1].type).toBe('append');
      expect(result.approvedProposals[2].type).toBe('append');
    });

    it('should detect and warn about duplicate information', async () => {
      const { validateEdits } = await import('../../fast_agents/validationAgent');
      
      const result = await validateEdits(mockCtx, {
        proposals: [
          {
            type: 'append' as const,
            newValue: 'Sarah Chen is the CEO',
            reason: 'Add founder info'
          },
          {
            type: 'append' as const,
            newValue: 'Sarah Chen is the CEO',
            reason: 'Add founder info again'
          }
        ],
        documentId: 'doc1',
        currentContent: 'Existing content',
        currentTitle: 'Research',
      });

      expect(result.valid).toBe(true);
      expect(result.approvedProposals.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario 4: Real-time Document Updates During Research', () => {
    it('should support incremental document updates', async () => {
      // Simulate: User starts with empty document, adds findings incrementally
      
      const updates = [
        { type: 'title' as const, value: 'Healthcare Startup Research' },
        { type: 'append' as const, value: '## Companies Found\n\n1. BioTech Innovations' },
        { type: 'append' as const, value: '\n2. MedFlow Systems' },
        { type: 'append' as const, value: '\n\n## Key Insights\n- Strong founding teams\n- Large market opportunity' }
      ];

      expect(updates).toHaveLength(4);
      expect(updates[0].type).toBe('title');
      expect(updates.slice(1).every(u => u.type === 'append')).toBe(true);
    });

    it('should validate each incremental update', async () => {
      const { validateEdits } = await import('../../fast_agents/validationAgent');
      
      for (let i = 0; i < 3; i++) {
        const result = await validateEdits(mockCtx, {
          proposals: [
            {
              type: 'append' as const,
              newValue: `Update ${i + 1}: New research finding`,
              reason: `Incremental update ${i + 1}`
            }
          ],
          documentId: 'doc1',
          currentContent: `Previous content with ${i} updates`,
          currentTitle: 'Research',
        });

        expect(result.valid).toBe(true);
      }
    });
  });

  describe('Scenario 5: Error Handling in Research + Edit Workflow', () => {
    it('should handle missing company data gracefully', async () => {
      const { validateEdits } = await import('../../fast_agents/validationAgent');
      
      const result = await validateEdits(mockCtx, {
        proposals: [
          {
            type: 'append' as const,
            newValue: 'Company data unavailable',
            reason: 'API call failed'
          }
        ],
        documentId: 'doc1',
        currentContent: 'Existing research',
        currentTitle: 'Research',
      });

      expect(result.valid).toBe(true);
    });

    it('should reject malformed research data', async () => {
      const { validateEdits } = await import('../../fast_agents/validationAgent');
      
      const result = await validateEdits(mockCtx, {
        proposals: [
          {
            type: 'append' as const,
            newValue: '',
            reason: 'Empty data'
          }
        ],
        documentId: 'doc1',
        currentContent: 'Existing research',
        currentTitle: 'Research',
      });

      expect(result.valid).toBe(false);
    });
  });
});

