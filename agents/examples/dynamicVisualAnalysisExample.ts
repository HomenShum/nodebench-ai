/**
 * Example: Dynamic Visual Meta-Analysis
 * 
 * Demonstrates how the system adapts to different analysis tasks
 * without hardcoded field assumptions.
 */

import { runDynamicVisualMetaAnalysis } from '../core/visualMetaAnalysis';
import { analyzeImageMultiModel } from '../tools/visionAnalysis';
import { codeExecTool } from '../tools/codeExec';

/**
 * Example 1: VR Avatar Quality Analysis
 * 
 * The system will automatically discover and analyze:
 * - Numerical: ratings.movementMotion, ratings.visualQuality, ratings.emotionalComfort, confidence
 * - Categorical: detectedArtifacts
 */
async function exampleVRAnalysis() {
  console.log('\n=== Example 1: VR Avatar Quality Analysis ===\n');

  const vrPrompt = `
Analyze this VR avatar image for quality issues.

Detect:
1. Visual artifacts (redlines, distortions, glitches)
2. Movement quality issues (frozen feet, static fingers)
3. Eye rendering problems (red lines, artifacts)
4. Clothing distortions

Rate on 1-5 scale:
- movementMotion (1=worst/frozen, 5=best/natural)
- visualQuality (1=worst/distorted, 5=best/clean)
- emotionalComfort (1=worst/unsettling, 5=best/comfortable)
`.trim();

  const vrImages = [
    'https://example.com/vr_avatar_1.jpg',
    'https://example.com/vr_avatar_2.jpg',
    'https://example.com/vr_avatar_3.jpg',
  ];

  // Step 1: Analyze images with visual LLMs
  const llmOutputs = [];
  for (const imageUrl of vrImages) {
    const analysis = await analyzeImageMultiModel(imageUrl, imageUrl, vrPrompt);
    llmOutputs.push(analysis);
  }

  // Step 2: Run dynamic meta-analysis
  const { fields, plan, results } = await runDynamicVisualMetaAnalysis(
    llmOutputs,
    codeExecTool()
  );

  console.log('Discovered Fields:');
  console.log('  Numerical:', Array.from(fields.numerical));
  console.log('  Categorical:', Array.from(fields.categorical));
  console.log('  Excluded:', Array.from(fields.excluded));

  console.log('\nAnalysis Plan:');
  console.log('  Numerical Fields:', plan.numericalFields);
  console.log('  Categorical Fields:', plan.categoricalFields);

  console.log('\nResults:', JSON.stringify(results, null, 2));
}

/**
 * Example 2: General Image Content Analysis
 * 
 * The system will automatically discover and analyze:
 * - Numerical: peopleCount, confidence
 * - Categorical: detectedEmotions, primaryEmotion, sceneType
 */
async function exampleGeneralImageAnalysis() {
  console.log('\n=== Example 2: General Image Content Analysis ===\n');

  const generalPrompt = `
Analyze this image for content and context.

Identify:
1. Number of people visible
2. Emotions displayed (happy, sad, calm, excited, etc.)
3. Primary emotion of the scene
4. Scene type (indoor, outdoor, urban, nature, etc.)

Provide:
- peopleCount: number of people
- detectedEmotions: array of emotions detected
- primaryEmotion: the dominant emotion
- sceneType: type of scene
- confidence: your confidence in the analysis (0-1)
`.trim();

  const generalImages = [
    'https://example.com/family_photo.jpg',
    'https://example.com/park_scene.jpg',
    'https://example.com/office_meeting.jpg',
  ];

  // Step 1: Analyze images with visual LLMs
  const llmOutputs = [];
  for (const imageUrl of generalImages) {
    const analysis = await analyzeImageMultiModel(imageUrl, imageUrl, generalPrompt);
    llmOutputs.push(analysis);
  }

  // Step 2: Run dynamic meta-analysis
  const { fields, plan, results } = await runDynamicVisualMetaAnalysis(
    llmOutputs,
    codeExecTool()
  );

  console.log('Discovered Fields:');
  console.log('  Numerical:', Array.from(fields.numerical));
  console.log('  Categorical:', Array.from(fields.categorical));
  console.log('  Excluded:', Array.from(fields.excluded));

  console.log('\nAnalysis Plan:');
  console.log('  Numerical Fields:', plan.numericalFields);
  console.log('  Categorical Fields:', plan.categoricalFields);

  console.log('\nResults:', JSON.stringify(results, null, 2));
}

