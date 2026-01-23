import { db } from "./db";
import { attendees } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY;
const GOOGLE_CSE_SEARCH_ENGINE_ID = process.env.GOOGLE_CSE_SEARCH_ENGINE_ID;

export type CompanySize = "SMB" | "Mid-Market" | "Enterprise" | "Unknown";

interface CompanySizeResult {
  companySize: CompanySize;
  companyRevenue: string | null;
  rawSearchResult: string | null;
}

export async function lookupCompanySize(companyName: string): Promise<CompanySizeResult> {
  if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_SEARCH_ENGINE_ID) {
    console.warn("[CompanyEnrichment] Google CSE credentials not configured");
    return { companySize: "Unknown", companyRevenue: null, rawSearchResult: null };
  }

  if (!companyName || companyName.trim().length === 0) {
    console.warn("[CompanyEnrichment] No company name provided");
    return { companySize: "Unknown", companyRevenue: null, rawSearchResult: null };
  }

  try {
    const searchQuery = `${companyName} site:dnb.com/business-directory`;
    console.log(`[CompanyEnrichment] Searching DNB for: ${companyName}`);

    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", GOOGLE_CSE_API_KEY);
    url.searchParams.set("cx", GOOGLE_CSE_SEARCH_ENGINE_ID);
    url.searchParams.set("q", searchQuery);
    url.searchParams.set("num", "5");

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CompanyEnrichment] Google CSE error: ${response.status} - ${errorText}`);
      return { companySize: "Unknown", companyRevenue: null, rawSearchResult: null };
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log(`[CompanyEnrichment] No results found for: ${companyName}`);
      return { companySize: "Unknown", companyRevenue: null, rawSearchResult: null };
    }

    let revenueString: string | null = null;
    let rawSearchResult: string | null = null;

    console.log(`[CompanyEnrichment] Got ${data.items.length} results for: ${companyName}`);
    
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const snippet = item.snippet || "";
      const title = item.title || "";
      const link = item.link || "";
      const combinedText = `${title} ${snippet}`;
      rawSearchResult = combinedText;
      
      console.log(`[CompanyEnrichment] Result ${i + 1}: ${title}`);
      console.log(`[CompanyEnrichment] Link: ${link}`);
      console.log(`[CompanyEnrichment] Snippet: ${snippet}`);

      const revenueMatch = combinedText.match(/Revenue:\s*\$?([\d,.]+)\s*(million|billion|bn|mil|M|B)?/i);
      
      if (revenueMatch) {
        revenueString = revenueMatch[0];
        console.log(`[CompanyEnrichment] Found revenue for ${companyName}: ${revenueString}`);
        break;
      }
    }

    if (!revenueString) {
      console.log(`[CompanyEnrichment] No revenue data found for: ${companyName}. Raw results logged above.`);
      return { companySize: "Unknown", companyRevenue: null, rawSearchResult };
    }

    const companySize = classifyCompanySize(revenueString);
    console.log(`[CompanyEnrichment] Classified ${companyName} as: ${companySize} (${revenueString})`);

    return { companySize, companyRevenue: revenueString, rawSearchResult };

  } catch (error) {
    console.error(`[CompanyEnrichment] Error looking up company: ${error}`);
    return { companySize: "Unknown", companyRevenue: null, rawSearchResult: null };
  }
}

export function classifyCompanySize(revenueString: string): CompanySize {
  const normalized = revenueString.toLowerCase().replace(/,/g, "");
  
  const match = normalized.match(/\$?([\d.]+)\s*(million|billion|bn|mil|m|b)?/i);
  
  if (!match) {
    return "Unknown";
  }

  let value = parseFloat(match[1]);
  const unit = (match[2] || "").toLowerCase();

  if (unit === "billion" || unit === "bn" || unit === "b") {
    value = value * 1000;
  } else if (unit === "million" || unit === "mil" || unit === "m") {
  } else if (unit === "") {
    if (value >= 1000000) {
      value = value / 1000000;
    }
  }

  if (value >= 1000) {
    return "Enterprise";
  } else if (value >= 50) {
    return "Mid-Market";
  } else {
    return "SMB";
  }
}

export async function enrichCompanySizeForNewAttendee(
  attendeeId: string, 
  organizationId: string,
  companyName: string
): Promise<void> {
  if (!companyName || companyName.trim().length === 0) {
    console.log(`[CompanyEnrichment] No company name, skipping enrichment for: ${attendeeId}`);
    return;
  }

  setTimeout(async () => {
    try {
      const result = await lookupCompanySize(companyName);

      await db
        .update(attendees)
        .set({
          companySize: result.companySize,
          companyRevenue: result.companyRevenue,
          companySizeEnrichedAt: new Date(),
        })
        .where(and(
          eq(attendees.id, attendeeId),
          eq(attendees.organizationId, organizationId)
        ));

      console.log(`[CompanyEnrichment] Async enriched attendee ${attendeeId}: ${result.companySize}`);
    } catch (error) {
      console.error(`[CompanyEnrichment] Async enrichment error: ${error}`);
    }
  }, 100);
}
