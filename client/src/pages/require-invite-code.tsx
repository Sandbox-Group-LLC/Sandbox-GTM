import { useState } from "react";
import { useClerk } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2, LogOut, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import sandboxIcon from "@assets/Orange_bug_-_no_background_1768254114237.png";
import sandboxLogo from "@assets/Sandbox-GTM_1768253990902.png";

export default function RequireInviteCode() {
  const { signOut } = useClerk();
  const [inviteCode, setInviteCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    discountPercent?: number | null;
    error?: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateInviteCode = async () => {
    if (!inviteCode.trim()) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/signup-invite-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.trim() }),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setValidationResult(data);
      } else {
        setValidationResult({ valid: false, error: "Invalid activation key" });
      }
    } catch {
      setValidationResult({ valid: false, error: "Failed to validate code" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!inviteCode.trim() || !validationResult?.valid) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/signup-invite-codes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.trim() }),
        credentials: "include",
      });

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/signup-status"] });
      } else {
        const data = await response.json().catch(() => ({}));
        setSubmitError(data.message || "Failed to redeem activation key");
      }
    } catch {
      setSubmitError("Failed to redeem activation key. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    signOut({ redirectUrl: '/' });
  };

  const clearInviteCode = () => {
    setInviteCode("");
    setValidationResult(null);
    setSubmitError(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={sandboxIcon} alt="sandbox" className="h-6 w-6" />
            <img src={sandboxLogo} alt="Sandbox GTM" className="h-5 dark:invert" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md" data-testid="card-require-invite">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Activation Key Required</CardTitle>
            <CardDescription>
              Please enter a valid activation key to access Sandbox
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="invite-code" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Activation Key
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="invite-code"
                    type="text"
                    placeholder="Enter your activation key"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value);
                      setValidationResult(null);
                      setSubmitError(null);
                    }}
                    disabled={isSubmitting}
                    data-testid="input-invite-code"
                  />
                  {inviteCode && !isSubmitting && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={clearInviteCode}
                      data-testid="button-clear-invite-code"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={validateInviteCode}
                  disabled={!inviteCode.trim() || isValidating || isSubmitting}
                  data-testid="button-validate-code"
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Validate"
                  )}
                </Button>
              </div>

              {validationResult && (
                <div className="mt-2" data-testid="validation-result">
                  {validationResult.valid ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <Check className="h-4 w-4" />
                      <span data-testid="text-validation-success">Valid activation key</span>
                      {validationResult.discountPercent && validationResult.discountPercent > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {validationResult.discountPercent}% discount
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-destructive" data-testid="text-validation-error">
                      {validationResult.error || "Invalid activation key"}
                    </p>
                  )}
                </div>
              )}

              {submitError && (
                <p className="text-sm text-destructive" data-testid="text-submit-error">
                  {submitError}
                </p>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={!validationResult?.valid || isSubmitting}
              data-testid="button-submit-invite-code"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                "Continue"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an activation key? Contact your administrator for access.
            </p>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-border py-6 px-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          Sandbox - Event Management Made Simple
        </div>
      </footer>
    </div>
  );
}
