import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Mic2, FolderOpen, DollarSign, Mail, Share2, CheckCircle } from "lucide-react";
import logoImage from "@assets/Orange_bug_-_no_background_1765764672466.png";

const features = [
  {
    icon: Users,
    title: "Attendee Registration",
    description: "Manage registrations with custom forms and real-time tracking",
  },
  {
    icon: Calendar,
    title: "Agenda Builder",
    description: "Create and organize event schedules with drag-and-drop ease",
  },
  {
    icon: Mic2,
    title: "Speaker Management",
    description: "Handle speaker profiles, bios, and session assignments",
  },
  {
    icon: FolderOpen,
    title: "Content Catalog",
    description: "Organize event materials, documents, and resources",
  },
  {
    icon: DollarSign,
    title: "Budget Tracking",
    description: "Monitor expenses with planned vs actual comparisons",
  },
  {
    icon: Mail,
    title: "Email Communications",
    description: "Create and send targeted email campaigns to attendees",
  },
  {
    icon: Share2,
    title: "Social Media Planning",
    description: "Schedule and track promotional content across platforms",
  },
  {
    icon: CheckCircle,
    title: "Project Management",
    description: "Track timelines, milestones, and deliverables",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="Sandbox" className="h-6 w-6" />
            <span className="font-semibold text-lg">Sandbox</span>
          </div>
          <Button asChild data-testid="button-login-header">
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </header>

      <main>
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">
              Streamline Your Event Management
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              A comprehensive platform for managing events, registrations, speakers, content, 
              and marketing campaigns. Everything you need in one place.
            </p>
            <Button size="lg" asChild data-testid="button-get-started">
              <a href="/api/login">Get Started</a>
            </Button>
          </div>
        </section>

        <section className="py-16 px-6 bg-card">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl font-semibold text-center mb-12">
              Everything You Need to Run Successful Events
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="border-card-border">
                  <CardHeader className="pb-2">
                    <feature.icon className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
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
              <a href="/api/login">Start Now</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          Sandbox - Event Management Made Simple
          <span className="mx-2">|</span>
          <a href="/privacy-policy" className="hover:underline">Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
}
