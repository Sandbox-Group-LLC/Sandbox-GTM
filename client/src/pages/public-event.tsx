import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Clock, Mic, AlertCircle, ArrowRight, ChevronDown, ChevronUp, Quote, Star, Zap, Heart, Check, Award, Target, Users, Mail, Phone, Globe } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Event, EventSession, Speaker, EventPage, EventPageTheme, EventSponsor } from "@shared/schema";
import { replaceMergeTags, type MergeTagContext } from "@shared/mergeTags";
import { sanitizeCustomCss } from "@shared/css-sanitizer";

export { sanitizeCustomCss };

/**
 * Scopes custom CSS by prefixing all rules with .event-page-custom
 * This prevents CSS leakage to the admin shell or other parts of the app
 */
export function scopeCustomCss(css: string): string {
  if (!css || !css.trim()) return '';
  
  // Split by } to find individual rules, then process each
  // This is a simplified parser that handles most common CSS patterns
  const result: string[] = [];
  let depth = 0;
  let currentRule = '';
  let inAtRule = false;
  let atRuleContent = '';
  
  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    
    if (char === '@' && depth === 0) {
      inAtRule = true;
    }
    
    if (char === '{') {
      depth++;
      if (inAtRule && depth === 1) {
        // This is the opening of an @-rule block (like @media)
        atRuleContent = currentRule + '{';
        currentRule = '';
        continue;
      }
    }
    
    if (char === '}') {
      depth--;
      if (depth === 0) {
        if (inAtRule) {
          // End of @-rule block
          // Process the inner rules with scoping
          const innerScoped = scopeInnerRules(currentRule);
          result.push(atRuleContent + innerScoped + '}');
          atRuleContent = '';
          currentRule = '';
          inAtRule = false;
        } else {
          // End of a regular rule
          currentRule += '}';
          const scoped = scopeSingleRule(currentRule);
          if (scoped) result.push(scoped);
          currentRule = '';
        }
        continue;
      }
    }
    
    currentRule += char;
  }
  
  return result.join('\n');
}

function scopeInnerRules(innerCss: string): string {
  const result: string[] = [];
  let currentRule = '';
  let depth = 0;
  
  for (let i = 0; i < innerCss.length; i++) {
    const char = innerCss[i];
    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) {
        currentRule += '}';
        const scoped = scopeSingleRule(currentRule);
        if (scoped) result.push(scoped);
        currentRule = '';
        continue;
      }
    }
    currentRule += char;
  }
  
  return result.join('\n');
}

function scopeSingleRule(rule: string): string {
  const trimmed = rule.trim();
  if (!trimmed) return '';
  
  const braceIndex = trimmed.indexOf('{');
  if (braceIndex === -1) return '';
  
  const selector = trimmed.slice(0, braceIndex).trim();
  const body = trimmed.slice(braceIndex);
  
  // Handle multiple selectors separated by commas
  const selectors = selector.split(',').map(s => s.trim()).filter(Boolean);
  const scopedSelectors = selectors.map(s => {
    // Skip if already scoped
    if (s.includes('.event-page-custom')) return s;
    // Handle :root, html, body specially - they become .event-page-custom
    if (s === ':root' || s === 'html' || s === 'body') {
      return '.event-page-custom';
    }
    return `.event-page-custom ${s}`;
  });
  
  return scopedSelectors.join(', ') + ' ' + body;
}

