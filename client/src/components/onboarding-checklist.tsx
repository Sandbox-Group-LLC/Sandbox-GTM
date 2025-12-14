import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Circle, ChevronDown, ChevronUp, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useOnboardingStatus } from "./onboarding-wizard";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface OnboardingChecklistProps {
  onOpenWizard?: () => void;
}

export function OnboardingChecklist({ onOpenWizard }: OnboardingChecklistProps) {
  const { data: status, isLoading } = useOnboardingStatus();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/onboarding/dismiss", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/organization"] });
    },
  });

  if (isLoading || !status || status.onboardingCompleted) {
    return null;
  }

  const completedSteps = status.steps.filter((step) => step.completed).length;
  const totalSteps = status.steps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  const handleDismiss = () => {
    dismissMutation.mutate();
  };

  const handleContinueSetup = () => {
    onOpenWizard?.();
  };

  return (
    <Card className="mx-2 mb-4" data-testid="card-onboarding-checklist">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 pb-2">
        <CardTitle className="text-sm font-medium">Setup Progress</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setIsCollapsed(!isCollapsed)}
            data-testid="button-toggle-checklist"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={handleDismiss}
            disabled={dismissMutation.isPending}
            data-testid="button-dismiss-checklist"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="mb-2 flex items-center gap-2">
          <Progress value={progressPercentage} className="h-2" data-testid="progress-onboarding" />
          <span className="text-xs text-muted-foreground" data-testid="text-progress-percentage">
            {progressPercentage}%
          </span>
        </div>

        {!isCollapsed && (
          <>
            <ul className="mb-3 space-y-1" data-testid="list-onboarding-steps">
              {status.steps.map((step) => (
                <li
                  key={step.id}
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    step.completed && "text-muted-foreground"
                  )}
                  data-testid={`step-${step.id}`}
                >
                  {step.completed ? (
                    <Check className="h-3 w-3 text-primary" data-testid={`icon-check-${step.id}`} />
                  ) : step.id === status.currentStep ? (
                    <Circle className="h-3 w-3 fill-primary text-primary" data-testid={`icon-current-${step.id}`} />
                  ) : (
                    <Circle className="h-3 w-3 text-muted-foreground" data-testid={`icon-incomplete-${step.id}`} />
                  )}
                  <span
                    className={cn(
                      step.id === status.currentStep && !step.completed && "font-medium text-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                </li>
              ))}
            </ul>

            <Button
              size="sm"
              className="w-full"
              onClick={handleContinueSetup}
              data-testid="button-continue-setup"
            >
              Continue Setup
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
