/**
 * Rainfocus Platform Adapter
 *
 * Rainfocus API docs should be consulted for exact field names and endpoints.
 * This scaffold maps to the expected Rainfocus REST API patterns.
 * Update field mappings in mapAttendee() once API documentation is confirmed.
 *
 * Key concepts:
 *   - Profile ID = the "show" identifier in Rainfocus
 *   - Attendees are called "registrants" in Rainfocus terminology
 *   - Badge codes may come from a separate barcode/badge field
 *
 * Environment variables needed:
 *   RAINFOCUS_API_URL      e.g. https://api.rainfocus.com
 *   RAINFOCUS_API_KEY      API key from Rainfocus admin
 *   RAINFOCUS_PROFILE_ID   Show/profile identifier
 */

import { BasePlatformAdapter, ExternalAttendee, ExternalEvent, ExternalSession, AdapterConfig } from "./base-adapter.js";

// ---------------------------------------------------------------------------
// Raw Rainfocus API response shapes — update these once docs are confirmed
// ---------------------------------------------------------------------------
interface RFEvent {
  id: string;
  name?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  venue?: string;
  [key: string]: unknown;
}

interface RFAttendee {
  id?: string;
  rfId?: string;                   // Rainfocus internal ID
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  email?: string;
  emailAddress?: string;
  company?: string;
  organization?: string;
  jobTitle?: string;
  title?: string;
  phone?: string;
  phoneNumber?: string;
  badgeCode?: string;
  barcode?: string;
  qrCode?: string;
  registrationType?: string;
  type?: string;
  status?: string;
  registrationStatus?: string;
  [key: string]: unknown;
}

interface RFSession {
  id?: string;
  rfId?: string;
  title?: string;
  name?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  location?: string;
  type?: string;
  sessionType?: string;
  capacity?: number;
  [key: string]: unknown;
}

interface RFListResponse<T> {
  data?: T[];
  items?: T[];
  results?: T[];
  registrants?: T[];              // Rainfocus may use "registrants" for attendees
  sessions?: T[];
  total?: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Adapter implementation
// ---------------------------------------------------------------------------
export class RainfocusAdapter extends BasePlatformAdapter {
  private baseUrl: string;

  constructor(config: AdapterConfig) {
    super(config);
    this.baseUrl = (config.apiUrl || "https://api.rainfocus.com").replace(/\/$/, "");
  }

