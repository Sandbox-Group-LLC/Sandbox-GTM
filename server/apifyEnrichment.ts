import { ApifyClient } from "apify-client";
import { z } from "zod";

// Zod schemas for validating Apify response data
const LinkedInPositionSchema = z.object({
  startYear: z.number().optional(),
  startMonth: z.number().optional(),
  endYear: z.number().optional(),
  endMonth: z.number().optional(),
  companyName: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  current: z.boolean().optional(),
}).passthrough(); // Allow extra fields but validate core structure

const LinkedInEducationSchema = z.object({
  startYear: z.number().optional(),
  endYear: z.number().optional(),
  degreeName: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  schoolName: z.string().optional(),
}).passthrough();

const LinkedInSkillSchema = z.object({
  skillName: z.string(),
}).passthrough();

// Schema for validating profile data from Apify
const LinkedInProfileDataSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  headline: z.string().optional(),
  summary: z.string().optional(),
  picture: z.string().optional(),
  locationName: z.string().optional(),
  publicIdentifier: z.string().optional(),
  url: z.string().optional(),
  positions: z.array(LinkedInPositionSchema).optional(),
  educations: z.array(LinkedInEducationSchema).optional(),
  skills: z.array(LinkedInSkillSchema).optional(),
}).passthrough();

// Apify LinkedIn profile scraper actor ID
// curious_coder/linkedin-profile-scraper - actor rented by user
const LINKEDIN_SCRAPER_ACTOR_ID = "curious_coder/linkedin-profile-scraper";

interface LinkedInPosition {
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  endMonth?: number;
  durationMonth?: number;
  durationYear?: number;
  companyName?: string;
  companyUrn?: number;
  companyUrl?: string;
  title?: string;
  description?: string;
  locationName?: string;
  skills?: string;
  current?: boolean;
}

interface LinkedInEducation {
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  endMonth?: number;
  degreeName?: string;
  fieldOfStudy?: string;
  schoolName?: string;
}

interface LinkedInSkill {
  skillName: string;
}

interface LinkedInCertification {
  name?: string;
  authority?: string;
  setLicenseNumber?: string;
  url?: string;
  startYear?: number;
  endYear?: number;
}

interface LinkedInLanguage {
  name: string;
  level?: string;
}

export interface LinkedInProfileData {
  // Core identity fields
  firstName?: string;
  lastName?: string;
  fullName?: string;
  headline?: string;
  about?: string;
  summary?: string; // legacy field name
  
  // URLs and identifiers
  linkedinUrl?: string;
  url?: string;
  publicIdentifier?: string;
  linkedinPublicUrl?: string;
  urn?: string;
  
  // Profile images
  profilePic?: string;
  profilePicHighQuality?: string;
  picture?: string; // legacy field name
  backgroundPic?: string;
  
  // Location
  addressWithCountry?: string;
  addressWithoutCountry?: string;
  addressCountryOnly?: string;
  locationName?: string; // legacy field name
  
  // Current job info
  jobTitle?: string;
  companyName?: string;
  companyIndustry?: string;
  companyWebsite?: string;
  companySize?: string;
  
  // Experience and education
  experiences?: LinkedInExperience[];
  positions?: LinkedInPosition[]; // legacy field name
  educations?: LinkedInEducation[];
  skills?: LinkedInSkillNew[];
  licenseAndCertificates?: LinkedInCertification[];
  certifications?: LinkedInCertification[];
  languages?: LinkedInLanguage[];
  
  // Counts and stats
  connections?: number;
  followers?: number;
  totalExperienceYears?: number;
  
  // Status flags
  isPremium?: boolean;
  isVerified?: boolean;
  isCreator?: boolean;
  isInfluencer?: boolean;
  isCurrentlyEmployed?: boolean;
  
  // Contact info (if available)
  email?: string;
  mobileNumber?: string;
}

interface LinkedInExperience {
  companyName?: string;
  title?: string;
  jobDescription?: string;
  jobStartedOn?: string;
  jobEndedOn?: string;
  jobLocation?: string;
  jobStillWorking?: boolean;
  companySize?: string;
  companyWebsite?: string;
  logo?: string;
}

interface LinkedInSkillNew {
  title: string;
}

export interface ApifyScrapingResult {
  success: boolean;
  profileData?: LinkedInProfileData;
  error?: string;
}

export interface ApifyEnrichmentProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
  status: "idle" | "running" | "completed" | "error";
  currentAttendee?: string;
  errorMessage?: string;
}

const enrichmentProgress: Map<string, ApifyEnrichmentProgress> = new Map();
// Track active enrichments to prevent concurrent runs
const activeEnrichments: Set<string> = new Set();

