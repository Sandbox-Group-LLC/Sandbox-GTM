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
  XCircle,
  Rocket
} from "lucide-react";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { MarketingHeader } from "@/components/marketing-header";
import sandboxIcon from "@assets/Orange_bug_-_no_background_1768254114237.png";
import sandboxLogo from "@assets/Sandbox-GTM_1768253990902.png";

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
  "Data mapping and object alignment",
  "Identity resolution and attribution plumbing",
  "GTM workflow configuration",
  "Sandbox environment setup and validation",
];

const optimizationServices = [
  "Event portfolio structure and taxonomy",
  "Program-to-pipeline alignment",
  "Sales handoff workflows and SLAs",
  "KPI operationalization inside Sandbox",
  "Ongoing optimization and enablement recommendations",
];

const strategyActivationServices = [
  "Audience definition and ICP alignment",
  "Activation and channel planning",
  "Attribution model selection and validation",
  "Campaign architecture and rollout",
  "Launch support and early optimization",
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
      <MarketingHeader currentPage="pricing" />

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
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-3 mb-1">
                      <div className="text-4xl md:text-5xl font-bold text-primary">$36,000</div>
                      <Badge className="bg-primary text-primary-foreground">Preferred</Badge>
                    </div>
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
                  <LeadFormDialog source="pricing-page">
                    <Button size="lg" variant="outline" data-testid="button-talk-to-us">
                      Talk to Us
                    </Button>
                  </LeadFormDialog>
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
              <Badge variant="secondary" className="mt-4 bg-[#2b333b] text-[#dbe0e6] border-0">Optional</Badge>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-card/30">
                <CardHeader>
                  <CardTitle className="text-lg text-[#ffffff]">Implementation & Integrations</CardTitle>
                  <p className="text-sm text-[#b8b8b8] mt-1">Technical readiness and system alignment</p>
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
                  <p className="text-sm text-[#b8b8b8] mt-1">Operational excellence and adoption</p>
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

        <section className="py-20 px-6 border-t border-border bg-gradient-to-b from-background to-muted/10">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <div className="flex justify-center mb-4">
                <Rocket className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl font-semibold text-[#ffffff] mb-4">
                Acquisition Strategy & Activation
              </h2>
              <p className="text-[#b8b8b8] max-w-2xl mx-auto">
                For teams that want Sandbox to drive measurable pipeline faster.
              </p>
              <Badge variant="secondary" className="mt-4">Strategic Engagement</Badge>
            </div>

            <Card className="bg-card/30 border-primary/20">
              <CardContent className="pt-8">
                <p className="text-[#e0e0e0] text-center mb-8 max-w-2xl mx-auto leading-relaxed">
                  Sandbox can be implemented quickly. Designing a high-performing event GTM motion takes intent. 
                  Acquisition Strategy & Activation helps teams define who to target, how to activate them, 
                  and how success is measured — then launch with confidence.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  {strategyActivationServices.map((service, index) => (
                    <div key={index} className="flex items-start gap-3" data-testid={`service-strategy-${index}`}>
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-[#e0e0e0]">{service}</span>
                    </div>
                  ))}
                </div>

                <div className="text-center pt-4 border-t border-border">
                  <p className="text-[#b8b8b8] text-sm mb-4">Offered separately from platform licensing</p>
                  <LeadFormDialog source="pricing-strategy-activation">
                    <Button variant="outline" data-testid="button-talk-strategy">
                      Talk to Us About Strategy & Activation
                    </Button>
                  </LeadFormDialog>
                </div>
              </CardContent>
            </Card>
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
            <img src={sandboxIcon} alt="Sandbox" className="h-5 w-5" />
            <img src={sandboxLogo} alt="Sandbox GTM" className="h-4 opacity-60 invert" />
            <span className="text-sm text-[#b8b8b8]">- Event GTM Platform</span>
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
