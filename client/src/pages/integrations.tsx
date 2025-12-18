import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import { SiX, SiLinkedin, SiInstagram, SiFacebook, SiMailchimp, SiStripe, SiGooglesheets } from "react-icons/si";
import { 
  Send, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Loader2
} from "lucide-react";
import type { IconType } from "react-icons";
import type { Organization } from "@shared/schema";

interface SocialCredential {
  id: string;
  provider: string;
  clientId: string | null;
  clientSecret: string | null;
  isConfigured: boolean;
}

interface EmailConnection {
  id: string;
  provider: string;
  accountName: string;
  accountId: string;
  status: string;
  lastSyncedAt: string | null;
}

interface Audience {
  id: string;
  name: string;
  memberCount: number;
}

const socialCredentialsSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
});

const mailchimpSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

const stripeSchema = z.object({
  stripePublishableKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  paymentEnabled: z.boolean(),
});

type SocialCredentialsFormData = z.infer<typeof socialCredentialsSchema>;
type MailchimpFormData = z.infer<typeof mailchimpSchema>;
type StripeFormData = z.infer<typeof stripeSchema>;

const developerPortalLinks: Record<string, string> = {
  twitter: "https://developer.twitter.com/en/portal/dashboard",
  linkedin: "https://www.linkedin.com/developers/apps",
  instagram: "https://developers.facebook.com/apps",
  facebook: "https://developers.facebook.com/apps",
};

