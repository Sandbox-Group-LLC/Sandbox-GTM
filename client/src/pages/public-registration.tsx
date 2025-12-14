import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Calendar, MapPin, CheckCircle, AlertCircle, ArrowLeft, ArrowRight, Tag, Check, Loader2 } from "lucide-react";
import type { Event, Attendee, EventPage, EventPageTheme, CustomField, Package } from "@shared/schema";

interface PackageWithEffectivePrice extends Package {
  effectivePrice: string;
  effectiveFeatures: string[] | null;
}

interface ValidatedInviteCode {
  id: string;
  code: string;
  discountType: string | null;
  discountValue: string | null;
  packageId: string | null;
  attendeeTypeId: string | null;
}

const calculateDiscount = (price: number, discountType: string | null, discountValue: string | null): number => {
  if (!discountType || !discountValue) return price;
  const discountNum = parseFloat(discountValue);
  if (isNaN(discountNum)) return price;
  if (discountType === "percentage") {
    const cappedPercent = Math.min(100, Math.max(0, discountNum));
    return price * (1 - cappedPercent / 100);
  }
  if (discountType === "fixed") return Math.max(0, price - discountNum);
  return price;
};

const formatPrice = (price: string | number | null) => {
  const numPrice = Number(price) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numPrice);
};

function GoogleFontsLoader({ fonts }: { fonts: string[] }) {
  const uniqueFonts = useMemo(() => [...new Set(fonts.filter(Boolean))], [fonts]);
  
  if (uniqueFonts.length === 0) return null;
  
  const fontsParam = uniqueFonts
    .map(font => `family=${font.replace(/ /g, "+")}:wght@400;500;600;700`)
    .join("&");
  
  return (
    <link
      rel="stylesheet"
      href={`https://fonts.googleapis.com/css2?${fontsParam}&display=swap`}
    />
  );
}

function getThemeStyles(theme: EventPageTheme | null | undefined): React.CSSProperties {
  if (!theme) return {};
  
  const borderRadiusMap: Record<string, string> = {
    none: "0px",
    small: "4px",
    medium: "8px",
    large: "16px",
    pill: "9999px",
  };
  
  const containerWidthMap: Record<string, string> = {
    narrow: "768px",
    standard: "1024px",
    wide: "1280px",
  };
  
  const sectionSpacingMap: Record<string, string> = {
    compact: "2rem",
    normal: "3rem",
    relaxed: "5rem",
  };
  
  return {
    "--theme-primary-color": theme.primaryColor || "#3b82f6",
    "--theme-secondary-color": theme.secondaryColor || "#64748b",
    "--theme-background-color": theme.backgroundColor || "#ffffff",
    "--theme-text-color": theme.textColor || "#1f2937",
    "--theme-text-secondary-color": theme.textSecondaryColor || "#6b7280",
    "--theme-button-color": theme.buttonColor || "#3b82f6",
    "--theme-button-text-color": theme.buttonTextColor || "#ffffff",
    "--theme-card-background": theme.cardBackground || "#f9fafb",
    "--theme-border-radius": borderRadiusMap[theme.borderRadius || "medium"],
    "--theme-container-width": containerWidthMap[theme.containerWidth || "standard"],
    "--theme-section-spacing": sectionSpacingMap[theme.sectionSpacing || "normal"],
    "--theme-heading-font": theme.headingFont || "Inter",
    "--theme-body-font": theme.bodyFont || "Inter",
  } as React.CSSProperties;
}

interface Section {
  id: string;
  type: string;
  order: number;
  config: Record<string, unknown>;
}

interface PublicRegistrationData {
  event: Event;
  registrationPage: EventPage | null;
  landingTheme?: EventPageTheme | null;
}

const baseRegistrationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  inviteCode: z.string().optional(),
});

function buildDynamicSchema(customFields: CustomField[]) {
  const customDataShape: Record<string, z.ZodTypeAny> = {};
  
  customFields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;
    
    switch (field.fieldType) {
      case "checkbox":
        fieldSchema = z.boolean();
        break;
      case "number":
        fieldSchema = field.required 
          ? z.string().min(1, `${field.label} is required`)
          : z.string().optional();
        break;
      case "select":
        fieldSchema = field.required 
          ? z.string().min(1, `${field.label} is required`)
          : z.string().optional();
        break;
      default:
        fieldSchema = field.required 
          ? z.string().min(1, `${field.label} is required`)
          : z.string().optional();
    }
    
    customDataShape[field.name] = fieldSchema;
  });
  
  return baseRegistrationSchema.extend({
    customData: z.object(customDataShape).optional(),
  });
}

