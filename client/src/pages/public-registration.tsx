import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { titleCase } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemedButton } from "@/components/themed-button";
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
import { Calendar, MapPin, CheckCircle, AlertCircle, ArrowLeft, ArrowRight, Tag, Check, Loader2, CreditCard, Hotel, ExternalLink, Eye } from "lucide-react";
import type { Event, Attendee, EventPage, EventPageTheme, CustomField, Package } from "@shared/schema";
import { 
  DEFAULT_BUTTON_COLOR, 
  DEFAULT_BUTTON_TEXT_COLOR, 
  DEFAULT_TEXT_COLOR, 
  DEFAULT_TEXT_SECONDARY_COLOR, 
  DEFAULT_CARD_BACKGROUND, 
  DEFAULT_BACKGROUND_COLOR, 
  DEFAULT_HEADING_FONT, 
  DEFAULT_BODY_FONT,
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  DEFAULT_BORDER_COLOR
} from "./public-event";

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
  forcePackage: boolean | null;
  cfpSubmissionId: number | null;
}

interface SubmissionData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  submissionTitle: string;
}

interface PaymentConfig {
  paymentEnabled: boolean;
  stripePublishableKey: string | null;
}

interface PaymentIntentResponse {
  paymentRequired: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  finalPrice?: number;
}

interface HousingInfo {
  housingEnabled: boolean;
  bookingUrl?: string | null;
  passkeyEventName?: string | null;
}

export interface SectionStyles {
  backgroundColor?: string;
  textColor?: string;
  headingColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  gridJustify?: 'start' | 'center';
  paddingTop?: 'none' | 'small' | 'medium' | 'large';
  paddingBottom?: 'none' | 'small' | 'medium' | 'large';
  customClass?: string;
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  visibilityCondition?: VisibilityCondition;
}

interface SingleCondition {
  property: 'attendeeType' | 'registrationStatus' | 'ticketType' | 'checkedIn' | 'company' | 'jobTitle';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
  value: string;
}

interface VisibilityCondition {
  enabled: boolean;
  logic: 'and' | 'or';
  conditions: SingleCondition[];
}

interface SpoofAttendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  attendeeType?: string;
  registrationStatus?: string;
  ticketType?: string;
  checkedIn?: boolean;
  company?: string;
  jobTitle?: string;
}

function evaluateSingleCondition(
  condition: SingleCondition,
  attendee: SpoofAttendee
): boolean {
  const propertyValue = (() => {
    switch (condition.property) {
      case 'attendeeType': return attendee.attendeeType || '';
      case 'registrationStatus': return attendee.registrationStatus || '';
      case 'ticketType': return attendee.ticketType || '';
      case 'checkedIn': return attendee.checkedIn ? 'true' : 'false';
      case 'company': return attendee.company || '';
      case 'jobTitle': return attendee.jobTitle || '';
      default: return '';
    }
  })();

  const conditionValue = condition.value || '';

  if ((condition.operator === 'contains' || condition.operator === 'not_contains') && !conditionValue.trim()) {
    return true;
  }

  switch (condition.operator) {
    case 'equals':
      return propertyValue.toLowerCase() === conditionValue.toLowerCase();
    case 'not_equals':
      return propertyValue.toLowerCase() !== conditionValue.toLowerCase();
    case 'contains':
      return propertyValue.toLowerCase().includes(conditionValue.toLowerCase());
    case 'not_contains':
      return !propertyValue.toLowerCase().includes(conditionValue.toLowerCase());
    case 'is_empty':
      return !propertyValue || propertyValue.trim() === '';
    case 'is_not_empty':
      return !!propertyValue && propertyValue.trim() !== '';
    default: return true;
  }
}

