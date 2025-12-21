import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LogOut, User, Shield, Bell, Palette, FileText, Plug, Building2, Globe, Loader2, CheckCircle2, Copy, RefreshCw, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CustomFontsManager } from "@/components/custom-fonts-manager";
import type { Organization } from "@shared/schema";

export default function Settings() {
  const { user, organization } = useAuth();
  const { toast } = useToast();
  const [customDomain, setCustomDomain] = useState("");
  const [isEditingDomain, setIsEditingDomain] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

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
                  {domainStatus?.customDomain && (
                    domainStatus.customDomainVerified ? (
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

                {domainStatus?.customDomain && !domainStatus.customDomainVerified && domainStatus.instructions && (
                  <div className="mt-4 space-y-4">
                    <div className="bg-muted/50 rounded-md p-4 space-y-3">
                      <p className="font-medium text-sm">DNS Configuration Instructions</p>
                      <p className="text-sm text-muted-foreground">
                        Complete the following steps in your DNS provider (e.g., Cloudflare) to verify ownership of your domain:
                      </p>
                      
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <span className="text-xs font-medium bg-muted rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">1</span>
                          <div className="text-sm">
                            <p className="font-medium">Add CNAME Record</p>
                            <p className="text-muted-foreground">{domainStatus.instructions.step1}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <span className="text-xs font-medium bg-muted rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">2</span>
                          <div className="text-sm flex-1">
                            <p className="font-medium">Add TXT Record for Verification</p>
                            <p className="text-muted-foreground">{domainStatus.instructions.step2}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded text-xs font-mono break-all" data-testid="text-verification-token">
                                eventgtm-verify={domainStatus.verificationToken}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={copyToken}
                                data-testid="button-copy-token"
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        {domainStatus.instructions.cloudflareNote}
                      </p>
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

                {domainStatus?.customDomain && domainStatus.customDomainVerified && (
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

          <CustomFontsManager />

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
