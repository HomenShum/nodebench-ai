/**
 * Proactive Onboarding Flow
 * 5-step blanket consent wizard for enabling proactive features
 *
 * Steps:
 * 1. Welcome - Introduce proactive features
 * 2. Consent - Explain data access and get blanket consent
 * 3. Features - Show available proactive features
 * 4. Preferences - Configure notification settings
 * 5. Success - Confirmation and next steps
 */

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Shield,
  Check,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

// Step components
import { WelcomeStep } from "../components/onboarding/WelcomeStep";
import { ConsentStep } from "../components/onboarding/ConsentStep";
import { FeaturesStep } from "../components/onboarding/FeaturesStep";
import { PreferencesStep } from "../components/onboarding/PreferencesStep";
import { SuccessStep } from "../components/onboarding/SuccessStep";

const STEPS = [
  { id: 1, name: "Welcome", icon: Sparkles },
  { id: 2, name: "Consent", icon: Shield },
  { id: 3, name: "Features", icon: Check },
  { id: 4, name: "Preferences", icon: Check },
  { id: 5, name: "Success", icon: Check },
];

export interface OnboardingState {
  consentGranted: boolean;
  enabledDetectors: string[];
  notificationChannels: {
    inApp: boolean;
    slack: boolean;
    email: boolean;
  };
  quietHoursStart?: number;
  quietHoursEnd?: number;
  timezone: string;
  minimumConfidence: number;
}

export function ProactiveOnboarding({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<OnboardingState>({
    consentGranted: false,
    enabledDetectors: [
      "meeting_prep",
      "follow_up",
      "daily_brief",
    ],
    notificationChannels: {
      inApp: true,
      slack: false,
      email: false,
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    minimumConfidence: 0.7,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const grantConsent = useMutation(api.proactive.consentMutations.grantConsent);
  const updateSettings = useMutation(api.proactive.mutations.updateProactiveSettings);

  const updateState = (updates: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = async () => {
    // Step 2: Consent must be granted before proceeding
    if (currentStep === 2 && !state.consentGranted) {
      toast.error("Please accept the terms to continue");
      return;
    }

    // Step 5: Final submission
    if (currentStep === 5) {
      await handleComplete();
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // Grant consent
      await grantConsent({
        consentType: "proactive_features",
        version: "1.0",
      });

      // Save preferences
      await updateSettings({
        enabledDetectors: state.enabledDetectors,
        notificationChannels: state.notificationChannels,
        quietHoursStart: state.quietHoursStart,
        quietHoursEnd: state.quietHoursEnd,
        timezone: state.timezone,
        minimumConfidence: state.minimumConfidence,
      });

      toast.success("Proactive features enabled!");
      onComplete();
    } catch (error: any) {
      toast.error(`Setup failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true; // Welcome step can always proceed
      case 2:
        return state.consentGranted; // Must grant consent
      case 3:
        return state.enabledDetectors.length > 0; // Must enable at least one detector
      case 4:
        return true; // Preferences have defaults
      case 5:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Enable Proactive Features
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                NodeBench AI
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center gap-2">
              {STEPS.map((step, idx) => (
                <React.Fragment key={step.id}>
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                      currentStep === step.id
                        ? "bg-blue-500 text-white"
                        : currentStep > step.id
                        ? "bg-green-500 text-white"
                        : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                    )}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-1 rounded transition-colors",
                        currentStep > step.id
                          ? "bg-green-500"
                          : "bg-[var(--border-color)]"
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && <WelcomeStep />}
          {currentStep === 2 && (
            <ConsentStep
              consentGranted={state.consentGranted}
              onConsentChange={(granted) => updateState({ consentGranted: granted })}
            />
          )}
          {currentStep === 3 && (
            <FeaturesStep
              enabledDetectors={state.enabledDetectors}
              onDetectorsChange={(detectors) => updateState({ enabledDetectors: detectors })}
            />
          )}
          {currentStep === 4 && (
            <PreferencesStep
              state={state}
              updateState={updateState}
            />
          )}
          {currentStep === 5 && <SuccessStep state={state} />}
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
              <button
                onClick={handleComplete}
                disabled={isSubmitting || !canProceed()}
                className="flex items-center gap-2 px-6 py-2 rounded bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {isSubmitting ? "Enabling..." : "Enable Proactive Features"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
