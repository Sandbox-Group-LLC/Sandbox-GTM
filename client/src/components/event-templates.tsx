import { LucideIcon, Presentation, Users, Building2, Wine, Video, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  defaults: {
    name?: string;
    description?: string;
    durationDays?: number;
    location?: string;
  };
}

export const eventTemplates: EventTemplate[] = [
  {
    id: "conference",
    name: "Conference",
    description: "Multi-day event with sessions, speakers, and tracks",
    icon: Presentation,
    defaults: {
      name: "Annual Conference",
      description: "Join us for an inspiring multi-day conference featuring keynote speakers, breakout sessions, panel discussions, and networking opportunities. Connect with industry leaders and peers while exploring the latest trends and innovations.",
      durationDays: 3,
      location: "Convention Center",
    },
  },
  {
    id: "workshop",
    name: "Workshop / Training",
    description: "Single or half-day hands-on learning event",
    icon: Users,
    defaults: {
      name: "Professional Workshop",
      description: "An intensive hands-on workshop designed to build practical skills. Participants will engage in interactive exercises, real-world case studies, and collaborative activities to achieve specific learning objectives.",
      durationDays: 1,
      location: "Training Center",
    },
  },
  {
    id: "corporate",
    name: "Corporate Meeting",
    description: "Internal company event or all-hands meeting",
    icon: Building2,
    defaults: {
      name: "Company Meeting",
      description: "An internal company gathering to align teams, share updates, celebrate achievements, and discuss strategic initiatives. This meeting brings together team members to foster collaboration and communication.",
      durationDays: 1,
      location: "Company Headquarters",
    },
  },
  {
    id: "networking",
    name: "Networking Event",
    description: "Casual mixer or happy hour gathering",
    icon: Wine,
    defaults: {
      name: "Networking Mixer",
      description: "An evening of professional networking in a relaxed atmosphere. Connect with peers, exchange ideas, and build meaningful relationships over refreshments and conversation.",
      durationDays: 1,
      location: "Venue TBD",
    },
  },
  {
    id: "webinar",
    name: "Virtual Webinar",
    description: "Online presentation or virtual conference",
    icon: Video,
    defaults: {
      name: "Online Webinar",
      description: "A virtual presentation featuring expert speakers and interactive Q&A sessions. Join from anywhere to learn about the latest developments, best practices, and actionable insights in your field.",
      durationDays: 1,
      location: "Online",
    },
  },
  {
    id: "blank",
    name: "Blank Template",
    description: "Start from scratch with empty defaults",
    icon: FileText,
    defaults: {},
  },
];

interface EventTemplateSelectorProps {
  onSelectTemplate: (template: EventTemplate) => void;
  selectedTemplateId?: string;
}

export function EventTemplateSelector({
  onSelectTemplate,
  selectedTemplateId,
}: EventTemplateSelectorProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      data-testid="template-selector-grid"
    >
      {eventTemplates.map((template) => {
        const Icon = template.icon;
        const isSelected = selectedTemplateId === template.id;

        return (
          <Card
            key={template.id}
            className={cn(
              "cursor-pointer transition-all hover-elevate",
              isSelected && "ring-2 ring-primary"
            )}
            onClick={() => onSelectTemplate(template)}
            data-testid={`card-template-${template.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "rounded-md p-2 flex-shrink-0",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-medium text-sm"
                    data-testid={`text-template-name-${template.id}`}
                  >
                    {template.name}
                  </h3>
                  <p
                    className="text-xs text-muted-foreground mt-1 line-clamp-2"
                    data-testid={`text-template-desc-${template.id}`}
                  >
                    {template.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
