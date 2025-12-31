import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Calendar, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MEETING_PORTAL_PERMISSIONS } from "@shared/schema";

const PERMISSION_LABELS: Record<string, string> = {
  [MEETING_PORTAL_PERMISSIONS.REQUEST_MEETINGS]: "Request Meetings",
  [MEETING_PORTAL_PERMISSIONS.VIEW_ATTENDEES]: "View Attendees",
  [MEETING_PORTAL_PERMISSIONS.CAPTURE_OUTCOMES]: "Capture Outcomes",
};

export default function MeetingPortalAccept() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");

  const { data: invitation, isLoading, error } = useQuery({
    queryKey: ["/api/meeting-portal/auth/validate-invite", inviteCode],
    queryFn: async () => {
      const response = await fetch("/api/meeting-portal/auth/validate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to validate invitation");
      }
      return response.json();
    },
    enabled: !!inviteCode,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/meeting-portal/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode,
          firstName,
          lastName,
          jobTitle: jobTitle || undefined,
          phone: phone || undefined,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to accept invitation");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("meetingPortalToken", data.token);
      }
      toast({
        title: "Welcome!",
        description: "Your invitation has been accepted. Redirecting to the meeting portal...",
      });
      setLocation("/meeting-portal");
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
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Validating invitation...</p>
        </div>
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
              <Button 
                variant="link" 
                className="px-1 h-auto" 
                onClick={() => setLocation("/meeting-portal/login")}
                data-testid="link-go-to-login"
              >
                Go to login
              </Button>
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
              This invitation has been revoked. Please contact your administrator for a new invitation.
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
              This invitation expired on {expiresAt?.toLocaleDateString()}. Please contact your administrator for a new invitation.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const canSubmit = firstName.trim() && lastName.trim();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Accept Meeting Portal Invitation</CardTitle>
          <CardDescription>
            You've been invited to join the meeting portal for {invitation?.eventName}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium">{invitation?.eventName}</p>
              <p className="text-sm text-muted-foreground">{invitation?.organizationName}</p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissions granted:
              </p>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  data-testid="input-last-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title (optional)</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Your job title"
                data-testid="input-job-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your phone number"
                data-testid="input-phone"
              />
            </div>
          </div>

          <Button
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending || !canSubmit}
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
