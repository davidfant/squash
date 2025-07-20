import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, FileText, MessageCircle, Palette } from "lucide-react";
import { useState } from "react";
import { OnboardingStyleStep } from "./steps/OnboardingStyleStep";
import { OnboardingToneStep } from "./steps/OnboardingToneStep";

const ONBOARDING_STEPS = [
  { id: "styling", label: "Styling", icon: Palette },
  { id: "tone", label: "Tone", icon: MessageCircle },
  { id: "content", label: "Content", icon: FileText },
];

export function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);

  const handleContinue = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Navigate to next page or complete onboarding
      console.log("Complete onboarding");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between">
          {ONBOARDING_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-primary/20 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <div className="ml-2 flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium truncate",
                      isCurrent ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                </div>
                {index < ONBOARDING_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-px w-8 mx-2 transition-colors",
                      index < currentStep ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {currentStep === 0 && <OnboardingStyleStep />}
        {currentStep === 1 && <OnboardingToneStep />}

        {/* Continue Button */}
        <Button onClick={handleContinue} className="w-full">
          {currentStep < ONBOARDING_STEPS.length - 1
            ? "Continue"
            : "Get Started"}
        </Button>

        {/* Settings can be changed later text */}
        <p className="text-xs text-center text-muted-foreground">
          Don't worry, all these settings can be changed later
        </p>
      </div>
    </div>
  );
}
