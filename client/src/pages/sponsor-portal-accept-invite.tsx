import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Mail, Building2, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const PERMISSION_LABELS: Record<string, string> = {
  lead_capture: "Product Interaction",
  view_leads: "View Leads",
  export_leads: "Export Leads",
  invite_team: "Invite Team Members",
};

export default function SponsorPortalAcceptInvite() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const searchParams = new URLSearchParams(window.location.search);
  const inviteCode = searchParams.get("code");

  const { data: invitation, isLoading, error } = useQuery({
    queryKey: ["/api/sponsor-portal/invitations/accept", inviteCode],
    queryFn: async () => {
      if (!inviteCode) throw new Error("No invite code provided");
      const response = await fetch(`/api/sponsor-portal/invitations/accept/${inviteCode}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to load invitation");
      }
      return response.json();
    },
    enabled: !!inviteCode,
  });

  useEffect(() => {
    if (invitation) {
      setEmail(invitation.email || "");
      setFirstName(invitation.firstName || "");
      setLastName(invitation.lastName || "");
    }
  }, [invitation]);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/sponsor-portal/invitations/accept/${inviteCode}`, {
        email,
        firstName,
        lastName,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invitation Accepted",
        description: "You now have access to the sponsor portal.",
      });
      if (data.accessToken) {
        setLocation(`/sponsor-portal?token=${data.accessToken}`);
      } else {
        setLocation("/sponsor-portal");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    },
  });

  if (!inviteCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <CardTitle>Invalid Link</CardTitle>
            </div>
            <CardDescription>
              No invitation code was provided. Please check your email for the correct link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <CardTitle>Invitation Not Found</CardTitle>
            </div>
            <CardDescription>
              {(error as Error).message || "This invitation may have expired or been revoked."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (invitation?.status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-5 w-5" />
              <CardTitle>Already Accepted</CardTitle>
            </div>
            <CardDescription>
              This invitation has already been accepted.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (invitation?.status === "revoked") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <CardTitle>Invitation Revoked</CardTitle>
            </div>
            <CardDescription>
              This invitation has been revoked. Please contact the sponsor for a new invitation.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const expiresAt = invitation?.expiresAt ? new Date(invitation.expiresAt) : null;
  const isExpired = expiresAt && expiresAt < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <CardTitle>Invitation Expired</CardTitle>
            </div>
            <CardDescription>
              This invitation expired on {expiresAt?.toLocaleDateString()}. Please contact the sponsor for a new invitation.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Accept Sponsor Portal Invitation</CardTitle>
          <CardDescription>
            You've been invited to join the {invitation?.sponsorName} sponsor portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{invitation?.sponsorName}</p>
                <p className="text-sm text-muted-foreground">{invitation?.eventName}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Permissions granted:</p>
              <div className="flex flex-wrap gap-2">
                {invitation?.permissions?.map((permission: string) => (
                  <Badge key={permission} variant="secondary">
                    {PERMISSION_LABELS[permission] || permission}
                  </Badge>
                ))}
              </div>
            </div>

            {expiresAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Expires: {expiresAt.toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="your@email.com"
                  data-testid="input-accept-email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  data-testid="input-accept-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  data-testid="input-accept-lastname"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending || !email}
            className="w-full"
            data-testid="button-accept-invitation"
          >
            {acceptMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              "Accept Invitation"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
