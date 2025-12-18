import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Mic2, ClipboardList, DollarSign, Mail, CheckSquare, FileSpreadsheet, CreditCard, LayoutGrid, Send, Hotel, Zap } from "lucide-react";
import { SiX, SiLinkedin, SiInstagram, SiFacebook, SiMailchimp, SiStripe, SiGooglesheets } from "react-icons/si";
import logoImage from "@assets/Orange_bug_-_no_background_1765765097769.png";

const integrations = [
  { icon: SiStripe, name: "Stripe", color: "#635BFF", description: "Payment processing" },
  { icon: SiMailchimp, name: "Mailchimp", color: "#241C15", description: "Email marketing" },
  { icon: SiGooglesheets, name: "Google Sheets", color: "#34A853", description: "Data import" },
  { icon: SiLinkedin, name: "LinkedIn", color: "#0A66C2", description: "Social posting" },
  { icon: SiX, name: "X (Twitter)", color: "#000000", description: "Social posting" },
  { icon: SiFacebook, name: "Facebook", color: "#1877F2", description: "Social posting" },
  { icon: SiInstagram, name: "Instagram", color: "#E4405F", description: "Social posting" },
  { icon: Send, name: "Resend", color: null, description: "Transactional email" },
  { icon: Hotel, name: "Passkey", color: "#4A90D9", description: "Hotel housing" },
  { icon: Zap, name: "Instantly", color: "#FF6B35", description: "Email outreach" },
];

const corePillars = [
  {
    icon: LayoutGrid,
    title: "Complete Event Lifecycle",
    description: "Create, configure, and manage events from planning to post-event analysis. Handle multiple events simultaneously with organization-level oversight.",
  },
  {
    icon: CreditCard,
    title: "Seamless Registration",
    description: "Custom registration forms, flexible packages, and integrated Stripe payments. Track registrations in real-time with automated confirmations.",
  },
  {
    icon: Calendar,
    title: "Build Dynamic Agendas",
    description: "Create sessions, assign speakers, manage rooms and time slots. Give attendees a polished schedule they can explore and personalize.",
  },
];

const features = [
  {
    icon: ClipboardList,
    title: "Call for Papers",
    description: "Collect abstracts, assign reviewers, and convert accepted papers into sessions",
  },
  {
    icon: Mic2,
    title: "Speaker Management",
    description: "Manage bios, headshots, session assignments, and communications",
  },
  {
    icon: DollarSign,
    title: "Budget Tracking",
    description: "Monitor planned vs actual spend with category breakdowns",
  },
  {
    icon: Mail,
    title: "Marketing Campaigns",
    description: "Create templates, segment audiences, and track engagement",
  },
  {
    icon: CheckSquare,
    title: "Deliverables",
    description: "Assign tasks, set deadlines, and monitor completion status",
  },
  {
    icon: FileSpreadsheet,
    title: "Data Import",
    description: "Import attendees, sessions, and speakers via Excel or CSV",
  },
];

export default function Landing() {
  return (
    <div className="dark min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="Sandbox" className="h-6 w-6" />
            <span className="font-semibold text-lg text-[#ffffff]">Sandbox</span>
          </div>
          <Button asChild data-testid="button-login-header">
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </header>
      <main>
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6 text-[#ffffff]">
              Streamline Your Event Management
            </h1>
            <p className="text-lg mb-8 max-w-2xl mx-auto text-[#b8b8b8]">
              A unified platform for managing events, registrations, speakers, content, and marketing—seamlessly integrating with leading tools to complete your GTM tech stack. Everything you need, in one place.
            </p>
            <Button size="lg" asChild data-testid="button-get-started">
              <a href="/signup">Get Started</a>
            </Button>
          </div>
        </section>

        <section className="py-16 px-6 bg-card">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl font-semibold text-center mb-4 text-[#ffffff]">
              Everything You Need to Run Successful Events
            </h2>
            <p className="text-center mb-12 max-w-2xl mx-auto text-[#b8b8b8]">
              A complete platform that handles every aspect of event management, from initial planning to day-of execution.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {corePillars.map((pillar) => (
                <Card key={pillar.title} className="border-card-border" data-testid={`card-pillar-${pillar.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <CardHeader>
                    <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                      <pillar.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{pillar.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed text-[#b8b8b8]">{pillar.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>

            <h3 className="text-xl font-semibold text-center mb-8">
              Plus Powerful Tools for Every Need
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="border-card-border" data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <CardHeader className="pb-2 flex flex-row items-start gap-4">
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{feature.title}</CardTitle>
                      <CardDescription className="text-sm mt-1 text-[#b8b8b8]">{feature.description}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-6" data-testid="section-integrations">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl font-semibold text-center mb-4 text-[#ffffff]">
              Powerful Integrations
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Connect with the tools you already use. Our platform integrates seamlessly with leading services for payments, marketing, and social media.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {integrations.map((integration) => (
                <div 
                  key={integration.name} 
                  className="flex flex-col items-center text-center p-6 rounded-lg bg-card border border-border"
                  data-testid={`integration-${integration.name.toLowerCase().replace(/[^a-z]/g, '-')}`}
                >
                  <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center mb-3">
                    <integration.icon 
                      className="h-6 w-6" 
                      style={integration.color ? { color: integration.color } : undefined}
                    />
                  </div>
                  <span className="font-medium text-sm">{integration.name}</span>
                  <span className="text-xs text-muted-foreground mt-1">{integration.description}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold mb-4">
              Ready to Transform Your Event Planning?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join event organizers who have simplified their workflow with our platform.
            </p>
            <Button size="lg" asChild data-testid="button-start-now">
              <a href="/signup">Start Now</a>
            </Button>
          </div>
        </section>
      </main>
      <footer className="border-t border-border py-8 px-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          Sandbox - Event Management Made Simple
          <span className="mx-2">|</span>
          <a href="/privacy-policy" className="hover:underline">Privacy Policy</a>
          <span className="mx-2">|</span>
          <a href="/security-whitepaper.md" className="hover:underline" data-testid="link-security-whitepaper">Security</a>
        </div>
      </footer>
    </div>
  );
}