type RegistrationFormData = z.infer<typeof baseRegistrationSchema> & {
  customData?: Record<string, string | boolean>;
};

export default function PublicRegistration() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredAttendee, setRegisteredAttendee] = useState<Attendee | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [validatedCode, setValidatedCode] = useState<ValidatedInviteCode | null>(null);
  const [unlockedPackage, setUnlockedPackage] = useState<PackageWithEffectivePrice | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  const { data, isLoading, error } = useQuery<PublicRegistrationData>({
    queryKey: ["/api/public/event", slug, "registration"],
    queryFn: async () => {
      const res = await fetch(`/api/public/event/${slug}/registration`);
      if (!res.ok) throw new Error("Failed to fetch registration page");
      return res.json();
    },
    enabled: !!slug,
  });

  const { data: customFields = [] } = useQuery<CustomField[]>({
    queryKey: ["/api/public/custom-fields", slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/custom-fields/${slug}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!slug,
  });

  const { data: publicPackages = [] } = useQuery<PackageWithEffectivePrice[]>({
    queryKey: ["/api/public/event", slug, "packages"],
    queryFn: async () => {
      const res = await fetch(`/api/public/event/${slug}/packages`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!slug,
  });

  const availablePackages = useMemo(() => {
    const packages = [...publicPackages];
    if (unlockedPackage && !packages.find(p => p.id === unlockedPackage.id)) {
      packages.push(unlockedPackage);
    }
    return packages;
  }, [publicPackages, unlockedPackage]);

  const validateInviteCode = async () => {
    if (!inviteCodeInput.trim()) return;
    setIsValidatingCode(true);
    try {
      const res = await fetch(`/api/public/validate-invite-code/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCodeInput.trim() }),
      });
      const result = await res.json();
      if (result.valid) {
        setValidatedCode(result.inviteCode);
        setUnlockedPackage(result.unlockedPackage);
        form.setValue("inviteCode", inviteCodeInput.trim());
        toast({ title: "Invite code applied!", description: result.unlockedPackage ? "Package unlocked" : "Code validated" });
        if (result.unlockedPackage && !selectedPackageId) {
          setSelectedPackageId(result.unlockedPackage.id);
        }
      } else {
        toast({ title: "Invalid code", description: result.message || "Please check the code and try again", variant: "destructive" });
        setValidatedCode(null);
        setUnlockedPackage(null);
      }
    } catch {
      toast({ title: "Error", description: "Failed to validate code", variant: "destructive" });
    } finally {
      setIsValidatingCode(false);
    }
  };

  const sortedCustomFields = useMemo(() => {
    return [...customFields].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [customFields]);

  const dynamicSchema = useMemo(() => {
    return buildDynamicSchema(customFields);
  }, [customFields]);

  const defaultCustomData = useMemo(() => {
    const data: Record<string, string | boolean> = {};
    customFields.forEach((field) => {
      if (field.fieldType === "checkbox") {
        data[field.name] = false;
      } else {
        data[field.name] = "";
      }
    });
    return data;
  }, [customFields]);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      jobTitle: "",
      inviteCode: "",
      customData: defaultCustomData,
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (formData: RegistrationFormData) => {
      const res = await apiRequest("POST", `/api/public/register/${slug}`, {
        ...formData,
        packageId: selectedPackageId,
        inviteCodeId: validatedCode?.id || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setRegistrationComplete(true);
      setRegisteredAttendee(data.attendee);
      toast({ title: "Registration successful!", description: "You have been registered for the event." });
    },
    onError: () => {
      toast({ title: "Registration failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const onSubmit = (formData: RegistrationFormData) => {
    registerMutation.mutate(formData);
  };

  const getPackagePrice = (pkg: PackageWithEffectivePrice) => {
    const basePrice = Number(pkg.effectivePrice) || 0;
    if (validatedCode?.discountType && validatedCode?.discountValue) {
      return calculateDiscount(basePrice, validatedCode.discountType, validatedCode.discountValue);
    }
    return basePrice;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Registration Not Available</h2>
            <p className="text-muted-foreground mb-4">This event doesn't exist or registration is not available.</p>
            <Button variant="outline" asChild>
              <Link href={`/event/${slug}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Event
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { event, registrationPage, landingTheme } = data;
  const sections = (registrationPage?.sections as Section[]) || [];
  const theme = registrationPage?.theme || landingTheme;
  const themeStyles = getThemeStyles(theme);
  const fontsToLoad = [theme?.headingFont, theme?.bodyFont].filter(Boolean) as string[];

  if (registrationComplete && registeredAttendee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Registration Complete!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for registering for {event.name}
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-2">Your Check-In Code</p>
              <p className="text-3xl font-mono font-bold tracking-wider" data-testid="text-checkin-code">
                {registeredAttendee.checkInCode}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Save this code for check-in on event day</p>
            </div>

            <div className="text-left space-y-2 text-sm mb-6">
              <p><strong>Name:</strong> {registeredAttendee.firstName} {registeredAttendee.lastName}</p>
              <p><strong>Email:</strong> {registeredAttendee.email}</p>
              {registeredAttendee.company && <p><strong>Company:</strong> {registeredAttendee.company}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href={`/event/${slug}/portal`}>
                  Go to Attendee Portal
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/event/${slug}`}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Event
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <GoogleFontsLoader fonts={fontsToLoad} />
      <div 
        className="min-h-screen bg-background"
        style={{
          ...themeStyles,
          backgroundColor: theme?.backgroundColor || undefined,
          color: theme?.textColor || undefined,
          fontFamily: theme?.bodyFont ? `"${theme.bodyFont}", sans-serif` : undefined,
        }}
      >
        <div 
          className="py-8 px-6"
          style={{
            background: theme?.primaryColor 
              ? `linear-gradient(to bottom, ${theme.primaryColor}1a, transparent)` 
              : undefined,
          }}
        >
          <div className="max-w-2xl mx-auto">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href={`/event/${slug}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Event
              </Link>
            </Button>
            
            <Badge variant="secondary" className="mb-4">Registration</Badge>
            <h1 
              className="text-3xl font-bold mb-2" 
              data-testid="text-event-name"
              style={{ 
                fontFamily: theme?.headingFont ? `"${theme.headingFont}", sans-serif` : undefined,
                color: theme?.textColor || undefined,
              }}
            >
              {event.name}
            </h1>
            
            <div className="flex flex-wrap gap-4 text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {sections.length > 0 && (
          <div className="mb-8 space-y-6">
            {sections
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <SectionRenderer key={section.id} section={section} event={event} slug={slug || ""} theme={theme} />
              ))}
          </div>
        )}

        <Card style={{
          backgroundColor: theme?.cardBackground || undefined,
          borderRadius: theme?.borderRadius ? ({ none: "0px", small: "4px", medium: "8px", large: "16px", pill: "9999px" }[theme.borderRadius]) : undefined,
        }}>
          <CardHeader>
            <CardTitle style={{ fontFamily: theme?.headingFont ? `"${theme.headingFont}", sans-serif` : undefined }}>Complete Your Registration</CardTitle>
            <CardDescription>
              {event.registrationOpen
                ? "Fill out the form below to register for this event"
                : "Registration is currently closed"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {event.registrationOpen ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input data-testid="input-first-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input data-testid="input-last-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" data-testid="input-email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (optional)</FormLabel>
                        <FormControl>
                          <Input data-testid="input-phone" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company (optional)</FormLabel>
                        <FormControl>
                          <Input data-testid="input-company" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title (optional)</FormLabel>
                        <FormControl>
                          <Input data-testid="input-job-title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>Invite Code (optional)</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter invite code"
                        value={inviteCodeInput}
                        onChange={(e) => setInviteCodeInput(e.target.value)}
                        disabled={!!validatedCode}
                        data-testid="input-invite-code"
                      />
                      <Button
                        type="button"
                        variant={validatedCode ? "secondary" : "outline"}
                        onClick={validateInviteCode}
                        disabled={!inviteCodeInput.trim() || isValidatingCode || !!validatedCode}
                        data-testid="button-validate-code"
                      >
                        {isValidatingCode ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : validatedCode ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          "Apply"
                        )}
                      </Button>
                    </div>
                    {validatedCode && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        <span>Code applied{validatedCode.discountType && ` - ${validatedCode.discountType === "percentage" ? `${validatedCode.discountValue}% off` : `${formatPrice(validatedCode.discountValue)} off`}`}</span>
                      </div>
                    )}
                  </div>

                  {availablePackages.length > 0 && (
                    <div className="space-y-2">
                      <FormLabel>Select Package</FormLabel>
                      <div className="grid gap-3">
                        {availablePackages.map((pkg) => {
                          const originalPrice = Number(pkg.effectivePrice) || 0;
                          const discountedPrice = getPackagePrice(pkg);
                          const hasDiscount = discountedPrice < originalPrice;
                          const isSelected = selectedPackageId === pkg.id;
                          
                          return (
                            <div
                              key={pkg.id}
                              className={`p-4 border rounded-md cursor-pointer transition-colors ${
                                isSelected ? "border-2 border-primary bg-primary/5" : "hover:bg-muted/50"
                              }`}
                              onClick={() => setSelectedPackageId(pkg.id)}
                              data-testid={`package-option-${pkg.id}`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{pkg.name}</span>
                                    {unlockedPackage?.id === pkg.id && (
                                      <Badge variant="secondary" className="text-xs">
                                        <Tag className="h-3 w-3 mr-1" />
                                        Unlocked
                                      </Badge>
                                    )}
                                  </div>
                                  {pkg.description && (
                                    <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                                  )}
                                  {pkg.effectiveFeatures && pkg.effectiveFeatures.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {pkg.effectiveFeatures.slice(0, 3).map((feature, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">{feature}</Badge>
                                      ))}
                                      {pkg.effectiveFeatures.length > 3 && (
                                        <Badge variant="outline" className="text-xs">+{pkg.effectiveFeatures.length - 3} more</Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  {hasDiscount ? (
                                    <>
                                      <span className="text-lg font-bold">{formatPrice(discountedPrice)}</span>
                                      <span className="text-sm text-muted-foreground line-through ml-2">{formatPrice(originalPrice)}</span>
                                    </>
                                  ) : (
                                    <span className="text-lg font-bold">{formatPrice(originalPrice)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {sortedCustomFields.length > 0 && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-sm font-medium text-muted-foreground">Additional Information</h3>
                      {sortedCustomFields.map((customField) => (
                        <CustomFieldRenderer
                          key={customField.id}
                          customField={customField}
                          control={form.control}
                        />
                      ))}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                    style={{
                      backgroundColor: theme?.buttonStyle === "outline" ? "transparent" : (theme?.buttonColor || undefined),
                      color: theme?.buttonStyle === "outline" ? (theme?.buttonColor || undefined) : (theme?.buttonTextColor || undefined),
                      border: theme?.buttonStyle === "outline" ? `2px solid ${theme?.buttonColor || "#3b82f6"}` : undefined,
                      borderRadius: theme?.borderRadius ? ({ none: "0px", small: "4px", medium: "8px", large: "16px", pill: "9999px" }[theme.borderRadius]) : undefined,
                    }}
                  >
                    {registerMutation.isPending ? "Registering..." : "Complete Registration"}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Registration is not available at this time.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  );
}

function SectionRenderer({ section, event, slug, theme }: { section: Section; event: Event; slug: string; theme?: EventPageTheme | null }) {
  const config = section.config;
  const title = String(config.title || "");
  const subtitle = String(config.subtitle || "");
  const buttonText = String(config.buttonText || "");
  const buttonLink = String(config.buttonLink || "");
  const heading = String(config.heading || "");
  const content = String(config.content || "");
  const description = String(config.description || "");

  const borderRadiusMap: Record<string, string> = {
    none: "0px", small: "4px", medium: "8px", large: "16px", pill: "9999px",
  };
  const themeRadius = borderRadiusMap[theme?.borderRadius || "medium"];
  const isOutlineButton = theme?.buttonStyle === "outline";

  const buttonStyles: React.CSSProperties = isOutlineButton 
    ? {
        backgroundColor: "transparent",
        color: theme?.buttonColor || "#3b82f6",
        border: `2px solid ${theme?.buttonColor || "#3b82f6"}`,
        borderRadius: themeRadius,
      }
    : {
        backgroundColor: theme?.buttonColor || undefined,
        color: theme?.buttonTextColor || undefined,
        borderRadius: themeRadius,
      };

  const cardStyles: React.CSSProperties = {
    backgroundColor: theme?.cardBackground || undefined,
    borderRadius: themeRadius,
  };

  const headingStyles: React.CSSProperties = {
    fontFamily: theme?.headingFont ? `"${theme.headingFont}", sans-serif` : undefined,
    color: theme?.textColor || undefined,
  };

  const secondaryTextStyles: React.CSSProperties = {
    color: theme?.textSecondaryColor || undefined,
  };

  const renderButton = (text: string, link: string, testId: string) => {
    if (!text) return null;
    const isExternal = link.startsWith("http");
    const isAnchor = link.startsWith("#");
    
    if (link && (isExternal || isAnchor)) {
      return (
        <Button size="lg" asChild data-testid={testId} style={buttonStyles}>
          <a href={link} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined}>
            {text}
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      );
    }
    
    return (
      <Button size="lg" onClick={() => link && (window.location.href = link)} data-testid={testId} style={buttonStyles}>
        {text}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    );
  };

  switch (section.type) {
    case "hero":
      return (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-8 text-center" style={{ borderRadius: themeRadius }} data-testid={`section-hero-${section.id}`}>
          <h2 className="text-3xl font-bold mb-4" style={headingStyles}>{title || event.name}</h2>
          {subtitle && (
            <p className="text-lg mb-6" style={secondaryTextStyles}>{subtitle}</p>
          )}
          {renderButton(buttonText, buttonLink, "button-hero-cta")}
        </div>
      );

    case "text":
      return (
        <div className="prose dark:prose-invert max-w-none" data-testid={`section-text-${section.id}`}>
          {heading && <h3 className="text-2xl font-semibold mb-4" style={headingStyles}>{heading}</h3>}
          {content && <p style={secondaryTextStyles}>{content}</p>}
        </div>
      );

    case "cta":
      return (
        <Card className="bg-primary/5 border-primary/20" style={cardStyles} data-testid={`section-cta-${section.id}`}>
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-2" style={headingStyles}>{heading || "Ready to Join?"}</h3>
            {description && (
              <p className="mb-6" style={secondaryTextStyles}>{description}</p>
            )}
            {renderButton(buttonText || "Get Started", buttonLink, "button-cta-action")}
          </CardContent>
        </Card>
      );

    case "features":
      const features = (config.features as Array<{ title: string; description: string }>) || [];
      return (
        <div data-testid={`section-features-${section.id}`}>
          {heading && (
            <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>
          )}
          {features.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, idx) => (
                <Card key={idx} style={cardStyles}>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2" style={headingStyles}>{feature.title}</h4>
                    <p className="text-sm" style={secondaryTextStyles}>{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      );

    default:
      return null;
  }
}

function CustomFieldRenderer({ customField, control }: { customField: CustomField; control: any }) {
  const fieldName = `customData.${customField.name}` as const;
  const labelText = customField.required ? customField.label : `${customField.label} (optional)`;

  switch (customField.fieldType) {
    case "text":
      return (
        <FormField
          control={control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{labelText}</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  value={field.value as string || ""}
                  data-testid={`input-custom-${customField.name}`} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "textarea":
      return (
        <FormField
          control={control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{labelText}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  value={field.value as string || ""}
                  data-testid={`textarea-custom-${customField.name}`} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "number":
      return (
        <FormField
          control={control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{labelText}</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  value={field.value as string || ""}
                  data-testid={`input-custom-${customField.name}`} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "select":
      const options = customField.options || [];
      return (
        <FormField
          control={control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{labelText}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value as string || ""}>
                <FormControl>
                  <SelectTrigger data-testid={`select-custom-${customField.name}`}>
                    <SelectValue placeholder={`Select ${customField.label.toLowerCase()}`} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "checkbox":
      return (
        <FormField
          control={control}
          name={fieldName}
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value as boolean || false}
                  onCheckedChange={field.onChange}
                  data-testid={`checkbox-custom-${customField.name}`}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="cursor-pointer">{customField.label}</FormLabel>
              </div>
            </FormItem>
          )}
        />
      );

    default:
      return (
        <FormField
          control={control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{labelText}</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  value={field.value as string || ""}
                  data-testid={`input-custom-${customField.name}`} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
  }
}
