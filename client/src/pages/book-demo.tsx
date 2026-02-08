import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import sandboxIcon from "@assets/Orange_bug_-_no_background_1768254114237.png";
import sandboxLogo from "@assets/Sandbox-GTM_1768253990902.png";

export default function BookDemo() {
  return (
    <div className="dark min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <a href="/" className="flex items-center gap-2" data-testid="link-home-logo">
              <img src={sandboxIcon} alt="Sandbox" className="h-6 w-6" />
              <img src={sandboxLogo} alt="Sandbox" className="h-5 invert" />
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild data-testid="button-pricing-header" className="text-white">
              <a href="/pricing">Pricing</a>
            </Button>
            <Button asChild data-testid="button-login-header">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-6 py-12">
        <Button
          variant="ghost"
          asChild
          className="mb-6 text-muted-foreground"
          data-testid="button-back-landing"
        >
          <a href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </a>
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#ffffff] mb-3" data-testid="text-book-demo-title">
            Book a Demo
          </h1>
          <p className="text-lg text-[#b8b8b8] max-w-xl mx-auto" data-testid="text-book-demo-subtitle">
            See how Sandbox can turn your events into a measurable go-to-market channel. Pick a time that works for you.
          </p>
        </div>

        <div className="rounded-lg overflow-hidden border border-border bg-white" data-testid="container-calendar-embed">
          <iframe
            src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ2qriuCHEWNbUU_A-c5zuLEamAZOdSELitYzdek314gjNUWJnPvPUj7MfwpcCmNm8EZPBzGhPsU?gv=true"
            style={{ border: 0 }}
            width="100%"
            height="600"
            title="Book a Demo"
            data-testid="iframe-calendar"
          />
        </div>
      </main>
    </div>
  );
}
