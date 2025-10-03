/**
 * Tests for Dynamic Visual Meta-Analysis System
 * 
 * Validates that the system adapts to different LLM output schemas
 * without hardcoded field assumptions.
 */

import {
  discoverFields,
  planComputationalAnalysis,
  runDynamicVisualMetaAnalysis,
} from '../visualMetaAnalysis';

describe('Dynamic Visual Meta-Analysis', () => {
  describe('Scenario 1: VR Avatar Analysis', () => {
    const vrOutputs = [
      {
        imageId: 'vr_001',
        modelName: 'gpt-5-mini',
        ratings: {
          movementMotion: 4,
          visualQuality: 5,
          emotionalComfort: 3,
        },
        detectedArtifacts: ['redline', 'glitch'],
        confidence: 0.85,
        detailedFindings: 'Avatar shows good movement but has minor visual artifacts',
      },
      {
        imageId: 'vr_002',
        modelName: 'gemini-2.5-flash',
        ratings: {
          movementMotion: 3,
          visualQuality: 4,
          emotionalComfort: 4,
        },
        detectedArtifacts: ['distortion'],
        confidence: 0.92,
        detailedFindings: 'Avatar has acceptable quality with some distortion',
      },
    ];

    it('should discover VR-specific fields', () => {
      const fields = discoverFields(vrOutputs);

      // Should find nested numerical ratings
      expect(fields.numerical.has('ratings.movementMotion')).toBe(true);
      expect(fields.numerical.has('ratings.visualQuality')).toBe(true);
      expect(fields.numerical.has('ratings.emotionalComfort')).toBe(true);
      expect(fields.numerical.has('confidence')).toBe(true);

      // Should find categorical array
      expect(fields.categorical.has('detectedArtifacts')).toBe(true);

      // Should exclude metadata
      expect(fields.excluded.has('imageId')).toBe(true);
      expect(fields.excluded.has('modelName')).toBe(true);
      expect(fields.excluded.has('detailedFindings')).toBe(true);
    });

    it('should generate VR-specific analysis plan', () => {
      const fields = discoverFields(vrOutputs);
      const plan = planComputationalAnalysis(fields, vrOutputs);

      // Should include all numerical fields
      expect(plan.numericalFields).toContain('ratings.movementMotion');
      expect(plan.numericalFields).toContain('ratings.visualQuality');
      expect(plan.numericalFields).toContain('ratings.emotionalComfort');
      expect(plan.numericalFields).toContain('confidence');

      // Should include categorical fields
      expect(plan.categoricalFields).toContain('detectedArtifacts');

      // Prompt should mention discovered fields
      expect(plan.analysisPrompt).toContain('ratings.movementMotion');
      expect(plan.analysisPrompt).toContain('detectedArtifacts');
      expect(plan.analysisPrompt).not.toContain('people_count'); // Not in VR data
    });
  });

  describe('Scenario 2: General Image Analysis', () => {
    const generalOutputs = [
      {
        imageId: 'img_001',
        modelName: 'gpt-5-mini',
        peopleCount: 5,
        detectedEmotions: ['happy', 'calm'],
        primaryEmotion: 'happy',
        sceneType: 'outdoor',
        confidence: 0.78,
      },
      {
        imageId: 'img_002',
        modelName: 'gemini-2.5-flash',
        peopleCount: 3,
        detectedEmotions: ['happy', 'excited'],
        primaryEmotion: 'excited',
        sceneType: 'indoor',
        confidence: 0.91,
      },
    ];

    it('should discover general image fields', () => {
      const fields = discoverFields(generalOutputs);

      // Should find numerical fields
      expect(fields.numerical.has('peopleCount')).toBe(true);
      expect(fields.numerical.has('confidence')).toBe(true);

      // Should find categorical fields
      expect(fields.categorical.has('detectedEmotions')).toBe(true);
      expect(fields.categorical.has('primaryEmotion')).toBe(true);
      expect(fields.categorical.has('sceneType')).toBe(true);

      // Should NOT find VR-specific fields
      expect(fields.numerical.has('ratings.movementMotion')).toBe(false);
      expect(fields.categorical.has('detectedArtifacts')).toBe(false);
    });

    it('should generate general image analysis plan', () => {
      const fields = discoverFields(generalOutputs);
      const plan = planComputationalAnalysis(fields, generalOutputs);

      // Should include general image fields
      expect(plan.numericalFields).toContain('peopleCount');
      expect(plan.numericalFields).toContain('confidence');
      expect(plan.categoricalFields).toContain('detectedEmotions');
      expect(plan.categoricalFields).toContain('primaryEmotion');

      // Should NOT include VR-specific fields
      expect(plan.numericalFields).not.toContain('ratings.movementMotion');
      expect(plan.categoricalFields).not.toContain('detectedArtifacts');

      // Prompt should mention discovered fields
      expect(plan.analysisPrompt).toContain('peopleCount');
      expect(plan.analysisPrompt).toContain('detectedEmotions');
      expect(plan.analysisPrompt).not.toContain('movementMotion'); // Not in general data
    });
  });

  describe('Scenario 3: Medical Image Analysis', () => {
    const medicalOutputs = [
      {
        imageId: 'xray_001',
        modelName: 'gpt-5-mini',
        abnormalityScore: 7.5,
        detectedAbnormalities: ['fracture', 'inflammation'],
        severity: 'moderate',
        requiresFollowup: true,
        confidence: 0.88,
      },
      {
        imageId: 'xray_002',
        modelName: 'gemini-2.5-flash',
        abnormalityScore: 3.2,
        detectedAbnormalities: ['minor_calcification'],
        severity: 'mild',
        requiresFollowup: false,
        confidence: 0.95,
      },
    ];

    it('should discover medical-specific fields', () => {
      const fields = discoverFields(medicalOutputs);

      // Should find numerical fields
      expect(fields.numerical.has('abnormalityScore')).toBe(true);
      expect(fields.numerical.has('confidence')).toBe(true);

      // Should find categorical fields
      expect(fields.categorical.has('detectedAbnormalities')).toBe(true);
      expect(fields.categorical.has('severity')).toBe(true);
      expect(fields.categorical.has('requiresFollowup')).toBe(true);

      // Should NOT find VR or general image fields
      expect(fields.numerical.has('ratings.movementMotion')).toBe(false);
      expect(fields.numerical.has('peopleCount')).toBe(false);
    });

    it('should adapt to completely different schema', () => {
      const fields = discoverFields(medicalOutputs);
      const plan = planComputationalAnalysis(fields, medicalOutputs);

      // Should analyze medical fields
      expect(plan.numericalFields).toContain('abnormalityScore');
      expect(plan.categoricalFields).toContain('detectedAbnormalities');
      expect(plan.categoricalFields).toContain('severity');

      // Should NOT analyze VR or general fields
      expect(plan.numericalFields).not.toContain('movementMotion');
      expect(plan.numericalFields).not.toContain('peopleCount');
      expect(plan.categoricalFields).not.toContain('detectedEmotions');
    });
  });

  describe('Code Template Generation', () => {
    it('should generate valid Python code for VR analysis', () => {
      const vrOutputs = [
        {
          imageId: 'vr_001',
          ratings: { movementMotion: 4, visualQuality: 5 },
          detectedArtifacts: ['redline'],
          confidence: 0.85,
        },
      ];

      const fields = discoverFields(vrOutputs);
      const plan = planComputationalAnalysis(fields, vrOutputs);

      // Code should include field-specific analysis
      expect(plan.codeTemplate).toContain('ratings.movementMotion');
      expect(plan.codeTemplate).toContain('ratings.visualQuality');
      expect(plan.codeTemplate).toContain('detectedArtifacts');
      expect(plan.codeTemplate).toContain('confidence');

      // Code should have proper Python syntax
      expect(plan.codeTemplate).toContain('import json');
      expect(plan.codeTemplate).toContain('import statistics');
      expect(plan.codeTemplate).toContain('def get_field_value');
    });

    it('should generate different code for different schemas', () => {
      const generalOutputs = [
        {
          imageId: 'img_001',
          peopleCount: 5,
          detectedEmotions: ['happy'],
          confidence: 0.78,
        },
      ];

      const fields = discoverFields(generalOutputs);
      const plan = planComputationalAnalysis(fields, generalOutputs);

      // Code should include general image fields
      expect(plan.codeTemplate).toContain('peopleCount');
      expect(plan.codeTemplate).toContain('detectedEmotions');

      // Code should NOT include VR fields
      expect(plan.codeTemplate).not.toContain('movementMotion');
      expect(plan.codeTemplate).not.toContain('detectedArtifacts');
    });
  });

  describe('Field Classification Edge Cases', () => {
    it('should handle empty outputs', () => {
      const fields = discoverFields([]);
      expect(fields.numerical.size).toBe(0);
      expect(fields.categorical.size).toBe(0);
      expect(fields.excluded.size).toBe(0);
    });

    it('should handle deeply nested objects', () => {
      const outputs = [
        {
          imageId: 'test_001',
          analysis: {
            quality: {
              sharpness: 8.5,
              brightness: 7.2,
            },
            tags: ['outdoor', 'sunny'],
          },
        },
      ];

      const fields = discoverFields(outputs);

      // Should find nested numerical fields
      expect(fields.numerical.has('analysis.quality.sharpness')).toBe(true);
      expect(fields.numerical.has('analysis.quality.brightness')).toBe(true);

      // Should find nested categorical fields
      expect(fields.categorical.has('analysis.tags')).toBe(true);
    });

    it('should exclude long text fields', () => {
      const outputs = [
        {
          imageId: 'test_001',
          shortText: 'OK',
          longText: 'This is a very long description that exceeds 100 characters and should be excluded from categorical analysis because it is too long to be useful for frequency counting',
          summary: 'This should be excluded',
          detailedFindings: 'This should also be excluded',
        },
      ];

      const fields = discoverFields(outputs);

      // Short text should be categorical
      expect(fields.categorical.has('shortText')).toBe(true);

      // Long text and summaries should be excluded
      expect(fields.excluded.has('longText')).toBe(true);
      expect(fields.excluded.has('summary')).toBe(true);
      expect(fields.excluded.has('detailedFindings')).toBe(true);
    });
  });
});

