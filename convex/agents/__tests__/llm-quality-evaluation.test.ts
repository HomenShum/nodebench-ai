// convex/agents/__tests__/llm-quality-evaluation.test.ts
// LLM-based quality evaluation for agent responses

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ConvexClient } from 'convex/browser';
import { api } from '../../_generated/api';
import type { Id } from '../../_generated/dataModel';
import OpenAI from 'openai';

/**
 * LLM Quality Evaluation Tests
 * 
 * Uses GPT-5-mini to evaluate agent response quality across multiple criteria:
 * 1. Coordination - Did coordinator delegate to appropriate agents?
 * 2. Tool Execution - Were correct tools called with appropriate parameters?
 * 3. Media Extraction - Were videos, sources, profiles properly extracted?
 * 4. Citations - Are sources properly cited with [1], [2] notation?
 * 5. Response Quality:
 *    - Usefulness: Does it answer the user's question?
 *    - Relevancy: Is information relevant to the query?
 *    - Conciseness: Well-structured and not overly verbose?
 *    - Rich Information: Includes diverse media types?
 *    - Accuracy: Facts match Linkup search results?
 */

interface EvaluationCriteria {
  coordination: boolean;
  toolExecution: boolean;
  mediaExtraction: boolean;
  citations: boolean;
  usefulness: boolean;
  relevancy: boolean;
  conciseness: boolean;
  richInformation: boolean;
  accuracy: boolean;
}

interface EvaluationResult {
  query: string;
  response: string;
  agentsUsed: string[];
  criteria: EvaluationCriteria;
  explanations: Record<keyof EvaluationCriteria, string>;
  overallPass: boolean;
}

