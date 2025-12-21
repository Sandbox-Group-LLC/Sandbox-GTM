import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Event, EventTranslation } from "@shared/schema";

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
}

const EventLocaleContext = createContext<EventLocaleContextValue | null>(null);

export function EventLocaleProvider({
  children,
  event,
}: {
  children: React.ReactNode;
  event: Event | null | undefined;
}) {
  const supportedLanguages = event?.supportedLanguages || ["en"];
  const defaultLanguage = event?.defaultLanguage || "en";

  const [currentLocale, setCurrentLocale] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get("lang");
      if (urlLang && supportedLanguages.includes(urlLang)) {
        return urlLang;
      }
      const savedLang = localStorage.getItem("eventLocale");
      if (savedLang && supportedLanguages.includes(savedLang)) {
        return savedLang;
      }
      const browserLang = navigator.language.split("-")[0];
      if (supportedLanguages.includes(browserLang)) {
        return browserLang;
      }
    }
    return defaultLanguage;
  });

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

  useEffect(() => {
    if (!supportedLanguages.includes(currentLocale)) {
      setCurrentLocale(defaultLanguage);
    }
  }, [supportedLanguages, currentLocale, defaultLanguage]);

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
