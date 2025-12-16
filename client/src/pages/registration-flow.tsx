import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import {
  User,
  Shield,
  Package,
  CreditCard,
  CheckCircle,
  Calendar,
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
  FileText,
  Settings2,
  RotateCcw,
} from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { titleCase } from "@/lib/utils";
import type { Event, Package as PackageType, EmailTemplate } from "@shared/schema";

interface MergedPackage extends PackageType {
  effectivePrice: string | null;
  effectiveFeatures: string[] | null;
  hasOverride: boolean;
  isEnabled: boolean;
  eventPackageId?: string;
}

type StepStatus = "configured" | "pending" | "disabled";

interface FlowStep {
  id: number;
  title: string;
  description: string;
  icon: typeof User;
  status: StepStatus;
  enabled: boolean;
}

interface ValidationRule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

const defaultSteps: FlowStep[] = [
  {
    id: 1,
    title: "Attendee Profile",
    description: "Collect attendee information and authentication",
    icon: User,
    status: "pending",
    enabled: true,
  },
  {
    id: 2,
    title: "Validation",
    description: "Verify attendee eligibility based on rules",
    icon: Shield,
    status: "pending",
    enabled: true,
  },
  {
    id: 3,
    title: "Packages",
    description: "Select available packages for attendees",
    icon: Package,
    status: "pending",
    enabled: true,
  },
  {
    id: 4,
    title: "Payment",
    description: "Process registration payment",
    icon: CreditCard,
    status: "pending",
    enabled: true,
  },
  {
    id: 5,
    title: "Confirmation",
    description: "Final confirmation and ticket delivery",
    icon: CheckCircle,
    status: "pending",
    enabled: true,
  },
];

const validationFields = [
  { value: "utm_source", label: "UTM Source" },
  { value: "utm_medium", label: "UTM Medium" },
  { value: "utm_campaign", label: "UTM Campaign" },
  { value: "email_domain", label: "Email Domain" },
  { value: "referrer", label: "Referrer URL" },
  { value: "country", label: "Country" },
  { value: "invite_code", label: "Invite Code" },
];

const validationOperators = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does not contain" },
  { value: "starts_with", label: "Starts with" },
  { value: "ends_with", label: "Ends with" },
  { value: "exists", label: "Exists" },
  { value: "not_exists", label: "Does not exist" },
];

