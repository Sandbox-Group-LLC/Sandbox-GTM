import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a string to Title Case (capitalizes first letter of each word).
 * Used for consistent badge/tag formatting throughout the application.
 * @example titleCase("document") => "Document"
 * @example titleCase("session type") => "Session Type"
 * @example titleCase("keynote") => "Keynote"
 */
export function titleCase(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
