import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, User, Shield, Bell, Palette, FileText, Plug, Building2, Globe, Loader2, CheckCircle2, Copy, RefreshCw, AlertCircle, Key, Plus, Edit2, RotateCcw, Trash2, Eye, AlertTriangle, Clock, Calendar, Activity } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Organization, ApiKey, ApiKeyAuditLog } from "@shared/schema";
import { format } from "date-fns";

// Types for API responses
interface ApiKeyScope {
  scope: string;
  description: string;
}

interface ApiKeyWithSecret extends Omit<ApiKey, 'hashedSecret' | 'organizationId' | 'createdBy' | 'updatedAt'> {
  secret?: string;
}

// Form schemas
const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  scopes: z.array(z.string()).min(1, "Select at least one scope"),
  rateLimitPerMinute: z.coerce.number().int().min(1).max(10000).default(60),
  rateLimitPerDay: z.coerce.number().int().min(1).max(1000000).default(10000),
  expiresAt: z.string().optional(),
});

const editApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  scopes: z.array(z.string()).min(1, "Select at least one scope"),
  status: z.enum(["active", "paused"]),
  rateLimitPerMinute: z.coerce.number().int().min(1).max(10000),
  rateLimitPerDay: z.coerce.number().int().min(1).max(1000000),
  expiresAt: z.string().optional(),
});

type CreateApiKeyFormData = z.infer<typeof createApiKeySchema>;
type EditApiKeyFormData = z.infer<typeof editApiKeySchema>;

