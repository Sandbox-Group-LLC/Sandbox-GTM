import { useHubSpot } from "@/hooks/useHubSpot";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MarketingHeader } from "@/components/marketing-header";

export default function BookDemo() {
  useHubSpot();
  return (
    <div className="dark min-h-screen bg-background">
      <MarketingHeader currentPage="book-demo" />

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
