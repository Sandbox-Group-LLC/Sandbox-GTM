import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date string or Date object using consistent US locale formatting.
 * Provides presets for common date display patterns throughout the platform.
 * @param date - ISO date string, Date object, or null/undefined
 * @param preset - Format preset: 'full', 'medium', 'short', 'tabLabel', 'monthDay'
 * @returns Formatted date string or empty string if invalid
 * 
 * @example formatEventDate("2025-03-12", "full") => "Wednesday, March 12, 2025"
 * @example formatEventDate("2025-03-12", "medium") => "March 12, 2025"
 * @example formatEventDate("2025-03-12", "short") => "Mar 12, 2025"
 * @example formatEventDate("2025-03-12", "tabLabel") => "Wed, Mar 12"
 * @example formatEventDate("2025-03-12", "monthDay") => "Mar 12"
 */
export function formatEventDate(
  date: string | Date | null | undefined,
  preset: 'full' | 'medium' | 'short' | 'tabLabel' | 'monthDay' = 'medium'
): string {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "";
    
    const options: Record<string, Intl.DateTimeFormatOptions> = {
      full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
      medium: { month: 'long', day: 'numeric', year: 'numeric' },
      short: { month: 'short', day: 'numeric', year: 'numeric' },
      tabLabel: { weekday: 'short', month: 'short', day: 'numeric' },
      monthDay: { month: 'short', day: 'numeric' }
    };
    
    return dateObj.toLocaleDateString('en-US', options[preset]);
  } catch {
    return "";
  }
}

/**
 * Converts a string to Title Case (capitalizes first letter of each word).
 * Used for consistent badge/tag formatting throughout the application.
 * Preserves known acronyms and handles hyphens properly.
 * @example titleCase("document") => "Document"
 * @example titleCase("panel_discussion") => "Panel Discussion"
 * @example titleCase("VIP") => "VIP" (preserved)
 * @example titleCase("pre-event") => "Pre-Event"
 * @example titleCase("keynote") => "Keynote"
 */
export function titleCase(str: string | null | undefined): string {
  if (!str) return "";
  
  const acronyms = new Set(["VIP", "Q&A", "AI", "ML", "API", "CEO", "CTO", "CFO", "HR", "IT", "USA", "UK", "EU", "AV", "MC", "DJ", "TV", "PC"]);
  
  const capitalizeWord = (word: string): string => {
    const upper = word.toUpperCase();
    if (acronyms.has(upper)) return upper;
    if (word === word.toUpperCase() && word.length > 1) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  };
  
  return str
    .split(/[\s_]+/)
    .map(segment => {
      if (segment.includes("-")) {
        return segment.split("-").map(capitalizeWord).join("-");
      }
      return capitalizeWord(segment);
    })
    .join(" ");
}
