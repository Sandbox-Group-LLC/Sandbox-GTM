import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { LogOut, User, Shield, Bell, Palette, CreditCard, AlertTriangle, FileText, Mail, ExternalLink, CheckCircle, XCircle, Share2, Info, Trash2, Eye, EyeOff, RefreshCw, Users, ChevronDown, Loader2 } from "lucide-react";
import { SiLinkedin, SiX, SiFacebook, SiInstagram, SiMailchimp } from "react-icons/si";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "wouter";
import type { Organization } from "@shared/schema";
import type { IconType } from "react-icons";

const paymentSettingsSchema = z.object({
  paymentEnabled: z.boolean(),
  stripePublishableKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
});

type PaymentSettingsFormData = z.infer<typeof paymentSettingsSchema>;

interface SocialCredential {
  provider: string;
  clientIdMasked: string;
  isConfigured: boolean;
}

interface SocialCredentialsFormProps {
  provider: string;
  icon: IconType;
  iconColor?: string;
  title: string;
  description: string;
  helpUrl: string;
  clientIdLabel: string;
  clientSecretLabel: string;
  credential?: SocialCredential;
  onSave: (provider: string, clientId: string, clientSecret: string) => void;
  onDelete: (provider: string) => void;
  isSaving: boolean;
  isDeleting: boolean;
}