export function getApifyEnrichmentProgress(eventId: string): ApifyEnrichmentProgress | null {
  return enrichmentProgress.get(eventId) || null;
}

export function isEnrichmentActive(eventId: string): boolean {
  return activeEnrichments.has(eventId);
}

// Clear active enrichment immediately (prevents permanent locking)
function clearActiveEnrichment(eventId: string) {
  activeEnrichments.delete(eventId);
}

// Clear progress after a delay to allow final polling
function clearProgressAfterDelay(eventId: string, delayMs: number = 30000) {
  setTimeout(() => {
    const progress = enrichmentProgress.get(eventId);
    // Only clear if status is completed or error (not running)
    if (progress && (progress.status === "completed" || progress.status === "error")) {
      enrichmentProgress.delete(eventId);
    }
  }, delayMs);
}

/**
 * Normalizes a LinkedIn public identifier for comparison
 * Handles various URL formats and edge cases
 */
function normalizePublicIdentifier(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // Extract public identifier from URL
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (match && match[1]) {
    return match[1].toLowerCase().trim().replace(/\/$/, "");
  }
  
  // If it's already just an identifier
  if (!url.includes("/")) {
    return url.toLowerCase().trim();
  }
  
  return null;
}

/**
 * Validates that the scraped profile data matches the expected attendee
 * Requires EITHER publicIdentifier match OR both first AND last name match
 * Returns true if the profile appears to belong to the attendee
 */
function validateProfileMatch(
  profileData: LinkedInProfileData,
  attendee: { firstName: string; lastName: string; linkedinProfileUrl: string | null }
): boolean {
  if (!profileData || !attendee.linkedinProfileUrl) {
    return false;
  }

  // Check 1: Compare public identifiers (strongest match)
  const expectedPublicId = normalizePublicIdentifier(attendee.linkedinProfileUrl);
  const actualPublicId = profileData.publicIdentifier?.toLowerCase().trim();
  
  if (expectedPublicId && actualPublicId && actualPublicId === expectedPublicId) {
    return true;
  }

  // Check 2: Require BOTH first AND last name to match (case-insensitive)
  if (profileData.firstName && profileData.lastName && attendee.firstName && attendee.lastName) {
    const profileFirst = profileData.firstName.toLowerCase().trim();
    const profileLast = profileData.lastName.toLowerCase().trim();
    const attendeeFirst = attendee.firstName.toLowerCase().trim();
    const attendeeLast = attendee.lastName.toLowerCase().trim();
    
    if (profileFirst === attendeeFirst && profileLast === attendeeLast) {
      return true;
    }
  }

  return false;
}

/**
 * Validates and sanitizes profile data from Apify using Zod schema
 * Returns null if validation fails
 */
function validateAndSanitizeProfileData(rawData: unknown): LinkedInProfileData | null {
  try {
    // Parse with Zod to validate structure
    const parsed = LinkedInProfileDataSchema.safeParse(rawData);
    
    if (!parsed.success) {
      console.warn("LinkedIn profile data validation failed:", parsed.error.issues);
      return null;
    }
    
    const profileData = parsed.data;
    
    // Sanitize string fields to database-safe lengths
    return {
      ...profileData,
      headline: profileData.headline?.substring(0, 500),
      summary: profileData.summary?.substring(0, 5000),
      picture: profileData.picture?.substring(0, 500),
      locationName: profileData.locationName?.substring(0, 255),
      // Strip unexpected properties from nested objects
      positions: profileData.positions?.map(p => ({
        startYear: p.startYear,
        endYear: p.endYear,
        companyName: p.companyName,
        title: p.title,
        description: p.description,
        current: p.current,
      })),
      educations: profileData.educations?.map(e => ({
        startYear: e.startYear,
        endYear: e.endYear,
        degreeName: e.degreeName,
        fieldOfStudy: e.fieldOfStudy,
        schoolName: e.schoolName,
      })),
      skills: profileData.skills?.map(s => ({
        skillName: s.skillName,
      })),
    } as LinkedInProfileData;
  } catch (error) {
    console.error("Error validating LinkedIn profile data:", error);
    return null;
  }
}

/**
 * Sanitizes and validates profile data fields before storage (legacy wrapper)
 */
function sanitizeProfileData(profileData: LinkedInProfileData): LinkedInProfileData {
  // Use the new validation function
  const validated = validateAndSanitizeProfileData(profileData);
  if (validated) {
    return validated;
  }
  
  // Fallback: basic sanitization if Zod validation fails
  return {
    ...profileData,
    headline: profileData.headline?.substring(0, 500),
    summary: profileData.summary?.substring(0, 5000),
    picture: profileData.picture?.substring(0, 500),
    locationName: profileData.locationName?.substring(0, 255),
    positions: Array.isArray(profileData.positions) ? profileData.positions : undefined,
    educations: Array.isArray(profileData.educations) ? profileData.educations : undefined,
    skills: Array.isArray(profileData.skills) ? profileData.skills : undefined,
  };
}

