import { useState, useRef, useEffect } from "react";
import { useHubSpot } from "@/hooks/useHubSpot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, BarChart3, Users, Zap, Link2, ArrowRight, TrendingUp, Layers, DollarSign, Send, Hotel, CheckCircle2, XCircle, Volume2, VolumeX } from "lucide-react";
import { SiLinkedin, SiMailchimp, SiStripe, SiSalesforce, SiHubspot, SiOpenai, SiX, SiInstagram, SiFacebook } from "react-icons/si";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { MarketingHeader } from "@/components/marketing-header";

const gtmIntegrations = [
  { icon: SiStripe, name: "Stripe", color: "#635BFF" },
  { icon: SiSalesforce, name: "Salesforce", color: "#00A1E0" },
  { icon: SiHubspot, name: "HubSpot", color: "#FF7A59" },
  { icon: SiOpenai, name: "ChatGPT", color: "#000000" },
  { icon: SiMailchimp, name: "Mailchimp", color: "#241C15" },
  { icon: SiLinkedin, name: "LinkedIn", color: "#0A66C2" },
  { icon: SiX, name: "X (Twitter)", color: "#000000" },
  { icon: SiInstagram, name: "Instagram", color: "#E4405F" },
  { icon: SiFacebook, name: "Facebook", color: "#1877F2" },
  { icon: Send, name: "Resend", color: null },
  { icon: Zap, name: "Instantly", color: "#FF6B35" },
  { icon: Hotel, name: "Passkey", color: "#4A90D9" },
];

const gtmCapabilities = [
  {
    category: "Go-To-Market & Acquisition",
    icon: Target,
    items: [
      { title: "Attribution Links", description: "Track campaigns from paid, social, email, and partner channels with full UTM support" },
      { title: "Audience Targeting", description: "Segment and reach high-intent prospects with precision targeting" },
      { title: "Conversion-Focused Experiences", description: "Program pages built to convert, not just inform" },
    ],
  },
  {
    category: "Engagement & Intent",
    icon: Users,
    items: [
      { title: "Content Pillars", description: "Organize experiences around themes that resonate with your audience" },
      { title: "Engagement Capture", description: "Track every interaction to understand intent signals" },
      { title: "Experience Packages", description: "Define value, access, and pricing tiers that align with buyer journey" },
    ],
  },
  {
    category: "Revenue & ROI",
    icon: DollarSign,
    items: [
      { title: "Full Attribution", description: "Connect campaign spend to attendance to pipeline and revenue" },
      { title: "Sales-Ready Signals", description: "Surface high-intent attendees for immediate follow-up" },
      { title: "Pipeline Visibility", description: "See event-driven pipeline in real-time across programs" },
    ],
  },
];

const useCases = [
  {
    role: "Demand Generation Teams",
    description: "Run field events that feed your pipeline with qualified, engaged prospects.",
  },
  {
    role: "Field Marketing Leaders",
    description: "Prove program impact with attribution from campaign to closed-won.",
  },
  {
    role: "Marketing Leaders",
    description: "Defend event spend with clear ROI metrics your CFO will understand.",
  },
  {
    role: "Revenue Teams",
    description: "Get sales-ready handoffs with engagement context and intent signals.",
  },
];