function checkVisibilityCondition(
  condition: VisibilityCondition | { enabled: boolean; property?: string; operator?: string; value?: string } | undefined,
  attendee: SpoofAttendee | null | undefined
): boolean {
  if (!condition?.enabled) return true;
  if (!attendee) return true;
  
  let conditions: SingleCondition[] = [];
  let logic: 'and' | 'or' = 'and';
  
  if ('conditions' in condition && Array.isArray(condition.conditions)) {
    conditions = condition.conditions;
    logic = condition.logic || 'and';
  } else if ('property' in condition && condition.property) {
    conditions = [{
      property: condition.property as SingleCondition['property'],
      operator: (condition.operator || 'equals') as SingleCondition['operator'],
      value: condition.value || ''
    }];
  }
  
  if (conditions.length === 0) return true;
  
  if (logic === 'and') {
    return conditions.every(c => evaluateSingleCondition(c, attendee));
  } else {
    return conditions.some(c => evaluateSingleCondition(c, attendee));
  }
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
  const uniqueFonts = useMemo(() => Array.from(new Set(fonts.filter(Boolean))), [fonts]);
  
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

function CustomFontsLoader({ slug }: { slug: string }) {
  if (!slug) return null;
  
  return (
    <link
      rel="stylesheet"
      href={`/api/public/events/${slug}/fonts.css`}
    />
  );
}

function GoogleAnalyticsLoader({ googleTagId }: { googleTagId?: string }) {
  useEffect(() => {
    if (!googleTagId) return;
    
    // Validate Google Tag ID format (GA4: G-XXXXXXXXXX, UA: UA-XXXXX-X)
    const ga4Pattern = /^G-[A-Z0-9]{10,}$/i;
    const uaPattern = /^UA-\d+-\d+$/;
    if (!ga4Pattern.test(googleTagId) && !uaPattern.test(googleTagId)) {
      console.warn('Invalid Google Analytics Measurement ID format');
      return;
    }
    
    // Prevent duplicate scripts
    const existingScript = document.querySelector(`script[data-ga-id="${googleTagId}"]`);
    if (existingScript) return;
    
    // Add Google Analytics script
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleTagId)}`;
    script1.setAttribute('data-ga-id', googleTagId);
    document.head.appendChild(script1);

    // Initialize gtag using safe JavaScript API (no string interpolation)
    const script2 = document.createElement('script');
    script2.setAttribute('data-ga-init', googleTagId);
    const safeTagId = JSON.stringify(googleTagId);
    script2.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', ${safeTagId});
    `;
    document.head.appendChild(script2);
    
    return () => {
      script1.remove();
      script2.remove();
    };
  }, [googleTagId]);
  
  return null;
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
    full: "100%",
  };
  
  const sectionSpacingMap: Record<string, string> = {
    compact: "2rem",
    normal: "3rem",
    relaxed: "5rem",
  };
  
  return {
    "--theme-primary-color": theme.primaryColor || DEFAULT_PRIMARY_COLOR,
    "--theme-secondary-color": theme.secondaryColor || DEFAULT_SECONDARY_COLOR,
    "--theme-background-color": theme.backgroundColor || DEFAULT_BACKGROUND_COLOR,
    "--theme-text-color": theme.textColor || DEFAULT_TEXT_COLOR,
    "--theme-text-secondary-color": theme.textSecondaryColor || DEFAULT_TEXT_SECONDARY_COLOR,
    "--theme-button-color": theme.buttonColor || DEFAULT_BUTTON_COLOR,
    "--theme-button-text-color": theme.buttonTextColor || DEFAULT_BUTTON_TEXT_COLOR,
    "--theme-card-background": theme.cardBackground || DEFAULT_CARD_BACKGROUND,
    "--theme-border-radius": borderRadiusMap[theme.borderRadius || "medium"],
    "--theme-container-width": containerWidthMap[theme.containerWidth || "standard"],
    "--theme-section-spacing": sectionSpacingMap[theme.sectionSpacing || "normal"],
    "--theme-heading-font": theme.headingFont || DEFAULT_HEADING_FONT,
    "--theme-body-font": theme.bodyFont || DEFAULT_BODY_FONT,
  } as React.CSSProperties;
}

interface Section {
  id: string;
  type: string;
  order: number;
  config: Record<string, unknown>;
  styles?: SectionStyles;
}

interface Step1Config {
  collectFirstName?: boolean;
  collectLastName?: boolean;
  collectEmail?: boolean;
  collectPhone?: boolean;
  collectCompany?: boolean;
  collectJobTitle?: boolean;
  requirePassword?: boolean;
}

interface PublicRegistrationData {
  event: Event;
  registrationPage: EventPage | null;
  landingTheme?: EventPageTheme | null;
  registrationConfig?: Step1Config | null;
}

function buildDynamicSchema(customFields: CustomField[], registrationConfig?: Step1Config | null) {
  // Default required fields (backward compatibility)
  const defaultRequired = {
    firstName: true,
    lastName: true,
    email: true,
    phone: false,
    company: false,
    jobTitle: false,
  };
  
  // Determine which fields are required based on config or defaults
  const isRequired = {
    firstName: registrationConfig?.collectFirstName ?? defaultRequired.firstName,
    lastName: registrationConfig?.collectLastName ?? defaultRequired.lastName,
    email: registrationConfig?.collectEmail ?? defaultRequired.email,
    phone: registrationConfig?.collectPhone ?? defaultRequired.phone,
    company: registrationConfig?.collectCompany ?? defaultRequired.company,
    jobTitle: registrationConfig?.collectJobTitle ?? defaultRequired.jobTitle,
  };
  
  // Check if password is required
  const requirePassword = registrationConfig?.requirePassword ?? false;
  
  // Build base schema dynamically based on required fields
  // Use .trim() to match backend validation (rejects whitespace-only values)
  const baseSchema = z.object({
    firstName: isRequired.firstName 
      ? z.string().trim().min(1, "First name is required") 
      : z.string().optional(),
    lastName: isRequired.lastName 
      ? z.string().trim().min(1, "Last name is required") 
      : z.string().optional(),
    email: isRequired.email 
      ? z.string().trim().email("Valid email is required") 
      : z.string().trim().email("Valid email is required").optional().or(z.literal("")),
    phone: isRequired.phone 
      ? z.string().trim().min(1, "Phone is required") 
      : z.string().optional(),
    company: isRequired.company 
      ? z.string().trim().min(1, "Company is required") 
      : z.string().optional(),
    jobTitle: isRequired.jobTitle 
      ? z.string().trim().min(1, "Job title is required") 
      : z.string().optional(),
    inviteCode: z.string().optional(),
    password: requirePassword
      ? z.string().min(8, "Password must be at least 8 characters")
      : z.string().optional(),
    confirmPassword: requirePassword
      ? z.string().min(1, "Please confirm your password")
      : z.string().optional(),
  });
  
  const customDataShape: Record<string, z.ZodTypeAny> = {};
  
  customFields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;
    
    switch (field.fieldType) {
      case "checkbox":
        fieldSchema = z.boolean();
        break;
      case "number":
        fieldSchema = field.required 
          ? z.string().trim().min(1, `${field.label} is required`)
          : z.string().optional();
        break;
      case "select":
        fieldSchema = field.required 
          ? z.string().trim().min(1, `${field.label} is required`)
          : z.string().optional();
        break;
      default:
        fieldSchema = field.required 
          ? z.string().trim().min(1, `${field.label} is required`)
          : z.string().optional();
    }
    
    customDataShape[field.name] = fieldSchema;
  });
  
  const extendedSchema = baseSchema.extend({
    customData: z.object(customDataShape).optional(),
  });
  
  // Add password confirmation validation if password is required
  if (requirePassword) {
    return extendedSchema.refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });
  }
  
  return extendedSchema;
}