export default function RegistrationFlow() {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [steps, setSteps] = useState<FlowStep[]>(defaultSteps);
  const [activeStep, setActiveStep] = useState<number>(1);
  
  const [step1Config, setStep1Config] = useState({
    collectFirstName: true,
    collectLastName: true,
    collectEmail: true,
    collectPhone: false,
    collectCompany: false,
    collectJobTitle: false,
    requirePassword: true,
    allowGoogleAuth: false,
  });

  const [validationRules, setValidationRules] = useState<ValidationRule[]>([
    { id: "1", field: "utm_source", operator: "equals", value: "" },
  ]);

  const [step3Config, setStep3Config] = useState({
    enabledPackages: [] as string[],
    allowMultipleSelection: false,
  });

  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<MergedPackage | null>(null);
  const [overridePrice, setOverridePrice] = useState("");
  const [overrideFeatures, setOverrideFeatures] = useState("");
  const { toast } = useToast();

  const [step4Config, setStep4Config] = useState({
    cardholderName: "",
    cardNumber: "",
    expiryDate: "",
    cvc: "",
    acceptTerms: false,
    requirePayment: true,
  });

  const [step5Config, setStep5Config] = useState({
    sendConfirmationEmail: true,
    confirmationEmailTemplateId: "",
    generateQRCode: true,
    showCalendarAdd: true,
    customMessage: "",
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: packages = [], isLoading: packagesLoading } = useQuery<PackageType[]>({
    queryKey: ["/api/packages"],
  });

  const { data: eventPackages = [], isLoading: eventPackagesLoading, refetch: refetchEventPackages } = useQuery<MergedPackage[]>({
    queryKey: ["/api/events", selectedEventId, "packages"],
    enabled: !!selectedEventId,
  });

  const { data: emailTemplates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const upsertEventPackageMutation = useMutation({
    mutationFn: async (data: { packageId: string; priceOverride?: string | null; featuresOverride?: string[] | null; isEnabled?: boolean }) => {
      return apiRequest("PUT", `/api/events/${selectedEventId}/packages/${data.packageId}`, {
        priceOverride: data.priceOverride,
        featuresOverride: data.featuresOverride,
        isEnabled: data.isEnabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "packages"] });
      toast({ title: "Package updated", description: "Event package customization saved." });
      setCustomizeDialogOpen(false);
      setEditingPackage(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update package.", variant: "destructive" });
    },
  });

  const deleteEventPackageMutation = useMutation({
    mutationFn: async (packageId: string) => {
      return apiRequest("DELETE", `/api/events/${selectedEventId}/packages/${packageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "packages"] });
      toast({ title: "Override removed", description: "Package reset to base values." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reset package.", variant: "destructive" });
    },
  });

  const { data: registrationConfig } = useQuery<{
    steps?: Array<{ id: number; title: string; enabled: boolean }>;
    step1Config?: typeof step1Config;
    step2Config?: { rules?: ValidationRule[]; ruleLogic?: 'all' | 'any' };
    step3Config?: typeof step3Config;
    step4Config?: { requirePayment?: boolean };
    step5Config?: typeof step5Config;
  } | null>({
    queryKey: ["/api/events", selectedEventId, "registration-config"],
    enabled: !!selectedEventId,
  });

  const saveRegistrationConfigMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/events/${selectedEventId}/registration-config`, {
        steps: steps.map(s => ({ id: s.id, title: s.title, enabled: s.enabled })),
        step1Config,
        step2Config: { rules: validationRules },
        step3Config,
        step4Config: { requirePayment: step4Config.requirePayment },
        step5Config,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "registration-config"] });
      toast({ title: "Saved", description: "Registration flow configuration saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save registration configuration.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (registrationConfig === null || registrationConfig === undefined) {
      setSteps(defaultSteps);
      setStep1Config({
        collectFirstName: true,
        collectLastName: true,
        collectEmail: true,
        collectPhone: false,
        collectCompany: false,
        collectJobTitle: false,
        requirePassword: true,
        allowGoogleAuth: false,
      });
      setValidationRules([
        { id: "1", field: "utm_source", operator: "equals", value: "" },
      ]);
      setStep3Config({
        enabledPackages: [],
        allowMultipleSelection: false,
      });
      setStep4Config({
        cardholderName: "",
        cardNumber: "",
        expiryDate: "",
        cvc: "",
        acceptTerms: false,
        requirePayment: true,
      });
      setStep5Config({
        sendConfirmationEmail: true,
        confirmationEmailTemplateId: "",
        generateQRCode: true,
        showCalendarAdd: true,
        customMessage: "",
      });
    } else {
      if (registrationConfig.steps) {
        setSteps(prev => prev.map(s => {
          const savedStep = registrationConfig.steps?.find(ss => ss.id === s.id);
          return savedStep ? { ...s, enabled: savedStep.enabled } : s;
        }));
      }
      if (registrationConfig.step1Config) {
        setStep1Config(prev => ({ ...prev, ...registrationConfig.step1Config }));
      }
      if (registrationConfig.step2Config?.rules) {
        setValidationRules(registrationConfig.step2Config.rules);
      }
      if (registrationConfig.step3Config) {
        setStep3Config(prev => ({ ...prev, ...registrationConfig.step3Config }));
      }
      if (registrationConfig.step4Config) {
        setStep4Config(prev => ({ ...prev, requirePayment: registrationConfig.step4Config?.requirePayment ?? true }));
      }
      if (registrationConfig.step5Config) {
        setStep5Config(prev => ({ ...prev, ...registrationConfig.step5Config }));
      }
    }
  }, [registrationConfig, selectedEventId]);

  const openCustomizeDialog = (pkg: MergedPackage) => {
    setEditingPackage(pkg);
    setOverridePrice(pkg.effectivePrice ?? pkg.price ?? "0");
    setOverrideFeatures((pkg.effectiveFeatures ?? pkg.features ?? []).join("\n"));
    setCustomizeDialogOpen(true);
  };

  const handleSaveOverride = () => {
    if (!editingPackage) return;
    const featuresArray = overrideFeatures.split("\n").map(f => f.trim()).filter(Boolean);
    upsertEventPackageMutation.mutate({
      packageId: editingPackage.id,
      priceOverride: overridePrice || null,
      featuresOverride: featuresArray.length > 0 ? featuresArray : null,
      isEnabled: true,
    });
  };

  const handleToggleEventPackage = (pkg: MergedPackage, enabled: boolean) => {
    upsertEventPackageMutation.mutate({
      packageId: pkg.id,
      priceOverride: pkg.hasOverride ? (pkg.effectivePrice ?? undefined) : undefined,
      featuresOverride: pkg.hasOverride ? (pkg.effectiveFeatures ?? undefined) : undefined,
      isEnabled: enabled,
    });
  };

  const togglePackage = (packageId: string) => {
    setStep3Config(prev => ({
      ...prev,
      enabledPackages: prev.enabledPackages.includes(packageId)
        ? prev.enabledPackages.filter(id => id !== packageId)
        : [...prev.enabledPackages, packageId],
    }));
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const handleStepToggle = (stepId: number) => {
    setSteps(steps.map(step => 
      step.id === stepId 
        ? { ...step, enabled: !step.enabled, status: !step.enabled ? "pending" : "disabled" }
        : step
    ));
  };

  const addValidationRule = () => {
    const newRule: ValidationRule = {
      id: Date.now().toString(),
      field: "utm_source",
      operator: "equals",
      value: "",
    };
    setValidationRules([...validationRules, newRule]);
  };

  const removeValidationRule = (id: string) => {
    setValidationRules(validationRules.filter(rule => rule.id !== id));
  };

  const updateValidationRule = (id: string, field: keyof ValidationRule, value: string) => {
    setValidationRules(validationRules.map(rule =>
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };

  const renderStepConfig = () => {
    const step = steps.find(s => s.id === activeStep);
    if (!step || !step.enabled) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          {step ? "This step is disabled" : "Select a step to configure"}
        </div>
      );
    }

    switch (activeStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Profile Fields</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <Label htmlFor="firstName" className="cursor-pointer">First Name</Label>
                  <Switch
                    id="firstName"
                    checked={step1Config.collectFirstName}
                    onCheckedChange={(checked) => setStep1Config({ ...step1Config, collectFirstName: checked })}
                    data-testid="switch-first-name"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <Label htmlFor="lastName" className="cursor-pointer">Last Name</Label>
                  <Switch
                    id="lastName"
                    checked={step1Config.collectLastName}
                    onCheckedChange={(checked) => setStep1Config({ ...step1Config, collectLastName: checked })}
                    data-testid="switch-last-name"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <Label htmlFor="email" className="cursor-pointer">Email</Label>
                  <Switch
                    id="email"
                    checked={step1Config.collectEmail}
                    onCheckedChange={(checked) => setStep1Config({ ...step1Config, collectEmail: checked })}
                    data-testid="switch-email"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <Label htmlFor="phone" className="cursor-pointer">Phone</Label>
                  <Switch
                    id="phone"
                    checked={step1Config.collectPhone}
                    onCheckedChange={(checked) => setStep1Config({ ...step1Config, collectPhone: checked })}
                    data-testid="switch-phone"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <Label htmlFor="company" className="cursor-pointer">Company</Label>
                  <Switch
                    id="company"
                    checked={step1Config.collectCompany}
                    onCheckedChange={(checked) => setStep1Config({ ...step1Config, collectCompany: checked })}
                    data-testid="switch-company"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <Label htmlFor="jobTitle" className="cursor-pointer">Job Title</Label>
                  <Switch
                    id="jobTitle"
                    checked={step1Config.collectJobTitle}
                    onCheckedChange={(checked) => setStep1Config({ ...step1Config, collectJobTitle: checked })}
                    data-testid="switch-job-title"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Authentication Options</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <Label htmlFor="requirePassword" className="cursor-pointer">Require Password</Label>
                    <p className="text-sm text-muted-foreground">Attendees must create a password for their account</p>
                  </div>
                  <Switch
                    id="requirePassword"
                    checked={step1Config.requirePassword}
                    onCheckedChange={(checked) => setStep1Config({ ...step1Config, requirePassword: checked })}
                    data-testid="switch-require-password"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3">
                    <SiGoogle className="h-5 w-5" />
                    <div>
                      <Label htmlFor="googleAuth" className="cursor-pointer">Allow Google Sign-In</Label>
                      <p className="text-sm text-muted-foreground">Let attendees sign in with their Google account</p>
                    </div>
                  </div>
                  <Switch
                    id="googleAuth"
                    checked={step1Config.allowGoogleAuth}
                    onCheckedChange={(checked) => setStep1Config({ ...step1Config, allowGoogleAuth: checked })}
                    data-testid="switch-google-auth"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Validation Rules</h3>
                <p className="text-sm text-muted-foreground">Define rules to control who can proceed with registration</p>
              </div>
              <Button onClick={addValidationRule} size="sm" data-testid="button-add-rule">
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </div>

            <div className="space-y-3">
              {validationRules.map((rule, index) => (
                <div key={rule.id} className="flex items-center gap-3 p-3 border rounded-md">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  
                  <Select
                    value={rule.field}
                    onValueChange={(value) => updateValidationRule(rule.id, "field", value)}
                  >
                    <SelectTrigger className="w-40" data-testid={`select-field-${index}`}>
                      <SelectValue placeholder="Field" />
                    </SelectTrigger>
                    <SelectContent>
                      {validationFields.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={rule.operator}
                    onValueChange={(value) => updateValidationRule(rule.id, "operator", value)}
                  >
                    <SelectTrigger className="w-40" data-testid={`select-operator-${index}`}>
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {validationOperators.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {!["exists", "not_exists"].includes(rule.operator) && (
                    <Input
                      placeholder="Value"
                      value={rule.value}
                      onChange={(e) => updateValidationRule(rule.id, "value", e.target.value)}
                      className="flex-1"
                      data-testid={`input-value-${index}`}
                    />
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeValidationRule(rule.id)}
                    disabled={validationRules.length === 1}
                    data-testid={`button-remove-rule-${index}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Rule Logic</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="all" data-testid="tab-all-rules">All rules must match</TabsTrigger>
                    <TabsTrigger value="any" data-testid="tab-any-rules">Any rule must match</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <Label htmlFor="multipleSelection" className="cursor-pointer">Allow Multiple Package Selection</Label>
                <p className="text-sm text-muted-foreground">Let attendees select more than one package</p>
              </div>
              <Switch
                id="multipleSelection"
                checked={step3Config.allowMultipleSelection}
                onCheckedChange={(checked) => setStep3Config({ ...step3Config, allowMultipleSelection: checked })}
                data-testid="switch-multiple-selection"
              />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Event Packages</h3>
              <p className="text-sm text-muted-foreground mb-4">Configure which packages are available for this event and customize pricing</p>
              
              {eventPackagesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse h-20 bg-muted rounded-md" />
                  ))}
                </div>
              ) : eventPackages.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No packages found"
                  description="Create packages in the Packages section first"
                />
              ) : (
                <div className="space-y-3">
                  {eventPackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="flex items-center justify-between gap-4 p-4 border rounded-md"
                      data-testid={`package-item-${pkg.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{pkg.name}</span>
                          <Badge variant="outline" className="text-xs">
                            ${Number(pkg.effectivePrice || 0).toFixed(2)}
                          </Badge>
                          {pkg.hasOverride && (
                            <Badge variant="secondary" className="text-xs">
                              Customized
                            </Badge>
                          )}
                          {!pkg.isEnabled && (
                            <Badge variant="destructive" className="text-xs">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">{pkg.description}</p>
                        )}
                        {(pkg.effectiveFeatures ?? pkg.features) && (pkg.effectiveFeatures ?? pkg.features)!.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(pkg.effectiveFeatures ?? pkg.features)!.slice(0, 3).map((feature, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {titleCase(feature)}
                              </Badge>
                            ))}
                            {(pkg.effectiveFeatures ?? pkg.features)!.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{(pkg.effectiveFeatures ?? pkg.features)!.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {pkg.hasOverride && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteEventPackageMutation.mutate(pkg.id)}
                            disabled={deleteEventPackageMutation.isPending}
                            title="Reset to base values"
                            data-testid={`button-reset-package-${pkg.id}`}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCustomizeDialog(pkg)}
                          data-testid={`button-customize-package-${pkg.id}`}
                        >
                          <Settings2 className="h-4 w-4 mr-2" />
                          Customize
                        </Button>
                        <Switch
                          checked={pkg.isEnabled}
                          onCheckedChange={(checked) => handleToggleEventPackage(pkg, checked)}
                          data-testid={`switch-package-${pkg.id}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Dialog open={customizeDialogOpen} onOpenChange={setCustomizeDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Customize Package for Event</DialogTitle>
                  <DialogDescription>
                    Override the price and features for "{editingPackage?.name}" for this specific event.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="override-price">Price Override</Label>
                    <Input
                      id="override-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={overridePrice}
                      onChange={(e) => setOverridePrice(e.target.value)}
                      placeholder="Enter price"
                      data-testid="input-override-price"
                    />
                    <p className="text-xs text-muted-foreground">Base price: ${Number(editingPackage?.price || 0).toFixed(2)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="override-features">Features (one per line)</Label>
                    <textarea
                      id="override-features"
                      className="w-full min-h-24 p-3 border rounded-md bg-background resize-none text-sm"
                      value={overrideFeatures}
                      onChange={(e) => setOverrideFeatures(e.target.value)}
                      placeholder="Enter features, one per line"
                      data-testid="textarea-override-features"
                    />
                    <p className="text-xs text-muted-foreground">Base features: {(editingPackage?.features || []).join(", ") || "None"}</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCustomizeDialogOpen(false)} data-testid="button-cancel-override">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveOverride} disabled={upsertEventPackageMutation.isPending} data-testid="button-save-override">
                    {upsertEventPackageMutation.isPending ? "Saving..." : "Save Override"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <Label htmlFor="requirePayment" className="cursor-pointer">Require Payment</Label>
                <p className="text-sm text-muted-foreground">Attendees must complete payment to register</p>
              </div>
              <Switch
                id="requirePayment"
                checked={step4Config.requirePayment}
                onCheckedChange={(checked) => setStep4Config({ ...step4Config, requirePayment: checked })}
                data-testid="switch-require-payment"
              />
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Payment Form Preview</h3>
              <p className="text-sm text-muted-foreground mb-4">This is how the payment form will appear to attendees</p>
              
              <Card className="max-w-md">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Details
                  </CardTitle>
                  <CardDescription>Enter your card information securely</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardholderName">Cardholder Name</Label>
                    <Input
                      id="cardholderName"
                      placeholder="John Doe"
                      value={step4Config.cardholderName}
                      onChange={(e) => setStep4Config({ ...step4Config, cardholderName: e.target.value })}
                      data-testid="input-cardholder-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={step4Config.cardNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                        const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                        setStep4Config({ ...step4Config, cardNumber: formatted });
                      }}
                      data-testid="input-card-number"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        placeholder="MM/YY"
                        value={step4Config.expiryDate}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          if (value.length >= 2) {
                            value = value.slice(0, 2) + '/' + value.slice(2);
                          }
                          setStep4Config({ ...step4Config, expiryDate: value });
                        }}
                        data-testid="input-expiry-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvc">CVC</Label>
                      <Input
                        id="cvc"
                        placeholder="123"
                        value={step4Config.cvc}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setStep4Config({ ...step4Config, cvc: value });
                        }}
                        data-testid="input-cvc"
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="acceptTerms"
                      checked={step4Config.acceptTerms}
                      onChange={(e) => setStep4Config({ ...step4Config, acceptTerms: e.target.checked })}
                      className="mt-1"
                      data-testid="checkbox-accept-terms"
                    />
                    <Label htmlFor="acceptTerms" className="text-sm cursor-pointer">
                      I agree to the <span className="text-primary underline">Terms and Conditions</span> and <span className="text-primary underline">Privacy Policy</span>
                    </Label>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!step4Config.acceptTerms}
                    data-testid="button-submit-payment"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Now
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Payment Processing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Stripe integration will be configured here to securely process credit card payments. 
                  Connect your Stripe account to enable live payment processing.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Confirmation Options</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <Label htmlFor="confirmEmail" className="cursor-pointer">Send Confirmation Email</Label>
                    <p className="text-sm text-muted-foreground">Automatically send a confirmation email upon registration</p>
                  </div>
                  <Switch
                    id="confirmEmail"
                    checked={step5Config.sendConfirmationEmail}
                    onCheckedChange={(checked) => setStep5Config({ ...step5Config, sendConfirmationEmail: checked })}
                    data-testid="switch-confirm-email"
                  />
                </div>
                {step5Config.sendConfirmationEmail && (
                  <div className="p-3 border rounded-md space-y-2">
                    <Label htmlFor="emailTemplate">Confirmation Email Template</Label>
                    <Select
                      value={step5Config.confirmationEmailTemplateId}
                      onValueChange={(value) => setStep5Config({ ...step5Config, confirmationEmailTemplateId: value })}
                    >
                      <SelectTrigger id="emailTemplate" data-testid="select-confirmation-email-template">
                        <SelectValue placeholder="Select an email template" />
                      </SelectTrigger>
                      <SelectContent>
                        {emailTemplates.length === 0 ? (
                          <SelectItem value="none" disabled>No templates available</SelectItem>
                        ) : (
                          emailTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Choose which email template to use for registration confirmations. 
                      Create templates in the Email Templates page.
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <Label htmlFor="qrCode" className="cursor-pointer">Generate QR Code</Label>
                    <p className="text-sm text-muted-foreground">Create a unique QR code for check-in</p>
                  </div>
                  <Switch
                    id="qrCode"
                    checked={step5Config.generateQRCode}
                    onCheckedChange={(checked) => setStep5Config({ ...step5Config, generateQRCode: checked })}
                    data-testid="switch-qr-code"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <Label htmlFor="calendarAdd" className="cursor-pointer">Show Calendar Add Button</Label>
                    <p className="text-sm text-muted-foreground">Allow attendees to add event to their calendar</p>
                  </div>
                  <Switch
                    id="calendarAdd"
                    checked={step5Config.showCalendarAdd}
                    onCheckedChange={(checked) => setStep5Config({ ...step5Config, showCalendarAdd: checked })}
                    data-testid="switch-calendar-add"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="customMessage">Custom Confirmation Message</Label>
              <textarea
                id="customMessage"
                className="mt-2 w-full min-h-24 p-3 border rounded-md bg-background resize-none"
                placeholder="Enter a custom message to display on the confirmation page..."
                value={step5Config.customMessage}
                onChange={(e) => setStep5Config({ ...step5Config, customMessage: e.target.value })}
                data-testid="textarea-custom-message"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!selectedEventId) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title="Registration Flow"
          breadcrumbs={[{ label: "Events" }, { label: "Registration" }]}
        />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Select an Event</CardTitle>
                <CardDescription>
                  Choose an event to configure its registration flow
                </CardDescription>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="animate-pulse h-10 bg-muted rounded-md" />
                ) : events.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="No events found"
                    description="Create an event first before configuring registration"
                  />
                ) : (
                  <Select onValueChange={setSelectedEventId}>
                    <SelectTrigger data-testid="select-event">
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Registration Flow"
        breadcrumbs={[{ label: "Events" }, { label: "Registration" }]}
        actions={
          <div className="flex items-center gap-3">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-48" data-testid="select-event-header">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => saveRegistrationConfigMutation.mutate()}
              disabled={saveRegistrationConfigMutation.isPending}
              data-testid="button-save-flow"
            >
              {saveRegistrationConfigMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Registration Steps</CardTitle>
                  <CardDescription>Configure each step of your registration flow</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {steps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                          activeStep === step.id ? "bg-accent" : "hover-elevate"
                        }`}
                        onClick={() => setActiveStep(step.id)}
                        data-testid={`step-item-${step.id}`}
                      >
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                          step.enabled 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${!step.enabled ? "text-muted-foreground" : ""}`}>
                              {step.title}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{step.description}</p>
                        </div>
                        <Switch
                          checked={step.enabled}
                          onCheckedChange={() => handleStepToggle(step.id)}
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`switch-step-${step.id}`}
                        />
                        <ChevronRight className={`h-4 w-4 text-muted-foreground ${activeStep === step.id ? "opacity-100" : "opacity-0"}`} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="col-span-8">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const step = steps.find(s => s.id === activeStep);
                      if (step) {
                        const Icon = step.icon;
                        return <Icon className="h-5 w-5" />;
                      }
                      return null;
                    })()}
                    <div>
                      <CardTitle className="text-base">
                        {steps.find(s => s.id === activeStep)?.title || "Step Configuration"}
                      </CardTitle>
                      <CardDescription>
                        {steps.find(s => s.id === activeStep)?.description || "Configure this step"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderStepConfig()}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