export default function Landing() {
  useHubSpot();
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  return (
    <div className="dark min-h-screen bg-background">
      <MarketingHeader currentPage="landing" />

      <main>
        <section className="py-24 px-6">
          <div className="container mx-auto max-w-4xl text-center">
            <p className="text-primary font-medium mb-4 tracking-wide uppercase text-sm">Event GTM Platform</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6 text-[#ffffff] leading-tight">
              Turn Events Into a Measurable<br />Go-To-Market Channel
            </h1>
            <p className="text-lg md:text-xl mb-6 max-w-2xl mx-auto text-[#b8b8b8] leading-relaxed">
              From acquisition to engagement to revenue — Sandbox connects your events directly to pipeline. 
              Finally, a platform that treats events like the revenue channel they are.
            </p>
            <p className="text-lg text-[#ffffff] mb-10 max-w-2xl mx-auto font-medium" data-testid="text-tagline">
              Sandbox elevates event operations by making execution measurable, intentional, and connected to revenue.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <LeadFormDialog source="landing-hero">
                <Button size="lg" data-testid="button-request-access">
                  Request Access
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </LeadFormDialog>
              <Button size="lg" variant="secondary" asChild data-testid="button-see-how">
                <a href="#capabilities">See How It Works</a>
              </Button>
            </div>

            <div className="relative mt-12 mx-auto max-w-3xl rounded-xl overflow-hidden border border-border shadow-2xl aspect-video bg-black" data-testid="promo-video-container">
              <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="w-full h-full object-cover"
                data-testid="promo-video"
                src="/Sandbox%20Promo.mp4"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleMute}
                className="absolute bottom-4 right-4 gap-2 bg-black/60 backdrop-blur-sm text-white border-none"
                data-testid="button-toggle-sound"
              >
                {isMuted ? (
                  <>
                    <VolumeX className="h-4 w-4" />
                    Sound Off
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" />
                    Sound On
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 px-6 border-t border-border">
          <div className="container mx-auto max-w-5xl">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">100%</div>
                <p className="text-[#b8b8b8]">Campaign attribution</p>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">Real-time</div>
                <p className="text-[#b8b8b8]">Pipeline visibility</p>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">One</div>
                <p className="text-[#b8b8b8]">System of record</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-card">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-semibold text-center mb-6 text-[#ffffff]">
              Events Are a GTM Black Box. Until Now.
            </h2>
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-[#ffffff]">
                    <XCircle className="h-5 w-5 text-destructive" />
                    Event Platforms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-[#b8b8b8]">
                    Optimize for logistics and operations. No pipeline connection.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-[#ffffff]">
                    <XCircle className="h-5 w-5 text-destructive" />
                    Marketing Platforms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-[#b8b8b8]">
                    Stop at clicks and opens. No live experience data.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-[#ffffff]">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Sandbox
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-[#b8b8b8]">
                    The missing layer connecting marketing, events, and revenue.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
            <p className="text-center text-[#b8b8b8] max-w-2xl mx-auto">
              Most tools leave event ROI stranded in spreadsheets. Sandbox captures the full journey — 
              from first click to closed deal — so you can prove what your programs are worth.
            </p>
          </div>
        </section>

        <section id="capabilities" className="py-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-[#ffffff]">
                Design. Attract. Deliver. Prove.
              </h2>
              <p className="text-[#b8b8b8] max-w-2xl mx-auto">
                Sandbox structures your event strategy around outcomes, not logistics. 
                Every feature maps to your GTM motion.
              </p>
            </div>
            
            <div className="space-y-16">
              {gtmCapabilities.map((category) => (
                <div key={category.category}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <category.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#ffffff]">{category.category}</h3>
                  </div>
                  <div className="grid md:grid-cols-3 gap-6">
                    {category.items.map((item) => (
                      <Card key={item.title} className="border-card-border" data-testid={`card-capability-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-[#b8b8b8]">{item.description}</CardDescription>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-card">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-[#ffffff]">
                What Sandbox Is — And Isn't
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-[#ffffff] flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  Not This
                </h3>
                <ul className="space-y-3 text-[#b8b8b8]">
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">-</span>
                    Not a meeting planner or venue booking tool
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">-</span>
                    Not just registration software
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">-</span>
                    Not another disconnected point solution
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-1">-</span>
                    Not built for event ops teams
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-[#ffffff] flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  This
                </h3>
                <ul className="space-y-3 text-[#b8b8b8]">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">+</span>
                    A GTM platform where events behave like a revenue channel
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">+</span>
                    A system of record for event-driven performance
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">+</span>
                    Built for accountability, not guesswork
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">+</span>
                    Designed for marketers who need to prove ROI
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-[#ffffff]">
                Built for Marketing Teams Who Own Revenue
              </h2>
              <p className="text-[#b8b8b8] max-w-2xl mx-auto">
                Not event organizers. Not meeting planners. Marketers who treat events as a strategic GTM lever.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {useCases.map((useCase) => (
                <Card key={useCase.role} className="border-card-border" data-testid={`card-usecase-${useCase.role.toLowerCase().replace(/\s+/g, '-')}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      {useCase.role}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-[#b8b8b8]">{useCase.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-6 bg-card" data-testid="section-integrations">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-semibold mb-3 text-[#ffffff]">
                Fits Your GTM Stack
              </h2>
              <p className="text-[#b8b8b8]">
                Connects with the tools your marketing and revenue teams already use.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-8">
              {gtmIntegrations.map((integration) => (
                <div 
                  key={integration.name} 
                  className="flex flex-col items-center"
                  data-testid={`integration-${integration.name.toLowerCase().replace(/[^a-z]/g, '-')}`}
                >
                  <div className="h-12 w-12 rounded-md flex items-center justify-center bg-[#ffffff]">
                    <integration.icon 
                      className="h-6 w-6" 
                      style={integration.color ? { color: integration.color } : undefined}
                    />
                  </div>
                  <span className="text-xs mt-2 text-[#b8b8b8]">{integration.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-6">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-[#ffffff]">
              Stop Running Events. Start Running a Revenue Channel.
            </h2>
            <p className="mb-8 text-[#b8b8b8] text-lg">
              See how Sandbox turns your event investment into measurable pipeline.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <LeadFormDialog source="landing-footer">
                <Button size="lg" data-testid="button-request-access-footer">
                  Request Access
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </LeadFormDialog>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-6">
        <div className="container mx-auto text-center text-sm text-[#b8b8b8]">
          Sandbox — Event GTM Platform
          <span className="mx-2">|</span>
          <a href="/privacy-policy" className="hover:underline">Privacy Policy</a>
          <span className="mx-2">|</span>
          <a href="/security-whitepaper.md" className="hover:underline" data-testid="link-security-whitepaper">Security</a>
        </div>
      </footer>
    </div>
  );
}