export function GoogleFontsLoader({ fonts }: { fonts: string[] }) {
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

export function getThemeStyles(theme: EventPageTheme | null | undefined): React.CSSProperties {
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

export interface SectionStyles {
  backgroundColor?: string;
  textColor?: string;
  paddingTop?: 'none' | 'small' | 'medium' | 'large';
  paddingBottom?: 'none' | 'small' | 'medium' | 'large';
  customClass?: string;
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
}

export interface Section {
  id: string;
  type: string;
  order: number;
  config: Record<string, unknown>;
  styles?: SectionStyles;
}

interface PublicEventData {
  event: Event;
  sessions: EventSession[];
  speakers: Speaker[];
  sponsors: EventSponsor[];
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

  // Inject SEO meta tags when data is loaded
  useEffect(() => {
    if (!data) return;
    const { event, landingPage } = data;
    const seo = landingPage?.seo;
    
    // Set document title
    document.title = seo?.title || event.name;
    
    // Helper to set or remove meta tags
    const setMeta = (name: string, content: string | undefined, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (content) {
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute(attr, name);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
      } else if (tag) {
        tag.remove();
      }
    };
    
    // Set canonical link
    const setCanonical = (href: string) => {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };
    
    setMeta('description', seo?.description || event.description);
    setMeta('og:title', seo?.title || event.name, true);
    setMeta('og:description', seo?.description || event.description, true);
    setMeta('og:image', seo?.ogImage, true);
    setMeta('og:type', 'website', true);
    setMeta('og:url', window.location.href, true);
    setCanonical(window.location.href);
    
    // Cleanup function to remove tags on unmount
    return () => {
      document.title = 'Event';
      ['description'].forEach(name => {
        const tag = document.querySelector(`meta[name="${name}"]`);
        if (tag) tag.remove();
      });
      ['og:title', 'og:description', 'og:image', 'og:type', 'og:url'].forEach(prop => {
        const tag = document.querySelector(`meta[property="${prop}"]`);
        if (tag) tag.remove();
      });
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.remove();
    };
  }, [data]);

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

  const { event, sessions, speakers, sponsors, landingPage } = data;
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
        {theme?.customCss && (
          <style dangerouslySetInnerHTML={{ __html: scopeCustomCss(sanitizeCustomCss(theme.customCss)) }} />
        )}
        <div 
          className="event-page-custom min-h-screen overflow-y-auto"
          style={{
            ...themeStyles,
            backgroundColor: theme?.backgroundColor || undefined,
            color: theme?.textColor || undefined,
            fontFamily: theme?.bodyFont ? `"${theme.bodyFont}", sans-serif` : undefined,
          }}
        >
          <div 
            className={`mx-auto ${theme?.pagePadding === 'none' ? '' : 'px-6 py-12'} pb-24`}
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
                <SectionRenderer key={section.id} section={section} event={event} sessions={sessions} speakers={speakers} sponsors={sponsors} theme={theme} />
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

const SECTION_PADDING_MAP: Record<string, string> = {
  none: "0",
  small: "1rem",
  medium: "2rem",
  large: "4rem",
};

export function SectionRenderer({ section, event, sessions, speakers, sponsors, theme, isHighlighted, isPreview }: { section: Section; event: Event; sessions?: EventSession[]; speakers?: Speaker[]; sponsors?: EventSponsor[]; theme?: EventPageTheme | null; isHighlighted?: boolean; isPreview?: boolean }) {
  const config = section.config;
  const styles = section.styles;
  const isFullWidth = theme?.containerWidth === "full";
  const isHtmlSection = section.type === "html";
  
  const sectionWrapperStyles: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor || undefined,
    color: styles?.textColor || undefined,
    paddingTop: SECTION_PADDING_MAP[styles?.paddingTop || "none"] || undefined,
    paddingBottom: SECTION_PADDING_MAP[styles?.paddingBottom || "none"] || undefined,
  };
  
  const wrapWithMargins = (content: React.ReactNode) => {
    let wrapped = content;
    if (isFullWidth && !isHtmlSection) {
      wrapped = <div style={{ marginLeft: "10%", marginRight: "10%" }}>{wrapped}</div>;
    }
    
    // Build visibility classes based on hideOnMobile/hideOnDesktop settings
    // Skip in preview mode - filtering is handled by site-builder.tsx based on simulated device width
    const visibilityClasses: string[] = [];
    if (!isPreview) {
      if (styles?.hideOnMobile) {
        visibilityClasses.push('hidden md:block'); // Hide on mobile, show on md and up
      }
      if (styles?.hideOnDesktop) {
        visibilityClasses.push('md:hidden'); // Hide on md and up (desktop)
      }
    }
    
    // Always wrap sections consistently with section-type class for styling hooks
    wrapped = (
      <div 
        className={`section-${section.type} ${styles?.customClass || ""} ${visibilityClasses.join(' ')}`.trim()}
        style={sectionWrapperStyles}
      >
        {wrapped}
      </div>
    );
    return wrapped;
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
        border: `2px solid ${theme?.buttonBorderColor || theme?.buttonColor || "#3b82f6"}`,
        borderRadius: themeRadius,
      }
    : {
        backgroundColor: theme?.buttonColor || undefined,
        color: theme?.buttonTextColor || undefined,
        borderRadius: themeRadius,
        border: theme?.buttonBorderColor ? `2px solid ${theme.buttonBorderColor}` : undefined,
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
      const heroStyles: React.CSSProperties = {
        backgroundColor: theme?.cardBackground || undefined,
        borderRadius: themeRadius,
        borderColor: theme?.borderColor || undefined,
        borderWidth: theme?.borderColor ? '1px' : undefined,
        borderStyle: theme?.borderColor ? 'solid' : undefined,
      };
      return wrapWithMargins(
        <div className="p-8 py-12 bg-muted" style={heroStyles} data-testid={`section-hero-${section.id}`}>
          <Badge variant="secondary" className="mb-4">Public Event</Badge>
          <h1 className="text-4xl font-bold mb-4" style={headingStyles}>{title || event.name}</h1>
          <div className="flex flex-wrap gap-4 mb-4" style={secondaryTextStyles}>
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
            <p className="text-lg mb-6" style={secondaryTextStyles}>{subtitle || event.description}</p>
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
      const speakersDataSource = config.dataSource as string || "dynamic";
      const speakersDynamicFilters = config.dynamicFilters as { limit?: number; showFeaturedOnly?: boolean } || {};
      
      let displaySpeakers = speakers || [];
      if (speakersDataSource === "dynamic" && displaySpeakers.length > 0) {
        if (speakersDynamicFilters.showFeaturedOnly) {
          displaySpeakers = displaySpeakers.filter((s: Speaker) => (s as Speaker & { isFeatured?: boolean }).isFeatured);
        }
        if (speakersDynamicFilters.limit && speakersDynamicFilters.limit > 0) {
          displaySpeakers = displaySpeakers.slice(0, speakersDynamicFilters.limit);
        }
      }
      
      return wrapWithMargins(
        <div data-testid={`section-speakers-${section.id}`}>
          {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
          {displaySpeakers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displaySpeakers.map((speaker) => (
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
      const agendaDataSource = config.dataSource as string || "dynamic";
      const agendaDynamicFilters = config.dynamicFilters as { limit?: number; filterByTrack?: string; filterByDay?: string } || {};
      
      let displaySessions = sessions || [];
      if (agendaDataSource === "dynamic" && displaySessions.length > 0) {
        if (agendaDynamicFilters.filterByTrack) {
          displaySessions = displaySessions.filter((s: EventSession) => s.track === agendaDynamicFilters.filterByTrack);
        }
        if (agendaDynamicFilters.filterByDay) {
          displaySessions = displaySessions.filter((s: EventSession) => s.day === agendaDynamicFilters.filterByDay);
        }
        if (agendaDynamicFilters.limit && agendaDynamicFilters.limit > 0) {
          displaySessions = displaySessions.slice(0, agendaDynamicFilters.limit);
        }
      }
      
      return wrapWithMargins(
        <div data-testid={`section-agenda-${section.id}`}>
          {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
          {displaySessions.length > 0 ? (
            <div className="space-y-3">
              {displaySessions.map((session) => (
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
      return wrapWithMargins(
        <div 
          data-testid={`section-html-${section.id}`}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      );

    case "columns":
      const simpleColumns = (config.columns as Array<{ heading: string; content: string }>) || [];
      const columnCount = (config.columnCount as number) || 2;
      const gridColsClass = columnCount === 2 ? "md:grid-cols-2" : columnCount === 3 ? "md:grid-cols-3" : "md:grid-cols-4";
      return wrapWithMargins(
        <div data-testid={`section-columns-${section.id}`}>
          {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
          <div className={`grid grid-cols-1 ${gridColsClass} gap-6`}>
            {simpleColumns.slice(0, columnCount).map((col, idx) => (
              <div key={idx} className="space-y-2">
                {col.heading && <h4 className="text-lg font-semibold" style={headingStyles}>{col.heading}</h4>}
                {col.content && <p style={secondaryTextStyles}>{col.content}</p>}
              </div>
            ))}
          </div>
        </div>
      );

    case "columns-flex":
      const flexColumns = (config.columns as Array<{ icon: string; heading: string; content: string; imageUrl: string; buttonText: string; buttonLink: string }>) || [];
      const flexColumnCount = (config.columnCount as number) || 3;
      const flexGridColsClass = flexColumnCount === 2 ? "md:grid-cols-2" : flexColumnCount === 3 ? "md:grid-cols-3" : "md:grid-cols-4";
      
      const getIconComponent = (iconName: string) => {
        const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
          star: Star, zap: Zap, heart: Heart, check: Check, award: Award,
          target: Target, users: Users, calendar: Calendar, mail: Mail,
          phone: Phone, globe: Globe, "map-pin": MapPin,
        };
        return iconMap[iconName] || Star;
      };
      
      return wrapWithMargins(
        <div data-testid={`section-columns-flex-${section.id}`}>
          {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
          <div className={`grid grid-cols-1 ${flexGridColsClass} gap-6`}>
            {flexColumns.slice(0, flexColumnCount).map((col, idx) => {
              const IconComponent = getIconComponent(col.icon);
              return (
                <Card key={idx} style={cardStyles}>
                  <CardContent className="p-6 space-y-4">
                    {col.imageUrl && (
                      <img src={col.imageUrl} alt={col.heading} className="w-full h-40 object-cover rounded-md" />
                    )}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: theme?.primaryColor || "#3b82f6" }}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 space-y-2">
                        {col.heading && <h4 className="text-lg font-semibold" style={headingStyles}>{col.heading}</h4>}
                        {col.content && <p className="text-sm" style={secondaryTextStyles}>{col.content}</p>}
                      </div>
                    </div>
                    {col.buttonText && col.buttonLink && (
                      <Button asChild style={buttonStyles}>
                        <a href={col.buttonLink}>{col.buttonText}</a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      );

    case "sponsors":
      const sponsorsDataSource = config.dataSource as string || "dynamic";
      const sponsorsDynamicFilters = config.dynamicFilters as { limit?: number; filterByTier?: string; sortOrder?: string } || {};
      const tierOrder: Record<string, number> = { gold: 0, silver: 1, bronze: 2 };
      const tierColors: Record<string, string> = {
        gold: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400",
        silver: "bg-gray-100 dark:bg-gray-800 border-gray-400",
        bronze: "bg-orange-100 dark:bg-orange-900/30 border-orange-400",
      };
      
      let displaySponsors: Array<{ name: string; logoUrl: string; tier: string; url?: string; websiteUrl?: string }> = [];
      
      if (sponsorsDataSource === "dynamic" && sponsors && sponsors.length > 0) {
        displaySponsors = sponsors.map(s => ({
          name: s.name,
          logoUrl: s.logoUrl || "",
          tier: s.tier || "bronze",
          url: s.websiteUrl || "",
          websiteUrl: s.websiteUrl || "",
        }));
        if (sponsorsDynamicFilters.filterByTier) {
          displaySponsors = displaySponsors.filter(s => s.tier === sponsorsDynamicFilters.filterByTier);
        }
        if (sponsorsDynamicFilters.limit && sponsorsDynamicFilters.limit > 0) {
          displaySponsors = displaySponsors.slice(0, sponsorsDynamicFilters.limit);
        }
      } else {
        displaySponsors = (config.sponsors as Array<{ name: string; logoUrl: string; tier: string; url?: string }>) || [];
      }
      
      const sortedSponsors = [...displaySponsors].sort((a, b) => {
        if (sponsorsDynamicFilters.sortOrder === "name") {
          return a.name.localeCompare(b.name);
        }
        return (tierOrder[a.tier] ?? 3) - (tierOrder[b.tier] ?? 3);
      });
      
      return wrapWithMargins(
        <div data-testid={`section-sponsors-${section.id}`}>
          {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
          {sortedSponsors.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedSponsors.map((sponsor, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 border rounded-md flex flex-col items-center gap-2 ${tierColors[sponsor.tier] || "bg-muted"}`}
                  style={{ borderRadius: themeRadius }}
                  data-testid={`sponsor-item-${idx}`}
                >
                  {sponsor.logoUrl ? (
                    (sponsor.url || sponsor.websiteUrl) ? (
                      <a href={sponsor.url || sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                        <img src={sponsor.logoUrl} alt={sponsor.name} className="h-16 w-full object-contain" />
                      </a>
                    ) : (
                      <img src={sponsor.logoUrl} alt={sponsor.name} className="h-16 w-full object-contain" />
                    )
                  ) : (
                    <div className="h-16 w-full flex items-center justify-center bg-muted/50" style={{ borderRadius: themeRadius }}>
                      <span className="text-sm" style={secondaryTextStyles}>{sponsor.name}</span>
                    </div>
                  )}
                  <Badge variant="outline" className="capitalize">{sponsor.tier}</Badge>
                  {sponsor.name && !sponsor.logoUrl && (
                    <span className="text-sm font-medium text-center" style={headingStyles}>{sponsor.name}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center" style={secondaryTextStyles}>Sponsors will appear here</p>
          )}
        </div>
      );

    case "map":
      const mapEmbedUrl = (config.embedUrl as string) || "";
      const useEventAddress = config.useEventAddress !== false;
      const mapAddress = useEventAddress && event.location ? event.location : "";
      const googleMapsEmbedUrl = mapEmbedUrl || (mapAddress ? `https://www.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed` : "");
      return wrapWithMargins(
        <div data-testid={`section-map-${section.id}`}>
          {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
          {googleMapsEmbedUrl ? (
            <div className="aspect-video w-full overflow-hidden" style={{ borderRadius: themeRadius }}>
              <iframe
                src={googleMapsEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Event Location Map"
                data-testid="map-iframe"
              />
            </div>
          ) : (
            <div className="aspect-video w-full flex items-center justify-center bg-muted" style={{ borderRadius: themeRadius }}>
              <p style={secondaryTextStyles}>Map will appear here when a location is configured</p>
            </div>
          )}
        </div>
      );

    case "video":
      const videoUrl = (config.videoUrl as string) || "";
      const autoplay = config.autoplay === true;
      let videoEmbedUrl = "";
      if (videoUrl) {
        if (videoUrl.includes("youtube.com/watch")) {
          const videoId = new URL(videoUrl).searchParams.get("v");
          videoEmbedUrl = videoId ? `https://www.youtube.com/embed/${videoId}${autoplay ? "?autoplay=1" : ""}` : "";
        } else if (videoUrl.includes("youtu.be/")) {
          const videoId = videoUrl.split("youtu.be/")[1]?.split("?")[0];
          videoEmbedUrl = videoId ? `https://www.youtube.com/embed/${videoId}${autoplay ? "?autoplay=1" : ""}` : "";
        } else if (videoUrl.includes("vimeo.com/")) {
          const videoId = videoUrl.split("vimeo.com/")[1]?.split("?")[0];
          videoEmbedUrl = videoId ? `https://player.vimeo.com/video/${videoId}${autoplay ? "?autoplay=1" : ""}` : "";
        } else if (videoUrl.includes("youtube.com/embed") || videoUrl.includes("player.vimeo.com")) {
          videoEmbedUrl = videoUrl;
        }
      }
      return wrapWithMargins(
        <div data-testid={`section-video-${section.id}`}>
          {heading && <h3 className="text-2xl font-semibold mb-6 text-center" style={headingStyles}>{heading}</h3>}
          {videoEmbedUrl ? (
            <div className="aspect-video w-full overflow-hidden" style={{ borderRadius: themeRadius }}>
              <iframe
                src={videoEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video"
                data-testid="video-iframe"
              />
            </div>
          ) : (
            <div className="aspect-video w-full flex items-center justify-center bg-muted" style={{ borderRadius: themeRadius }}>
              <p style={secondaryTextStyles}>Video will appear here when a URL is configured</p>
            </div>
          )}
        </div>
      );

    case "footer":
      const showContactInfo = config.showContactInfo !== false;
      const footerEmail = (config.email as string) || "";
      const footerPhone = (config.phone as string) || "";
      const footerAddress = (config.address as string) || "";
      const footerLinks = (config.links as Array<{ label: string; url: string }>) || [];
      const showSocialIcons = config.showSocialIcons !== false;
      const facebookUrl = (config.facebookUrl as string) || "";
      const twitterUrl = (config.twitterUrl as string) || "";
      const linkedinUrl = (config.linkedinUrl as string) || "";
      const instagramUrl = (config.instagramUrl as string) || "";
      const copyright = (config.copyright as string) || "";
      return (
        <footer 
          className="w-full py-8 px-6 bg-muted/50 mt-auto"
          style={{ backgroundColor: theme?.cardBackground || undefined, borderRadius: themeRadius }}
          data-testid={`section-footer-${section.id}`}
        >
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {showContactInfo && (footerEmail || footerPhone || footerAddress) && (
                <div>
                  <h4 className="font-semibold mb-3" style={headingStyles}>Contact</h4>
                  <div className="space-y-2 text-sm" style={secondaryTextStyles}>
                    {footerEmail && (
                      <p data-testid="footer-email">
                        <a href={`mailto:${footerEmail}`} className="hover:underline">{footerEmail}</a>
                      </p>
                    )}
                    {footerPhone && (
                      <p data-testid="footer-phone">
                        <a href={`tel:${footerPhone}`} className="hover:underline">{footerPhone}</a>
                      </p>
                    )}
                    {footerAddress && <p data-testid="footer-address">{footerAddress}</p>}
                  </div>
                </div>
              )}
              {footerLinks.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3" style={headingStyles}>Links</h4>
                  <ul className="space-y-2 text-sm" style={secondaryTextStyles}>
                    {footerLinks.map((link, idx) => (
                      <li key={idx}>
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                          data-testid={`footer-link-${idx}`}
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {showSocialIcons && (facebookUrl || twitterUrl || linkedinUrl || instagramUrl) && (
                <div>
                  <h4 className="font-semibold mb-3" style={headingStyles}>Follow Us</h4>
                  <div className="flex gap-3">
                    {facebookUrl && (
                      <a href={facebookUrl} target="_blank" rel="noopener noreferrer" data-testid="social-facebook" className="hover:opacity-80">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      </a>
                    )}
                    {twitterUrl && (
                      <a href={twitterUrl} target="_blank" rel="noopener noreferrer" data-testid="social-twitter" className="hover:opacity-80">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      </a>
                    )}
                    {linkedinUrl && (
                      <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" data-testid="social-linkedin" className="hover:opacity-80">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      </a>
                    )}
                    {instagramUrl && (
                      <a href={instagramUrl} target="_blank" rel="noopener noreferrer" data-testid="social-instagram" className="hover:opacity-80">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
            {copyright && (
              <div className="mt-8 pt-4 border-t text-center text-sm" style={secondaryTextStyles} data-testid="footer-copyright">
                {copyright}
              </div>
            )}
          </div>
        </footer>
      );

    case "navigation":
      const navLogo = (config.logo as string) || "";
      const navLinks = (config.links as Array<{ label: string; url: string }>) || [];
      const showEventTitle = config.showEventTitle !== false;
      const isSticky = config.sticky === true;
      const navStyle = (config.style as string) || "light";
      
      // Use theme colors with fallbacks based on style preference
      const navBgColor = styles?.backgroundColor || (
        navStyle === "dark" ? (theme?.textColor || "#1f2937") :
        navStyle === "transparent" ? "transparent" :
        (theme?.backgroundColor || "#ffffff")
      );
      const navTextColor = styles?.textColor || (
        navStyle === "dark" ? (theme?.backgroundColor || "#ffffff") :
        (theme?.textColor || "#1f2937")
      );
      
      return (
        <nav 
          className={`w-full py-3 px-6 ${isSticky ? 'sticky top-0 z-50' : ''} ${navStyle === "light" ? "border-b" : ""}`}
          style={{ 
            backgroundColor: navBgColor,
            color: navTextColor
          }}
          data-testid={`section-navigation-${section.id}`}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3" data-testid="nav-brand">
              {navLogo && (
                <img src={navLogo} alt="Logo" className="h-8 w-auto" data-testid="nav-logo" />
              )}
              {showEventTitle && (
                <span className="font-semibold" style={{ ...headingStyles, color: navTextColor }} data-testid="nav-event-title">{event.name}</span>
              )}
            </div>
            <div className="flex items-center gap-4" data-testid="nav-links">
              {navLinks.map((link, idx) => (
                <a 
                  key={idx}
                  href={link.url.replace(/\{\{slug\}\}/g, event.publicSlug || '')}
                  className="text-sm hover:underline"
                  style={{ color: navTextColor, opacity: 0.9 }}
                  data-testid={`nav-link-${idx}`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </nav>
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
