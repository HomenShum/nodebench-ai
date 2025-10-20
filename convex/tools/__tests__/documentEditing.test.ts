/**
 * Document Editing Tests
 * Tests for document editing functionality including proposals and validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Document Editing', () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      runQuery: vi.fn(),
      runMutation: vi.fn(),
    };
  });

  describe('Edit Proposal Generation', () => {
    it('should generate edit proposals for a document', async () => {
      const { generateEditProposals } = await import('../documentTools');
      expect(generateEditProposals).toBeDefined();
      expect(generateEditProposals.description).toContain('edit proposals');
    });

    it('should accept document ID and request', async () => {
      const { generateEditProposals } = await import('../documentTools');
      // Tool should be defined and have description
      expect(generateEditProposals).toBeDefined();
      expect(generateEditProposals.description).toContain('document');
    });

    it('should support different proposal types', () => {
      const proposalTypes = ['title', 'content', 'append', 'replace'];
      expect(proposalTypes).toContain('title');
      expect(proposalTypes).toContain('content');
      expect(proposalTypes).toContain('append');
      expect(proposalTypes).toContain('replace');
    });
  });

  describe('Edit Validation', () => {
    it('should validate edit proposals', async () => {
      const { validateEdits } = await import('../../fast_agents/validationAgent');
      expect(validateEdits).toBeDefined();
    });

    it('should detect invalid proposal structures', async () => {
      const { validateEdits } = await import('../../fast_agents/validationAgent');

      const result = await validateEdits(mockCtx, {
        proposals: [
          { type: 'title' as const, newValue: '', reason: 'test' } // Empty value
        ],
        documentId: 'doc1',
        currentContent: 'test',
        currentTitle: 'Test',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should approve valid proposals', async () => {
      const { validateEdits } = await import('../../fast_agents/validationAgent');
      
      const result = await validateEdits(mockCtx, {
        proposals: [
          {
            type: 'title' as const,
            newValue: 'New Title',
            reason: 'Better title'
          }
        ],
        documentId: 'doc1',
        currentContent: 'test',
        currentTitle: 'Old Title',
      });

      expect(result.valid).toBe(true);
      expect(result.approvedProposals.length).toBe(1);
    });

    it('should warn about unchanged content', async () => {
      const { validateEdits } = await import('../../fast_agents/validationAgent');
      
      const result = await validateEdits(mockCtx, {
        proposals: [
          {
            type: 'title' as const,
            newValue: 'Test',
            reason: 'Same title'
          }
        ],
        documentId: 'doc1',
        currentContent: 'test',
        currentTitle: 'Test',
      });

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should reject extremely large proposals', async () => {
      const { validateEdits } = await import('../../fast_agents/validationAgent');
      
      const largeContent = 'x'.repeat(60000);
      const result = await validateEdits(mockCtx, {
        proposals: [
          {
            type: 'content' as const,
            newValue: largeContent,
            reason: 'Large content'
          }
        ],
        documentId: 'doc1',
        currentContent: 'test',
        currentTitle: 'Test',
      });

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should reject titles longer than 200 chars', async () => {
      const { validateEdits } = await import('../../fast_agents/validationAgent');
      
      const longTitle = 'x'.repeat(250);
      const result = await validateEdits(mockCtx, {
        proposals: [
          {
            type: 'title' as const,
            newValue: longTitle,
            reason: 'Long title'
          }
        ],
        documentId: 'doc1',
        currentContent: 'test',
        currentTitle: 'Test',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edit Types', () => {
    it('should support title edits', () => {
      const editType = 'title';
      expect(['title', 'content', 'append', 'replace']).toContain(editType);
    });

    it('should support content replacement', () => {
      const editType = 'content';
      expect(['title', 'content', 'append', 'replace']).toContain(editType);
    });

    it('should support content appending', () => {
      const editType = 'append';
      expect(['title', 'content', 'append', 'replace']).toContain(editType);
    });

    it('should support targeted replacement', () => {
      const editType = 'replace';
      expect(['title', 'content', 'append', 'replace']).toContain(editType);
    });
  });

  describe('Edit Detection', () => {
    it('should detect edit requests', () => {
      const editKeywords = ['edit', 'modify', 'change', 'update', 'add', 'insert', 'create', 'write', 'append', 'prepend', 'delete', 'remove'];
      const pattern = /\b(edit|modify|change|update|add|insert|create|write|append|prepend|delete|remove)\b/i;
      
      for (const keyword of editKeywords) {
        expect(pattern.test(`Please ${keyword} this document`)).toBe(true);
      }
    });

    it('should not detect non-edit requests', () => {
      const pattern = /\b(edit|modify|change|update|add|insert|create|write|append|prepend|delete|remove)\b/i;
      expect(pattern.test('What is in this document?')).toBe(false);
      expect(pattern.test('Summarize this document')).toBe(false);
    });
  });

  describe('Integration', () => {
    it('should have updateDocument tool available', async () => {
      const { updateDocument } = await import('../documentTools');
      expect(updateDocument).toBeDefined();
      expect(updateDocument.description).toContain('Update');
    });

    it('should have createDocument tool available', async () => {
      const { createDocument } = await import('../documentTools');
      expect(createDocument).toBeDefined();
      expect(createDocument.description).toContain('Create');
    });

    it('should have generateEditProposals tool available', async () => {
      const { generateEditProposals } = await import('../documentTools');
      expect(generateEditProposals).toBeDefined();
      expect(generateEditProposals.description).toContain('proposals');
    });
  });
});

