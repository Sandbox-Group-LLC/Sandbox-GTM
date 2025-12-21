import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  ArrowRight, 
  Layers, 
  Link2, 
  Users, 
  Zap, 
  BarChart3, 
  Send,
  Settings,
  Target,
  XCircle
} from "lucide-react";
import logoImage from "@assets/Orange_bug_-_no_background_1765765097769.png";

const includedFeatures = [
  { icon: Layers, text: "Unlimited programs and events" },
  { icon: Target, text: "Program Experiences (conversion + attendee experiences)" },
  { icon: Link2, text: "Attribution Links & Activation Keys" },
  { icon: Users, text: "Audience segmentation & properties" },
  { icon: Zap, text: "Engagement Signals & intent tracking" },
  { icon: BarChart3, text: "Revenue Impact & GTM analytics" },
  { icon: Send, text: "Email & campaign orchestration" },
  { icon: Settings, text: "Core integrations and APIs" },
];

const noFees = [
  "No per-event fees",
  "No per-registrant pricing",
  "No usage-based overages",
];

const implementationServices = [
  "CRM and marketing automation integrations",
  "Attribution modeling and validation",
  "Data mapping and GTM configuration",
];

const optimizationServices = [
  "Event portfolio design",
  "Measurement frameworks",
  "Sales handoff and pipeline alignment",
];

const targetAudience = [
  "Event marketers",
  "Demand generation teams",
  "Field marketing & experiential teams",
  "Marketing Ops and RevOps leaders",
];

export default function Pricing() {
  return (
    <div className="dark min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2" data-testid="link-home">
            <img src={logoImage} alt="Sandbox" className="h-6 w-6" />
            <span className="font-semibold text-lg text-[#ffffff]">Sandbox</span>
          </a>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild data-testid="link-pricing-nav">
              <a href="/pricing" className="text-[#b8b8b8]">Pricing</a>
            </Button>
            <Button asChild data-testid="button-login-header">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-24 px-6">
          <div className="container mx-auto max-w-4xl text-center">
            <p className="text-primary font-medium mb-4 tracking-wide uppercase text-sm">Platform Pricing</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6 text-[#ffffff] leading-tight">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto text-[#b8b8b8] leading-relaxed">
              One platform license. No hidden fees. No per-event or per-registrant pricing.
              Sandbox is infrastructure for your GTM stack.
            </p>
          </div>
        </section>

        <section className="pb-20 px-6">
          <div className="container mx-auto max-w-4xl">
            <Card className="border-2 border-primary/30 bg-card/50">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    Platform License
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-semibold text-[#ffffff] mb-2">
                  Sandbox Platform
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-6">
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl font-bold text-[#ffffff]">$3,500</div>
                    <p className="text-[#b8b8b8] mt-1">per month</p>
                  </div>
                  <div className="hidden md:block w-px h-16 bg-border" />
                  <div className="text-center relative">
                    <Badge className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Preferred
                    </Badge>
                    <div className="text-4xl md:text-5xl font-bold text-primary">$36,000</div>
                    <p className="text-[#b8b8b8] mt-1">per year (annual prepay)</p>
                  </div>
                </div>

                <p className="text-center text-[#b8b8b8] text-sm">
                  Most customers choose annual billing for preferred pricing and easier budgeting.
                </p>

                <div className="border-t border-border pt-8">
                  <h3 className="text-lg font-semibold text-[#ffffff] mb-6 text-center">What's Included</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {includedFeatures.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3" data-testid={`feature-included-${index}`}>
                        <feature.icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-[#e0e0e0]">{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-6">
                  <div className="flex flex-wrap justify-center gap-6">
                    {noFees.map((item, index) => (
                      <div key={index} className="flex items-center gap-2" data-testid={`no-fee-${index}`}>
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="text-[#b8b8b8] text-sm font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Button size="lg" asChild data-testid="button-request-access-main">
                    <a href="/signup">
                      Request Access
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild data-testid="button-talk-to-us">
                    <a href="/signup">Talk to Us</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-20 px-6 border-t border-border">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-semibold text-[#ffffff] mb-4">
                Professional Services
              </h2>
              <p className="text-[#b8b8b8] max-w-2xl mx-auto">
                Sandbox works out of the box. Professional services help teams accelerate impact.
              </p>
              <Badge variant="outline" className="mt-4">Optional</Badge>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-card/30">
                <CardHeader>
                  <CardTitle className="text-lg text-[#ffffff]">Implementation & Integrations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {implementationServices.map((service, index) => (
                      <li key={index} className="flex items-start gap-3" data-testid={`service-impl-${index}`}>
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-[#b8b8b8]">{service}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-card/30">
                <CardHeader>
                  <CardTitle className="text-lg text-[#ffffff]">GTM Optimization</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {optimizationServices.map((service, index) => (
                      <li key={index} className="flex items-start gap-3" data-testid={`service-opt-${index}`}>
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-[#b8b8b8]">{service}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 border-t border-border">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold text-[#ffffff] mb-6">
              Who Sandbox Is For
            </h2>
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {targetAudience.map((audience, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-sm px-4 py-2"
                  data-testid={`audience-badge-${index}`}
                >
                  {audience}
                </Badge>
              ))}
            </div>
            <p className="text-lg text-[#b8b8b8] italic">
              "If events influence your pipeline, Sandbox belongs in your GTM stack."
            </p>
          </div>
        </section>

        <section className="py-20 px-6 border-t border-border bg-muted/20">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold text-[#ffffff] mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-[#ffffff] mb-4 max-w-2xl mx-auto font-medium" data-testid="text-tagline">
              Sandbox elevates event operations by making execution measurable, intentional, and revenue-aware.
            </p>
            <p className="text-[#b8b8b8] mb-8 max-w-xl mx-auto">
              See how Sandbox transforms events from cost centers into measurable revenue channels.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild data-testid="button-request-access-footer">
                <a href="/signup">
                  Request Access
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="secondary" asChild data-testid="button-see-how-footer">
                <a href="/#capabilities">See How Sandbox Works</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-6">
        <div className="container mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="Sandbox" className="h-5 w-5" />
            <span className="text-sm text-[#b8b8b8]">Sandbox - Event GTM Platform</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#b8b8b8]">
            <a href="/privacy-policy" className="hover:text-[#ffffff] transition-colors" data-testid="link-privacy">
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