/**
 * Scrapes a single LinkedIn profile using the Apify actor
 */
export async function scrapeLinkedInProfile(
  linkedinUrl: string
): Promise<ApifyScrapingResult> {
  const apiToken = process.env.APIFY_API_TOKEN;

  if (!apiToken) {
    return {
      success: false,
      error: "Apify API token not configured"
    };
  }

  try {
    const client = new ApifyClient({ token: apiToken });
    
    // Get LinkedIn session cookie if available (required for accessing profile data)
    const linkedinCookie = process.env.LINKEDIN_SESSION_COOKIE;

    // Run the LinkedIn profile scraper actor
    console.log(`[Apify] Starting scrape for: ${linkedinUrl}`);
    console.log(`[Apify] LinkedIn cookie configured: ${linkedinCookie ? 'Yes' : 'No'}`);
    
    // curious_coder/linkedin-profile-scraper requires urls, cookie, proxy, useragent
    const input: Record<string, unknown> = {
      urls: [linkedinUrl],
      cookie: linkedinCookie ? [
        {
          name: "li_at",
          value: linkedinCookie,
          domain: ".linkedin.com",
          path: "/",
          secure: true,
          httpOnly: true
        }
      ] : [],
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"]
      },
      useragent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };
    
    const run = await client.actor(LINKEDIN_SCRAPER_ACTOR_ID).call(input);
    console.log(`[Apify] Run completed: ${run.id}, status: ${run.status}`);

    // Fetch results from the dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    // Log raw response for debugging
    console.log(`[Apify] Dataset items count: ${items?.length || 0}`);
    if (items && items.length > 0) {
      console.log(`[Apify] Raw item[0]: ${JSON.stringify(items[0], null, 2)}`);
    }

    if (items && items.length > 0) {
      const profileData = items[0] as LinkedInProfileData;
      return {
        success: true,
        profileData
      };
    }

    return {
      success: false,
      error: "No profile data returned from scraper"
    };
  } catch (error) {
    console.error("Error scraping LinkedIn profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Scrapes multiple LinkedIn profiles in batch
 */
export async function scrapeLinkedInProfilesBatch(
  linkedinUrls: string[]
): Promise<Map<string, ApifyScrapingResult>> {
  const results = new Map<string, ApifyScrapingResult>();
  const apiToken = process.env.APIFY_API_TOKEN;

  if (!apiToken) {
    for (const url of linkedinUrls) {
      results.set(url, {
        success: false,
        error: "Apify API token not configured"
      });
    }
    return results;
  }

  try {
    const client = new ApifyClient({ token: apiToken });

    // Get LinkedIn session cookie if available
    const linkedinCookie = process.env.LINKEDIN_SESSION_COOKIE;
    
    // curious_coder/linkedin-profile-scraper requires urls, cookie, proxy, useragent
    const input: Record<string, unknown> = {
      urls: linkedinUrls,
      cookie: linkedinCookie ? [
        {
          name: "li_at",
          value: linkedinCookie,
          domain: ".linkedin.com",
          path: "/",
          secure: true,
          httpOnly: true
        }
      ] : [],
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"]
      },
      useragent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };
    
    const run = await client.actor(LINKEDIN_SCRAPER_ACTOR_ID).call(input);

    // Fetch results from the dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Map results back to URLs
    for (const item of items as LinkedInProfileData[]) {
      if (item.url) {
        results.set(item.url, {
          success: true,
          profileData: item
        });
      }
    }

    // Mark any URLs not in results as failed
    for (const url of linkedinUrls) {
      if (!results.has(url)) {
        // Try to match by public identifier
        const publicId = url.split("/in/")[1]?.replace(/\/$/, "");
        const matchingItem = (items as LinkedInProfileData[]).find(
          i => i.publicIdentifier === publicId || i.url?.includes(publicId || "")
        );
        if (matchingItem) {
          results.set(url, {
            success: true,
            profileData: matchingItem
          });
        } else {
          results.set(url, {
            success: false,
            error: "Profile not found in results"
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error("Error batch scraping LinkedIn profiles:", error);
    for (const url of linkedinUrls) {
      if (!results.has(url)) {
        results.set(url, {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred"
        });
      }
    }
    return results;
  }
}

/**
 * Enriches event attendees with full LinkedIn profile data
 */
export async function enrichAttendeesWithLinkedInData(
  eventId: string,
  attendees: Array<{
    id: string;
    firstName: string;
    lastName: string;
    linkedinProfileUrl: string | null;
  }>,
  updateAttendee: (
    id: string,
    profileData: LinkedInProfileData
  ) => Promise<void>
): Promise<ApifyEnrichmentProgress> {
  // Check if enrichment is already running for this event
  if (activeEnrichments.has(eventId)) {
    const existingProgress = enrichmentProgress.get(eventId);
    if (existingProgress && existingProgress.status === "running") {
      return existingProgress;
    }
  }

  // Filter to only attendees with LinkedIn URLs but no enriched data yet
  const attendeesToEnrich = attendees.filter(a => a.linkedinProfileUrl);

  if (attendeesToEnrich.length === 0) {
    return {
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      status: "completed"
    };
  }

  // Mark enrichment as active
  activeEnrichments.add(eventId);

  // Initialize progress tracking
  const progress: ApifyEnrichmentProgress = {
    total: attendeesToEnrich.length,
    processed: 0,
    success: 0,
    failed: 0,
    status: "running"
  };
  enrichmentProgress.set(eventId, progress);

  try {
    // Collect all LinkedIn URLs
    const urlToAttendeeMap = new Map<string, typeof attendeesToEnrich[0]>();
    for (const attendee of attendeesToEnrich) {
      if (attendee.linkedinProfileUrl) {
        urlToAttendeeMap.set(attendee.linkedinProfileUrl, attendee);
      }
    }

    // Batch scrape all profiles (Apify handles this efficiently)
    const urls = Array.from(urlToAttendeeMap.keys());
    
    // Process in batches of 50 to avoid timeouts
    const BATCH_SIZE = 50;
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batchUrls = urls.slice(i, i + BATCH_SIZE);
      const results = await scrapeLinkedInProfilesBatch(batchUrls);

      // Update each attendee with their profile data
      for (const [url, result] of Array.from(results.entries())) {
        const attendee = urlToAttendeeMap.get(url);
        if (!attendee) continue;

        progress.currentAttendee = `${attendee.firstName} ${attendee.lastName}`;
        progress.processed++;

        if (result.success && result.profileData) {
          // Validate that the profile matches the expected attendee
          if (!validateProfileMatch(result.profileData, attendee)) {
            console.warn(`Profile mismatch for attendee ${attendee.id}: expected ${attendee.firstName} ${attendee.lastName}, got ${result.profileData.firstName} ${result.profileData.lastName}`);
            progress.failed++;
            enrichmentProgress.set(eventId, { ...progress });
            continue;
          }

          try {
            // Sanitize the profile data before storing
            const sanitizedData = sanitizeProfileData(result.profileData);
            await updateAttendee(attendee.id, sanitizedData);
            progress.success++;
          } catch (error) {
            console.error(`Error updating attendee ${attendee.id}:`, error);
            progress.failed++;
          }
        } else {
          progress.failed++;
        }

        enrichmentProgress.set(eventId, { ...progress });
      }
    }

    progress.status = "completed";
    progress.currentAttendee = undefined;
    enrichmentProgress.set(eventId, progress);

    // Clear active enrichment immediately to allow new enrichments
    clearActiveEnrichment(eventId);
    
    // Clear progress after delay to allow final polling
    clearProgressAfterDelay(eventId);

    return progress;
  } catch (error) {
    console.error("Error enriching attendees with LinkedIn data:", error);
    progress.status = "error";
    progress.errorMessage = error instanceof Error ? error.message : "Unknown error";
    enrichmentProgress.set(eventId, progress);
    
    // Clear active enrichment immediately to allow retry
    clearActiveEnrichment(eventId);
    
    // Clear progress after delay
    clearProgressAfterDelay(eventId);
    
    return progress;
  }
}

/**
 * Formats positions into a readable string
 */
export function formatExperience(positions?: LinkedInPosition[]): string | null {
  if (!positions || positions.length === 0) return null;

  return positions
    .slice(0, 5) // Limit to most recent 5 positions
    .map(pos => {
      const duration = pos.current 
        ? "Present" 
        : pos.endYear 
          ? `${pos.endYear}` 
          : "";
      const startYear = pos.startYear || "";
      const dateRange = startYear && duration ? `${startYear} - ${duration}` : "";
      return `${pos.title || "Position"} at ${pos.companyName || "Company"}${dateRange ? ` (${dateRange})` : ""}`;
    })
    .join("\n");
}

/**
 * Formats skills into a comma-separated string
 */
export function formatSkills(skills?: LinkedInSkill[]): string | null {
  if (!skills || skills.length === 0) return null;
  return skills.map(s => s.skillName).join(", ");
}
