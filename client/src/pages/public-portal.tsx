import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Clock, Mic, AlertCircle, ArrowLeft, ArrowRight, User } from "lucide-react";
import type { Event, EventSession, Speaker, EventPage, EventPageTheme } from "@shared/schema";

function GoogleFontsLoader({ fonts }: { fonts: string[] }) {
  const uniqueFonts = useMemo(() => [...new Set(fonts.filter(Boolean))], [fonts]);
  
  if (uniqueFonts.length === 0) return null;
  
  const fontsParam = uniqueFonts
    .map(font => `family=${font.replace(/ /g, "+")}:wght@400;500;600;700`)
    .join("&");
  
  return (
    <link
      rel="stylesheet"
      href={`https://fonts.googleapis.com/css2?${fontsParam}&display=swap`}
    />
  );
}

function getThemeStyles(theme: EventPageTheme | null | undefined): React.CSSProperties {
  if (!theme) return {};
  
  const borderRadiusMap: Record<string, string> = {
    none: "0px",
    small: "4px",
    medium: "8px",
    large: "16px",
    pill: "9999px",
  };
  
  const containerWidthMap: Record<string, string> = {
    narrow: "768px",
    standard: "1024px",
    wide: "1280px",
  };
  
  const sectionSpacingMap: Record<string, string> = {
    compact: "2rem",
    normal: "3rem",
    relaxed: "5rem",
  };
  
  return {
    "--theme-primary-color": theme.primaryColor || "#3b82f6",
    "--theme-secondary-color": theme.secondaryColor || "#64748b",
    "--theme-background-color": theme.backgroundColor || "#ffffff",
    "--theme-text-color": theme.textColor || "#1f2937",
    "--theme-text-secondary-color": theme.textSecondaryColor || "#6b7280",
    "--theme-button-color": theme.buttonColor || "#3b82f6",
    "--theme-button-text-color": theme.buttonTextColor || "#ffffff",
    "--theme-card-background": theme.cardBackground || "#f9fafb",
    "--theme-border-radius": borderRadiusMap[theme.borderRadius || "medium"],
    "--theme-container-width": containerWidthMap[theme.containerWidth || "standard"],
    "--theme-section-spacing": sectionSpacingMap[theme.sectionSpacing || "normal"],
    "--theme-heading-font": theme.headingFont || "Inter",
    "--theme-body-font": theme.bodyFont || "Inter",
  } as React.CSSProperties;
}

interface Section {
  id: string;
  type: string;
  order: number;
  config: Record<string, unknown>;
}

interface PublicPortalData {
  event: Event;
  sessions: EventSession[];
  speakers: Speaker[];
  portalPage: EventPage | null;
}

export default function PublicPortal() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery<PublicPortalData>({
    queryKey: ["/api/public/event", slug, "portal"],
    queryFn: async () => {
      const res = await fetch(`/api/public/event/${slug}/portal`);
      if (!res.ok) throw new Error("Failed to fetch portal page");
      return res.json();
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
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
            <h2 className="text-xl font-semibold mb-2">Portal Not Available</h2>
            <p className="text-muted-foreground mb-4">This event portal doesn't exist or is not available.</p>
            <Button variant="outline" asChild>
              <Link href={`/event/${slug}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Event
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { event, sessions, speakers, portalPage } = data;
  const sections = (portalPage?.sections as Section[]) || [];
  const theme = portalPage?.theme;
  const themeStyles = getThemeStyles(theme);
  const fontsToLoad = [theme?.headingFont, theme?.bodyFont].filter(Boolean) as string[];

  return (
    <>
      <GoogleFontsLoader fonts={fontsToLoad} />
      <div 
        className="min-h-screen bg-background"
        style={{
          ...themeStyles,
          backgroundColor: theme?.backgroundColor || undefined,
          color: theme?.textColor || undefined,
          fontFamily: theme?.bodyFont ? `"${theme.bodyFont}", sans-serif` : undefined,
        }}
      >
        <div className="bg-gradient-to-b from-primary/10 to-background py-8 px-6">
          <div className="max-w-4xl mx-auto">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href={`/event/${slug}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Event
              </Link>
            </Button>
            
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary">Attendee Portal</Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>Welcome, Attendee</span>
              </div>
            </div>
            
            <h1 
              className="text-3xl font-bold mb-2" 
              data-testid="text-event-name"
              style={{ fontFamily: theme?.headingFont ? `"${theme.headingFont}", sans-serif` : undefined }}
            >
              {event.name}
            </h1>
            
            <div className="flex flex-wrap gap-4 text-muted-foreground text-sm">
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
          </div>
        </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {sections.length > 0 && (
          <div className="mb-8 space-y-6">
            {sections
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <SectionRenderer key={section.id} section={section} event={event} slug={slug || ""} />
              ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Your Schedule
                </CardTitle>
                <CardDescription>Sessions you can attend</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="p-3 border rounded-md">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-sm">{session.title}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {session.track && <Badge variant="outline" className="text-xs">{session.track}</Badge>}
                          {session.sessionType && <Badge variant="secondary" className="text-xs">{session.sessionType}</Badge>}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        <p>{session.startTime} - {session.endTime}</p>
                        {session.room && <p>{session.room}</p>}
                      </div>
                    </div>
                  </div>
                ))}
                {sessions.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{sessions.length - 5} more sessions
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {speakers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Speakers
                </CardTitle>
                <CardDescription>Featured speakers at this event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {speakers.slice(0, 5).map((speaker) => (
                  <div key={speaker.id} className="flex items-center gap-3 p-2">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      {speaker.photoUrl ? (
                        <img src={speaker.photoUrl} alt={`${speaker.firstName} ${speaker.lastName}`} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold text-muted-foreground">
                          {speaker.firstName[0]}{speaker.lastName[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{speaker.firstName} {speaker.lastName}</p>
                      {speaker.jobTitle && <p className="text-xs text-muted-foreground">{speaker.jobTitle}</p>}
                    </div>
                  </div>
                ))}
                {speakers.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{speakers.length - 5} more speakers
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {sessions.length === 0 && speakers.length === 0 && sections.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Portal Content Coming Soon</h3>
              <p className="text-muted-foreground mb-4">
                Check back later for schedule updates and event information.
              </p>
              <Button variant="outline" asChild>
                <Link href={`/event/${slug}`}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Event
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </>
  );
}

function SectionRenderer({ section, event, slug }: { section: Section; event: Event; slug: string }) {
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, idx) => (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      );

    default:
      return null;
  }
}
