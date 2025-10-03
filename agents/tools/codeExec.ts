// agents/tools/codeExec.ts
// Code execution tool using Google Gemini's built-in code execution
// Supports Python with 40+ libraries (numpy, pandas, matplotlib, etc.)

import type { ExecContext } from '../core/execute';
import { GoogleGenAI } from '@google/genai';

export interface CodeExecArgs {
  prompt: string;            // Natural language task description
  context?: Record<string, any>; // Data to pass to code (as JSON)
  files?: Array<{            // Optional file inputs (CSV, text, etc.)
    data: string;
    mimeType: string;
  }>;
}

export interface CodeExecResult {
  success: boolean;
  result?: any;
  code?: string;             // Generated Python code
  output?: string;           // Code execution output
  error?: string;
  plots?: string[];          // Base64 encoded matplotlib plots
}

/**
 * Code execution tool using Google Gemini's built-in code execution
 *
 * Features:
 * - Google-managed Python sandbox (30s timeout)
 * - 40+ libraries: numpy, pandas, matplotlib, scipy, sklearn, etc.
 * - Auto-retry on errors (up to 5x)
 * - File I/O support (CSV, text, images)
 * - Matplotlib plotting with inline images
 *
 * Example usage:
 * ```typescript
 * const result = await codeExecTool({
 *   prompt: `
 *     Parse these search results and extract restaurants with rating >= 4.0:
 *     ${JSON.stringify(searchResults)}
 *
 *     Return a list of dicts with: name, rating, priceLevel, cuisine
 *   `,
 *   context: { searchResults }
 * });
 * ```
 */
export function codeExecTool() {
  return async function tool(args: CodeExecArgs, ctx: ExecContext): Promise<CodeExecResult> {
    const { prompt, context = {}, files = [] } = args;

    ctx.trace.info('codeExec.start', {
      promptLength: prompt.length,
      contextKeys: Object.keys(context),
      filesCount: files.length
    });

    const startTime = Date.now();

    try {
      // Initialize Gemini with code execution enabled
      const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_GENAI_API_KEY or GEMINI_API_KEY not set');
      }

      const ai = new GoogleGenAI({ apiKey });

      // Build prompt with context
      let fullPrompt = prompt;
      if (Object.keys(context).length > 0) {
        fullPrompt += '\n\nContext data:\n```json\n' + JSON.stringify(context, null, 2) + '\n```';
      }

      // Build content parts (text + optional files)
      const contentParts: any[] = [{ text: fullPrompt }];
      for (const file of files) {
        contentParts.push({
          inlineData: {
            data: file.data,
            mimeType: file.mimeType,
          },
        });
      }

      // Call Gemini with code execution enabled
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: contentParts }],
        config: {
          tools: [{ codeExecution: {} }],
        },
      });

      const executionTimeMs = Date.now() - startTime;

      // Extract parts from response
      const parts = response?.candidates?.[0]?.content?.parts || [];
      let generatedCode = '';
      let executionOutput = '';
      let finalText = '';
      const plots: string[] = [];

      for (const part of parts) {
        if (part.text) {
          finalText += part.text + '\n';
        }
        if (part.executableCode?.code) {
          generatedCode = part.executableCode.code;
        }
        if (part.codeExecutionResult?.output) {
          executionOutput = part.codeExecutionResult.output;
        }
        // Extract inline images (matplotlib plots)
        if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData.data) {
          plots.push(part.inlineData.data);
        }
      }

      ctx.trace.info('codeExec.success', {
        executionTimeMs,
        codeLength: generatedCode.length,
        outputLength: executionOutput.length,
        plotsCount: plots.length
      });

      // Parse output as JSON if possible
      let result: any = executionOutput;
      try {
        result = JSON.parse(executionOutput);
      } catch {
        // Keep as string if not valid JSON
      }

      return {
        success: true,
        result,
        code: generatedCode,
        output: executionOutput,
        plots,
      };

    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error?.message || String(error);

      ctx.trace.error('codeExec.error', {
        error: errorMessage,
        executionTimeMs
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  };
}

/**
 * Helper: Build a code execution prompt with structured output
 *
 * Example:
 * ```typescript
 * const prompt = buildCodeExecPrompt({
 *   task: "Parse search results and extract top 10 restaurants by rating",
 *   context: { searchResults: [...] },
 *   outputFormat: "JSON array of objects with: name, rating, priceLevel, cuisine"
 * });
 * ```
 */
export function buildCodeExecPrompt(args: {
  task: string;
  context?: Record<string, any>;
  outputFormat?: string;
  libraries?: string[]; // e.g., ['pandas', 'numpy', 'matplotlib']
}): string {
  const { task, context, outputFormat, libraries = [] } = args;

  let prompt = `Task: ${task}\n\n`;

  if (context && Object.keys(context).length > 0) {
    prompt += 'Context data:\n```json\n' + JSON.stringify(context, null, 2) + '\n```\n\n';
  }

  if (outputFormat) {
    prompt += `Output format: ${outputFormat}\n\n`;
  }

  if (libraries.length > 0) {
    prompt += `You can use these libraries: ${libraries.join(', ')}\n\n`;
  }

  prompt += 'Generate and execute Python code to accomplish this task. Return the result as JSON if possible.';

  return prompt;
}

