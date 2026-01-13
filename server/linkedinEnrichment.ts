interface LinkedInSearchResult {
  linkedinUrl: string | null;
  searchQuery: string;
  title?: string;
  snippet?: string;
}

interface GoogleSearchResponse {
  items?: Array<{
    title: string;
    link: string;
    snippet: string;
  }>;
  error?: {
    message: string;
    code: number;
  };
}

export async function searchLinkedInProfile(
  firstName: string,
  lastName: string,
  company: string | null,
  email: string | null
): Promise<LinkedInSearchResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) {
    throw new Error("Google Custom Search API credentials not configured");
  }

  const fullName = `${firstName} ${lastName}`.trim();
  
  const searchQueries = [];
  
  if (company) {
    searchQueries.push(`site:linkedin.com/in "${fullName}" "${company}"`);
  }
  
  if (email) {
    const emailDomain = email.split("@")[1];
    if (emailDomain && !emailDomain.includes("gmail") && !emailDomain.includes("yahoo") && !emailDomain.includes("hotmail") && !emailDomain.includes("outlook")) {
      const companyFromEmail = emailDomain.split(".")[0];
      searchQueries.push(`site:linkedin.com/in "${fullName}" "${companyFromEmail}"`);
    }
  }
  
  searchQueries.push(`site:linkedin.com/in "${fullName}"`);

  for (const query of searchQueries) {
    try {
      const url = new URL("https://www.googleapis.com/customsearch/v1");
      url.searchParams.set("key", apiKey);
      url.searchParams.set("cx", cseId);
      url.searchParams.set("q", query);
      url.searchParams.set("num", "3");

      const response = await fetch(url.toString());
      const data = await response.json() as GoogleSearchResponse;

      if (data.error) {
        console.error(`Google API error: ${data.error.message}`);
        continue;
      }

      if (data.items && data.items.length > 0) {
        const linkedinResult = data.items.find(item => 
          item.link.includes("linkedin.com/in/")
        );

        if (linkedinResult) {
          return {
            linkedinUrl: linkedinResult.link,
            searchQuery: query,
            title: linkedinResult.title,
            snippet: linkedinResult.snippet
          };
        }
      }
    } catch (error) {
      console.error(`Error searching with query "${query}":`, error);
    }
  }

  return {
    linkedinUrl: null,
    searchQuery: searchQueries[0] || `site:linkedin.com/in "${fullName}"`
  };
}

export interface EnrichmentProgress {
  total: number;
  processed: number;
  found: number;
  notFound: number;
  errors: number;
  status: "idle" | "running" | "completed" | "error";
  currentAttendee?: string;
}

const enrichmentProgress: Map<string, EnrichmentProgress> = new Map();

export function getEnrichmentProgress(eventId: string): EnrichmentProgress | null {
  return enrichmentProgress.get(eventId) || null;
}

export async function enrichEventAttendees(
  eventId: string,
  attendees: Array<{
    id: string;
    firstName: string;
    lastName: string;
    company: string | null;
    email: string;
    linkedinProfileUrl: string | null;
  }>,
  updateAttendee: (id: string, linkedinUrl: string, searchQuery: string) => Promise<void>
): Promise<EnrichmentProgress> {
  const attendeesToEnrich = attendees.filter(a => !a.linkedinProfileUrl);

  const progress: EnrichmentProgress = {
    total: attendeesToEnrich.length,
    processed: 0,
    found: 0,
    notFound: 0,
    errors: 0,
    status: "running"
  };

  enrichmentProgress.set(eventId, progress);

  if (attendeesToEnrich.length === 0) {
    progress.status = "completed";
    return progress;
  }

  for (const attendee of attendeesToEnrich) {
    progress.currentAttendee = `${attendee.firstName} ${attendee.lastName}`;
    enrichmentProgress.set(eventId, { ...progress });

    try {
      const result = await searchLinkedInProfile(
        attendee.firstName,
        attendee.lastName,
        attendee.company,
        attendee.email
      );

      if (result.linkedinUrl) {
        await updateAttendee(attendee.id, result.linkedinUrl, result.searchQuery);
        progress.found++;
      } else {
        await updateAttendee(attendee.id, "", result.searchQuery);
        progress.notFound++;
      }
    } catch (error) {
      console.error(`Error enriching attendee ${attendee.id}:`, error);
      progress.errors++;
    }

    progress.processed++;
    enrichmentProgress.set(eventId, { ...progress });

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  progress.status = "completed";
  progress.currentAttendee = undefined;
  enrichmentProgress.set(eventId, progress);

  return progress;
}
