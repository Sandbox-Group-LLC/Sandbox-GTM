import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { SiX, SiLinkedin, SiInstagram, SiFacebook, SiMailchimp, SiStripe, SiGooglesheets } from "react-icons/si";
import { Send } from "lucide-react";
import type { IconType } from "react-icons";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: IconType | typeof Send;
  iconColor?: string;
  settingsPath: string;
}

interface IntegrationCategory {
  title: string;
  integrations: Integration[];
}

const integrationCategories: IntegrationCategory[] = [
  {
    title: "Social Media Integrations",
    integrations: [
      {
        id: "twitter",
        name: "Twitter/X",
        description: "Post event updates and engage with attendees on social media",
        icon: SiX,
        iconColor: "#000000",
        settingsPath: "/settings#social",
      },
      {
        id: "linkedin",
        name: "LinkedIn",
        description: "Share professional networking posts and event announcements",
        icon: SiLinkedin,
        iconColor: "#0A66C2",
        settingsPath: "/settings#social",
      },
      {
        id: "instagram",
        name: "Instagram",
        description: "Share visual content and event highlights with your audience",
        icon: SiInstagram,
        iconColor: "#E4405F",
        settingsPath: "/settings#social",
      },
      {
        id: "facebook",
        name: "Facebook",
        description: "Engage with attendees and promote events on Facebook",
        icon: SiFacebook,
        iconColor: "#1877F2",
        settingsPath: "/settings#social",
      },
    ],
  },
  {
    title: "Email & Marketing",
    integrations: [
      {
        id: "mailchimp",
        name: "Mailchimp",
        description: "Send email marketing campaigns and manage subscriber lists",
        icon: SiMailchimp,
        iconColor: "#FFE01B",
        settingsPath: "/settings#email",
      },
      {
        id: "resend",
        name: "Resend",
        description: "Send transactional emails for confirmations and notifications",
        icon: Send,
        settingsPath: "/settings#email",
      },
    ],
  },
  {
    title: "Payments",
    integrations: [
      {
        id: "stripe",
        name: "Stripe",
        description: "Process payments for event registrations and tickets",
        icon: SiStripe,
        iconColor: "#635BFF",
        settingsPath: "/settings#payments",
      },
    ],
  },
  {
    title: "Data Import",
    integrations: [
      {
        id: "google-sheets",
        name: "Google Sheets",
        description: "Import attendee data from spreadsheets",
        icon: SiGooglesheets,
        iconColor: "#34A853",
        settingsPath: "/import-attendees",
      },
    ],
  },
];

function IntegrationCard({ integration }: { integration: Integration }) {
  const Icon = integration.icon;
  
  return (
    <Card data-testid={`card-integration-${integration.id}`}>
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-md bg-muted">
            <Icon 
              className="h-6 w-6" 
              style={integration.iconColor ? { color: integration.iconColor } : undefined}
              data-testid={`icon-${integration.id}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base" data-testid={`title-${integration.id}`}>
              {integration.name}
            </CardTitle>
            <CardDescription className="mt-1" data-testid={`description-${integration.id}`}>
              {integration.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Link href={integration.settingsPath}>
          <Button 
            variant="outline" 
            size="sm"
            data-testid={`button-configure-${integration.id}`}
          >
            Configure
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function Integrations() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Integrations" 
        breadcrumbs={[{ label: "Integrations" }]} 
      />
      
      <div className="flex-1 overflow-auto p-6 space-y-8">
        {integrationCategories.map((category) => (
          <section key={category.title} data-testid={`section-${category.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <h2 className="text-xl font-semibold mb-4" data-testid={`heading-${category.title.toLowerCase().replace(/\s+/g, '-')}`}>
              {category.title}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {category.integrations.map((integration) => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
