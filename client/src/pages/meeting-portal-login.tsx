import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Key, Send, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MeetingPortalLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/meeting-portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          inviteCode,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to login");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("meetingPortalToken", data.token);
        toast({
          title: "Login Successful",
          description: "Redirecting to the meeting portal...",
        });
        setLocation("/meeting-portal");
      } else {
        toast({
          title: "Error",
          description: "No access token received",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message || "Unable to log in. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const requestMagicLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/meeting-portal/auth/request-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to send login link");
      }
      return response.json();
    },
    onSuccess: () => {
      setMagicLinkSent(true);
      toast({
        title: "Check Your Email",
        description: "If an account exists with this email, a login link has been sent.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send login link. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInviteCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && inviteCode.trim()) {
      loginMutation.mutate();
    }
  };

  const handleMagicLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      requestMagicLinkMutation.mutate();
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              <CardTitle>Check Your Email</CardTitle>
            </div>
            <CardDescription>
              We've sent a login link to <strong>{email}</strong>. Click the link in the email to access the meeting portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The link will expire in 15 minutes. If you don't see the email, check your spam folder.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setMagicLinkSent(false);
                  setEmail("");
                }}
                data-testid="button-try-different-email"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Try a Different Email
              </Button>
              <Button
                variant="ghost"
                onClick={() => requestMagicLinkMutation.mutate()}
                disabled={requestMagicLinkMutation.isPending}
                data-testid="button-resend-link"
              >
                {requestMagicLinkMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Resend Login Link
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Meeting Portal Login</CardTitle>
          <CardDescription>
            Access the meeting portal to request and manage meetings with event attendees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="magic-link" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="magic-link" data-testid="tab-magic-link">Email Link</TabsTrigger>
              <TabsTrigger value="invite-code" data-testid="tab-invite-code">Invite Code</TabsTrigger>
            </TabsList>
            
            <TabsContent value="magic-link" className="space-y-4 mt-4">
              <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-magic">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email-magic"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      placeholder="your@email.com"
                      required
                      data-testid="input-magic-email"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll send you a secure login link to access the portal.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={requestMagicLinkMutation.isPending || !email.trim()}
                  className="w-full"
                  data-testid="button-send-magic-link"
                >
                  {requestMagicLinkMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Login Link
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="invite-code" className="space-y-4 mt-4">
              <form onSubmit={handleInviteCodeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-code">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email-code"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      placeholder="your@email.com"
                      required
                      data-testid="input-code-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Code</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="inviteCode"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="pl-10"
                      placeholder="Enter your invite code"
                      required
                      data-testid="input-invite-code"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The invite code was provided in your invitation email.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loginMutation.isPending || !email.trim() || !inviteCode.trim()}
                  className="w-full"
                  data-testid="button-login-code"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Log In"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
