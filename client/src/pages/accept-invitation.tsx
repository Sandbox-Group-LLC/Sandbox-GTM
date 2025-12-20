import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Shield, Check, X, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FEATURE_PERMISSIONS, type FeaturePermission } from "@shared/schema";
import logoImage from "@assets/Orange_bug_-_no_background_1765765097769.png";

const PERMISSION_LABELS: Record<FeaturePermission, { name: string; description: string }> = {
  programs: { name: "Programs", description: "Manage events and programs" },
  performance: { name: "Performance", description: "View analytics and reports" },
  goToMarket: { name: "Go-to-Market", description: "Campaigns and audience" },
  engagement: { name: "Engagement", description: "CFP, speakers, sponsors" },
  execution: { name: "Execution", description: "Sessions, vendors, run of show" },
  revenueRoi: { name: "Revenue & ROI", description: "Pipeline and ROI tracking" },
};

interface InvitationDetails {
  id: string;
  email: string;
  organizationName: string;
  permissions: string[] | null;
  expiresAt: string | null;
}

export default function AcceptInvitation() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get the invite code from URL
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");

  useEffect(() => {
    if (!code) {
      setError("No invitation code provided");
      setLoading(false);
      return;
    }

    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/${encodeURIComponent(code)}`);
        if (!response.ok) {
          const data = await response.json();
          setError(data.message || "Invalid or expired invitation");
          setLoading(false);
          return;
        }
        const data = await response.json();
        setInvitation(data);
      } catch {
        setError("Failed to load invitation details");
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [code]);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/invitations/accept", { code });
    },
    onSuccess: () => {
      toast({
        title: "Invitation accepted",
        description: `You are now a member of ${invitation?.organizationName}`,
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogin = () => {
    // Store the invite code in localStorage so we can redirect back after login
    if (code) {
      localStorage.setItem("pendingInviteCode", code);
    }
    window.location.href = "/api/login";
  };

  // Check for pending invite after login
  useEffect(() => {
    if (isAuthenticated && !code) {
      const pendingCode = localStorage.getItem("pendingInviteCode");
      if (pendingCode) {
        localStorage.removeItem("pendingInviteCode");
        navigate(`/accept-invitation?code=${encodeURIComponent(pendingCode)}`);
      }
    }
  }, [isAuthenticated, code, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border">
          <div className="container mx-auto px-6 py-4 flex items-center gap-4">
            <a href="/" className="flex items-center gap-2">
              <img src={logoImage} alt="Sandbox" className="h-6 w-6" />
              <span className="font-semibold text-lg">Sandbox</span>
            </a>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <Card className="w-full max-w-md" data-testid="card-invitation-error">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10">
                <X className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Invitation Not Available</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button onClick={() => navigate("/")} data-testid="button-go-home">
                Go to Home
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <a href="/" className="flex items-center gap-2">
            <img src={logoImage} alt="Sandbox" className="h-6 w-6" />
            <span className="font-semibold text-lg">Sandbox</span>
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md" data-testid="card-accept-invitation">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Team Invitation</CardTitle>
            <CardDescription>
              You have been invited to join
            </CardDescription>
            <p className="text-lg font-semibold mt-2" data-testid="text-organization-name">
              {invitation?.organizationName}
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {invitation?.permissions && invitation.permissions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>You will have access to:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {invitation.permissions.map((perm) => (
                    <Badge key={perm} variant="secondary">
                      {PERMISSION_LABELS[perm as FeaturePermission]?.name || perm}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {invitation?.expiresAt && (
              <p className="text-sm text-muted-foreground text-center">
                This invitation expires on{" "}
                {new Date(invitation.expiresAt).toLocaleDateString()}
              </p>
            )}

            {!isAuthenticated ? (
              <div className="space-y-3 pt-4">
                <p className="text-sm text-center text-muted-foreground">
                  Sign in to accept this invitation
                </p>
                <Button
                  className="w-full"
                  onClick={handleLogin}
                  data-testid="button-login-to-accept"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In to Accept
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pt-4">
                <p className="text-sm text-center text-muted-foreground">
                  Signed in as <span className="font-medium">{user?.email}</span>
                </p>
                <Button
                  className="w-full"
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending}
                  data-testid="button-accept-invitation"
                >
                  {acceptMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {acceptMutation.isPending ? "Accepting..." : "Accept Invitation"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
