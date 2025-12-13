import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { SiGoogle } from "react-icons/si";
import type { Event, Package as PackageType } from "@shared/schema";

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
    status: "disabled",
    enabled: false,
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

  const [step5Config, setStep5Config] = useState({
    sendConfirmationEmail: true,
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
              <h3 className="text-lg font-medium mb-4">Available Packages</h3>
              <p className="text-sm text-muted-foreground mb-4">Enable which packages are available for registration</p>
              
              {packagesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse h-16 bg-muted rounded-md" />
                  ))}
                </div>
              ) : packages.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No packages found"
                  description="Create packages first before configuring registration"
                />
              ) : (
                <div className="space-y-3">
                  {packages.filter(pkg => pkg.isActive).map((pkg) => (
                    <div
                      key={pkg.id}
                      className="flex items-center justify-between p-4 border rounded-md"
                      data-testid={`package-item-${pkg.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pkg.name}</span>
                          <Badge variant="outline" className="text-xs">
                            ${Number(pkg.price || 0).toFixed(2)}
                          </Badge>
                        </div>
                        {pkg.description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">{pkg.description}</p>
                        )}
                        {pkg.features && pkg.features.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pkg.features.slice(0, 3).map((feature, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                            {pkg.features.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{pkg.features.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Switch
                        checked={step3Config.enabledPackages.includes(pkg.id)}
                        onCheckedChange={() => togglePackage(pkg.id)}
                        data-testid={`switch-package-${pkg.id}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-muted-foreground mb-4">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium text-lg">Coming Soon</h3>
              <p className="text-sm">This step will be available in a future update</p>
            </div>
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
            <Button data-testid="button-save-flow">
              Save Changes
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
                            {step.id === 4 ? (
                              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{step.description}</p>
                        </div>
                        <Switch
                          checked={step.enabled}
                          onCheckedChange={() => handleStepToggle(step.id)}
                          disabled={step.id === 4}
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
