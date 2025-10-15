/**
 * X-Ray Classification Tool
 * 
 * Classifies medical X-ray images using vision LLMs (GPT-5-mini and Gemini 2.5 Flash)
 */

import { analyzeImageMultiModel } from './visionAnalysis';

export interface XRayClassificationResult {
  imageUrl: string;
  classification: string;
  confidence: number;
  findings: {
    abnormalities: string[];
    severity: 'normal' | 'mild' | 'moderate' | 'severe';
    requiresFollowup: boolean;
    detectedConditions: string[];
  };
  modelResults: {
    gpt5mini?: any;
    gemini?: any;
  };
  metadata: {
    classifiedAt: string;
    processingTimeMs: number;
  };
}

const XRAY_CLASSIFICATION_PROMPT = `
You are an expert radiologist analyzing medical X-ray images.

Analyze this X-ray image and provide a detailed classification:

1. **Primary Classification**: Identify the main finding (normal, fracture, pneumonia, tuberculosis, lung nodule, etc.)

2. **Abnormalities Detected**: List any abnormalities visible in the image
   - Fractures (location and type)
   - Opacities or infiltrates
   - Nodules or masses
   - Pleural effusion
   - Pneumothorax
   - Cardiomegaly
   - Other findings

3. **Severity Assessment**: Rate the severity as normal, mild, moderate, or severe

4. **Follow-up Recommendation**: Indicate if follow-up imaging or specialist consultation is required

5. **Confidence Level**: Provide your confidence in this assessment (0-1 scale)

**IMPORTANT**: This is for educational/research purposes only. Always consult a qualified radiologist for actual medical diagnosis.

Provide your analysis in a structured format with clear findings and recommendations.
`.trim();

/**
 * Classify a single X-ray image
 */
export async function classifyXRayImage(
  imageUrl: string,
  imageId?: string
): Promise<XRayClassificationResult> {
  const startTime = Date.now();

  try {
    // Analyze with both GPT-5-mini and Gemini
    const models: Array<"gpt-5-mini" | "gemini-2.5-flash"> = ['gpt-5-mini', 'gemini-2.5-flash'];
    const apiKeys = {
      openai: process.env.OPENAI_API_KEY,
      google: process.env.GOOGLE_API_KEY,
    };
    const analysis = await analyzeImageMultiModel(
      imageUrl,
      imageId || imageUrl,
      XRAY_CLASSIFICATION_PROMPT,
      models,
      apiKeys
    );

    // Extract classification from analysis
    const classification = extractClassification(analysis);
    const findings = extractFindings(analysis);
    const confidence = extractConfidence(analysis);

    const processingTimeMs = Date.now() - startTime;

    return {
      imageUrl,
      classification,
      confidence,
      findings,
      modelResults: {
        gpt5mini: analysis.gpt5mini,
        gemini: analysis.gemini,
      },
      metadata: {
        classifiedAt: new Date().toISOString(),
        processingTimeMs,
      },
    };
  } catch (error) {
    console.error('[xrayClassification] Classification failed:', error);
    throw new Error(`X-ray classification failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract primary classification from analysis
 */
function extractClassification(analysis: any): string {
  // Try to extract from structured output
  if (analysis.gpt5mini?.classification) {
    return analysis.gpt5mini.classification;
  }
  if (analysis.gemini?.classification) {
    return analysis.gemini.classification;
  }

  // Fallback: extract from text
  const text = analysis.gpt5mini?.detailedFindings || analysis.gemini?.summary || '';
  
  // Look for common classifications
  const classifications = [
    'normal',
    'fracture',
    'pneumonia',
    'tuberculosis',
    'lung nodule',
    'pleural effusion',
    'pneumothorax',
    'cardiomegaly',
  ];

  for (const classification of classifications) {
    if (text.toLowerCase().includes(classification)) {
      return classification;
    }
  }

  return 'unclassified';
}

/**
 * Extract findings from analysis
 */
function extractFindings(analysis: any): XRayClassificationResult['findings'] {
  const abnormalities: string[] = [];
  let severity: 'normal' | 'mild' | 'moderate' | 'severe' = 'normal';
  let requiresFollowup = false;
  const detectedConditions: string[] = [];

  // Extract from GPT-5-mini
  if (analysis.gpt5mini) {
    if (analysis.gpt5mini.detectedAbnormalities) {
      abnormalities.push(...analysis.gpt5mini.detectedAbnormalities);
    }
    if (analysis.gpt5mini.severity) {
      severity = analysis.gpt5mini.severity;
    }
    if (analysis.gpt5mini.requiresFollowup !== undefined) {
      requiresFollowup = analysis.gpt5mini.requiresFollowup;
    }
  }

  // Extract from Gemini
  if (analysis.gemini) {
    if (analysis.gemini.detectedAbnormalities) {
      abnormalities.push(...analysis.gemini.detectedAbnormalities);
    }
    if (analysis.gemini.severity && !severity) {
      severity = analysis.gemini.severity;
    }
    if (analysis.gemini.requiresFollowup !== undefined && !requiresFollowup) {
      requiresFollowup = analysis.gemini.requiresFollowup;
    }
  }

  // Deduplicate abnormalities
  const uniqueAbnormalities = Array.from(new Set(abnormalities));

  // Detected conditions are same as abnormalities for now
  detectedConditions.push(...uniqueAbnormalities);

  return {
    abnormalities: uniqueAbnormalities,
    severity,
    requiresFollowup,
    detectedConditions,
  };
}

/**
 * Extract confidence from analysis
 */
function extractConfidence(analysis: any): number {
  // Average confidence from both models
  const confidences: number[] = [];

  if (analysis.gpt5mini?.confidence !== undefined) {
    confidences.push(analysis.gpt5mini.confidence);
  }
  if (analysis.gemini?.confidence !== undefined) {
    confidences.push(analysis.gemini.confidence);
  }

  if (confidences.length === 0) {
    return 0.5; // Default confidence
  }

  return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
}

/**
 * Classify multiple X-ray images
 */
export async function classifyXRayImagesBatch(
  imageUrls: string[]
): Promise<XRayClassificationResult[]> {
  const results: XRayClassificationResult[] = [];

  for (const imageUrl of imageUrls) {
    try {
      const result = await classifyXRayImage(imageUrl);
      results.push(result);
    } catch (error) {
      console.error(`[xrayClassification] Failed to classify ${imageUrl}:`, error);
      // Continue with other images
    }
  }

  return results;
}

/**
 * X-ray classification tool for orchestrator
 */
export function xrayClassificationTool() {
  return async (payload: any) => {
    const images = payload?.images || [];
    const imageUrls = images.map((img: any) => img.imageUrl || img.url || img);

    if (imageUrls.length === 0) {
      throw new Error('X-ray classification requires at least one image URL');
    }

    const results = await classifyXRayImagesBatch(imageUrls);

    return {
      success: true,
      count: results.length,
      classifications: results,
      summary: {
        totalImages: imageUrls.length,
        classified: results.length,
        failed: imageUrls.length - results.length,
        averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
      },
    };
  };
}

