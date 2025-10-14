/**
 * Dynamic Visual Meta-Analysis System
 * 
 * Automatically adapts computational analysis based on actual LLM output fields,
 * without hardcoded assumptions about VR-specific or task-specific fields.
 * 
 * Key Features:
 * - Runtime field discovery from actual LLM outputs
 * - Automatic classification into numerical vs categorical fields
 * - Dynamic analysis plan generation
 * - No Pydantic schemas or hardcoded field assumptions
 */

export interface FieldClassification {
  numerical: Set<string>;
  categorical: Set<string>;
  excluded: Set<string>;
}

export interface AnalysisPlan {
  numericalFields: string[];
  categoricalFields: string[];
  analysisPrompt: string;
  codeTemplate: string;
}

/**
 * Dynamically discover and classify fields from actual LLM outputs
 * 
 * @param sampleOutputs - Array of actual LLM response objects
 * @returns Classified field sets
 */
export function discoverFields(sampleOutputs: any[]): FieldClassification {
  const numerical = new Set<string>();
  const categorical = new Set<string>();
  const excluded = new Set<string>();

  if (!sampleOutputs || sampleOutputs.length === 0) {
    return { numerical, categorical, excluded };
  }

  const isLongText = (s: unknown) => typeof s === 'string' && s.length >= 100;
  const isMetaKey = (k: string) => {
    const keyLower = k.toLowerCase();
    return (
      keyLower === 'imageid' ||
      keyLower === 'image_id' ||
      keyLower === 'modelname' ||
      keyLower === 'model_name' ||
      keyLower.includes('summary') ||
      keyLower.includes('description') ||
      keyLower.includes('findings') ||
      keyLower.includes('details')
    );
  };

  const visit = (obj: any, prefix = '') => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (isMetaKey(k)) { excluded.add(path); continue; }
      if (isLongText(v)) { excluded.add(path); continue; }

      if (typeof v === 'number') {
        numerical.add(path);
        continue;
      }
      if (typeof v === 'boolean') {
        categorical.add(path);
        continue;
      }
      if (Array.isArray(v)) {
        categorical.add(path);
        continue;
      }
      if (typeof v === 'string') {
        // short strings count as categorical
        categorical.add(path);
        continue;
      }
      if (v && typeof v === 'object') {
        // Recurse into nested objects
        visit(v as any, path);
      }
    }
  };

  // Use all samples to accumulate field sets to be robust across varied outputs
  for (const sample of sampleOutputs) visit(sample);

  return { numerical, categorical, excluded };
}

/**
 * Generate dynamic analysis plan based on discovered fields
 * 
 * @param fields - Classified field sets
 * @param outputs - All LLM outputs for analysis
 * @returns Analysis plan with prompt and code template
 */
export function planComputationalAnalysis(
  fields: FieldClassification,
  outputs: any[]
): AnalysisPlan {
  const numericalFields = Array.from(fields.numerical);
  const categoricalFields = Array.from(fields.categorical);

  // Build dynamic analysis prompt
  const prompt = buildAnalysisPrompt(numericalFields, categoricalFields);

  // Build dynamic code template
  const codeTemplate = buildCodeTemplate(numericalFields, categoricalFields, outputs);

  return {
    numericalFields,
    categoricalFields,
    analysisPrompt: prompt,
    codeTemplate,
  };
}

/**
 * Build dynamic analysis prompt for computational LLM
 */
function buildAnalysisPrompt(
  numericalFields: string[],
  categoricalFields: string[]
): string {
  return `
**DYNAMIC VISUAL META-ANALYSIS**

**FIELDS DETECTED FOR ANALYSIS:**
Numerical Fields: ${numericalFields.length > 0 ? numericalFields.join(', ') : 'NONE'}
Categorical/List Fields: ${categoricalFields.length > 0 ? categoricalFields.join(', ') : 'NONE'}

**MANDATORY: Analyze ONLY the detected fields above. Do NOT assume any other fields exist.**

**ANALYSIS TASKS:**

${numericalFields.length > 0 ? `
1. **Numerical Field Analysis:**
   For each numerical field (${numericalFields.join(', ')}):
   - Calculate mean, median, standard deviation
   - Identify min and max values
   - Generate distribution histogram
   - Detect outliers (values > 2 std deviations from mean)
` : ''}

${categoricalFields.length > 0 ? `
2. **Categorical Field Analysis:**
   For each categorical/list field (${categoricalFields.join(', ')}):
   - Count frequency of unique values/items
   - Calculate percentage distribution
   - Identify most common values
   - Generate frequency bar chart
` : ''}

3. **Cross-Model Comparison:**
   - Compare distributions across different models (if multiple models present)
   - Calculate inter-model agreement/correlation
   - Identify systematic differences between models

**OUTPUT FORMAT:**
Return a JSON object with:
{
  "numericalAnalysis": { /* stats for each numerical field */ },
  "categoricalAnalysis": { /* frequencies for each categorical field */ },
  "crossModelComparison": { /* model comparison metrics */ },
  "visualizations": { /* chart specifications */ }
}
`.trim();
}

