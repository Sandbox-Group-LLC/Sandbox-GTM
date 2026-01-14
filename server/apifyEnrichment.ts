import { ApifyClient } from "apify-client";

// Apify LinkedIn profile scraper actor ID
const LINKEDIN_SCRAPER_ACTOR_ID = "dataweave/linkedin-profile-scraper";

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
  objectUrn?: number;
  locationName?: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  url?: string;
  publicIdentifier?: string;
  summary?: string;
  picture?: string;
  entityUrn?: string;
  openToWork?: boolean;
  premium?: boolean;
  verified?: boolean;
  creator?: boolean;
  influencer?: boolean;
  joinedDate?: string;
  positions?: LinkedInPosition[];
  educations?: LinkedInEducation[];
  skills?: LinkedInSkill[];
  certifications?: LinkedInCertification[];
  languages?: LinkedInLanguage[];
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

export function getApifyEnrichmentProgress(eventId: string): ApifyEnrichmentProgress | null {
  return enrichmentProgress.get(eventId) || null;
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

    // Run the LinkedIn profile scraper actor
    const run = await client.actor(LINKEDIN_SCRAPER_ACTOR_ID).call({
      urls: [linkedinUrl]
    });

    // Fetch results from the dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

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

    // Run the LinkedIn profile scraper actor with all URLs
    const run = await client.actor(LINKEDIN_SCRAPER_ACTOR_ID).call({
      urls: linkedinUrls
    });

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
          try {
            await updateAttendee(attendee.id, result.profileData);
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

    return progress;
  } catch (error) {
    console.error("Error enriching attendees with LinkedIn data:", error);
    progress.status = "error";
    progress.errorMessage = error instanceof Error ? error.message : "Unknown error";
    enrichmentProgress.set(eventId, progress);
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
