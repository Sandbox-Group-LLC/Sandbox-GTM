import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import logoImage from "@assets/Orange_bug_-_no_background_1765765097769.png";

const benefits = [
  "Manage unlimited events",
  "Custom registration forms with payment processing",
  "Speaker and session management",
  "Email campaigns with analytics",
  "Call for Papers workflow",
  "Budget tracking and deliverables",
];

export default function Signup() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <a href="/landing" className="flex items-center gap-2">
            <img src={logoImage} alt="Sandbox" className="h-6 w-6" />
            <span className="font-semibold text-lg">Sandbox</span>
          </a>
        </div>
      </header>

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

            <Button className="w-full" size="lg" asChild data-testid="button-create-account">
              <a href="/api/login">Create Account</a>
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already a Sandbox user?{" "}
              <a 
                href="/api/login" 
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