function SocialCredentialsForm({
  provider,
  icon: Icon,
  iconColor,
  title,
  description,
  helpUrl,
  clientIdLabel,
  clientSecretLabel,
  credential,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: SocialCredentialsFormProps) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  const handleSave = () => {
    if (clientId && clientSecret) {
      onSave(provider, clientId, clientSecret);
      setClientId("");
      setClientSecret("");
    }
  };

  const handleDelete = () => {
    onDelete(provider);
  };

  return (
    <AccordionItem value={provider} data-testid={`accordion-${provider}`}>
      <AccordionTrigger className="text-sm" data-testid={`accordion-trigger-${provider}`}>
        <div className="flex items-center justify-between gap-2 w-full pr-2">
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4" style={iconColor ? { color: iconColor } : undefined} />
            {title}
          </span>
          {credential?.isConfigured ? (
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
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">{description}</p>

          {credential?.isConfigured && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Current {clientIdLabel}:</span>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{credential.clientIdMasked}</code>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`${provider}-client-id`}>{clientIdLabel}</Label>
              <Input
                id={`${provider}-client-id`}
                placeholder={`Enter ${clientIdLabel}`}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                data-testid={`input-${provider}-client-id`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${provider}-client-secret`}>{clientSecretLabel}</Label>
              <Input
                id={`${provider}-client-secret`}
                type="password"
                placeholder={`Enter ${clientSecretLabel}`}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                data-testid={`input-${provider}-client-secret`}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleSave}
              disabled={!clientId || !clientSecret || isSaving}
              data-testid={`button-save-${provider}`}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
            {credential?.isConfigured && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                data-testid={`button-remove-${provider}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "Removing..." : "Remove"}
              </Button>
            )}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Setup Help</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>To get your credentials:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Go to the developer portal</li>
                <li>Create or select your app</li>
                <li>Copy the {clientIdLabel} and {clientSecretLabel}</li>
              </ol>
              <a
                href={helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
              >
                Open Developer Portal <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

interface EmailConnection {
  id: string;
  provider: string;
  accountName: string | null;
  status: string | null;
  apiKeyMasked?: string;
  lastSyncedAt: string | null;
}

interface EmailAudience {
  id: string;
  externalId: string;
  name: string;
  memberCount: number | null;
}

function EmailMarketingSection() {
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [newProvider, setNewProvider] = useState("mailchimp");
  const [newApiKey, setNewApiKey] = useState("");
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());
  const [syncingAudiences, setSyncingAudiences] = useState<Set<string>>(new Set());

  const { data: connections, isLoading: connectionsLoading } = useQuery<EmailConnection[]>({
    queryKey: ["/api/email-integrations"],
  });

  const createConnectionMutation = useMutation({
    mutationFn: async ({ provider, apiKey }: { provider: string; apiKey: string }) => {
      return await apiRequest("POST", "/api/email-integrations", { provider, apiKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-integrations"] });
      toast({ title: "Connection created successfully" });
      setNewApiKey("");
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

  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/email-integrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-integrations"] });
      toast({ title: "Connection removed" });
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

  const handleCreateConnection = () => {
    if (newApiKey.trim()) {
      createConnectionMutation.mutate({ provider: newProvider, apiKey: newApiKey });
    }
  };

  const toggleConnectionExpanded = (id: string) => {
    setExpandedConnections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "mailchimp":
        return <SiMailchimp className="h-5 w-5" style={{ color: "#FFE01B" }} />;
      default:
        return <Mail className="h-5 w-5" />;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case "mailchimp":
        return "Mailchimp";
      default:
        return provider;
    }
  };

  return (
    <Card data-testid="card-email-marketing">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Marketing Platforms
        </CardTitle>
        <CardDescription>Connect email marketing platforms to sync attendees and manage campaigns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {connectionsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            {connections && connections.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Connected Platforms</h4>
                {connections.map((connection) => (
                  <EmailConnectionItem
                    key={connection.id}
                    connection={connection}
                    isExpanded={expandedConnections.has(connection.id)}
                    onToggleExpand={() => toggleConnectionExpanded(connection.id)}
                    onDelete={() => deleteConnectionMutation.mutate(connection.id)}
                    isDeleting={deleteConnectionMutation.isPending}
                    getProviderIcon={getProviderIcon}
                    getProviderName={getProviderName}
                    syncingAudiences={syncingAudiences}
                    setSyncingAudiences={setSyncingAudiences}
                  />
                ))}
              </div>
            )}

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Add Connection</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email-provider">Provider</Label>
                  <Select value={newProvider} onValueChange={setNewProvider}>
                    <SelectTrigger id="email-provider" data-testid="select-email-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mailchimp" data-testid="select-item-mailchimp">
                        <span className="flex items-center gap-2">
                          <SiMailchimp className="h-4 w-4" style={{ color: "#FFE01B" }} />
                          Mailchimp
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-api-key">API Key</Label>
                  <div className="relative">
                    <Input
                      id="email-api-key"
                      type={showApiKey ? "text" : "password"}
                      placeholder="Enter your API key"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      className="pr-10"
                      data-testid="input-email-api-key"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowApiKey(!showApiKey)}
                      data-testid="button-toggle-api-key-visibility"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={handleCreateConnection}
                  disabled={!newApiKey.trim() || createConnectionMutation.isPending}
                  data-testid="button-connect-email-platform"
                >
                  {createConnectionMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface EmailConnectionItemProps {
  connection: EmailConnection;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  getProviderIcon: (provider: string) => JSX.Element;
  getProviderName: (provider: string) => string;
  syncingAudiences: Set<string>;
  setSyncingAudiences: React.Dispatch<React.SetStateAction<Set<string>>>;
}

function EmailConnectionItem({
  connection,
  isExpanded,
  onToggleExpand,
  onDelete,
  isDeleting,
  getProviderIcon,
  getProviderName,
  syncingAudiences,
  setSyncingAudiences,
}: EmailConnectionItemProps) {
  const { toast } = useToast();

  const { data: audiences, isLoading: audiencesLoading, refetch: refetchAudiences } = useQuery<EmailAudience[]>({
    queryKey: ["/api/email-integrations", connection.id, "audiences"],
    enabled: isExpanded,
  });

  const refreshAudiencesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("GET", `/api/email-integrations/${connection.id}/audiences`);
    },
    onSuccess: () => {
      refetchAudiences();
      toast({ title: "Audiences refreshed" });
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

  const syncAttendeesMutation = useMutation({
    mutationFn: async ({ audienceId }: { audienceId: string }) => {
      return await apiRequest("POST", `/api/email-integrations/${connection.id}/sync`, {
        audienceId,
        direction: "push",
      });
    },
    onSuccess: () => {
      toast({ title: "Attendees sync started" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: (_, __, variables) => {
      setSyncingAudiences(prev => {
        const next = new Set(prev);
        next.delete(variables.audienceId);
        return next;
      });
    },
  });

  const handleSyncAudience = (audienceId: string) => {
    setSyncingAudiences(prev => new Set(prev).add(audienceId));
    syncAttendeesMutation.mutate({ audienceId });
  };

  return (
    <div className="border rounded-lg p-4 space-y-3" data-testid={`email-connection-${connection.id}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {getProviderIcon(connection.provider)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium" data-testid={`text-provider-name-${connection.id}`}>
                {getProviderName(connection.provider)}
              </span>
              {connection.accountName && (
                <span className="text-muted-foreground text-sm" data-testid={`text-account-name-${connection.id}`}>
                  ({connection.accountName})
                </span>
              )}
              <Badge
                variant={connection.status === "active" ? "outline" : "destructive"}
                className="flex items-center gap-1"
                data-testid={`badge-status-${connection.id}`}
              >
                {connection.status === "active" ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {connection.status === "active" ? "Active" : "Error"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
              {connection.apiKeyMasked && (
                <span data-testid={`text-api-key-masked-${connection.id}`}>
                  API Key: {connection.apiKeyMasked}
                </span>
              )}
              {connection.lastSyncedAt && (
                <span data-testid={`text-last-synced-${connection.id}`}>
                  Last synced: {new Date(connection.lastSyncedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={isDeleting}
          data-testid={`button-delete-connection-${connection.id}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start" data-testid={`button-toggle-audiences-${connection.id}`}>
            <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            {isExpanded ? "Hide Audiences" : "Show Audiences"}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-sm font-medium">Available Audiences</h5>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshAudiencesMutation.mutate()}
              disabled={refreshAudiencesMutation.isPending}
              data-testid={`button-refresh-audiences-${connection.id}`}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshAudiencesMutation.isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {audiencesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : audiences && audiences.length > 0 ? (
            <div className="space-y-2">
              {audiences.map((audience) => (
                <div
                  key={audience.id}
                  className="flex items-center justify-between gap-2 p-2 border rounded"
                  data-testid={`audience-item-${audience.id}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate" data-testid={`text-audience-name-${audience.id}`}>
                      {audience.name}
                    </span>
                    <Badge variant="secondary" className="text-xs" data-testid={`badge-member-count-${audience.id}`}>
                      {audience.memberCount ?? 0} members
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncAudience(audience.externalId)}
                    disabled={syncingAudiences.has(audience.externalId)}
                    data-testid={`button-sync-attendees-${audience.id}`}
                  >
                    {syncingAudiences.has(audience.externalId) ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      "Sync Attendees"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No audiences found. Click refresh to fetch audiences.</p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

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

  const { data: socialCredentials, isLoading: credentialsLoading } = useQuery<SocialCredential[]>({
    queryKey: ['/api/settings/social-credentials'],
  });

  const saveCredentialsMutation = useMutation({
    mutationFn: async ({ provider, clientId, clientSecret }: { provider: string; clientId: string; clientSecret: string }) => {
      await apiRequest('POST', `/api/settings/social-credentials/${provider}`, { clientId, clientSecret });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/social-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/social-integrations-status'] });
      toast({ title: "Credentials saved successfully" });
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

  const deleteCredentialsMutation = useMutation({
    mutationFn: async (provider: string) => {
      await apiRequest('DELETE', `/api/settings/social-credentials/${provider}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/social-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/social-integrations-status'] });
      toast({ title: "Credentials removed" });
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

  const getCredentialByProvider = (provider: string) => {
    return socialCredentials?.find(c => c.provider === provider);
  };

  const handleSaveCredentials = (provider: string, clientId: string, clientSecret: string) => {
    saveCredentialsMutation.mutate({ provider, clientId, clientSecret });
  };

  const handleDeleteCredentials = (provider: string) => {
    deleteCredentialsMutation.mutate(provider);
  };

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
              {credentialsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  <SocialCredentialsForm
                    provider="linkedin"
                    icon={SiLinkedin}
                    iconColor="#0A66C2"
                    title="LinkedIn"
                    description="Share event updates and professional networking"
                    helpUrl="https://www.linkedin.com/developers/apps"
                    clientIdLabel="Client ID"
                    clientSecretLabel="Client Secret"
                    credential={getCredentialByProvider('linkedin')}
                    onSave={handleSaveCredentials}
                    onDelete={handleDeleteCredentials}
                    isSaving={saveCredentialsMutation.isPending}
                    isDeleting={deleteCredentialsMutation.isPending}
                  />
                  <SocialCredentialsForm
                    provider="twitter"
                    icon={SiX}
                    title="Twitter / X"
                    description="Post event announcements and engage attendees"
                    helpUrl="https://developer.twitter.com/en/portal/dashboard"
                    clientIdLabel="API Key"
                    clientSecretLabel="API Secret"
                    credential={getCredentialByProvider('twitter')}
                    onSave={handleSaveCredentials}
                    onDelete={handleDeleteCredentials}
                    isSaving={saveCredentialsMutation.isPending}
                    isDeleting={deleteCredentialsMutation.isPending}
                  />
                  <SocialCredentialsForm
                    provider="facebook"
                    icon={SiFacebook}
                    iconColor="#1877F2"
                    title="Facebook"
                    description="Create event pages and reach broader audiences"
                    helpUrl="https://developers.facebook.com/apps"
                    clientIdLabel="App ID"
                    clientSecretLabel="App Secret"
                    credential={getCredentialByProvider('facebook')}
                    onSave={handleSaveCredentials}
                    onDelete={handleDeleteCredentials}
                    isSaving={saveCredentialsMutation.isPending}
                    isDeleting={deleteCredentialsMutation.isPending}
                  />
                  <SocialCredentialsForm
                    provider="instagram"
                    icon={SiInstagram}
                    iconColor="#E4405F"
                    title="Instagram"
                    description="Share visual content and event highlights"
                    helpUrl="https://developers.facebook.com/apps"
                    clientIdLabel="App ID"
                    clientSecretLabel="App Secret"
                    credential={getCredentialByProvider('instagram')}
                    onSave={handleSaveCredentials}
                    onDelete={handleDeleteCredentials}
                    isSaving={saveCredentialsMutation.isPending}
                    isDeleting={deleteCredentialsMutation.isPending}
                  />
                </Accordion>
              )}
            </CardContent>
          </Card>

          <EmailMarketingSection />

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