function SocialMediaIntegrationCard({ 
  provider, 
  name, 
  description, 
  icon: Icon, 
  iconColor 
}: { 
  provider: string;
  name: string;
  description: string;
  icon: IconType;
  iconColor?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const { data: credentials, isLoading } = useQuery<SocialCredential[]>({
    queryKey: ["/api/settings/social-credentials"],
  });

  const credential = credentials?.find(c => c.provider === provider);
  const isConfigured = credential?.isConfigured ?? false;

  const form = useForm<SocialCredentialsFormData>({
    resolver: zodResolver(socialCredentialsSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: SocialCredentialsFormData) => {
      return await apiRequest("POST", `/api/settings/social-credentials/${provider}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/social-credentials"] });
      toast({ title: `${name} credentials saved successfully` });
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Session expired. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/settings/social-credentials/${provider}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/social-credentials"] });
      toast({ title: `${name} credentials removed` });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Session expired. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card data-testid={`card-integration-${provider}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-md bg-muted">
              <Icon 
                className="h-6 w-6" 
                style={iconColor ? { color: iconColor } : undefined}
                data-testid={`icon-${provider}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base" data-testid={`title-${provider}`}>
                  {name}
                </CardTitle>
                {isLoading ? (
                  <Skeleton className="h-5 w-20" />
                ) : isConfigured ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-muted-foreground" />
                    Not Configured
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1" data-testid={`description-${provider}`}>
                {description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              data-testid={`button-configure-${provider}`}
              className="flex items-center gap-1"
            >
              Configure
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-4">
            <Separator />
            
            {isConfigured && credential?.clientId && (
              <div className="p-3 bg-muted rounded-md space-y-2">
                <p className="text-sm font-medium">Current Configuration</p>
                <p className="text-sm text-muted-foreground">
                  Client ID: {credential.clientId}
                </p>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your Client ID" 
                          {...field} 
                          data-testid={`input-client-id-${provider}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Secret</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter your Client Secret" 
                          {...field} 
                          data-testid={`input-client-secret-${provider}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-2 flex-wrap">
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={saveMutation.isPending}
                    data-testid={`button-save-${provider}`}
                  >
                    {saveMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  {isConfigured && (
                    <Button 
                      type="button"
                      variant="destructive" 
                      size="sm"
                      onClick={() => removeMutation.mutate()}
                      disabled={removeMutation.isPending}
                      data-testid={`button-remove-${provider}`}
                    >
                      {removeMutation.isPending ? "Removing..." : "Remove"}
                    </Button>
                  )}
                </div>
              </form>
            </Form>

            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium">Setup Instructions</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Go to the{" "}
                  <a 
                    href={developerPortalLinks[provider]} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {name} Developer Portal <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Create a new application or select an existing one</li>
                <li>Copy the Client ID and Client Secret</li>
                <li>Paste the credentials above and click Save</li>
              </ol>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

function MailchimpIntegrationCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [selectedAudience, setSelectedAudience] = useState<string>("");
  const { toast } = useToast();

  const { data: connections, isLoading: isLoadingConnections } = useQuery<EmailConnection[]>({
    queryKey: ["/api/email-integrations"],
  });

  const connection = connections?.find(c => c.provider === "mailchimp");
  const isConnected = !!connection;

  const { data: audiences, isLoading: isLoadingAudiences, refetch: refetchAudiences } = useQuery<Audience[]>({
    queryKey: ["/api/email-integrations", connection?.id, "audiences"],
    enabled: !!connection?.id,
  });

  const { data: events } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/events"],
    enabled: isConnected,
  });

  const form = useForm<MailchimpFormData>({
    resolver: zodResolver(mailchimpSchema),
    defaultValues: {
      apiKey: "",
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (data: MailchimpFormData) => {
      return await apiRequest("POST", "/api/email-integrations", {
        provider: "mailchimp",
        apiKey: data.apiKey,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-integrations"] });
      toast({ title: "Mailchimp connected successfully" });
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Session expired. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!connection?.id) throw new Error("No connection to remove");
      return await apiRequest("DELETE", `/api/email-integrations/${connection.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-integrations"] });
      toast({ title: "Mailchimp disconnected" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Session expired. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!connection?.id) throw new Error("No connection");
      return await apiRequest("POST", `/api/email-integrations/${connection.id}/sync`, {
        audienceId: selectedAudience,
        eventId: selectedEvent || undefined,
        direction: "push",
      });
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Sync completed", 
        description: `${data.successCount} contacts synced successfully` 
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Session expired. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card data-testid="card-integration-mailchimp">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-md bg-muted">
              <SiMailchimp 
                className="h-6 w-6" 
                style={{ color: "#FFE01B" }}
                data-testid="icon-mailchimp"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base" data-testid="title-mailchimp">
                  Mailchimp
                </CardTitle>
                {isLoadingConnections ? (
                  <Skeleton className="h-5 w-20" />
                ) : isConnected ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-muted-foreground" />
                    Not Connected
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1" data-testid="description-mailchimp">
                Send email marketing campaigns and manage subscriber lists
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              data-testid="button-configure-mailchimp"
              className="flex items-center gap-1"
            >
              Configure
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-4">
            <Separator />

            {isConnected && connection ? (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-md space-y-2">
                  <p className="text-sm font-medium">Connected Account</p>
                  <p className="text-sm text-muted-foreground">
                    {connection.accountName} ({connection.accountId})
                  </p>
                  {connection.lastSyncedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last synced: {new Date(connection.lastSyncedAt).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Audiences</p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => refetchAudiences()}
                      disabled={isLoadingAudiences}
                      data-testid="button-refresh-audiences"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoadingAudiences ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                  {isLoadingAudiences ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : audiences && audiences.length > 0 ? (
                    <div className="space-y-3">
                      <Select value={selectedAudience} onValueChange={setSelectedAudience}>
                        <SelectTrigger data-testid="select-audience">
                          <SelectValue placeholder="Select an audience" />
                        </SelectTrigger>
                        <SelectContent>
                          {audiences.map((audience) => (
                            <SelectItem key={audience.id} value={audience.id}>
                              {audience.name} ({audience.memberCount} members)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {events && events.length > 0 && (
                        <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                          <SelectTrigger data-testid="select-event">
                            <SelectValue placeholder="All attendees (or select event)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All attendees</SelectItem>
                            {events.map((event) => (
                              <SelectItem key={event.id} value={event.id}>
                                {event.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <Button 
                        size="sm"
                        onClick={() => syncMutation.mutate()}
                        disabled={!selectedAudience || syncMutation.isPending}
                        data-testid="button-sync-mailchimp"
                      >
                        {syncMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          "Sync Attendees"
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No audiences found. Create an audience in Mailchimp first.
                    </p>
                  )}
                </div>

                <Separator />

                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  data-testid="button-disconnect-mailchimp"
                >
                  {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => connectMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Enter your Mailchimp API key" 
                            {...field} 
                            data-testid="input-mailchimp-api-key"
                          />
                        </FormControl>
                        <FormDescription>
                          Your API key can be found in Mailchimp under Account Settings, then Extras, then API keys
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={connectMutation.isPending}
                    data-testid="button-connect-mailchimp"
                  >
                    {connectMutation.isPending ? "Connecting..." : "Connect"}
                  </Button>
                </form>
              </Form>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

function ResendIntegrationCard() {
  const [isOpen, setIsOpen] = useState(false);

  const { data: resendStatus, isLoading } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/settings/resend-status"],
  });

  const isConfigured = resendStatus?.configured ?? false;

  return (
    <Card data-testid="card-integration-resend">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-md bg-muted">
              <Send className="h-6 w-6" data-testid="icon-resend" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base" data-testid="title-resend">
                  Resend
                </CardTitle>
                {isLoading ? (
                  <Skeleton className="h-5 w-20" />
                ) : isConfigured ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-muted-foreground" />
                    Not Configured
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1" data-testid="description-resend">
                Send transactional emails for confirmations and notifications
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              data-testid="button-configure-resend"
              className="flex items-center gap-1"
            >
              Configure
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-4">
            <Separator />

            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">API Key Status</p>
                <p className="text-sm text-muted-foreground">RESEND_API_KEY environment variable</p>
              </div>
              {isConfigured ? (
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

            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium">Setup Instructions</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Create a free account at{" "}
                  <a 
                    href="https://resend.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    resend.com <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Generate an API key in the Resend dashboard</li>
                <li>Add the API key to your Replit Secrets as RESEND_API_KEY</li>
                <li>Restart your application to apply the changes</li>
              </ol>
            </div>

            {!isConfigured && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Configuration Required</AlertTitle>
                <AlertDescription>
                  The RESEND_API_KEY secret must be configured in your Replit Secrets panel.
                  This cannot be set through the UI for security reasons.
                </AlertDescription>
              </Alert>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

function StripeIntegrationCard() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const { data: organization, isLoading } = useQuery<Organization>({
    queryKey: ["/api/auth/organization"],
  });

  const isConfigured = !!(organization?.stripePublishableKey && organization?.stripeSecretKey);

  const form = useForm<StripeFormData>({
    resolver: zodResolver(stripeSchema),
    defaultValues: {
      stripePublishableKey: "",
      stripeSecretKey: "",
      paymentEnabled: false,
    },
    values: organization ? {
      stripePublishableKey: organization.stripePublishableKey ?? "",
      stripeSecretKey: "",
      paymentEnabled: organization.paymentEnabled ?? false,
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: StripeFormData) => {
      const updateData: Record<string, any> = {
        paymentEnabled: data.paymentEnabled,
      };
      if (data.stripePublishableKey) {
        updateData.stripePublishableKey = data.stripePublishableKey;
      }
      if (data.stripeSecretKey) {
        updateData.stripeSecretKey = data.stripeSecretKey;
      }
      return await apiRequest("PATCH", "/api/auth/organization", updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/organization"] });
      toast({ title: "Stripe settings saved successfully" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Session expired. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card data-testid="card-integration-stripe">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-md bg-muted">
              <SiStripe 
                className="h-6 w-6" 
                style={{ color: "#635BFF" }}
                data-testid="icon-stripe"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base" data-testid="title-stripe">
                  Stripe
                </CardTitle>
                {isLoading ? (
                  <Skeleton className="h-5 w-20" />
                ) : isConfigured ? (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-muted-foreground" />
                    Not Configured
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1" data-testid="description-stripe">
                Process payments for event registrations and tickets
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              data-testid="button-configure-stripe"
              className="flex items-center gap-1"
            >
              Configure
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-4">
            <Separator />

            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Security Warning</AlertTitle>
                    <AlertDescription>
                      API keys are sensitive credentials. Keep them secure and never share them publicly.
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
                        <FormLabel>Publishable Key</FormLabel>
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
                        <FormLabel>Secret Key</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={organization?.stripeSecretKey ? "sk_****" : "sk_live_..."}
                            {...field}
                            data-testid="input-stripe-secret-key"
                          />
                        </FormControl>
                        <FormDescription>
                          Your Stripe secret key (starts with sk_). Leave blank to keep existing.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={updateMutation.isPending}
                    data-testid="button-save-stripe"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </form>
              </Form>
            )}

            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium">Setup Instructions</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Go to your{" "}
                  <a 
                    href="https://dashboard.stripe.com/apikeys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Stripe Dashboard <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Copy your Publishable key and Secret key</li>
                <li>Paste the keys above and enable payment processing</li>
              </ol>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

function GoogleSheetsIntegrationCard() {
  return (
    <Card data-testid="card-integration-google-sheets">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-md bg-muted">
            <SiGooglesheets 
              className="h-6 w-6" 
              style={{ color: "#34A853" }}
              data-testid="icon-google-sheets"
            />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base" data-testid="title-google-sheets">
              Google Sheets
            </CardTitle>
            <CardDescription className="mt-1" data-testid="description-google-sheets">
              Import attendee data from spreadsheets
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Link href="/import-attendees">
          <Button 
            variant="outline" 
            size="sm"
            data-testid="button-configure-google-sheets"
          >
            Import Attendees
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function Integrations() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Integrations" 
        breadcrumbs={[{ label: "Integrations" }]} 
      />
      
      <div className="flex-1 overflow-auto p-6 space-y-8">
        <section data-testid="section-social-media-integrations">
          <h2 className="text-xl font-semibold mb-4" data-testid="heading-social-media-integrations">
            Social Media Integrations
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <SocialMediaIntegrationCard 
              provider="twitter"
              name="Twitter/X"
              description="Post event updates and engage with attendees on social media"
              icon={SiX}
              iconColor="#000000"
            />
            <SocialMediaIntegrationCard 
              provider="linkedin"
              name="LinkedIn"
              description="Share professional networking posts and event announcements"
              icon={SiLinkedin}
              iconColor="#0A66C2"
            />
            <SocialMediaIntegrationCard 
              provider="instagram"
              name="Instagram"
              description="Share visual content and event highlights with your audience"
              icon={SiInstagram}
              iconColor="#E4405F"
            />
            <SocialMediaIntegrationCard 
              provider="facebook"
              name="Facebook"
              description="Engage with attendees and promote events on Facebook"
              icon={SiFacebook}
              iconColor="#1877F2"
            />
          </div>
        </section>

        <section data-testid="section-email-marketing">
          <h2 className="text-xl font-semibold mb-4" data-testid="heading-email-marketing">
            Email & Marketing
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MailchimpIntegrationCard />
            <ResendIntegrationCard />
          </div>
        </section>

        <section data-testid="section-payments">
          <h2 className="text-xl font-semibold mb-4" data-testid="heading-payments">
            Payments
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <StripeIntegrationCard />
          </div>
        </section>

        <section data-testid="section-data-import">
          <h2 className="text-xl font-semibold mb-4" data-testid="heading-data-import">
            Data Import
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <GoogleSheetsIntegrationCard />
          </div>
        </section>
      </div>
    </div>
  );
}
