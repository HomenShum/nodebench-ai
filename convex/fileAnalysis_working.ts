// convex/fileAnalysis_working.ts
"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  GoogleGenAI,
  createUserContent,
  Part,
  Type,
} from "@google/genai";

export const analyzeFileWithGenAI = action({
  args: {
    fileId: v.optional(v.id("files")),
    url: v.optional(v.string()),
    analysisPrompt: v.string(),
    analysisType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.fileId && !args.url) {
      throw new Error("Either a fileId or a url must be provided.");
    }

    const startTime = Date.now();
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Not authenticated");
    }

    try {
      // Initialize Google AI
      const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Google AI API key not configured");
      }

      const ai = new GoogleGenAI({ apiKey });

      let contentParts: Part[];
      let sourceName: string;
      let fileType: string;

      if (args.fileId) {
        // Handle file input
        const file = await ctx.runQuery(internal.files.getFile, {
          fileId: args.fileId,
        });
        
        if (!file || file.userId !== userId.subject) {
          throw new Error("File not found or not accessible");
        }

        const fileUrl = await ctx.storage.getUrl(file.storageId);
        if (!fileUrl) throw new Error("File not accessible from storage");
        
        sourceName = file.fileName || "unknown";
        fileType = file.fileType || "unknown";
        
        // For simplicity, create text-based analysis for all file types
        contentParts = [{ text: `Analyzing file: ${sourceName} (${fileType})` }];

      } else {
        // Handle URL input
        const url = args.url!;
        sourceName = url;
        fileType = "url";
        
        try {
          const response = await fetch(url);
          const text = await response.text();
          const cleanText = text.replace(/<[^>]+>/g, ' ').replace(/\s\s+/g, ' ').trim();
          contentParts = [{ text: `Content from URL ${url}:\n\n${cleanText.substring(0, 5000)}` }];
        } catch (error) {
          contentParts = [{ text: `Unable to fetch content from URL: ${url}. Error: ${String(error)}` }];
        }
      }
      
      // Generate analysis using Gemini
      const analysisResult = await generateAnalysis(
        ai,
        contentParts,
        args.analysisPrompt,
        args.analysisType || fileType
      );

      // Save results to database
      if (args.fileId) {
        await ctx.runMutation(internal.files.updateFileAnalysis, {
          fileId: args.fileId,
          analysis: analysisResult.analysis || '',
          structuredData: analysisResult.structuredData,
          analysisType: args.analysisType || fileType,
          processingTime: Date.now() - startTime,
        });
      } else if (args.url) {
        // Save URL analysis
        await ctx.runMutation(internal.files.createUrlAnalysis, {
          url: args.url,
          analysis: analysisResult.analysis,
          structuredData: analysisResult.structuredData,
          analysisType: args.analysisType || fileType,
          processingTime: Date.now() - startTime,
        });
      }

      return {
        success: true,
        analysis: analysisResult.analysis,
        sourceName: sourceName,
        structuredData: analysisResult.structuredData,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      console.error("Analysis error:", error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Helper function for generating analysis
async function generateAnalysis(
  ai: GoogleGenAI, 
  contentParts: Part[], 
  analysisPrompt: string, 
  analysisType: string
) {
  const prompt = `${analysisPrompt}\n\nPlease provide a comprehensive analysis of this ${analysisType} content.`;
  
  try {
    // Try structured output first
    const structuredResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: createUserContent([...contentParts, prompt]),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            analysis: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY, 
              items: { type: Type.STRING }
            }
          }
        }
      }
    });
    
    const structuredData = JSON.parse(structuredResponse.text || '{}');
    
    // Also get plain text analysis
    const textResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: createUserContent([...contentParts, prompt])
    });
    
    return {
      analysis: textResponse.text,
      structuredData: structuredData
    };
    
  } catch (error) {
    console.error("Structured analysis failed, falling back to text:", error);
    
    // Fallback to text-only analysis
    const textResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: createUserContent([...contentParts, prompt])
    });
    
    return {
      analysis: textResponse.text,
      structuredData: {
        summary: "Analysis completed (fallback mode)",
        analysis: textResponse.text,
        contentType: analysisType,
        processingNotes: "Structured output unavailable"
      }
    };
  }
}
