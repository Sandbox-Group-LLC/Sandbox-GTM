import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Zap, Loader2, Mail } from "lucide-react";

const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL || "";

type Mode = "signin" | "magic";

export default function Login() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [magicSent, setMagicSent] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Authenticate with Neon Auth to get JWT
      const authRes = await fetch(`${NEON_AUTH_URL}/api/v1/auth/signin/email-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!authRes.ok) {
        const err = await authRes.json();
        throw new Error(err.message || "Sign in failed");
      }

      const { access_token } = await authRes.json();

      // 2. Exchange with our server to load app user + role
      const meRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: access_token }),
      });

      if (!meRes.ok) {
        const err = await meRes.json();
        throw new Error(err.error || err.message || "Login failed");
      }

      const { user, token } = await meRes.json();

      // 3. Store token + user
      localStorage.setItem("engage_token", token);
      localStorage.setItem("engage_user", JSON.stringify(user));

      // 4. Route by role
      if (user.role === "admin") navigate("/");
      else if (user.role === "staff") navigate("/check-in");
      else navigate("/");

    } catch (err: any) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${NEON_AUTH_URL}/api/v1/auth/signin/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectUrl: `${window.location.origin}/auth/callback` }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send magic link");
      }

      setMagicSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-2">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Engage</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex rounded-lg border p-1 gap-1">
              <button
                onClick={() => { setMode("signin"); setError(""); }}
                className={`flex-1 text-sm py-1.5 rounded-md transition-colors font-medium
                  ${mode === "signin" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Password
              </button>
              <button
                onClick={() => { setMode("magic"); setError(""); }}
                className={`flex-1 text-sm py-1.5 rounded-md transition-colors font-medium
                  ${mode === "magic" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Magic Link
              </button>
            </div>
          </CardHeader>

          <CardContent>
            {magicSent ? (
              <div className="text-center space-y-3 py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Check your email</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    We sent a sign-in link to <strong>{email}</strong>
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMagicSent(false)}>
                  Use a different email
                </Button>
              </div>
            ) : (
              <form onSubmit={mode === "signin" ? handleSignIn : handleMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                {mode === "signin" && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                )}

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in...</>
                    : mode === "signin" ? "Sign In" : "Send Magic Link"
                  }
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Need access? Contact your event administrator.
        </p>
      </div>
    </div>
  );
}
