/**
 * Custom Detector Builder
 * Visual builder for creating custom proactive detectors (Premium feature)
 *
 * 6-step wizard:
 * 1. Name detector
 * 2. Choose trigger (event/schedule/threshold)
 * 3. Define conditions (optional)
 * 4. Configure actions
 * 5. Set schedule & limits
 * 6. Test detector
 */

import React, { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import {
  Zap,
  Calendar,
  AlertTriangle,
  Check,
  ArrowLeft,
  ArrowRight,
  Save,
  Play,
} from "lucide-react";
import { toast } from "sonner";

// Step components
import { NameStep } from "../components/detector-builder/NameStep";
import { TriggerStep } from "../components/detector-builder/TriggerStep";
import { ConditionsStep } from "../components/detector-builder/ConditionsStep";
import { ActionsStep } from "../components/detector-builder/ActionsStep";
import { ScheduleStep } from "../components/detector-builder/ScheduleStep";
import { TestStep } from "../components/detector-builder/TestStep";

// Types
interface DetectorConfig {
  detectorId?: string;
  name: string;
  description?: string;
  icon?: string;
  triggerType: "event" | "schedule" | "threshold";
  eventTrigger?: {
    eventType: string;
    keywords?: string[];
    entityFilter?: {
      entityType: string;
      scope: "watchlist" | "all" | "specific_ids";
      entityIds?: string[];
    };
    sourcesFilter?: string[];
  };
  scheduleTrigger?: {
    cronExpression: string;
    timezone: string;
  };
  thresholdTrigger?: {
    metric: string;
    operator: "gt" | "lt" | "eq";
    value: number;
    checkInterval: string;
  };
  conditions?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    actionType: string;
    config: any;
    template?: string;
  }>;
  rateLimit?: {
    maxPerDay?: number;
    maxPerWeek?: number;
    deduplicateWindow?: number;
  };
  priority: "low" | "medium" | "high";
  respectQuietHours: boolean;
  deduplicate: boolean;
  status: "draft" | "active";
}

const STEPS = [
  { id: 1, name: "Name", icon: Zap },
  { id: 2, name: "Trigger", icon: Calendar },
  { id: 3, name: "Conditions", icon: AlertTriangle },
  { id: 4, name: "Actions", icon: Check },
  { id: 5, name: "Schedule", icon: Calendar },
  { id: 6, name: "Test", icon: Play },
];

export function CustomDetectorBuilder({
  initialConfig,
  onClose,
}: {
  initialConfig?: DetectorConfig;
  onClose: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<DetectorConfig>(
    initialConfig || {
      name: "",
      triggerType: "event",
      actions: [],
      priority: "medium",
      respectQuietHours: true,
      deduplicate: true,
      status: "draft",
    }
  );
  const [isSaving, setIsSaving] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const createDetector = useMutation(api.proactive.mutations.createCustomDetector);
  const updateDetector = useMutation(api.proactive.mutations.updateCustomDetector);
  const testDetector = useMutation(api.proactive.mutations.testCustomDetector);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSave = useCallback(
    async (enableImmediately: boolean) => {
      setIsSaving(true);
      try {
        const finalConfig = {
          ...config,
          status: enableImmediately ? "active" : "draft",
        };

        if (config.detectorId) {
          // Update existing
          await updateDetector({
            detectorId: config.detectorId,
            ...finalConfig,
          });
          toast.success(`Detector "${config.name}" updated`);
        } else {
          // Create new
          const detectorId = await createDetector(finalConfig);
          setConfig({ ...finalConfig, detectorId });
          toast.success(`Detector "${config.name}" created`);
        }

        if (enableImmediately) {
          onClose();
        }
      } catch (error: any) {
        toast.error(`Failed to save: ${error.message}`);
      } finally {
        setIsSaving(false);
      }
    },
    [config, createDetector, updateDetector, onClose]
  );

  const handleTest = useCallback(async () => {
    try {
      const results = await testDetector(config);
      setTestResults(results);
      toast.success(`Found ${results.matchCount} matches in last 7 days`);
    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`);
    }
  }, [config, testDetector]);

  const updateConfig = useCallback((updates: Partial<DetectorConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return config.name.length >= 3 && config.name.length <= 50;
      case 2:
        if (config.triggerType === "event") {
          return !!config.eventTrigger?.eventType;
        }
        if (config.triggerType === "schedule") {
          return !!config.scheduleTrigger?.cronExpression;
        }
        if (config.triggerType === "threshold") {
          return !!config.thresholdTrigger?.metric;
        }
        return false;
      case 3:
        return true; // Conditions are optional
      case 4:
        return config.actions.length > 0;
      case 5:
        return true; // Schedule settings have defaults
      case 6:
        return true;
      default:
        return false;
    }
  }, [currentStep, config]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {config.detectorId ? "Edit" : "Create"} Custom Detector
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              ✕
            </button>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            {STEPS.map((step, idx) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors",
                    currentStep === step.id
                      ? "bg-blue-500 text-white"
                      : currentStep > step.id
                      ? "bg-green-500/20 text-green-600"
                      : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                  )}
                >
                  <step.icon className="w-4 h-4" />
                  <span>{step.name}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 bg-[var(--border-color)]" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <NameStep config={config} updateConfig={updateConfig} />
          )}
          {currentStep === 2 && (
            <TriggerStep config={config} updateConfig={updateConfig} />
          )}
          {currentStep === 3 && (
            <ConditionsStep config={config} updateConfig={updateConfig} />
          )}
          {currentStep === 4 && (
            <ActionsStep config={config} updateConfig={updateConfig} />
          )}
          {currentStep === 5 && (
            <ScheduleStep config={config} updateConfig={updateConfig} />
          )}
          {currentStep === 6 && (
            <TestStep
              config={config}
              testResults={testResults}
              onTest={handleTest}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-color)] flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 rounded bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            {currentStep < STEPS.length ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleSave(false)}
                  disabled={isSaving || !canProceed()}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save as Draft"}
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={isSaving || !canProceed()}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save & Enable"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