/**
 * Example 3: Medical Image Analysis
 * 
 * The system will automatically discover and analyze:
 * - Numerical: abnormalityScore, confidence
 * - Categorical: detectedAbnormalities, severity, requiresFollowup
 */
async function exampleMedicalImageAnalysis() {
  console.log('\n=== Example 3: Medical Image Analysis ===\n');

  const medicalPrompt = `
Analyze this medical image (X-ray) for abnormalities.

Identify:
1. Abnormality score (0-10, where 0=normal, 10=severe)
2. Detected abnormalities (fracture, inflammation, calcification, etc.)
3. Severity level (mild, moderate, severe)
4. Whether follow-up is required

Provide:
- abnormalityScore: numerical score 0-10
- detectedAbnormalities: array of abnormalities found
- severity: severity level (mild/moderate/severe)
- requiresFollowup: boolean indicating if follow-up needed
- confidence: your confidence in the analysis (0-1)
`.trim();

  const medicalImages = [
    'https://example.com/xray_chest_1.jpg',
    'https://example.com/xray_chest_2.jpg',
    'https://example.com/xray_chest_3.jpg',
  ];

  // Step 1: Analyze images with visual LLMs
  const llmOutputs = [];
  for (const imageUrl of medicalImages) {
    const analysis = await analyzeImageMultiModel(imageUrl, imageUrl, medicalPrompt);
    llmOutputs.push(analysis);
  }

  // Step 2: Run dynamic meta-analysis
  const { fields, plan, results } = await runDynamicVisualMetaAnalysis(
    llmOutputs,
    codeExecTool()
  );

  console.log('Discovered Fields:');
  console.log('  Numerical:', Array.from(fields.numerical));
  console.log('  Categorical:', Array.from(fields.categorical));
  console.log('  Excluded:', Array.from(fields.excluded));

  console.log('\nAnalysis Plan:');
  console.log('  Numerical Fields:', plan.numericalFields);
  console.log('  Categorical Fields:', plan.categoricalFields);

  console.log('\nResults:', JSON.stringify(results, null, 2));
}

/**
 * Example 4: Comparison Across Different Tasks
 * 
 * Demonstrates that the same code adapts to completely different schemas
 */
async function exampleCrossTaskComparison() {
  console.log('\n=== Example 4: Cross-Task Comparison ===\n');

  // Mock outputs from different tasks
  const vrOutput = {
    imageId: 'vr_001',
    modelName: 'gpt-5-mini',
    ratings: { movementMotion: 4, visualQuality: 5, emotionalComfort: 3 },
    detectedArtifacts: ['redline', 'glitch'],
    confidence: 0.85,
  };

  const generalOutput = {
    imageId: 'img_001',
    modelName: 'gpt-5-mini',
    peopleCount: 5,
    detectedEmotions: ['happy', 'calm'],
    primaryEmotion: 'happy',
    sceneType: 'outdoor',
    confidence: 0.78,
  };

  const medicalOutput = {
    imageId: 'xray_001',
    modelName: 'gpt-5-mini',
    abnormalityScore: 7.5,
    detectedAbnormalities: ['fracture', 'inflammation'],
    severity: 'moderate',
    requiresFollowup: true,
    confidence: 0.88,
  };

  // Analyze each task with the SAME code
  const tasks = [
    { name: 'VR Avatar', outputs: [vrOutput] },
    { name: 'General Image', outputs: [generalOutput] },
    { name: 'Medical Image', outputs: [medicalOutput] },
  ];

  for (const task of tasks) {
    console.log(`\n--- ${task.name} ---`);

    const { fields, plan } = await runDynamicVisualMetaAnalysis(
      task.outputs,
      codeExecTool()
    );

    console.log('Numerical Fields:', plan.numericalFields);
    console.log('Categorical Fields:', plan.categoricalFields);
  }

  console.log('\n✅ Same code, different fields analyzed for each task!');
}

/**
 * Main execution
 */
async function main() {
  try {
    // Run all examples
    await exampleVRAnalysis();
    await exampleGeneralImageAnalysis();
    await exampleMedicalImageAnalysis();
    await exampleCrossTaskComparison();

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  exampleVRAnalysis,
  exampleGeneralImageAnalysis,
  exampleMedicalImageAnalysis,
  exampleCrossTaskComparison,
};

