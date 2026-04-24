import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MarketingHeader } from "@/components/marketing-header";

const benefits = [
  "Run unlimited programs and events",
  "Capture and convert audiences with flexible registration flows",
  "Design sessions and experiences that drive engagement",
  "Launch event campaigns with built-in performance analytics",
  "Manage speakers, contributors, and content workflows",
  "Track investment, execution, and program outcomes",
];

export default function Signup() {
  const [inviteCode, setInviteCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    discountPercent?: number | null;
    error?: string;
  } | null>(null);

  const validateInviteCode = async () => {
    if (!inviteCode.trim()) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch("/api/signup-invite-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.trim() }),
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

  const handleCreateAccount = () => {
    if (validationResult?.valid && inviteCode.trim()) {
      localStorage.setItem("signupInviteCode", inviteCode.trim());
    }
    window.location.href = "/sign-up";
  };

  const clearInviteCode = () => {
    setInviteCode("");
    setValidationResult(null);
  };

  return (
    <div className="dark min-h-screen bg-background flex flex-col">
      <MarketingHeader currentPage="signup" />

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md" data-testid="card-signup">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Get Started with Sandbox</CardTitle>
            <CardDescription>
              Create your account and start managing events today
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

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
                    placeholder="Enter activation key"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value);
                      setValidationResult(null);
                    }}
                    data-testid="input-invite-code"
                  />
                  {inviteCode && (
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
                  disabled={!inviteCode.trim() || isValidating}
                  data-testid="button-validate-code"
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>

              {validationResult && (
                <div className="mt-2">
                  {validationResult.valid ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <Check className="h-4 w-4" />
                      <span>Activation key applied</span>
                      {validationResult.discountPercent && validationResult.discountPercent > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {validationResult.discountPercent}% discount
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-destructive" data-testid="text-invite-code-error">
                      {validationResult.error || "Invalid activation key"}
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleCreateAccount}
              data-testid="button-create-account"
            >
              Create Account
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already a Sandbox user?{" "}
              <a 
                href="/sign-in" 
                className="text-primary hover:underline font-medium"
                data-testid="link-signin"
              >
                Sign in
              </a>
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
