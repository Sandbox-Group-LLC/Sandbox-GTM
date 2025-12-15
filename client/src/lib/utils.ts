import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