function getRequiredFields(registrationConfig?: Step1Config | null) {
  const defaultRequired = {
    firstName: true,
    lastName: true,
    email: true,
    phone: false,
    company: false,
    jobTitle: false,
  };
  
  return {
    firstName: registrationConfig?.collectFirstName ?? defaultRequired.firstName,
    lastName: registrationConfig?.collectLastName ?? defaultRequired.lastName,
    email: registrationConfig?.collectEmail ?? defaultRequired.email,
    phone: registrationConfig?.collectPhone ?? defaultRequired.phone,
    company: registrationConfig?.collectCompany ?? defaultRequired.company,
    jobTitle: registrationConfig?.collectJobTitle ?? defaultRequired.jobTitle,
  };
}

type RegistrationFormData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  inviteCode?: string;
  password?: string;
  confirmPassword?: string;
  customData?: Record<string, string | boolean>;
};

type RegistrationStep = 1 | 2 | 3 | 4;

interface PaymentFormProps {
  clientSecret: string;
  paymentIntentId: string;
  finalPrice: number;
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
  onBack: () => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
  theme?: EventPageTheme | null;
  slug: string;
}

function PaymentForm({ 
  clientSecret, 
  paymentIntentId, 
  finalPrice, 
  onPaymentSuccess, 
  onPaymentError, 
  onBack,
  isProcessing,
  setIsProcessing,
  theme,
  slug,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (error) {
      setIsProcessing(false);
      onPaymentError(error.message || "Payment failed");
      return;
    }

    try {
      const verifyRes = await fetch(`/api/public/event/${slug}/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId }),
      });
      const verifyResult = await verifyRes.json();

      if (verifyResult.verified) {
        onPaymentSuccess();
      } else {
        onPaymentError("Payment verification failed. Please contact support.");
      }
    } catch {
      onPaymentError("Failed to verify payment. Please contact support.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-muted/50 rounded-lg mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Amount to pay</span>
          <span className="text-xl font-bold">{formatPrice(finalPrice)}</span>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <PaymentElement />
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
          data-testid="button-payment-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={!stripe || isProcessing}
          data-testid="button-pay"
          style={{
            backgroundColor: theme?.buttonStyle === "outline" ? "transparent" : (theme?.buttonColor || undefined),
            color: theme?.buttonStyle === "outline" ? (theme?.buttonColor || undefined) : (theme?.buttonTextColor || undefined),
            border: theme?.buttonStyle === "outline" ? `2px solid ${theme?.buttonColor || DEFAULT_BUTTON_COLOR}` : undefined,
          }}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay {formatPrice(finalPrice)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function PublicRegistration() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(1);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredAttendee, setRegisteredAttendee] = useState<Attendee | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [validatedCode, setValidatedCode] = useState<ValidatedInviteCode | null>(null);
  const [unlockedPackage, setUnlockedPackage] = useState<PackageWithEffectivePrice | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [urlCodeAttempted, setUrlCodeAttempted] = useState<string | null>(null);

  // Parse spoof mode query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const spoofAttendeeId = searchParams.get('spoof');
  const spoofOrgId = searchParams.get('orgId');
  const isSpoof = !!(spoofAttendeeId && spoofOrgId);

  // Fetch spoofed attendee data when in spoof mode
  // Security: This endpoint requires authentication and owner role check
  const { data: spoofData, isLoading: spoofLoading, error: spoofError } = useQuery<{ attendee: SpoofAttendee }>({
    queryKey: ["/api/organizations", spoofOrgId, "attendees", spoofAttendeeId, "spoof-portal"],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${spoofOrgId}/attendees/${spoofAttendeeId}/spoof-portal`);
      if (!res.ok) throw new Error("Failed to fetch spoof data");
      return res.json();
    },
    enabled: isSpoof,
  });

  const spoofAttendee = isSpoof ? spoofData?.attendee : null;

  // Helper to exit spoof mode by removing query params
  const exitSpoofMode = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('spoof');
    url.searchParams.delete('orgId');
    window.history.replaceState({}, '', url.toString());
    window.location.reload();
  };

  // Parse URL query parameters (e.g., ?attendeeType=speaker&code=SPEAKER-123-ABCD)
  const search = useSearch();
  const attendeeTypeFromUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("attendeeType");
  }, [search]);
  const inviteCodeFromUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("code");
  }, [search]);

  // Capture activation link ID and UTM parameters for attribution tracking
  const attributionParams = useMemo(() => {
    const params = new URLSearchParams(search);
    return {
      activationLinkId: params.get("al_id") || undefined,
      utmSource: params.get("utm_source") || undefined,
      utmMedium: params.get("utm_medium") || undefined,
      utmCampaign: params.get("utm_campaign") || undefined,
      utmContent: params.get("utm_content") || undefined,
      utmTerm: params.get("utm_term") || undefined,
    };
  }, [search]);

  const { data, isLoading, error } = useQuery<PublicRegistrationData>({
    queryKey: ["/api/public/event", slug, "registration"],
    queryFn: async () => {
      const res = await fetch(`/api/public/event/${slug}/registration`);
      if (!res.ok) throw new Error("Failed to fetch registration page");
      return res.json();
    },
    enabled: !!slug,
  });

  const { data: paymentConfig } = useQuery<PaymentConfig>({
    queryKey: ["/api/public/event", slug, "payment-config"],
    queryFn: async () => {
      const res = await fetch(`/api/public/event/${slug}/payment-config`);
      if (!res.ok) return { paymentEnabled: false, stripePublishableKey: null };
      return res.json();
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (paymentConfig?.paymentEnabled && paymentConfig?.stripePublishableKey) {
      setStripePromise(loadStripe(paymentConfig.stripePublishableKey));
    }
  }, [paymentConfig]);

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

  // Fetch housing info after registration is complete (requires checkInCode for security)
  const { data: housingInfo } = useQuery<HousingInfo>({
    queryKey: ["/api/public/event", slug, "housing", registeredAttendee?.id, registeredAttendee?.checkInCode],
    queryFn: async () => {
      const res = await fetch(`/api/public/event/${slug}/housing/${registeredAttendee!.id}?code=${encodeURIComponent(registeredAttendee!.checkInCode || '')}`);
      if (!res.ok) return { housingEnabled: false };
      return res.json();
    },
    enabled: !!slug && !!registeredAttendee?.id && !!registeredAttendee?.checkInCode && registrationComplete,
  });

  const availablePackages = useMemo(() => {
    if (unlockedPackage && validatedCode?.forcePackage) {
      return [unlockedPackage];
    }
    const packages = [...publicPackages];
    if (unlockedPackage && !packages.find(p => p.id === unlockedPackage.id)) {
      packages.push(unlockedPackage);
    }
    return packages;
  }, [publicPackages, unlockedPackage, validatedCode]);

  const selectedPackage = useMemo(() => {
    return availablePackages.find(p => p.id === selectedPackageId) || null;
  }, [availablePackages, selectedPackageId]);

  const selectedPackagePrice = useMemo(() => {
    if (!selectedPackage) return 0;
    const basePrice = Number(selectedPackage.effectivePrice) || 0;
    if (validatedCode?.discountType && validatedCode?.discountValue) {
      return calculateDiscount(basePrice, validatedCode.discountType, validatedCode.discountValue);
    }
    return basePrice;
  }, [selectedPackage, validatedCode]);

  const requiresPayment = useMemo(() => {
    return paymentConfig?.paymentEnabled && selectedPackagePrice > 0;
  }, [paymentConfig, selectedPackagePrice]);

  const validateInviteCode = async (codeToValidate?: string, silent?: boolean) => {
    const code = codeToValidate || inviteCodeInput.trim();
    if (!code) return;
    setIsValidatingCode(true);
    try {
      const res = await fetch(`/api/public/validate-invite-code/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = await res.json();
      if (result.valid) {
        setValidatedCode(result.inviteCode);
        setUnlockedPackage(result.unlockedPackage);
        setInviteCodeInput(code);
        form.setValue("inviteCode", code);
        
        // Pre-populate form with submission data if available (speaker registration)
        if (result.submissionData) {
          const subData = result.submissionData as SubmissionData;
          form.setValue("firstName", subData.firstName);
          form.setValue("lastName", subData.lastName);
          form.setValue("email", subData.email);
          if (subData.company) {
            form.setValue("company", subData.company);
          }
        }
        
        if (!silent) {
          toast({ title: "Activation key applied!", description: result.unlockedPackage ? "Access package unlocked" : "Key validated" });
        }
        if (result.unlockedPackage && !selectedPackageId) {
          setSelectedPackageId(result.unlockedPackage.id);
        }
      } else {
        if (!silent) {
          toast({ title: "Invalid code", description: result.message || "Please check the code and try again", variant: "destructive" });
        }
        setValidatedCode(null);
        setUnlockedPackage(null);
      }
    } catch {
      if (!silent) {
        toast({ title: "Error", description: "Failed to validate code", variant: "destructive" });
      }
    } finally {
      setIsValidatingCode(false);
    }
  };

  const sortedCustomFields = useMemo(() => {
    return [...customFields].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [customFields]);

  const dynamicSchema = useMemo(() => {
    return buildDynamicSchema(customFields, data?.registrationConfig);
  }, [customFields, data?.registrationConfig]);

  const requiredFields = useMemo(() => {
    return getRequiredFields(data?.registrationConfig);
  }, [data?.registrationConfig]);

  const requirePassword = data?.registrationConfig?.requirePassword ?? false;

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
      password: "",
      confirmPassword: "",
      customData: defaultCustomData,
    },
  });

  // Auto-validate invite code from URL on page load (for speaker registration links)
  useEffect(() => {
    if (inviteCodeFromUrl && !validatedCode && !isValidatingCode && slug && urlCodeAttempted !== inviteCodeFromUrl) {
      setUrlCodeAttempted(inviteCodeFromUrl);
      validateInviteCode(inviteCodeFromUrl, true);
    }
  }, [inviteCodeFromUrl, slug, urlCodeAttempted, validatedCode, isValidatingCode]);

  // Auto-apply invite code from activation link (when al_id is present in URL)
  const [alCodeAttempted, setAlCodeAttempted] = useState<string | null>(null);
  useEffect(() => {
    const activationLinkId = attributionParams.activationLinkId;
    if (activationLinkId && !validatedCode && !isValidatingCode && slug && alCodeAttempted !== activationLinkId && !inviteCodeFromUrl) {
      setAlCodeAttempted(activationLinkId);
      // Fetch the invite code associated with this activation link
      fetch(`/api/public/activation-link/${activationLinkId}/invite-code`)
        .then(res => res.json())
        .then(data => {
          if (data.inviteCode) {
            validateInviteCode(data.inviteCode, true);
          }
        })
        .catch(() => {
          // Silently fail - activation link might not have an invite code
        });
    }
  }, [attributionParams.activationLinkId, slug, alCodeAttempted, validatedCode, isValidatingCode, inviteCodeFromUrl]);

  // Set public page styling to prevent dark mode bleed-through and overscroll issues
  useEffect(() => {
    const theme = data?.registrationPage?.theme || data?.landingTheme;
    const bgColor = theme?.backgroundColor || DEFAULT_BACKGROUND_COLOR;
    if (data) {
      document.documentElement.classList.add('public-page');
      document.documentElement.style.setProperty('--public-page-bg', bgColor);
    }
    return () => {
      document.documentElement.classList.remove('public-page');
      document.documentElement.style.removeProperty('--public-page-bg');
    };
  }, [data]);

  const registerMutation = useMutation({
    mutationFn: async (formData: RegistrationFormData) => {
      const res = await apiRequest("POST", `/api/public/register/${slug}`, {
        ...formData,
        packageId: selectedPackageId,
        inviteCodeId: validatedCode?.id || undefined,
        paymentIntentId: paymentIntentId || undefined,
        attendeeType: attendeeTypeFromUrl || undefined,
        ...attributionParams,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setRegistrationComplete(true);
      setRegisteredAttendee(data.attendee);
      setCurrentStep(4);
      toast({ title: "Registration successful!", description: "You have been registered for the event." });
    },
    onError: () => {
      toast({ title: "Registration failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const createPaymentIntent = async () => {
    setIsCreatingPaymentIntent(true);
    try {
      const res = await fetch(`/api/public/event/${slug}/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPackageId,
          inviteCodeId: validatedCode?.id || undefined,
        }),
      });
      const result: PaymentIntentResponse = await res.json();

      if (!result.paymentRequired) {
        form.handleSubmit(onSubmit)();
        return;
      }

      if (result.clientSecret && result.paymentIntentId) {
        setClientSecret(result.clientSecret);
        setPaymentIntentId(result.paymentIntentId);
        setFinalPrice(result.finalPrice || 0);
        setCurrentStep(3);
      } else {
        toast({ title: "Error", description: "Failed to initialize payment", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create payment", variant: "destructive" });
    } finally {
      setIsCreatingPaymentIntent(false);
    }
  };

  const onSubmit = (formData: RegistrationFormData) => {
    registerMutation.mutate(formData);
  };

  const handleStep1Continue = async () => {
    const isValid = await form.trigger(["firstName", "lastName", "email", "phone", "company", "jobTitle"]);
    if (isValid) {
      setCurrentStep(2);
    }
  };

  const handleStep2Continue = async () => {
    const isCustomValid = await form.trigger();
    if (!isCustomValid) return;

    if (requiresPayment) {
      await createPaymentIntent();
    } else {
      form.handleSubmit(onSubmit)();
    }
  };

  const handlePaymentSuccess = () => {
    form.handleSubmit(onSubmit)();
  };

  const handlePaymentError = (errorMessage: string) => {
    toast({ title: "Payment failed", description: errorMessage, variant: "destructive" });
  };

  const getPackagePrice = (pkg: PackageWithEffectivePrice) => {
    const basePrice = Number(pkg.effectivePrice) || 0;
    if (validatedCode?.discountType && validatedCode?.discountValue) {
      return calculateDiscount(basePrice, validatedCode.discountType, validatedCode.discountValue);
    }
    return basePrice;
  };

  if (isLoading || (isSpoof && spoofLoading)) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // If spoof mode failed (user not authorized), exit spoof mode
  if (isSpoof && spoofError) {
    exitSpoofMode();
    return null;
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
  const rawSections = (registrationPage?.sections as Section[]) || [];
  
  // Filter sections by visibility conditions if in spoof mode
  const sections = isSpoof 
    ? rawSections.filter(section => checkVisibilityCondition(section.styles?.visibilityCondition, spoofAttendee))
    : rawSections;

  const theme = registrationPage?.theme || landingTheme;
  const themeStyles = getThemeStyles(theme);
  const fontsToLoad = [theme?.headingFont, theme?.bodyFont].filter(Boolean) as string[];

  // Find registration-form section to get section-level fontColor
  const registrationFormSection = sections.find(s => s.type === "registration-form");
  const sectionFontColor = (registrationFormSection?.config as any)?.fontColor 
    || (registrationFormSection?.styles as any)?.textColor 
    || theme?.textColor 
    || DEFAULT_TEXT_COLOR;

  // Input styling based on theme and section settings - matches site builder preview
  const borderRadiusMap: Record<string, string> = {
    none: "0px", small: "4px", medium: "8px", large: "16px", pill: "9999px",
  };
  const inputStyles: React.CSSProperties = {
    backgroundColor: theme?.backgroundColor || DEFAULT_BACKGROUND_COLOR,
    borderColor: theme?.borderColor || DEFAULT_BORDER_COLOR,
    borderRadius: borderRadiusMap[theme?.borderRadius || "medium"],
    color: sectionFontColor,
  };
  const labelStyles: React.CSSProperties = {
    color: sectionFontColor,
  };

  const stepTitles = ["Personal Info", "Select Access Package", "Payment", "Confirmation"];
  const totalSteps = requiresPayment ? 4 : 3;

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

            {housingInfo?.housingEnabled && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Hotel className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-blue-900 dark:text-blue-100">Hotel Accommodations</h3>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  Book your hotel room through our official room block for special event rates.
                </p>
                {housingInfo.bookingUrl ? (
                  <Button 
                    size="sm" 
                    className="w-full"
                    asChild
                    data-testid="button-book-hotel"
                  >
                    <a href={housingInfo.bookingUrl} target="_blank" rel="noopener noreferrer">
                      <Hotel className="w-4 h-4 mr-2" />
                      Book Your Hotel Room
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                ) : (
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Hotel booking will be available soon. Check back in the attendee portal.
                  </p>
                )}
              </div>
            )}

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

  const renderStepIndicator = () => {
    const displaySteps = requiresPayment 
      ? stepTitles 
      : stepTitles.filter((_, i) => i !== 2);
    
    const activeStepColor = theme?.buttonColor || DEFAULT_BUTTON_COLOR;
    const activeStepTextColor = theme?.buttonTextColor || DEFAULT_BUTTON_TEXT_COLOR;
    
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {displaySteps.map((title, index) => {
          const stepNum = index + 1;
          const isActive = currentStep === stepNum || (currentStep === 3 && !requiresPayment && stepNum === 3);
          const isCompleted = currentStep > stepNum;
          
          const stepCircleStyle: React.CSSProperties = isActive || isCompleted
            ? { backgroundColor: activeStepColor, color: activeStepTextColor }
            : {};
          
          return (
            <div key={title} className="flex items-center gap-2">
              <div 
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  !isActive && !isCompleted ? "bg-muted text-muted-foreground" : ""
                }`}
                style={stepCircleStyle}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              <span 
                className={`text-sm hidden sm:inline ${isActive ? "font-medium" : "text-muted-foreground"}`}
                style={{ color: isActive ? sectionFontColor : undefined }}
              >
                {title}
              </span>
              {index < displaySteps.length - 1 && (
                <div 
                  className={`w-8 h-0.5 ${!isCompleted ? "bg-muted" : ""}`}
                  style={isCompleted ? { backgroundColor: activeStepColor } : {}}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <GoogleFontsLoader fonts={fontsToLoad} />
      <CustomFontsLoader slug={slug || ''} />
      <GoogleAnalyticsLoader googleTagId={theme?.googleTagId} />
      {isSpoof && spoofAttendee && (
        <div className="bg-primary/10 border-b border-primary/20 py-2 px-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Eye className="w-4 h-4" />
            <span>
              Preview Mode: Viewing as {spoofAttendee.firstName} {spoofAttendee.lastName} 
              {spoofAttendee.attendeeType && ` (${titleCase(spoofAttendee.attendeeType)})`}
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exitSpoofMode}
            className="h-8 text-xs"
            data-testid="button-exit-preview"
          >
            Exit Preview
          </Button>
        </div>
      )}
      <div 
        className="min-h-screen pb-8"
        style={{
          ...themeStyles,
          backgroundColor: theme?.backgroundColor || DEFAULT_BACKGROUND_COLOR,
          color: theme?.textColor || undefined,
          fontFamily: theme?.bodyFont ? `"${theme.bodyFont}", sans-serif` : undefined,
        }}
      >
        <div className="max-w-2xl mx-auto px-6 py-8">
        {sections.length > 0 && currentStep === 1 && (
          <div className="mb-8 space-y-6">
            {sections
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <SectionRenderer key={section.id} section={section} event={event} slug={slug || ""} theme={theme} />
              ))}
          </div>
        )}

        <Card className="overflow-hidden" style={{
          backgroundColor: theme?.cardBackground || undefined,
          borderRadius: theme?.borderRadius ? ({ none: "0px", small: "4px", medium: "8px", large: "16px", pill: "9999px" }[theme.borderRadius]) : undefined,
        }}>
          <CardHeader>
            <CardTitle style={{ fontFamily: theme?.headingFont ? `"${theme.headingFont}", sans-serif` : undefined, color: sectionFontColor }}>
              {currentStep === 1 && "Personal Information"}
              {currentStep === 2 && "Select Your Access Package"}
              {currentStep === 3 && "Complete Payment"}
            </CardTitle>
            <CardDescription>
              {event.registrationOpen
                ? currentStep === 1 
                  ? "Tell us about yourself" 
                  : currentStep === 2 
                    ? "Choose an access package"
                    : "Enter your payment details"
                : "Registration is currently closed"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {event.registrationOpen ? (
              <>
                {renderStepIndicator()}
                
                <Form {...form}>
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel style={labelStyles}>
                                First Name{requiredFields.firstName && <span className="text-destructive ml-1">*</span>}
                              </FormLabel>
                              <FormControl>
                                <Input data-testid="input-first-name" style={inputStyles} {...field} />
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
                              <FormLabel style={labelStyles}>
                                Last Name{requiredFields.lastName && <span className="text-destructive ml-1">*</span>}
                              </FormLabel>
                              <FormControl>
                                <Input data-testid="input-last-name" style={inputStyles} {...field} />
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
                            <FormLabel style={labelStyles}>
                              Email{requiredFields.email && <span className="text-destructive ml-1">*</span>}
                            </FormLabel>
                            <FormControl>
                              <Input type="email" data-testid="input-email" style={inputStyles} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {requirePassword && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel style={labelStyles}>
                                  Password<span className="text-destructive ml-1">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input type="password" data-testid="input-password" style={inputStyles} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel style={labelStyles}>
                                  Confirm Password<span className="text-destructive ml-1">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input type="password" data-testid="input-confirm-password" style={inputStyles} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel style={labelStyles}>
                              Phone{requiredFields.phone ? <span className="text-destructive ml-1">*</span> : " (optional)"}
                            </FormLabel>
                            <FormControl>
                              <Input data-testid="input-phone" style={inputStyles} {...field} />
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
                            <FormLabel style={labelStyles}>
                              Company{requiredFields.company ? <span className="text-destructive ml-1">*</span> : " (optional)"}
                            </FormLabel>
                            <FormControl>
                              <Input data-testid="input-company" style={inputStyles} {...field} />
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
                            <FormLabel style={labelStyles}>
                              Job Title{requiredFields.jobTitle ? <span className="text-destructive ml-1">*</span> : " (optional)"}
                            </FormLabel>
                            <FormControl>
                              <Input data-testid="input-job-title" style={inputStyles} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <FormLabel style={labelStyles}>Activation Key (optional)</FormLabel>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter activation key"
                            value={inviteCodeInput}
                            onChange={(e) => setInviteCodeInput(e.target.value)}
                            disabled={!!validatedCode}
                            style={inputStyles}
                            data-testid="input-invite-code"
                          />
                          <Button
                            type="button"
                            variant={validatedCode ? "secondary" : "outline"}
                            onClick={() => validateInviteCode()}
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

                      <Button
                        type="button"
                        className="w-full"
                        onClick={handleStep1Continue}
                        data-testid="button-continue-step1"
                        style={{
                          backgroundColor: theme?.buttonStyle === "outline" ? "transparent" : (theme?.buttonColor || undefined),
                          color: theme?.buttonStyle === "outline" ? (theme?.buttonColor || undefined) : (theme?.buttonTextColor || undefined),
                          border: theme?.buttonStyle === "outline" ? `2px solid ${theme?.buttonColor || DEFAULT_BUTTON_COLOR}` : undefined,
                          borderRadius: theme?.borderRadius ? ({ none: "0px", small: "4px", medium: "8px", large: "16px", pill: "9999px" }[theme.borderRadius]) : undefined,
                        }}
                      >
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-4">
                      {validatedCode && (
                        <div className="flex items-center gap-2 text-sm text-green-600 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                          <Check className="h-4 w-4" />
                          <span>Activation key applied{validatedCode.discountType && ` - ${validatedCode.discountType === "percentage" ? `${validatedCode.discountValue}% off` : `${formatPrice(validatedCode.discountValue)} off`}`}</span>
                        </div>
                      )}

                      {availablePackages.length > 0 && (
                        <div className="space-y-2">
                          <FormLabel style={labelStyles}>Select Access Package</FormLabel>
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
                                            <Badge key={i} variant="outline" className="text-xs">{titleCase(feature)}</Badge>
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
                              inputStyles={inputStyles}
                              labelStyles={labelStyles}
                            />
                          ))}
                        </div>
                      )}

                      <div className="flex gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrentStep(1)}
                          data-testid="button-back-step2"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                        <Button
                          type="button"
                          className="flex-1"
                          onClick={handleStep2Continue}
                          disabled={registerMutation.isPending || isCreatingPaymentIntent}
                          data-testid="button-continue-step2"
                          style={{
                            backgroundColor: theme?.buttonStyle === "outline" ? "transparent" : (theme?.buttonColor || undefined),
                            color: theme?.buttonStyle === "outline" ? (theme?.buttonColor || undefined) : (theme?.buttonTextColor || undefined),
                            border: theme?.buttonStyle === "outline" ? `2px solid ${theme?.buttonColor || DEFAULT_BUTTON_COLOR}` : undefined,
                            borderRadius: theme?.borderRadius ? ({ none: "0px", small: "4px", medium: "8px", large: "16px", pill: "9999px" }[theme.borderRadius]) : undefined,
                          }}
                        >
                          {(registerMutation.isPending || isCreatingPaymentIntent) ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {isCreatingPaymentIntent ? "Preparing Payment..." : "Registering..."}
                            </>
                          ) : requiresPayment ? (
                            <>
                              Continue to Payment
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                          ) : (
                            "Complete Registration"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && clientSecret && stripePromise && (
                    <Elements 
                      stripe={stripePromise} 
                      options={{ 
                        clientSecret,
                        appearance: {
                          theme: 'stripe',
                        },
                      }}
                    >
                      <PaymentForm
                        clientSecret={clientSecret}
                        paymentIntentId={paymentIntentId || ""}
                        finalPrice={finalPrice}
                        onPaymentSuccess={handlePaymentSuccess}
                        onPaymentError={handlePaymentError}
                        onBack={() => setCurrentStep(2)}
                        isProcessing={isProcessingPayment}
                        setIsProcessing={setIsProcessingPayment}
                        theme={theme}
                        slug={slug || ""}
                      />
                    </Elements>
                  )}
                </Form>
              </>
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
  const isFullWidth = theme?.containerWidth === "full";
  const isHtmlSection = section.type === "html";

  const wrapWithMargins = (content: React.ReactNode) => {
    return content;
  };

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
        color: theme?.buttonColor || DEFAULT_BUTTON_COLOR,
        border: `2px solid ${theme?.buttonColor || DEFAULT_BUTTON_COLOR}`,
        borderRadius: themeRadius,
      }
    : {
        backgroundColor: theme?.buttonColor || DEFAULT_BUTTON_COLOR,
        color: theme?.buttonTextColor || DEFAULT_BUTTON_TEXT_COLOR,
        borderRadius: themeRadius,
      };

  const cardStyles: React.CSSProperties = {
    backgroundColor: theme?.cardBackground || DEFAULT_CARD_BACKGROUND,
    borderRadius: themeRadius,
  };

  const headingStyles: React.CSSProperties = {
    fontFamily: theme?.headingFont ? `"${theme.headingFont}", sans-serif` : `"${DEFAULT_HEADING_FONT}", sans-serif`,
    color: theme?.textColor || DEFAULT_TEXT_COLOR,
  };

  const secondaryTextStyles: React.CSSProperties = {
    color: theme?.textSecondaryColor || DEFAULT_TEXT_SECONDARY_COLOR,
  };

  const renderButton = (text: string, link: string, testId: string) => {
    if (!text) return null;
    const isExternal = link.startsWith("http");
    const isAnchor = link.startsWith("#");
    
    if (link && (isExternal || isAnchor)) {
      return (
        <ThemedButton size="lg" asChild data-testid={testId} theme={theme}>
          <a href={link} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined}>
            {text}
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </ThemedButton>
      );
    }
    
    return (
      <ThemedButton size="lg" onClick={() => link && (window.location.href = link)} data-testid={testId} theme={theme}>
        {text}
        <ArrowRight className="ml-2 h-4 w-4" />
      </ThemedButton>
    );
  };

  switch (section.type) {
    case "hero":
      const eventDate = event.startDate ? new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : "";
      const heroStyles: React.CSSProperties = {
        backgroundColor: theme?.cardBackground || undefined,
        borderRadius: themeRadius,
        borderColor: theme?.borderColor || undefined,
        borderWidth: theme?.borderColor ? '1px' : undefined,
        borderStyle: theme?.borderColor ? 'solid' : undefined,
      };
      return wrapWithMargins(
        <div className="p-8 py-12 bg-muted" style={heroStyles} data-testid={`section-hero-${section.id}`}>
          <Badge variant="secondary" className="mb-4">Public Event</Badge>
          <h1 className="text-4xl font-bold mb-4" style={headingStyles}>{title || event.name}</h1>
          <div className="flex flex-wrap gap-4 mb-4" style={secondaryTextStyles}>
            {eventDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{eventDate}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
            )}
          </div>
          {(subtitle || event.description) && (
            <p className="text-lg mb-6" style={secondaryTextStyles}>{subtitle || event.description}</p>
          )}
          {renderButton(buttonText || "Register Now", buttonLink || `/event/${slug}/register`, "button-hero-cta")}
        </div>
      );

    case "text":
      return wrapWithMargins(
        <div className="prose dark:prose-invert max-w-none" data-testid={`section-text-${section.id}`}>
          {heading && <h3 className="text-2xl font-semibold mb-4" style={headingStyles}>{heading}</h3>}
          {content && <p style={secondaryTextStyles}>{content}</p>}
        </div>
      );

    case "cta":
      return wrapWithMargins(
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
      return wrapWithMargins(
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

    case "registration-form":
      const regHeading = config.heading as string || "";
      const regDescription = config.description as string || "";
      const showRegHeading = config.showHeading !== false;
      
      // Only render heading and description - the actual form is rendered separately
      if (!showRegHeading || (!regHeading && !regDescription)) {
        return null;
      }
      
      return wrapWithMargins(
        <div data-testid={`section-registration-form-${section.id}`} className="text-center">
          {regHeading && (
            <h2 className="text-3xl font-bold mb-4" style={headingStyles}>{regHeading}</h2>
          )}
          {regDescription && (
            <p className="text-lg mb-2" style={secondaryTextStyles}>{regDescription}</p>
          )}
        </div>
      );

    default:
      return null;
  }
}

function CustomFieldRenderer({ customField, control, inputStyles, labelStyles }: { customField: CustomField; control: any; inputStyles?: React.CSSProperties; labelStyles?: React.CSSProperties }) {
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
              <FormLabel style={labelStyles}>{labelText}</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  value={field.value as string || ""}
                  style={inputStyles}
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
              <FormLabel style={labelStyles}>{labelText}</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  value={field.value as string || ""}
                  style={inputStyles}
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
              <FormLabel style={labelStyles}>{labelText}</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  value={field.value as string || ""}
                  style={inputStyles}
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
              <FormLabel style={labelStyles}>{labelText}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value as string || ""}>
                <FormControl>
                  <SelectTrigger style={inputStyles} data-testid={`select-custom-${customField.name}`}>
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
                <FormLabel style={labelStyles} className="cursor-pointer">{customField.label}</FormLabel>
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
              <FormLabel style={labelStyles}>{labelText}</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  value={field.value as string || ""}
                  style={inputStyles}
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