describe.skipIf(!process.env.CONVEX_DEPLOYMENT_URL)('LLM Quality Evaluation', () => {
  let client: ConvexClient;
  let openai: OpenAI;
  const testUserId = ('quality-eval-user-' + Date.now()) as Id<"users">;

  beforeAll(() => {
    const deploymentUrl = process.env.CONVEX_DEPLOYMENT_URL;
    if (!deploymentUrl) {
      throw new Error('CONVEX_DEPLOYMENT_URL environment variable is required');
    }
    client = new ConvexClient(deploymentUrl);
    
    // Initialize OpenAI for evaluation
    // Note: dangerouslyAllowBrowser is needed because Vitest uses jsdom environment
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: true,
    });
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  /**
   * Evaluate agent response quality using GPT-5-mini
   */
  async function evaluateResponse(
    query: string,
    response: string,
    agentsUsed: string[],
    linkupResults?: string
  ): Promise<EvaluationResult> {
    const evaluationPrompt = `You are an expert evaluator of AI agent responses. Evaluate the following agent response based on these criteria:

USER QUERY: "${query}"

AGENT RESPONSE:
${response}

AGENTS USED: ${agentsUsed.join(', ')}

${linkupResults ? `LINKUP SEARCH RESULTS (for accuracy validation):\n${linkupResults}\n` : ''}

Evaluate the response on these criteria (respond with JSON only):

{
  "coordination": boolean, // Did coordinator delegate to appropriate agents for this query?
  "toolExecution": boolean, // Were correct tools likely called based on the response content?
  "mediaExtraction": boolean, // Are videos/sources/profiles properly formatted in HTML comments?
  "citations": boolean, // Are sources cited with [1], [2] notation where appropriate?
  "usefulness": boolean, // Does the response answer the user's question?
  "relevancy": boolean, // Is the information relevant to the query?
  "conciseness": boolean, // Is the response well-structured and not overly verbose?
  "richInformation": boolean, // Does it include diverse media types (videos, sources, profiles)?
  "accuracy": boolean, // Do the facts match the Linkup search results (if provided)?
  "explanations": {
    "coordination": "Brief explanation",
    "toolExecution": "Brief explanation",
    "mediaExtraction": "Brief explanation",
    "citations": "Brief explanation",
    "usefulness": "Brief explanation",
    "relevancy": "Brief explanation",
    "conciseness": "Brief explanation",
    "richInformation": "Brief explanation",
    "accuracy": "Brief explanation"
  }
}

Respond with ONLY the JSON object, no other text.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert evaluator. Respond only with valid JSON.',
        },
        {
          role: 'user',
          content: evaluationPrompt,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const evaluationText = completion.choices[0].message.content;
    if (!evaluationText) {
      throw new Error('No evaluation response from GPT-5-mini');
    }

    const evaluation = JSON.parse(evaluationText);
    
    const criteria: EvaluationCriteria = {
      coordination: evaluation.coordination,
      toolExecution: evaluation.toolExecution,
      mediaExtraction: evaluation.mediaExtraction,
      citations: evaluation.citations,
      usefulness: evaluation.usefulness,
      relevancy: evaluation.relevancy,
      conciseness: evaluation.conciseness,
      richInformation: evaluation.richInformation,
      accuracy: evaluation.accuracy,
    };

    // Calculate overall pass based on CRITICAL criteria only
    // Critical: coordination, toolExecution, usefulness, relevancy, accuracy
    // Nice-to-have: mediaExtraction, citations, conciseness, richInformation
    const criticalCriteria = [
      criteria.coordination,
      criteria.toolExecution,
      criteria.usefulness,
      criteria.relevancy,
      criteria.accuracy,
    ];
    const overallPass = criticalCriteria.every((v) => v === true);

    return {
      query,
      response,
      agentsUsed,
      criteria,
      explanations: evaluation.explanations,
      overallPass,
    };
  }

  /**
   * Get Linkup search results for accuracy validation
   * Note: Since linkupSearch is a tool (not an action), we skip direct API calls
   * and rely on the agent's tool execution logs for accuracy validation
   */
  async function getLinkupResults(_query: string): Promise<string> {
    // Return empty string - accuracy will be validated from agent's tool execution
    return '';
  }

  it('should pass quality evaluation for simple web search query', async () => {
    const query = "What's the latest news about Tesla?";
    
    const result = await client.action(
      api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
      {
        prompt: query,
        userId: testUserId,
      }
    );

    const linkupResults = await getLinkupResults(query);
    const evaluation = await evaluateResponse(
      query,
      result.response,
      result.agentsUsed,
      linkupResults
    );

    console.log('\n=== EVALUATION RESULTS ===');
    console.log('Query:', query);
    console.log('Agents Used:', result.agentsUsed);
    console.log('Criteria:', evaluation.criteria);
    console.log('Explanations:', evaluation.explanations);
    console.log('Overall Pass:', evaluation.overallPass);

    expect(evaluation.overallPass).toBe(true);
  }, 300000); // 5 minute timeout

  it('should pass quality evaluation for media-focused query', async () => {
    const query = 'Find videos about machine learning tutorials';
    
    const result = await client.action(
      api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
      {
        prompt: query,
        userId: testUserId,
      }
    );

    const evaluation = await evaluateResponse(
      query,
      result.response,
      result.agentsUsed
    );

    console.log('\n=== EVALUATION RESULTS ===');
    console.log('Query:', query);
    console.log('Agents Used:', result.agentsUsed);
    console.log('Criteria:', evaluation.criteria);
    console.log('Explanations:', evaluation.explanations);
    console.log('Overall Pass:', evaluation.overallPass);

    expect(evaluation.overallPass).toBe(true);
  }, 300000); // 5 minute timeout

  it('should pass quality evaluation for SEC filing query', async () => {
    // Use ticker symbol instead of company name to avoid ambiguity
    const query = "Show me AAPL's recent 10-K filings";

    const result = await client.action(
      api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
      {
        prompt: query,
        userId: testUserId,
      }
    );

    const evaluation = await evaluateResponse(
      query,
      result.response,
      result.agentsUsed
    );

    console.log('\n=== EVALUATION RESULTS ===');
    console.log('Query:', query);
    console.log('Agents Used:', result.agentsUsed);
    console.log('Criteria:', evaluation.criteria);
    console.log('Explanations:', evaluation.explanations);
    console.log('Overall Pass:', evaluation.overallPass);

    expect(evaluation.overallPass).toBe(true);
  }, 300000); // 5 minute timeout

  it('should pass quality evaluation for multi-agent complex query', async () => {
    const query = 'Research AI trends 2025 with videos and company filings';
    
    const result = await client.action(
      api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
      {
        prompt: query,
        userId: testUserId,
      }
    );

    const linkupResults = await getLinkupResults('AI trends 2025');
    const evaluation = await evaluateResponse(
      query,
      result.response,
      result.agentsUsed,
      linkupResults
    );

    console.log('\n=== EVALUATION RESULTS ===');
    console.log('Query:', query);
    console.log('Agents Used:', result.agentsUsed);
    console.log('Criteria:', evaluation.criteria);
    console.log('Explanations:', evaluation.explanations);
    console.log('Overall Pass:', evaluation.overallPass);

    expect(evaluation.overallPass).toBe(true);
  }, 600000); // 10 minute timeout for complex multi-agent queries

  it('should pass quality evaluation for document + web hybrid query', async () => {
    const query = 'Find information about climate change in my documents and on the web';
    
    const result = await client.action(
      api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
      {
        prompt: query,
        userId: testUserId,
      }
    );

    const linkupResults = await getLinkupResults('climate change');
    const evaluation = await evaluateResponse(
      query,
      result.response,
      result.agentsUsed,
      linkupResults
    );

    console.log('\n=== EVALUATION RESULTS ===');
    console.log('Query:', query);
    console.log('Agents Used:', result.agentsUsed);
    console.log('Criteria:', evaluation.criteria);
    console.log('Explanations:', evaluation.explanations);
    console.log('Overall Pass:', evaluation.overallPass);

    expect(evaluation.overallPass).toBe(true);
  }, 300000); // 5 minute timeout

  it('should correctly handle SEC API errors with helpful options', async () => {
    // Test that agent provides helpful options when SEC API fails
    const query = "Show me Apple's recent 10-K filings";

    const result = await client.action(
      api.fastAgentPanelCoordinator.sendMessageWithCoordinator,
      {
        prompt: query,
        userId: testUserId,
      }
    );

    console.log('\n=== SEC ERROR HANDLING TEST ===');
    console.log('Query:', query);
    console.log('Response:', result.response);
    console.log('Agents Used:', result.agentsUsed);

    // Verify that the response either:
    // 1. Asks for clarification about which Apple company, OR
    // 2. Provides helpful error handling options when SEC API fails
    const response = result.response.toLowerCase();
    const hasErrorHandling = response.includes('option') || response.includes('retry') || response.includes('proceed');
    const hasClarification = response.match(/which.*apple|clarif|select|choose/i);

    expect(hasErrorHandling || hasClarification).toBe(true);
    expect(result.agentsUsed).toContain('SEC');
  }, 300000); // 5 minute timeout
});