  private get headers(): Record<string, string> {
    return {
      "Authorization": `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      // Rainfocus may use a different auth header — update once docs confirmed
      // "rfApiProfileId": this.config.profileId || "",
      // "rfAccessToken": this.config.apiKey,
    };
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const res = await fetch(url.toString(), { headers: this.headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Rainfocus API error ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  // -------------------------------------------------------------------------
  // Field mapping helpers — update once Rainfocus docs are confirmed
  // -------------------------------------------------------------------------
  private mapEvent(raw: RFEvent): ExternalEvent {
    return {
      externalId: String(raw.id || raw.rfId || ""),
      name: String(raw.name || raw.title || "Untitled Event"),
      startDate: raw.startDate,
      endDate: raw.endDate,
      timezone: raw.timezone,
      venue: raw.venue,
      meta: raw,
    };
  }

  private mapAttendee(raw: RFAttendee): ExternalAttendee {
    // TODO: Confirm exact field names from Rainfocus API documentation
    return {
      externalId: String(raw.id || raw.rfId || ""),
      firstName: String(raw.firstName || raw.first_name || ""),
      lastName: String(raw.lastName || raw.last_name || ""),
      email: String(raw.email || raw.emailAddress || ""),
      company: String(raw.company || raw.organization || "") || undefined,
      jobTitle: String(raw.jobTitle || raw.title || "") || undefined,
      phone: String(raw.phone || raw.phoneNumber || "") || undefined,
      // Badge code field — Rainfocus likely exposes this; update field name from docs
      badgeCode: String(raw.badgeCode || raw.barcode || raw.qrCode || "") || undefined,
      registrationType: String(raw.registrationType || raw.type || "") || undefined,
      registrationStatus: String(raw.status || raw.registrationStatus || "") || undefined,
      meta: raw,
    };
  }

  private mapSession(raw: RFSession): ExternalSession {
    return {
      externalId: String(raw.id || raw.rfId || ""),
      title: String(raw.title || raw.name || "Untitled Session"),
      description: raw.description,
      startTime: raw.startTime,
      endTime: raw.endTime,
      room: String(raw.room || raw.location || "") || undefined,
      sessionType: String(raw.type || raw.sessionType || "") || undefined,
      capacity: raw.capacity,
      meta: raw,
    };
  }

  // -------------------------------------------------------------------------
  // Public API methods
  // -------------------------------------------------------------------------

  /**
   * List all shows/events under the configured API key.
   * TODO: Confirm endpoint from Rainfocus docs — likely GET /api/v1/shows or similar
   */
  async getEvents(): Promise<ExternalEvent[]> {
    const profileId = this.config.profileId;
    if (profileId) {
      // If a single profile ID is configured, return it as a synthetic event list
      // until we know the correct list endpoint
      return [{
        externalId: profileId,
        name: "Event (configure name from Rainfocus)",
        meta: { profileId },
      }];
    }
    // TODO: Replace with actual Rainfocus events list endpoint
    const data = await this.get<RFListResponse<RFEvent>>("/api/v1/events");
    const items = data.data || data.items || data.results || [];
    return items.map(this.mapEvent.bind(this));
  }

  /**
   * Pull full attendee/registrant roster for a show.
   * TODO: Confirm endpoint — likely GET /api/v1/registrants?profileId=...
   *       Pagination strategy (page/limit or cursor) needed for large events.
   */
  async getAttendees(externalEventId: string): Promise<ExternalAttendee[]> {
    const allAttendees: ExternalAttendee[] = [];
    let page = 1;
    const pageSize = 500;

    while (true) {
      // TODO: Replace with confirmed Rainfocus registrant list endpoint + params
      const data = await this.get<RFListResponse<RFAttendee>>("/api/v1/registrants", {
        profileId: externalEventId,
        page: String(page),
        pageSize: String(pageSize),
      });

      const items = data.data || data.items || data.results || data.registrants || [];
      if (items.length === 0) break;

      allAttendees.push(...items.map(this.mapAttendee.bind(this)));
      if (items.length < pageSize) break;
      page++;
    }

    return allAttendees;
  }

  /**
   * Real-time badge scan lookup — called on every scan at check-in.
   * TODO: Confirm the lookup endpoint; Rainfocus may support search by barcode field.
   */
  async lookupAttendee(
    externalEventId: string,
    query: { badgeCode?: string; email?: string }
  ): Promise<ExternalAttendee | null> {
    const params: Record<string, string> = { profileId: externalEventId };
    if (query.badgeCode) params.badgeCode = query.badgeCode;  // TODO: confirm field name
    if (query.email) params.email = query.email;

    // TODO: Replace with confirmed Rainfocus registrant lookup endpoint
    const data = await this.get<RFListResponse<RFAttendee>>("/api/v1/registrants/lookup", params);
    const items = data.data || data.items || data.results || data.registrants || [];

    if (items.length === 0) return null;
    return this.mapAttendee(items[0]);
  }

  /**
   * Pull agenda/sessions for a show.
   * TODO: Confirm endpoint — likely GET /api/v1/sessions?profileId=...
   */
  async getSessions(externalEventId: string): Promise<ExternalSession[]> {
    // TODO: Replace with confirmed Rainfocus sessions endpoint
    const data = await this.get<RFListResponse<RFSession>>("/api/v1/sessions", {
      profileId: externalEventId,
    });
    const items = data.data || data.items || data.results || data.sessions || [];
    return items.map(this.mapSession.bind(this));
  }

  /**
   * Push check-in status back to Rainfocus (if supported).
   * TODO: Confirm write endpoint and required payload from docs.
   */
  async pushCheckIn(externalEventId: string, externalAttendeeId: string): Promise<void> {
    // TODO: Implement once write endpoints are confirmed from Rainfocus docs
    // Example pattern:
    // await this.post(`/api/v1/registrants/${externalAttendeeId}/checkin`, { profileId: externalEventId });
    console.log(`[Rainfocus] pushCheckIn not yet implemented — ${externalAttendeeId}`);
  }
}