export default function Settings() {
  const { user, organization, isOwner } = useAuth();
  const { toast } = useToast();
  const [customDomain, setCustomDomain] = useState("");
  const [isEditingDomain, setIsEditingDomain] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // API Key Management State
  const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false);
  const [editKeyDialogOpen, setEditKeyDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKeyWithSecret | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  // Fetch current organization data
  const { data: orgData } = useQuery<Organization>({
    queryKey: ["/api/auth/organization"],
  });

  // Set custom domain when org data loads
  useEffect(() => {
    if (orgData?.customDomain) {
      setCustomDomain(orgData.customDomain);
    }
  }, [orgData?.customDomain]);

  // Set profile fields when user data loads
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user]);

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      return await apiRequest("PATCH", "/api/auth/user", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile Updated",
        description: "Your name has been updated successfully.",
      });
      setIsEditingProfile(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Update organization custom domain mutation
  const updateDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      return await apiRequest("PATCH", "/api/organization/custom-domain", { customDomain: domain || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/organization"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organization/domain-status"] });
      toast({
        title: "Custom Domain Updated",
        description: "Your organization's custom domain has been saved.",
      });
      setIsEditingDomain(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update custom domain",
        variant: "destructive",
      });
    },
  });

  // Fetch domain verification status
  const { data: domainStatus } = useQuery<{
    customDomain: string | null;
    customDomainVerified: boolean;
    verificationToken: string | null;
    instructions: {
      step1: string;
      step2: string;
      cloudflareNote: string;
      cnameRecord?: {
        type: string;
        host: string;
        value: string;
        description: string;
      };
      txtRecord?: {
        type: string;
        host: string;
        value: string;
        description: string;
      };
    } | null;
  }>({
    queryKey: ["/api/organization/domain-status"],
    enabled: !!orgData,
  });

  // Verify domain mutation
  const verifyDomainMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/organization/verify-domain", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/organization"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organization/domain-status"] });
      if (data.verified) {
        toast({
          title: "Domain Verified",
          description: "Your custom domain has been successfully verified!",
        });
      } else {
        toast({
          title: "Verification Pending",
          description: data.message || "DNS records not found. Please check your configuration.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify domain",
        variant: "destructive",
      });
    },
  });

  // Copy token to clipboard
  const copyToken = () => {
    if (domainStatus?.verificationToken) {
      const fullValue = `eventgtm-verify=${domainStatus.verificationToken}`;
      navigator.clipboard.writeText(fullValue);
      toast({
        title: "Copied",
        description: "Verification token copied to clipboard.",
      });
    }
  };

  // API Key Queries and Mutations
  const { data: apiKeys, isLoading: apiKeysLoading } = useQuery<ApiKeyWithSecret[]>({
    queryKey: ["/api/organization/api-keys"],
    enabled: !!orgData && isOwner,
  });

  const { data: availableScopes } = useQuery<ApiKeyScope[]>({
    queryKey: ["/api/organization/api-keys/scopes"],
    enabled: !!orgData && isOwner,
  });

  const { data: keyLogs, isLoading: keyLogsLoading } = useQuery<ApiKeyAuditLog[]>({
    queryKey: ["/api/organization/api-keys", selectedKey?.id, "logs"],
    enabled: !!selectedKey?.id && logsDialogOpen,
  });

  // Create API Key Form
  const createKeyForm = useForm<CreateApiKeyFormData>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: {
      name: "",
      description: "",
      scopes: [],
      rateLimitPerMinute: 60,
      rateLimitPerDay: 10000,
      expiresAt: "",
    },
  });

  // Edit API Key Form
  const editKeyForm = useForm<EditApiKeyFormData>({
    resolver: zodResolver(editApiKeySchema),
    defaultValues: {
      name: "",
      description: "",
      scopes: [],
      status: "active",
      rateLimitPerMinute: 60,
      rateLimitPerDay: 10000,
      expiresAt: "",
    },
  });

  // Create API Key Mutation
  const createKeyMutation = useMutation({
    mutationFn: async (data: CreateApiKeyFormData) => {
      const res = await apiRequest("POST", "/api/organization/api-keys", {
        ...data,
        expiresAt: data.expiresAt || undefined,
      });
      return res.json();
    },
    onSuccess: (data: ApiKeyWithSecret) => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/api-keys"] });
      setNewSecret(data.secret || null);
      setCreateKeyDialogOpen(false);
      setSecretDialogOpen(true);
      createKeyForm.reset();
      toast({
        title: "API Key Created",
        description: "Your new API key has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  // Update API Key Mutation
  const updateKeyMutation = useMutation({
    mutationFn: async (data: EditApiKeyFormData & { id: string }) => {
      const { id, ...updates } = data;
      const res = await apiRequest("PATCH", `/api/organization/api-keys/${id}`, {
        ...updates,
        expiresAt: updates.expiresAt || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/api-keys"] });
      setEditKeyDialogOpen(false);
      setSelectedKey(null);
      editKeyForm.reset();
      toast({
        title: "API Key Updated",
        description: "The API key has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update API key",
        variant: "destructive",
      });
    },
  });

  // Rotate API Key Mutation
  const rotateKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/organization/api-keys/${id}/rotate`, {});
      return res.json();
    },
    onSuccess: (data: ApiKeyWithSecret) => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/api-keys"] });
      setNewSecret(data.secret || null);
      setRotateDialogOpen(false);
      setSecretDialogOpen(true);
      toast({
        title: "API Key Rotated",
        description: "A new secret has been generated for this API key.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to rotate API key",
        variant: "destructive",
      });
    },
  });

  // Revoke API Key Mutation
  const revokeKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/organization/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/api-keys"] });
      setRevokeDialogOpen(false);
      setSelectedKey(null);
      toast({
        title: "API Key Revoked",
        description: "The API key has been permanently revoked.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke API key",
        variant: "destructive",
      });
    },
  });

  // Helper functions for API keys
  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "Copied",
      description: "API key copied to clipboard.",
    });
  };

  const openEditDialog = (key: ApiKeyWithSecret) => {
    setSelectedKey(key);
    editKeyForm.reset({
      name: key.name,
      description: key.description || "",
      scopes: key.scopes as string[],
      status: key.status as "active" | "paused",
      rateLimitPerMinute: key.rateLimitPerMinute || 60,
      rateLimitPerDay: key.rateLimitPerDay || 10000,
      expiresAt: key.expiresAt ? format(new Date(key.expiresAt), "yyyy-MM-dd") : "",
    });
    setEditKeyDialogOpen(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "paused":
        return "secondary";
      case "revoked":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "Never";
    return format(new Date(date), "MMM d, yyyy");
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

  const handleSaveDomain = () => {
    // Strip protocol if provided
    let cleanDomain = customDomain.trim();
    if (cleanDomain.startsWith("https://")) {
      cleanDomain = cleanDomain.substring(8);
    } else if (cleanDomain.startsWith("http://")) {
      cleanDomain = cleanDomain.substring(7);
    }
    // Remove trailing slash
    cleanDomain = cleanDomain.replace(/\/$/, "");
    setCustomDomain(cleanDomain);
    updateDomainMutation.mutate(cleanDomain);
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
                <div className="flex-1">
                  {isEditingProfile ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="First name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          data-testid="input-first-name"
                        />
                        <Input
                          placeholder="Last name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          data-testid="input-last-name"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateProfileMutation.mutate({ firstName, lastName })}
                          disabled={updateProfileMutation.isPending}
                          data-testid="button-save-profile"
                        >
                          {updateProfileMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsEditingProfile(false);
                            setFirstName(user?.firstName || "");
                            setLastName(user?.lastName || "");
                          }}
                          data-testid="button-cancel-profile"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold" data-testid="text-user-name">
                          {user?.firstName && user?.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user?.firstName || user?.lastName || "Set your name"}
                        </h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingProfile(true)}
                          data-testid="button-edit-profile"
                        >
                          Edit
                        </Button>
                      </div>
                      <p className="text-muted-foreground" data-testid="text-user-email">{user?.email}</p>
                    </>
                  )}
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
                <Building2 className="h-5 w-5" />
                Organization
              </CardTitle>
              <CardDescription>Configure your organization settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">Organization Name</p>
                <p className="text-sm text-muted-foreground">{orgData?.name || organization?.name || "Not set"}</p>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">Custom Domain</p>
                  {orgData?.customDomain && (
                    (orgData.customDomainVerified || domainStatus?.customDomainVerified) ? (
                      <Badge variant="default" className="ml-2" data-testid="badge-domain-verified">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="ml-2" data-testid="badge-domain-pending">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending Verification
                      </Badge>
                    )
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Set your custom domain for invitation links and public URLs (e.g., www.example.com)
                </p>
                
                {isEditingDomain ? (
                  <div className="flex flex-wrap gap-2">
                    <Input
                      placeholder="www.example.com"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="flex-1 min-w-[200px]"
                      data-testid="input-custom-domain"
                    />
                    <Button
                      onClick={handleSaveDomain}
                      disabled={updateDomainMutation.isPending}
                      data-testid="button-save-domain"
                    >
                      {updateDomainMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingDomain(false);
                        setCustomDomain(orgData?.customDomain || "");
                      }}
                      data-testid="button-cancel-domain"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm">
                      {orgData?.customDomain ? (
                        <span className="font-mono bg-muted px-2 py-1 rounded">{orgData.customDomain}</span>
                      ) : (
                        <span className="text-muted-foreground">Not configured</span>
                      )}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCustomDomain(orgData?.customDomain || "");
                        setIsEditingDomain(true);
                      }}
                      data-testid="button-edit-domain"
                    >
                      {orgData?.customDomain ? "Edit" : "Configure"}
                    </Button>
                  </div>
                )}

                {orgData?.customDomain && !orgData.customDomainVerified && !domainStatus?.customDomainVerified && domainStatus?.instructions && (
                  <div className="mt-4 space-y-4">
                    <div className="bg-muted/50 rounded-md p-4 space-y-4">
                      <p className="font-medium text-sm">DNS Configuration Instructions</p>
                      <p className="text-sm text-muted-foreground">
                        Add the following DNS records in your domain provider (e.g., Cloudflare, GoDaddy, Namecheap):
                      </p>
                      
                      {/* DNS Records Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Type</th>
                              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Host / Name</th>
                              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Value / Target</th>
                              <th className="text-left py-2 px-2 font-medium text-muted-foreground sr-only">Copy</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* CNAME Record */}
                            <tr className="border-b">
                              <td className="py-2 px-2">
                                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">CNAME</code>
                              </td>
                              <td className="py-2 px-2">
                                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" data-testid="text-cname-host">
                                  {domainStatus.instructions.cnameRecord?.host || orgData.customDomain.split('.')[0]}
                                </code>
                              </td>
                              <td className="py-2 px-2">
                                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono break-all" data-testid="text-cname-value">
                                  {domainStatus.instructions.cnameRecord?.value || window.location.host}
                                </code>
                              </td>
                              <td className="py-2 px-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    navigator.clipboard.writeText(domainStatus?.instructions?.cnameRecord?.value || window.location.host);
                                    toast({ title: "Copied!", description: "CNAME value copied to clipboard" });
                                  }}
                                  data-testid="button-copy-cname"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                            {/* TXT Record */}
                            <tr>
                              <td className="py-2 px-2">
                                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">TXT</code>
                              </td>
                              <td className="py-2 px-2">
                                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" data-testid="text-txt-host">
                                  {domainStatus.instructions.txtRecord?.host || '_eventgtm'}
                                </code>
                              </td>
                              <td className="py-2 px-2">
                                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono break-all" data-testid="text-txt-value">
                                  {domainStatus.instructions.txtRecord?.value || `eventgtm-verify=${domainStatus.verificationToken}`}
                                </code>
                              </td>
                              <td className="py-2 px-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={copyToken}
                                  data-testid="button-copy-token"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Additional notes */}
                      <div className="space-y-2 text-xs text-muted-foreground">
                        {domainStatus.instructions.cnameRecord?.host === '@' && (
                          <p className="text-amber-600 dark:text-amber-400">
                            Note: Root domains (@) cannot use CNAME records per DNS standards. Use a subdomain like "events" instead, or use ALIAS/ANAME if your provider supports it.
                          </p>
                        )}
                        <p>
                          <strong>Cloudflare users:</strong> {domainStatus.instructions.cloudflareNote}
                        </p>
                        <p>
                          DNS changes may take up to 48 hours to propagate, though typically much faster.
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => verifyDomainMutation.mutate()}
                      disabled={verifyDomainMutation.isPending}
                      data-testid="button-verify-domain"
                    >
                      {verifyDomainMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Verify Domain
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {orgData?.customDomain && (orgData.customDomainVerified || domainStatus?.customDomainVerified) && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Your custom domain is verified and active.</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Integrations
              </CardTitle>
              <CardDescription>Manage connected services and APIs</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure payment processing, email services, social media, and other integrations.
              </p>
              <Button variant="outline" asChild>
                <Link href="/integrations" data-testid="link-integrations">
                  Manage Integrations
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* API Keys Section - Only visible to organization owners */}
          {isOwner && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      API Keys
                    </CardTitle>
                    <CardDescription>Manage API keys for external integrations</CardDescription>
                  </div>
                  <Button
                    onClick={() => setCreateKeyDialogOpen(true)}
                    data-testid="button-create-api-key"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create API Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {apiKeysLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                ) : !apiKeys || apiKeys.length === 0 ? (
                  <div className="text-center py-8">
                    <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">No API keys yet</p>
                    <p className="text-sm text-muted-foreground">
                      Create an API key to integrate with external applications.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {apiKeys.map((apiKey) => (
                      <div
                        key={apiKey.id}
                        className="border rounded-lg p-4 space-y-3"
                        data-testid={`api-key-item-${apiKey.id}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium" data-testid={`api-key-name-${apiKey.id}`}>
                                {apiKey.name}
                              </span>
                              <Badge
                                variant={getStatusBadgeVariant(apiKey.status)}
                                data-testid={`api-key-status-${apiKey.id}`}
                              >
                                {apiKey.status}
                              </Badge>
                            </div>
                            {apiKey.description && (
                              <p className="text-sm text-muted-foreground" data-testid={`api-key-description-${apiKey.id}`}>
                                {apiKey.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {apiKey.status !== "revoked" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditDialog(apiKey)}
                                  data-testid={`button-edit-api-key-${apiKey.id}`}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedKey(apiKey);
                                    setRotateDialogOpen(true);
                                  }}
                                  data-testid={`button-rotate-api-key-${apiKey.id}`}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedKey(apiKey);
                                    setRevokeDialogOpen(true);
                                  }}
                                  data-testid={`button-revoke-api-key-${apiKey.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedKey(apiKey);
                                setLogsDialogOpen(true);
                              }}
                              data-testid={`button-logs-api-key-${apiKey.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Key:</span>
                            <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono" data-testid={`api-key-prefix-${apiKey.id}`}>
                              {apiKey.keyPrefix}...
                            </code>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Rate:</span>
                            <span data-testid={`api-key-rate-${apiKey.id}`}>
                              {apiKey.rateLimitPerMinute}/min, {apiKey.rateLimitPerDay}/day
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {(apiKey.scopes as string[]).map((scope) => (
                            <Badge key={scope} variant="outline" className="text-xs" data-testid={`api-key-scope-${apiKey.id}-${scope}`}>
                              {scope}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Created: {formatDate(apiKey.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            <span data-testid={`api-key-last-used-${apiKey.id}`}>
                              Last used: {formatDate(apiKey.lastUsedAt)}
                            </span>
                          </div>
                          {apiKey.expiresAt && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span data-testid={`api-key-expires-${apiKey.id}`}>
                                Expires: {formatDate(apiKey.expiresAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
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

      {/* Create API Key Dialog */}
      <Dialog open={createKeyDialogOpen} onOpenChange={setCreateKeyDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for external integrations. The key will only be shown once after creation.
            </DialogDescription>
          </DialogHeader>
          <Form {...createKeyForm}>
            <form onSubmit={createKeyForm.handleSubmit((data) => createKeyMutation.mutate(data))} className="flex flex-col flex-1 min-h-0">
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
              <FormField
                control={createKeyForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="My API Key" {...field} data-testid="input-api-key-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createKeyForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional description for this API key"
                        {...field}
                        data-testid="input-api-key-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createKeyForm.control}
                name="scopes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scopes *</FormLabel>
                    <FormDescription>Select the permissions for this API key</FormDescription>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                      {availableScopes?.map((scope) => (
                        <div key={scope.scope} className="flex items-start gap-2">
                          <Checkbox
                            id={`create-scope-${scope.scope}`}
                            checked={field.value.includes(scope.scope)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, scope.scope]);
                              } else {
                                field.onChange(field.value.filter((s) => s !== scope.scope));
                              }
                            }}
                            data-testid={`checkbox-scope-${scope.scope}`}
                          />
                          <Label
                            htmlFor={`create-scope-${scope.scope}`}
                            className="text-sm leading-tight cursor-pointer"
                          >
                            <span className="font-medium">{scope.scope}</span>
                            <span className="text-muted-foreground block text-xs">{scope.description}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createKeyForm.control}
                  name="rateLimitPerMinute"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Limit (per minute)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                          data-testid="input-rate-limit-minute"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createKeyForm.control}
                  name="rateLimitPerDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Limit (per day)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 10000)}
                          data-testid="input-rate-limit-day"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createKeyForm.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-api-key-expires" />
                    </FormControl>
                    <FormDescription>Leave empty for no expiration</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
                </div>
              </ScrollArea>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateKeyDialogOpen(false);
                    createKeyForm.reset();
                  }}
                  data-testid="button-cancel-create-key"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createKeyMutation.isPending} data-testid="button-submit-create-key">
                  {createKeyMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create API Key"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit API Key Dialog */}
      <Dialog open={editKeyDialogOpen} onOpenChange={setEditKeyDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit API Key</DialogTitle>
            <DialogDescription>Update the settings for this API key.</DialogDescription>
          </DialogHeader>
          <Form {...editKeyForm}>
            <form
              onSubmit={editKeyForm.handleSubmit((data) =>
                selectedKey && updateKeyMutation.mutate({ ...data, id: selectedKey.id })
              )}
              className="flex flex-col flex-1 min-h-0"
            >
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
              <FormField
                control={editKeyForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-api-key-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editKeyForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-edit-api-key-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editKeyForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-api-key-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editKeyForm.control}
                name="scopes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scopes *</FormLabel>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                      {availableScopes?.map((scope) => (
                        <div key={scope.scope} className="flex items-start gap-2">
                          <Checkbox
                            id={`edit-scope-${scope.scope}`}
                            checked={field.value.includes(scope.scope)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, scope.scope]);
                              } else {
                                field.onChange(field.value.filter((s) => s !== scope.scope));
                              }
                            }}
                            data-testid={`checkbox-edit-scope-${scope.scope}`}
                          />
                          <Label htmlFor={`edit-scope-${scope.scope}`} className="text-sm leading-tight cursor-pointer">
                            <span className="font-medium">{scope.scope}</span>
                            <span className="text-muted-foreground block text-xs">{scope.description}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editKeyForm.control}
                  name="rateLimitPerMinute"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Limit (per minute)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                          data-testid="input-edit-rate-limit-minute"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editKeyForm.control}
                  name="rateLimitPerDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Limit (per day)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 10000)}
                          data-testid="input-edit-rate-limit-day"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editKeyForm.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-edit-api-key-expires" />
                    </FormControl>
                    <FormDescription>Leave empty for no expiration</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
                </div>
              </ScrollArea>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditKeyDialogOpen(false);
                    setSelectedKey(null);
                    editKeyForm.reset();
                  }}
                  data-testid="button-cancel-edit-key"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateKeyMutation.isPending} data-testid="button-submit-edit-key">
                  {updateKeyMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* One-Time Secret Display Dialog */}
      <Dialog open={secretDialogOpen} onOpenChange={setSecretDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Save Your API Key
            </DialogTitle>
            <DialogDescription>
              This is the only time you will see this API key. Copy it now and store it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <code
                  className="text-sm font-mono break-all flex-1"
                  data-testid="text-new-api-key"
                >
                  {newSecret}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => newSecret && copyApiKey(newSecret)}
                  data-testid="button-copy-new-api-key"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">Important</p>
                  <p className="mt-1">
                    This API key will not be shown again. If you lose it, you will need to rotate
                    the key to generate a new one.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setSecretDialogOpen(false);
                setNewSecret(null);
                setSelectedKey(null);
              }}
              data-testid="button-close-secret-dialog"
            >
              I've Saved My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate Key Confirmation Dialog */}
      <AlertDialog open={rotateDialogOpen} onOpenChange={setRotateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new secret for "{selectedKey?.name}". The old secret will stop
              working immediately. Any applications using this key will need to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-rotate-key">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedKey && rotateKeyMutation.mutate(selectedKey.id)}
              disabled={rotateKeyMutation.isPending}
              data-testid="button-confirm-rotate-key"
            >
              {rotateKeyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rotating...
                </>
              ) : (
                "Rotate Key"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Key Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently revoke "{selectedKey?.name}". This action cannot be undone.
              Any applications using this key will immediately stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-revoke-key">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedKey && revokeKeyMutation.mutate(selectedKey.id)}
              disabled={revokeKeyMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-revoke-key"
            >
              {revokeKeyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke Key"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>API Key Logs</DialogTitle>
            <DialogDescription>
              Recent usage logs for "{selectedKey?.name}" ({selectedKey?.keyPrefix}...)
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            {keyLogsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))}
              </div>
            ) : !keyLogs || keyLogs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No logs yet</p>
                <p className="text-sm text-muted-foreground">
                  Logs will appear here once the API key is used.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {keyLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-3 text-sm space-y-1"
                    data-testid={`api-key-log-${log.id}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={log.statusCode < 400 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {log.statusCode}
                        </Badge>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">
                          {log.method}
                        </code>
                        <span className="text-muted-foreground">{log.route}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {log.latencyMs}ms
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(log.occurredAt), "MMM d, yyyy HH:mm:ss")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLogsDialogOpen(false);
                setSelectedKey(null);
              }}
              data-testid="button-close-logs-dialog"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