/**
 * Build dynamic Python code template for analysis
 */
function buildCodeTemplate(
  numericalFields: string[],
  categoricalFields: string[],
  outputs: any[]
): string {
  // Convert outputs to Python-compatible format
  const dataJson = JSON.stringify(outputs, null, 2);

  return `
import json
import statistics
from collections import Counter
from typing import Any, Dict, List

# Load data
data: List[Dict[str, Any]] = ${dataJson}

# Helper function to extract nested field values
def get_field_value(obj: Dict[str, Any], field_path: str) -> Any:
    """Extract value from a nested path (e.g., 'a.b.c')"""
    parts = field_path.split('.')
    value = obj
    for part in parts:
        if isinstance(value, dict) and part in value:
            value = value[part]
        else:
            return None
    return value

# Numerical field analysis
numerical_analysis = {}
${numericalFields.map(field => `
# Analyze: ${field}
${field.replace(/\./g, '_')}_values = [get_field_value(item, '${field}') for item in data if get_field_value(item, '${field}') is not None]
if ${field.replace(/\./g, '_')}_values:
    numerical_analysis['${field}'] = {
        'mean': statistics.mean(${field.replace(/\./g, '_')}_values),
        'median': statistics.median(${field.replace(/\./g, '_')}_values),
        'stdev': statistics.stdev(${field.replace(/\./g, '_')}_values) if len(${field.replace(/\./g, '_')}_values) > 1 else 0,
        'min': min(${field.replace(/\./g, '_')}_values),
        'max': max(${field.replace(/\./g, '_')}_values),
        'count': len(${field.replace(/\./g, '_')}_values)
    }
`).join('\n')}

# Categorical field analysis
categorical_analysis = {}
${categoricalFields.map(field => `
# Analyze: ${field}
${field.replace(/\./g, '_')}_values = []
for item in data:
    val = get_field_value(item, '${field}')
    if val is not None:
        if isinstance(val, list):
            ${field.replace(/\./g, '_')}_values.extend(val)
        else:
            ${field.replace(/\./g, '_')}_values.append(val)

if ${field.replace(/\./g, '_')}_values:
    counter = Counter(${field.replace(/\./g, '_')}_values)
    total = len(${field.replace(/\./g, '_')}_values)
    categorical_analysis['${field}'] = {
        'frequencies': dict(counter),
        'percentages': {k: (v / total * 100) for k, v in counter.items()},
        'most_common': counter.most_common(5),
        'unique_count': len(counter)
    }
`).join('\n')}

# Output results
result = {
    'numericalAnalysis': numerical_analysis,
    'categoricalAnalysis': categorical_analysis,
    'summary': f'Analyzed {len(data)} outputs with {len(numerical_analysis)} numerical fields and {len(categorical_analysis)} categorical fields'
}

print(json.dumps(result, indent=2))
`.trim();
}

/**
 * Execute dynamic analysis plan
 * 
 * @param plan - Analysis plan from planComputationalAnalysis
 * @param codeExecTool - Code execution tool function
 * @returns Analysis results
 */
export async function executeAnalysisPlan(
  plan: AnalysisPlan,
  codeExecTool: (code: string) => Promise<any>
): Promise<any> {
  try {
    const result = await codeExecTool(plan.codeTemplate);
    return result;
  } catch (error) {
    console.error('Analysis execution failed:', error);
    throw new Error(`Failed to execute analysis: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Complete dynamic visual meta-analysis pipeline
 * 
 * @param llmOutputs - Array of visual LLM analysis results
 * @param codeExecTool - Code execution tool function
 * @returns Complete analysis results
 */
export async function runDynamicVisualMetaAnalysis(
  llmOutputs: any[],
  codeExecTool: (code: string) => Promise<any>
): Promise<{
  fields: FieldClassification;
  plan: AnalysisPlan;
  results: any;
}> {
  // Step 1: Discover fields from actual outputs
  const fields = discoverFields(llmOutputs);

  console.log('Discovered fields:', {
    numerical: Array.from(fields.numerical),
    categorical: Array.from(fields.categorical),
    excluded: Array.from(fields.excluded),
  });

  // Step 2: Generate analysis plan
  const plan = planComputationalAnalysis(fields, llmOutputs);

  console.log('Generated analysis plan:', {
    numericalFields: plan.numericalFields,
    categoricalFields: plan.categoricalFields,
  });

  // Step 3: Execute analysis
  const results = await executeAnalysisPlan(plan, codeExecTool);

  return { fields, plan, results };
}

