import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { LogOut, User, Shield, Bell, Palette, CreditCard, AlertTriangle, FileText, Mail, ExternalLink, CheckCircle, XCircle, Share2 } from "lucide-react";
import { SiLinkedin, SiX, SiFacebook, SiInstagram } from "react-icons/si";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "wouter";
import type { Organization } from "@shared/schema";

const paymentSettingsSchema = z.object({
  paymentEnabled: z.boolean(),
  stripePublishableKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
});

type PaymentSettingsFormData = z.infer<typeof paymentSettingsSchema>;

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: organization, isLoading: isLoadingOrg } = useQuery<Organization>({
    queryKey: ["/api/auth/organization"],
  });

  const { data: resendStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/settings/resend-status"],
  });

  const { data: socialStatus } = useQuery<{
    linkedin: boolean;
    twitter: boolean;
    facebook: boolean;
    instagram: boolean;
  }>({
    queryKey: ["/api/settings/social-integrations-status"],
  });

  const form = useForm<PaymentSettingsFormData>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
      paymentEnabled: false,
      stripePublishableKey: "",
      stripeSecretKey: "",
    },
    values: organization ? {
      paymentEnabled: organization.paymentEnabled ?? false,
      stripePublishableKey: organization.stripePublishableKey ?? "",
      stripeSecretKey: organization.stripeSecretKey ?? "",
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PaymentSettingsFormData) => {
      return await apiRequest("PATCH", "/api/auth/organization", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/organization"] });
      toast({ title: "Payment settings saved successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: PaymentSettingsFormData) => {
    updateMutation.mutate(data);
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Settings" breadcrumbs={[{ label: "Settings" }]} />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={user?.profileImageUrl || undefined}
                    alt={user?.firstName || "User"}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-user-name">
                    {user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : "User"}
                  </h3>
                  <p className="text-muted-foreground" data-testid="text-user-email">{user?.email}</p>
                  <Badge variant="secondary" className="mt-2">Admin</Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user?.email || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Account Created</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Settings
              </CardTitle>
              <CardDescription>
                Configure Stripe payment processing for your organization
                {isLoadingOrg && " (Loading...)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingOrg ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Security Warning</AlertTitle>
                      <AlertDescription>
                        API keys are sensitive credentials. Keep them secure and never share them publicly. 
                        Your Stripe secret key grants full access to your Stripe account.
                      </AlertDescription>
                    </Alert>

                    <FormField
                      control={form.control}
                      name="paymentEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Payment Processing</FormLabel>
                            <FormDescription>
                              Allow attendees to pay for registration packages
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-payment-enabled"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="stripePublishableKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stripe Publishable Key</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="pk_live_..."
                              {...field}
                              data-testid="input-stripe-publishable-key"
                            />
                          </FormControl>
                          <FormDescription>
                            Your Stripe publishable key (starts with pk_)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="stripeSecretKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stripe Secret Key</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="sk_live_..."
                              {...field}
                              data-testid="input-stripe-secret-key"
                            />
                          </FormControl>
                          <FormDescription>
                            Your Stripe secret key (starts with sk_)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={updateMutation.isPending}
                      data-testid="button-save-payment-settings"
                    >
                      {updateMutation.isPending ? "Saving..." : "Save Payment Settings"}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Settings (Resend)
              </CardTitle>
              <CardDescription>Configure email sending for campaigns and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">API Key Status</p>
                  <p className="text-sm text-muted-foreground">Resend API key configuration</p>
                </div>
                {resendStatus?.configured ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-500" />
                    Not Configured
                  </Badge>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="font-medium">Setup Instructions</p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Create a free account at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">resend.com <ExternalLink className="h-3 w-3" /></a></li>
                  <li>Go to API Keys in your Resend dashboard</li>
                  <li>Create a new API key with sending permissions</li>
                  <li>In Replit, open the Secrets tab (padlock icon in the sidebar)</li>
                  <li>Add a new secret with key <code className="bg-muted px-1.5 py-0.5 rounded text-xs">RESEND_API_KEY</code> and paste your API key as the value</li>
                  <li>Verify a domain in Resend to send from your own email address</li>
                </ol>
              </div>

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertTitle>Email Sending</AlertTitle>
                <AlertDescription>
                  Resend is used to send email campaigns and notifications. Without a configured API key, email features will not work.
                </AlertDescription>
              </Alert>

              <Button variant="outline" asChild>
                <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" data-testid="button-resend-dashboard">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Resend Dashboard
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="card-social-integrations">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Social Media Integrations
              </CardTitle>
              <CardDescription>Connect social platforms for marketing and event promotion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2" data-testid="social-integration-linkedin">
                  <div className="flex items-center gap-3">
                    <SiLinkedin className="h-5 w-5 text-[#0A66C2]" />
                    <div>
                      <p className="font-medium">LinkedIn</p>
                      <p className="text-sm text-muted-foreground">Share event updates and professional networking</p>
                    </div>
                  </div>
                  {socialStatus?.linkedin ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                      Not Configured
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2" data-testid="social-integration-twitter">
                  <div className="flex items-center gap-3">
                    <SiX className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Twitter / X</p>
                      <p className="text-sm text-muted-foreground">Post event announcements and engage attendees</p>
                    </div>
                  </div>
                  {socialStatus?.twitter ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                      Not Configured
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2" data-testid="social-integration-facebook">
                  <div className="flex items-center gap-3">
                    <SiFacebook className="h-5 w-5 text-[#1877F2]" />
                    <div>
                      <p className="font-medium">Facebook</p>
                      <p className="text-sm text-muted-foreground">Create event pages and reach broader audiences</p>
                    </div>
                  </div>
                  {socialStatus?.facebook ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                      Not Configured
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2" data-testid="social-integration-instagram">
                  <div className="flex items-center gap-3">
                    <SiInstagram className="h-5 w-5 text-[#E4405F]" />
                    <div>
                      <p className="font-medium">Instagram</p>
                      <p className="text-sm text-muted-foreground">Share visual content and event highlights</p>
                    </div>
                  </div>
                  {socialStatus?.instagram ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                      Not Configured
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="linkedin" data-testid="accordion-linkedin">
                  <AccordionTrigger className="text-sm" data-testid="accordion-trigger-linkedin">
                    <span className="flex items-center gap-2">
                      <SiLinkedin className="h-4 w-4 text-[#0A66C2]" />
                      LinkedIn Setup Instructions
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>To connect LinkedIn, you need to create a LinkedIn App:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Go to <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">LinkedIn Developer Portal <ExternalLink className="h-3 w-3" /></a></li>
                        <li>Create a new app with your company page</li>
                        <li>Request the required API products (Share on LinkedIn, Sign In with LinkedIn)</li>
                        <li>Copy your Client ID and Client Secret</li>
                      </ol>
                      <div className="mt-3 p-2 bg-muted rounded text-xs">
                        <p className="font-medium mb-1">Required Secrets:</p>
                        <code>LINKEDIN_CLIENT_ID</code><br />
                        <code>LINKEDIN_CLIENT_SECRET</code>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="twitter" data-testid="accordion-twitter">
                  <AccordionTrigger className="text-sm" data-testid="accordion-trigger-twitter">
                    <span className="flex items-center gap-2">
                      <SiX className="h-4 w-4" />
                      Twitter / X Setup Instructions
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>To connect Twitter/X, you need to create a Twitter Developer App:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Go to <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Twitter Developer Portal <ExternalLink className="h-3 w-3" /></a></li>
                        <li>Create a new project and app</li>
                        <li>Enable OAuth 2.0 and configure permissions</li>
                        <li>Generate and copy your API Key and API Secret</li>
                      </ol>
                      <div className="mt-3 p-2 bg-muted rounded text-xs">
                        <p className="font-medium mb-1">Required Secrets:</p>
                        <code>TWITTER_API_KEY</code><br />
                        <code>TWITTER_API_SECRET</code>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="facebook" data-testid="accordion-facebook">
                  <AccordionTrigger className="text-sm" data-testid="accordion-trigger-facebook">
                    <span className="flex items-center gap-2">
                      <SiFacebook className="h-4 w-4 text-[#1877F2]" />
                      Facebook Setup Instructions
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>To connect Facebook, you need to create a Meta/Facebook App:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Meta Developer Portal <ExternalLink className="h-3 w-3" /></a></li>
                        <li>Create a new app (Business or Consumer type)</li>
                        <li>Add Facebook Login and Pages API products</li>
                        <li>Copy your App ID and App Secret from Settings</li>
                      </ol>
                      <div className="mt-3 p-2 bg-muted rounded text-xs">
                        <p className="font-medium mb-1">Required Secrets:</p>
                        <code>FACEBOOK_APP_ID</code><br />
                        <code>FACEBOOK_APP_SECRET</code>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="instagram" data-testid="accordion-instagram">
                  <AccordionTrigger className="text-sm" data-testid="accordion-trigger-instagram">
                    <span className="flex items-center gap-2">
                      <SiInstagram className="h-4 w-4 text-[#E4405F]" />
                      Instagram Setup Instructions
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>To connect Instagram, you need a Meta/Facebook App with Instagram API:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Meta Developer Portal <ExternalLink className="h-3 w-3" /></a></li>
                        <li>Create or use an existing Meta app</li>
                        <li>Add Instagram Basic Display or Instagram Graph API</li>
                        <li>Configure Instagram App ID and Secret</li>
                      </ol>
                      <div className="mt-3 p-2 bg-muted rounded text-xs">
                        <p className="font-medium mb-1">Required Secrets:</p>
                        <code>INSTAGRAM_APP_ID</code><br />
                        <code>INSTAGRAM_APP_SECRET</code>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Authentication</p>
                  <p className="text-sm text-muted-foreground">Signed in via secure authentication</p>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>
              <Separator />
              <Button variant="destructive" className="w-full" asChild>
                <a href="/api/logout" data-testid="button-logout">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Configure notification preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Notification settings will be available in a future update.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Customize the look and feel</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use the theme toggle in the header to switch between light and dark modes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Legal
              </CardTitle>
              <CardDescription>Privacy and legal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Link href="/privacy-policy" className="text-sm text-primary hover:underline" data-testid="link-privacy-policy">
                  Privacy Policy
                </Link>
              </div>
              <div>
                <a href="/security-whitepaper.md" className="text-sm text-primary hover:underline" data-testid="link-security-whitepaper">
                  Security Whitepaper
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
