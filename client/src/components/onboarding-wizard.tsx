import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Building2, Calendar, Users, Palette, CreditCard, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  skippable: boolean;
}

interface OnboardingStatus {
  currentStep: number;
  onboardingCompleted: boolean;
  steps: OnboardingStep[];
  organization: {
    id: string;
    name: string;
    organizationType?: string;
    expectedEventsPerYear?: string;
    typicalEventSize?: string;
    phone?: string;
    website?: string;
    country?: string;
    timezone?: string;
  };
}

export function useOnboardingStatus() {
  return useQuery<OnboardingStatus>({
    queryKey: ["/api/onboarding/status"],
  });
}

const organizationProfileSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  organizationType: z.string().min(1, "Organization type is required"),
  expectedEventsPerYear: z.string().min(1, "Expected events per year is required"),
  typicalEventSize: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
});

type OrganizationProfileValues = z.infer<typeof organizationProfileSchema>;

const eventSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  location: z.string().optional(),
});

type EventValues = z.infer<typeof eventSchema>;

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const stepIcons = [Building2, Calendar, Users, Palette, CreditCard, UserPlus];

export function OnboardingWizard({ open, onOpenChange }: OnboardingWizardProps) {
  const { toast } = useToast();
  const { data: status, refetch } = useOnboardingStatus();
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (status?.currentStep) {
      setCurrentStep(status.currentStep);
    }
  }, [status?.currentStep]);

  const organizationForm = useForm<OrganizationProfileValues>({
    resolver: zodResolver(organizationProfileSchema),
    defaultValues: {
      name: "",
      organizationType: "",
      expectedEventsPerYear: "",
      typicalEventSize: "",
      phone: "",
      website: "",
      country: "",
      timezone: "",
    },
  });

  const eventForm = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      location: "",
    },
  });

  useEffect(() => {
    if (status?.organization) {
      organizationForm.reset({
        name: status.organization.name || "",
        organizationType: status.organization.organizationType || "",
        expectedEventsPerYear: status.organization.expectedEventsPerYear || "",
        typicalEventSize: status.organization.typicalEventSize || "",
        phone: status.organization.phone || "",
        website: status.organization.website || "",
        country: status.organization.country || "",
        timezone: status.organization.timezone || "",
      });
    }
  }, [status?.organization, organizationForm]);

  const completeStepMutation = useMutation({
    mutationFn: async ({ step, data }: { step: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("POST", "/api/onboarding/complete-step", { step, data });
      return res.json();
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/organization"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: EventValues) => {
      const res = await apiRequest("POST", "/api/events", {
        ...data,
        status: "draft",
        isPublic: false,
        registrationOpen: false,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      completeStepMutation.mutate(
        { step: 2, data: {} },
        {
          onSuccess: () => setCurrentStep(3),
        }
      );
    },
    onError: (error: Error) => {
      toast({ title: "Error creating event", description: error.message, variant: "destructive" });
    },
  });

  const skipStepMutation = useMutation({
    mutationFn: async (step: number) => {
      const res = await apiRequest("POST", "/api/onboarding/skip-step", { step });
      return res.json();
    },
    onSuccess: (_data, step) => {
      refetch();
      setCurrentStep(Math.min(step + 1, 6));
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/onboarding/dismiss", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/organization"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOrganizationSubmit = (data: OrganizationProfileValues) => {
    completeStepMutation.mutate(
      { step: 1, data },
      {
        onSuccess: () => {
          setCurrentStep(2);
          toast({ title: "Organization profile saved" });
        },
      }
    );
  };

  const handleEventSubmit = (data: EventValues) => {
    createEventMutation.mutate(data);
  };

  const handleSkip = () => {
    skipStepMutation.mutate(currentStep);
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinish = () => {
    dismissMutation.mutate();
  };

  const progress = ((currentStep - 1) / 5) * 100;
  const steps = status?.steps || [];
  const currentStepData = steps.find((s) => s.id === currentStep);
  const isSkippable = currentStepData?.skippable || false;
  const StepIcon = stepIcons[currentStep - 1] || Building2;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Form {...organizationForm}>
            <form
              onSubmit={organizationForm.handleSubmit(handleOrganizationSubmit)}
              className="space-y-4"
            >
              <FormField
                control={organizationForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Acme Events Inc."
                        {...field}
                        data-testid="input-org-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={organizationForm.control}
                name="organizationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-org-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="conference">Conference Organizer</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                        <SelectItem value="nonprofit">Nonprofit</SelectItem>
                        <SelectItem value="agency">Agency</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={organizationForm.control}
                  name="expectedEventsPerYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Events Per Year</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-events-per-year">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1-5">1-5</SelectItem>
                          <SelectItem value="6-20">6-20</SelectItem>
                          <SelectItem value="21-50">21-50</SelectItem>
                          <SelectItem value="50+">50+</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={organizationForm.control}
                  name="typicalEventSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typical Event Size</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-event-size">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="<100">Less than 100</SelectItem>
                          <SelectItem value="100-500">100-500</SelectItem>
                          <SelectItem value="500-2000">500-2000</SelectItem>
                          <SelectItem value="2000+">2000+</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={organizationForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+1 (555) 123-4567"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-org-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={organizationForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-org-website"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={organizationForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="United States"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-org-country"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={organizationForm.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="America/New_York"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-org-timezone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={completeStepMutation.isPending}
                  data-testid="button-continue-step-1"
                >
                  {completeStepMutation.isPending ? "Saving..." : "Continue"}
                </Button>
              </div>
            </form>
          </Form>
        );

      case 2:
        return (
          <Form {...eventForm}>
            <form onSubmit={eventForm.handleSubmit(handleEventSubmit)} className="space-y-4">
              <FormField
                control={eventForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Annual Conference 2025"
                        autoComplete="off"
                        {...field}
                        data-testid="input-event-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={eventForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-event-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={eventForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-event-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={eventForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Convention Center, New York"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-event-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-between gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  data-testid="button-back-step-2"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  data-testid="button-continue-step-2"
                >
                  {createEventMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </form>
          </Form>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Setup Registration</h3>
              <p className="text-sm text-muted-foreground">
                Configure registration packages and attendee types. You can set this up later from
                the Registration page.
              </p>
            </div>
            <div className="flex justify-between gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                data-testid="button-back-step-3"
              >
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={skipStepMutation.isPending}
                  data-testid="button-skip-step-3"
                >
                  Skip for now
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    completeStepMutation.mutate({ step: 3, data: {} }, {
                      onSuccess: () => setCurrentStep(4),
                    });
                  }}
                  disabled={completeStepMutation.isPending}
                  data-testid="button-continue-step-3"
                >
                  {completeStepMutation.isPending ? "Saving..." : "Continue"}
                </Button>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Customize Branding</h3>
              <p className="text-sm text-muted-foreground">
                Add your logo, colors, and customize your event pages. You can set this up later
                from the Site Builder.
              </p>
            </div>
            <div className="flex justify-between gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                data-testid="button-back-step-4"
              >
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={skipStepMutation.isPending}
                  data-testid="button-skip-step-4"
                >
                  Skip for now
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    completeStepMutation.mutate({ step: 4, data: {} }, {
                      onSuccess: () => setCurrentStep(5),
                    });
                  }}
                  disabled={completeStepMutation.isPending}
                  data-testid="button-continue-step-4"
                >
                  {completeStepMutation.isPending ? "Saving..." : "Continue"}
                </Button>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Payment Setup</h3>
              <p className="text-sm text-muted-foreground">
                Connect your Stripe account to accept payments for registrations. You can set this
                up later from Settings.
              </p>
            </div>
            <div className="flex justify-between gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                data-testid="button-back-step-5"
              >
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={skipStepMutation.isPending}
                  data-testid="button-skip-step-5"
                >
                  Skip for now
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    completeStepMutation.mutate({ step: 5, data: {} }, {
                      onSuccess: () => setCurrentStep(6),
                    });
                  }}
                  disabled={completeStepMutation.isPending}
                  data-testid="button-continue-step-5"
                >
                  {completeStepMutation.isPending ? "Saving..." : "Continue"}
                </Button>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Invite Your Team</h3>
              <p className="text-sm text-muted-foreground">
                Add team members to collaborate on your events. You can invite team members later
                from Settings.
              </p>
            </div>
            <div className="flex justify-between gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                data-testid="button-back-step-6"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleFinish}
                disabled={dismissMutation.isPending}
                data-testid="button-finish-onboarding"
              >
                {dismissMutation.isPending ? "Finishing..." : "Finish Setup"}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col"
        data-testid="dialog-onboarding"
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <StepIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle data-testid="text-step-title">
                {currentStepData?.title || `Step ${currentStep}`}
              </DialogTitle>
              <DialogDescription data-testid="text-step-description">
                {currentStepData?.description || "Complete this step to continue"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Step {currentStep} of 6</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-onboarding" />
          <div className="flex justify-between mt-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  step.completed
                    ? "bg-primary text-primary-foreground"
                    : step.id === currentStep
                      ? "border-2 border-primary text-primary"
                      : "border border-muted-foreground/30 text-muted-foreground"
                }`}
                data-testid={`step-indicator-${step.id}`}
              >
                {step.completed ? <Check className="h-3 w-3" /> : step.id}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">{renderStepContent()}</div>
      </DialogContent>
    </Dialog>
  );
}
