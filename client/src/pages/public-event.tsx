import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Clock, Mic, AlertCircle, ArrowRight, ChevronDown, ChevronUp, Quote } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Event, EventSession, Speaker, EventPage, EventPageTheme } from "@shared/schema";
import { replaceMergeTags, type MergeTagContext } from "@shared/mergeTags";

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
    full: "100%",
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
    queryFn: async () => {
      const res = await fetch(`/api/public/event/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch event");
      return res.json();
    },
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
  const hasSiteBuilderContent = sections.length > 0;

  // If site builder has content, use that as the primary page layout
  if (hasSiteBuilderContent) {
    const theme = landingPage?.theme;
    const themeStyles = getThemeStyles(theme);
    const fontsToLoad = [theme?.headingFont, theme?.bodyFont].filter(Boolean) as string[];
    
    return (
      <>
        <GoogleFontsLoader fonts={fontsToLoad} />
        <div 
          className="min-h-screen overflow-y-auto"
          style={{
            ...themeStyles,
            backgroundColor: theme?.backgroundColor || undefined,
            color: theme?.textColor || undefined,
            fontFamily: theme?.bodyFont ? `"${theme.bodyFont}", sans-serif` : undefined,
          }}
        >
          <div 
            className="mx-auto px-6 py-12 pb-24"
            style={{
              maxWidth: "var(--theme-container-width, 1024px)",
              gap: "var(--theme-section-spacing, 3rem)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {sections
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <SectionRenderer key={section.id} section={section} event={event} sessions={sessions} speakers={speakers} theme={theme} />
              ))}
          </div>
        </div>
      </>
    );
  }

  // Default layout when no site builder content exists
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
    </div>
  );
}

function SectionRenderer({ section, event, sessions, speakers, theme }: { section: Section; event: Event; sessions?: EventSession[]; speakers?: Speaker[]; theme?: EventPageTheme | null }) {
  const config = section.config;
  const isFullWidth = theme?.containerWidth === "full";
  const isHtmlSection = section.type === "html";
  
  const wrapWithMargins = (content: React.ReactNode) => {
    if (isFullWidth && !isHtmlSection) {
      return <div style={{ marginLeft: "10%", marginRight: "10%" }}>{content}</div>;
    }
    return content;
  };
  
  const mergeTagContext: MergeTagContext = {
    event: {
      name: event.name,
      date: event.startDate ? new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : "",
      location: event.location || "",
      description: event.description || "",
    },
  };
  
  const title = replaceMergeTags(String(config.title || ""), mergeTagContext);
  const subtitle = replaceMergeTags(String(config.subtitle || ""), mergeTagContext);
  const buttonText = replaceMergeTags(String(config.buttonText || ""), mergeTagContext);
  const buttonLink = String(config.buttonLink || "");
  const heading = replaceMergeTags(String(config.heading || ""), mergeTagContext);
  const content = replaceMergeTags(String(config.content || ""), mergeTagContext);
  const description = replaceMergeTags(String(config.description || ""), mergeTagContext);

  const borderRadiusMap: Record<string, string> = {
    none: "0px", small: "4px", medium: "8px", large: "16px", pill: "9999px",
  };
  const themeRadius = borderRadiusMap[theme?.borderRadius || "medium"];
  const isOutlineButton = theme?.buttonStyle === "outline";

  const buttonStyles: React.CSSProperties = isOutlineButton 
    ? {
        backgroundColor: "transparent",
        color: theme?.buttonColor || "#3b82f6",
        border: `2px solid ${theme?.buttonColor || "#3b82f6"}`,
        borderRadius: themeRadius,
      }
    : {
        backgroundColor: theme?.buttonColor || undefined,
        color: theme?.buttonTextColor || undefined,
        borderRadius: themeRadius,
      };

  const cardStyles: React.CSSProperties = {
    backgroundColor: theme?.cardBackground || undefined,
    borderRadius: themeRadius,
  };

  const headingStyles: React.CSSProperties = {
    fontFamily: theme?.headingFont ? `"${theme.headingFont}", sans-serif` : undefined,
    color: theme?.textColor || undefined,
  };

  const secondaryTextStyles: React.CSSProperties = {
    color: theme?.textSecondaryColor || undefined,
  };

  const renderButton = (text: string, link: string, testId: string) => {
    if (!text) return null;
    const isExternal = link.startsWith("http");
    const isAnchor = link.startsWith("#");
    
    // Resolve relative links like "/register" to full event path "/event/{slug}/register"
    let resolvedLink = link;
    if (link && !isExternal && !isAnchor) {
      // Remove leading slash if present for relative paths
      const relativePath = link.startsWith("/") ? link.slice(1) : link;
      resolvedLink = `/event/${event.publicSlug}/${relativePath}`;
    }
    
    if (link && (isExternal || isAnchor)) {
      return (
        <Button size="lg" asChild data-testid={testId} style={buttonStyles}>
          <a href={link} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined}>
            {text}
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      );
    }
    
    return (
      <Button size="lg" asChild data-testid={testId} style={buttonStyles}>
        <Link href={resolvedLink}>
          {text}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    );
  };

  switch (section.type) {
    case "hero":
      const eventDate = event.startDate ? new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : "";
      return wrapWithMargins(
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-800 p-8 py-12" style={{ borderRadius: themeRadius }} data-testid={`section-hero-${section.id}`}>
          <Badge variant="secondary" className="mb-4 bg-zinc-700 text-zinc-100">Public Event</Badge>
          <h1 className="text-4xl font-bold mb-4 text-white">{title || event.name}</h1>
          <div className="flex flex-wrap gap-4 text-zinc-300 mb-4">
            {eventDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{eventDate}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
            )}
          </div>
          {(subtitle || event.description) && (
            <p className="text-lg text-zinc-300 mb-6">{subtitle || event.description}</p>
          )}
          {renderButton(buttonText || "Register Now", buttonLink || `/event/${event.publicSlug}/register`, "button-hero-cta")}
        </div>
      );

    case "text":
      return wrapWithMargins(
        <div className="prose dark:prose-invert max-w-none" data-testid={`section-text-${section.id}`}>
          {heading && <h3 className="text-2xl font-semibold mb-4" style={headingStyles}>{heading}</h3>}
          {content && <p style={secondaryTextStyles}>{content}</p>}
        </div>
      );

    case "cta":
      return wrapWithMargins(
        <Card className="bg-primary/5 border-primary/20" style={cardStyles} data-testid={`section-cta-${section.id}`}>
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-2" style={headingStyles}>{heading || "Ready to Join?"}</h3>
            {description && (
              <p className="mb-6" style={secondaryTextStyles}>{description}</p>
            )}
            {renderButton(buttonText || "Get Started", buttonLink, "button-cta-action")}
          </CardContent>
        </Card>
      );

    case "features":
      const rawFeatures = (config.features as Array<string | { title: string; description: string }>) || [];
      return wrapWithMargins(
        <div data-testid={`section-features-${section.id}`}>
          {heading && (
            <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>
          )}
          {rawFeatures.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rawFeatures.map((feature, idx) => {
                const isString = typeof feature === "string";
                const featureTitle = isString ? feature : feature.title;
                const featureDescription = isString ? "" : feature.description;
                return (
                  <Card key={idx} style={cardStyles}>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2" style={headingStyles}>{featureTitle}</h4>
                      {featureDescription && <p className="text-sm" style={secondaryTextStyles}>{featureDescription}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-center" style={secondaryTextStyles}>Feature items will appear here</p>
          )}
        </div>
      );

    case "countdown":
      return wrapWithMargins(<CountdownSection config={config} event={event} sectionId={section.id} theme={theme} />);

    case "speakers":
      const showBio = config.showBio !== false;
      return wrapWithMargins(
        <div data-testid={`section-speakers-${section.id}`}>
          {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
          {speakers && speakers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {speakers.map((speaker) => (
                <Card key={speaker.id} style={cardStyles}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      {speaker.photoUrl ? (
                        <img src={speaker.photoUrl} alt={`${speaker.firstName} ${speaker.lastName}`} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-xl font-semibold" style={secondaryTextStyles}>
                          {speaker.firstName[0]}{speaker.lastName[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium" style={headingStyles}>{speaker.firstName} {speaker.lastName}</p>
                      {speaker.jobTitle && <p className="text-sm" style={secondaryTextStyles}>{speaker.jobTitle}</p>}
                      {speaker.company && <p className="text-sm" style={secondaryTextStyles}>{speaker.company}</p>}
                      {showBio && speaker.bio && <p className="text-sm mt-2 line-clamp-2" style={secondaryTextStyles}>{speaker.bio}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center" style={secondaryTextStyles}>Speakers will appear here</p>
          )}
        </div>
      );

    case "agenda":
      const showRoom = config.showRoom !== false;
      const showTrack = config.showTrack !== false;
      return wrapWithMargins(
        <div data-testid={`section-agenda-${section.id}`}>
          {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
          {sessions && sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Card key={session.id} style={cardStyles}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-medium" style={headingStyles}>{session.title}</h4>
                        {session.description && (
                          <p className="text-sm mt-1" style={secondaryTextStyles}>{session.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {showTrack && session.track && <Badge variant="outline">{session.track}</Badge>}
                          {session.sessionType && <Badge variant="secondary">{session.sessionType}</Badge>}
                        </div>
                      </div>
                      <div className="text-right text-sm whitespace-nowrap" style={secondaryTextStyles}>
                        <p>{session.startTime} - {session.endTime}</p>
                        {showRoom && session.room && <p className="text-xs">{session.room}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center" style={secondaryTextStyles}>Schedule will appear here</p>
          )}
        </div>
      );

    case "faq":
      const faqItems = (config.items as Array<{ question: string; answer: string }>) || [];
      return wrapWithMargins(
        <div data-testid={`section-faq-${section.id}`}>
          {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
          {faqItems.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, idx) => (
                <AccordionItem key={idx} value={`faq-${idx}`}>
                  <AccordionTrigger className="text-left" style={headingStyles}>{item.question}</AccordionTrigger>
                  <AccordionContent style={secondaryTextStyles}>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-center" style={secondaryTextStyles}>FAQ items will appear here</p>
          )}
        </div>
      );

    case "testimonials":
      const testimonialItems = (config.items as Array<{ quote: string; author: string; role: string }>) || [];
      return wrapWithMargins(
        <div data-testid={`section-testimonials-${section.id}`}>
          {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
          {testimonialItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testimonialItems.map((item, idx) => (
                <Card key={idx} style={cardStyles}>
                  <CardContent className="p-6">
                    <Quote className="w-8 h-8 text-primary/30 mb-4" />
                    <p className="mb-4 italic" style={secondaryTextStyles}>{item.quote}</p>
                    <div>
                      <p className="font-medium" style={headingStyles}>{item.author}</p>
                      {item.role && <p className="text-sm" style={secondaryTextStyles}>{item.role}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center" style={secondaryTextStyles}>Testimonials will appear here</p>
          )}
        </div>
      );

    case "gallery":
      const galleryImages = (config.images as Array<{ url: string; caption: string }>) || [];
      return wrapWithMargins(
        <div data-testid={`section-gallery-${section.id}`}>
          {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {galleryImages.map((item, idx) => (
                <div key={idx} className="relative aspect-video bg-muted overflow-hidden" style={{ borderRadius: themeRadius }}>
                  <img src={item.url} alt={item.caption || `Gallery image ${idx + 1}`} className="w-full h-full object-cover" />
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                      <p className="text-white text-sm">{item.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center" style={secondaryTextStyles}>Gallery images will appear here</p>
          )}
        </div>
      );

    case "html":
      const htmlContent = replaceMergeTags(String(config.content || ""), mergeTagContext);
      return (
        <div 
          data-testid={`section-html-${section.id}`}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      );

    default:
      return null;
  }
}

function CountdownSection({ config, event, sectionId, theme }: { config: Record<string, unknown>; event: Event; sectionId: string; theme?: EventPageTheme | null }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const heading = String(config.heading || "Event Starts In");
  const useEventDate = config.useEventDate !== false;
  const customDate = String(config.customDate || "");
  
  const targetDate = useEventDate ? new Date(event.startDate) : customDate ? new Date(customDate) : new Date(event.startDate);

  const borderRadiusMap: Record<string, string> = {
    none: "0px", small: "4px", medium: "8px", large: "16px", pill: "9999px",
  };
  const themeRadius = borderRadiusMap[theme?.borderRadius || "medium"];

  const headingStyles: React.CSSProperties = {
    fontFamily: theme?.headingFont ? `"${theme.headingFont}", sans-serif` : undefined,
    color: theme?.textColor || undefined,
  };

  const secondaryTextStyles: React.CSSProperties = {
    color: theme?.textSecondaryColor || undefined,
  };

  const cardStyles: React.CSSProperties = {
    backgroundColor: theme?.cardBackground || undefined,
    borderRadius: themeRadius,
  };

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const diff = target - now;

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [targetDate.getTime()]);

  return (
    <div className="text-center" data-testid={`section-countdown-${sectionId}`}>
      {heading && <h3 className="text-2xl font-semibold mb-6" style={headingStyles}>{heading}</h3>}
      <div className="flex justify-center gap-4">
        {[
          { value: timeLeft.days, label: "Days" },
          { value: timeLeft.hours, label: "Hours" },
          { value: timeLeft.minutes, label: "Minutes" },
          { value: timeLeft.seconds, label: "Seconds" },
        ].map((item) => (
          <div key={item.label} className="bg-primary/10 p-4 min-w-[80px]" style={cardStyles}>
            <div className="text-3xl font-bold" style={headingStyles}>{item.value}</div>
            <div className="text-sm" style={secondaryTextStyles}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
