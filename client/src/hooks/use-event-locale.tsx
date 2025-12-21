import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Event, EventTranslation } from "@shared/schema";
import { getUITranslations, type UITranslations } from "@shared/ui-translations";

interface EventLocaleContextValue {
  currentLocale: string;
  setLocale: (locale: string) => void;
  supportedLanguages: string[];
  defaultLanguage: string;
  getLocalizedContent: <T extends { name?: string | null; description?: string | null; location?: string | null }>(
    baseContent: T
  ) => T;
  translations: EventTranslation[];
  isLoading: boolean;
  // UI translations for static text
  t: UITranslations;
}

const EventLocaleContext = createContext<EventLocaleContextValue | null>(null);

function getPreferredLocale(supportedLanguages: string[], defaultLanguage: string): string {
  if (typeof window === "undefined") {
    return defaultLanguage;
  }
  
  // 1. Check URL params first (highest priority)
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get("lang");
  if (urlLang && supportedLanguages.includes(urlLang)) {
    return urlLang;
  }
  
  // 2. Check localStorage for saved preference
  const savedLang = localStorage.getItem("eventLocale");
  if (savedLang && supportedLanguages.includes(savedLang)) {
    return savedLang;
  }
  
  // 3. Check browser language preference
  const browserLang = navigator.language.split("-")[0];
  if (supportedLanguages.includes(browserLang)) {
    return browserLang;
  }
  
  // 4. Fall back to default language
  return defaultLanguage;
}

export function EventLocaleProvider({
  children,
  event,
}: {
  children: React.ReactNode;
  event: Event | null | undefined;
}) {
  const supportedLanguages = event?.supportedLanguages || ["en"];
  const defaultLanguage = event?.defaultLanguage || "en";
  
  // Track the event ID to detect when it changes
  const lastEventIdRef = useRef<string | null>(null);
  const localeInitializedRef = useRef(false);

  // Start with default language, will be re-evaluated when event loads
  const [currentLocale, setCurrentLocale] = useState(defaultLanguage);

  // Re-evaluate locale when event data becomes available or changes
  useEffect(() => {
    if (!event?.id) {
      return;
    }
    
    // Only re-evaluate if this is a new event or first initialization
    if (lastEventIdRef.current === event.id && localeInitializedRef.current) {
      return;
    }
    
    lastEventIdRef.current = event.id;
    localeInitializedRef.current = true;
    
    const preferredLocale = getPreferredLocale(
      event.supportedLanguages || ["en"],
      event.defaultLanguage || "en"
    );
    
    setCurrentLocale(preferredLocale);
  }, [event?.id, event?.supportedLanguages, event?.defaultLanguage]);

  const { data: translations = [], isLoading } = useQuery<EventTranslation[]>({
    queryKey: ["/api/events", event?.id, "translations"],
    enabled: !!event?.id,
  });

  const setLocale = useCallback((locale: string) => {
    setCurrentLocale(locale);
    localStorage.setItem("eventLocale", locale);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", locale);
    window.history.replaceState({}, "", url.toString());
  }, []);

  const getLocalizedContent = useCallback(
    <T extends { name?: string | null; description?: string | null; location?: string | null }>(
      baseContent: T
    ): T => {
      if (currentLocale === defaultLanguage) {
        return baseContent;
      }

      const translation = translations.find((t) => t.languageCode === currentLocale);
      if (!translation) {
        return baseContent;
      }

      return {
        ...baseContent,
        name: translation.name || baseContent.name,
        description: translation.description || baseContent.description,
        location: translation.location || baseContent.location,
      };
    },
    [currentLocale, defaultLanguage, translations]
  );

  // Ensure locale is valid for current event
  useEffect(() => {
    if (event?.id && !supportedLanguages.includes(currentLocale)) {
      setCurrentLocale(defaultLanguage);
    }
  }, [supportedLanguages, currentLocale, defaultLanguage, event?.id]);

  // Get UI translations for current locale
  const uiTranslations = useMemo(() => getUITranslations(currentLocale), [currentLocale]);

  return (
    <EventLocaleContext.Provider
      value={{
        currentLocale,
        setLocale,
        supportedLanguages,
        defaultLanguage,
        getLocalizedContent,
        translations,
        isLoading,
        t: uiTranslations,
      }}
    >
      {children}
    </EventLocaleContext.Provider>
  );
}

export function useEventLocale() {
  const context = useContext(EventLocaleContext);
  if (!context) {
    throw new Error("useEventLocale must be used within EventLocaleProvider");
  }
  return context;
}
