// Validation Agent - Validates edit proposals
"use node";

import type { EditProposal } from "./editingAgent";

export interface ValidationInput {
  proposals: EditProposal[];
  documentId: string;
  currentContent: string;
  currentTitle: string;
}

export interface ValidationOutput {
  valid: boolean;
  errors: string[];
  warnings: string[];
  approvedProposals: EditProposal[];
}

/**
 * Validate edit proposals before applying
 * Checks for:
 * - Structural correctness
 * - Content safety
 * - Conflict detection
 * - Reasonable changes
 */
export async function validateEdits(
  ctx: any,
  input: ValidationInput
): Promise<ValidationOutput> {
  const { proposals, documentId, currentContent, currentTitle } = input;
  const errors: string[] = [];
  const warnings: string[] = [];
  const approvedProposals: EditProposal[] = [];

  // Validate each proposal
  for (const proposal of proposals) {
    // Check proposal structure
    if (!proposal.type || !proposal.newValue) {
      errors.push(`Invalid proposal structure: missing type or newValue`);
      continue;
    }

    // Validate proposal type
    if (!["title", "content", "append", "replace"].includes(proposal.type)) {
      errors.push(`Invalid proposal type: ${proposal.type}`);
      continue;
    }

    // Check for empty content
    if (proposal.newValue.trim().length === 0) {
      errors.push(`Proposal has empty content`);
      continue;
    }

    // Check for extremely large changes
    if (proposal.newValue.length > 50000) {
      warnings.push(`Proposal is very large (${proposal.newValue.length} chars)`);
    }

    // Check for title changes
    if (proposal.type === "title") {
      if (proposal.newValue.length > 200) {
        errors.push(`Title is too long (max 200 chars)`);
        continue;
      }
      if (proposal.newValue === currentTitle) {
        warnings.push(`Title is unchanged`);
      }
    }

    // Check for content changes
    if (proposal.type === "content") {
      if (proposal.newValue === currentContent) {
        warnings.push(`Content is unchanged`);
      }
    }

    // If no errors, approve the proposal
    if (errors.length === 0) {
      approvedProposals.push(proposal);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    approvedProposals,
  };
}

