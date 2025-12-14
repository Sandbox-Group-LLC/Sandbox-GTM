import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Clock, Mic, AlertCircle, ArrowRight } from "lucide-react";
import type { Event, EventSession, Speaker, EventPage } from "@shared/schema";

interface Section {
  id: string;
  type: string;
  order: number;
  config: Record<string, unknown>;
}

interface PublicEventData {
  event: Event;
  sessions: EventSession[];
  speakers: Speaker[];
  landingPage: EventPage | null;
}

export default function PublicEvent() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery<PublicEventData>({
    queryKey: ["/api/public/event", slug],
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
            <p className="text-muted-foreground">This event doesn't exist or is not available for public viewing.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { event, sessions, speakers, landingPage } = data;
  const sections = (landingPage?.sections as Section[]) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-b from-primary/10 to-background py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4">Public Event</Badge>
          <h1 className="text-4xl font-bold mb-4" data-testid="text-event-name">{event.name}</h1>
          
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
            )}
          </div>

          {event.description && (
            <p className="mt-6 text-lg text-muted-foreground">{event.description}</p>
          )}

          {event.registrationOpen && (
            <div className="mt-8">
              <Button size="lg" asChild data-testid="button-register-cta">
                <Link href={`/event/${slug}/register`}>
                  Register Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {sessions.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Schedule
                </h2>
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <Card key={session.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-medium">{session.title}</h3>
                            {session.description && (
                              <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {session.track && <Badge variant="outline">{session.track}</Badge>}
                              {session.sessionType && <Badge variant="secondary">{session.sessionType}</Badge>}
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                            <p>{session.startTime} - {session.endTime}</p>
                            {session.room && <p className="text-xs">{session.room}</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {speakers.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Speakers
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {speakers.map((speaker) => (
                    <Card key={speaker.id}>
                      <CardContent className="p-4 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          {speaker.photoUrl ? (
                            <img src={speaker.photoUrl} alt={`${speaker.firstName} ${speaker.lastName}`} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-lg font-semibold text-muted-foreground">
                              {speaker.firstName[0]}{speaker.lastName[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{speaker.firstName} {speaker.lastName}</p>
                          {speaker.jobTitle && <p className="text-sm text-muted-foreground">{speaker.jobTitle}</p>}
                          {speaker.company && <p className="text-sm text-muted-foreground">{speaker.company}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Register Now</CardTitle>
                <CardDescription>
                  {event.registrationOpen
                    ? "Join us at this event"
                    : "Registration is currently closed"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {event.registrationOpen ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Complete your registration to secure your spot at {event.name}.
                    </p>
                    <Button className="w-full" asChild data-testid="button-register">
                      <Link href={`/event/${slug}/register`}>
                        Register Now
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Registration is not available at this time.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Render custom sections from Site Builder */}
      {sections.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-12 space-y-12">
          {sections
            .sort((a, b) => a.order - b.order)
            .map((section) => (
              <SectionRenderer key={section.id} section={section} event={event} />
            ))}
        </div>
      )}
    </div>
  );
}

function SectionRenderer({ section, event }: { section: Section; event: Event }) {
  const config = section.config;
  const title = String(config.title || "");
  const subtitle = String(config.subtitle || "");
  const buttonText = String(config.buttonText || "");
  const buttonLink = String(config.buttonLink || "");
  const heading = String(config.heading || "");
  const content = String(config.content || "");
  const description = String(config.description || "");

  const renderButton = (text: string, link: string, testId: string) => {
    if (!text) return null;
    const isExternal = link.startsWith("http");
    const isAnchor = link.startsWith("#");
    
    if (link && (isExternal || isAnchor)) {
      return (
        <Button size="lg" asChild data-testid={testId}>
          <a href={link} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined}>
            {text}
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      );
    }
    
    return (
      <Button size="lg" onClick={() => link && (window.location.href = link)} data-testid={testId}>
        {text}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    );
  };

  switch (section.type) {
    case "hero":
      return (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-8 text-center" data-testid={`section-hero-${section.id}`}>
          <h2 className="text-3xl font-bold mb-4">{title || event.name}</h2>
          {subtitle && (
            <p className="text-lg text-muted-foreground mb-6">{subtitle}</p>
          )}
          {renderButton(buttonText, buttonLink, "button-hero-cta")}
        </div>
      );

    case "text":
      return (
        <div className="prose dark:prose-invert max-w-none" data-testid={`section-text-${section.id}`}>
          {heading && <h3 className="text-2xl font-semibold mb-4">{heading}</h3>}
          {content && <p className="text-muted-foreground">{content}</p>}
        </div>
      );

    case "cta":
      return (
        <Card className="bg-primary/5 border-primary/20" data-testid={`section-cta-${section.id}`}>
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-2">{heading || "Ready to Join?"}</h3>
            {description && (
              <p className="text-muted-foreground mb-6">{description}</p>
            )}
            {renderButton(buttonText || "Get Started", buttonLink, "button-cta-action")}
          </CardContent>
        </Card>
      );

    case "features":
      const features = (config.features as Array<{ title: string; description: string }>) || [];
      return (
        <div data-testid={`section-features-${section.id}`}>
          {heading && (
            <h3 className="text-2xl font-semibold mb-6 text-center">{heading}</h3>
          )}
          {features.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature, idx) => (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">Feature items will appear here</p>
          )}
        </div>
      );

    default:
      return null;
  }
}
