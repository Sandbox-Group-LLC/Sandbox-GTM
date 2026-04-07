/**
 * Rainfocus Platform Adapter — fully implemented
 *
 * URL pattern:  https://events.rainfocus.com/api/{orgId}/v3/{api-call}
 * Auth:         header `apiProfile: {token}`  (NOT Bearer)
 * Responses:    { responseCode, responseMessage, results?, data?, cursor?, timestamp? }
 * Pagination:   cursor-based — if response has `cursor`, more pages exist
 * Incremental:  pass `since` (ms-epoch from previous `timestamp`) for delta pulls
 *
 * Config mapping:
 *   config.apiKey     → apiProfile token (passed as `apiProfile` header)
 *   config.profileId  → org-id for URL path (e.g. "acme" → /api/acme/v3/...)
 *   config.apiUrl     → base host override (default: https://events.rainfocus.com)
 *   config.extra?.version → API version string (default: "3")
 *
 * Attendee field reference (from Rainfocus API docs):
 *   attendeeId         Internal Rainfocus ID
 *   externalId         Client-side external ID
 *   clientId           Alternative client ID
 *   firstname          First name
 *   lastname           Last name
 *   email              Email address
 *   companyname        Company/organization
 *   jobtitle           Job title
 *   phone              Phone number
 *   regcode            Badge/QR code — primary key for scan lookup
 *   registered         "true" | "false"
 *   registeredDate     Registration date
 *   checkedin          "true" | "false"
 *   checkinDate        Check-in date
 *   checkinTime        Check-in time
 *   address1-2, city, state, zip, country
 *   createDate, modifiedDate
 */

import {
  BasePlatformAdapter,
  ExternalAttendee,
  ExternalEvent,
  ExternalSession,
  AdapterConfig,
} from "./base-adapter.js";

// ---------------------------------------------------------------------------
// Raw Rainfocus API response shape
// ---------------------------------------------------------------------------

interface RFResponse<T = unknown> {
  responseCode: string;        // "0" = success, anything else = error
  responseMessage: string;
  timestamp?: string;          // ms-epoch — save for next `since` incremental pull
  cursor?: string;             // present when more pages exist
  results?: T[];               // search API returns this
  data?: T;                    // load API returns this
  [key: string]: unknown;
}

interface RFAttendee {
  attendeeId?: string;
  externalId?: string;
  clientId?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  companyname?: string;
  jobtitle?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  regcode?: string;            // badge QR/barcode — what gets scanned at check-in
  registered?: string;
  registeredDate?: string;
  registeredTime?: string;
  checkedin?: string;
  checkinDate?: string;
  checkinTime?: string;
  language?: string;
  createDate?: string;
  modifiedDate?: string;
  [key: string]: unknown;
}

interface RFSession {
  sessionId?: string;
  externalId?: string;
  title?: string;
  name?: string;
  description?: string;
  starttime?: string;
  endtime?: string;
  room?: string;
  location?: string;
  type?: string;
  capacity?: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class RainfocusAdapter extends BasePlatformAdapter {
  private readonly baseHost: string;
  private readonly orgId: string;
  private readonly version: string;

  constructor(config: AdapterConfig) {
    super(config);
    this.baseHost = (config.apiUrl || "https://events.rainfocus.com").replace(/\/$/, "");
    // profileId = org-id used in the URL path (e.g. "acme" → /api/acme/v3/...)
    this.orgId = config.profileId || "";
    this.version = config.extra?.version || "3";

    if (!this.orgId) {
      throw new Error(
        "Rainfocus adapter: profileId is required (org-id for URL path, e.g. 'acme')"
      );
    }
    if (!config.apiKey) {
      throw new Error("Rainfocus adapter: apiKey is required (apiProfile token)");
    }
  }

  // -------------------------------------------------------------------------
  // HTTP helpers
  // -------------------------------------------------------------------------

  private get authHeaders(): Record<string, string> {
    return {
      // Rainfocus uses `apiProfile` header — NOT a Bearer token
      apiProfile: this.config.apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  private buildUrl(apiCall: string): string {
    return `${this.baseHost}/api/${this.orgId}/v${this.version}/${apiCall}`;
  }

  private async request<T>(
    apiCall: string,
    method: "GET" | "POST",
    params?: Record<string, string>,
    body?: unknown
  ): Promise<RFResponse<T>> {
    const url = new URL(this.buildUrl(apiCall));
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const res = await fetch(url.toString(), {
      method,
      headers: this.authHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Rainfocus HTTP ${res.status}: ${text.slice(0, 300)}`);
    }

    const json = (await res.json()) as RFResponse<T>;
    if (json.responseCode !== "0") {
      throw new Error(
        `Rainfocus API error [${json.responseCode}]: ${json.responseMessage}`
      );
    }
    return json;
  }

  private async get<T>(apiCall: string, params: Record<string, string> = {}): Promise<RFResponse<T>> {
    return this.request<T>(apiCall, "GET", params);
  }

  private async post<T>(apiCall: string, body: unknown): Promise<RFResponse<T>> {
    return this.request<T>(apiCall, "POST", undefined, body);
  }

  /**
   * Cursor-based paginator — follows the cursor until exhausted.
   * Per Rainfocus docs: timestamp is only present on the first page;
   * we capture it once and discard from subsequent pages.
   */
  private async searchAll<T>(
    apiCall: string,
    params: Record<string, string> = {}
  ): Promise<{ results: T[]; timestamp?: string }> {
    const allResults: T[] = [];
    let cursor: string | undefined;
    let firstTimestamp: string | undefined;

    do {
      const callParams = { ...params };
      if (cursor) callParams.cursor = cursor;

      const data = await this.get<T>(apiCall, callParams);

      // Capture timestamp from first page only (API docs requirement)
      if (!cursor && data.timestamp) {
        firstTimestamp = data.timestamp;
      }

      allResults.push(...(data.results || []));
      cursor = data.cursor;
    } while (cursor);

    return { results: allResults, timestamp: firstTimestamp };
  }

  // -------------------------------------------------------------------------
  // Field mapping
  // -------------------------------------------------------------------------

  private mapAttendee(raw: RFAttendee): ExternalAttendee {
    return {
      externalId: raw.attendeeId || raw.externalId || raw.clientId || "",
      firstName: raw.firstname || "",
      lastName: raw.lastname || "",
      email: raw.email || "",
      company: raw.companyname || undefined,
      jobTitle: raw.jobtitle || undefined,
      phone: raw.phone || undefined,
      // regcode is the badge QR/barcode scanned at check-in kiosks
      badgeCode: raw.regcode || undefined,
      registrationType: undefined,   // pulled from custom attributes if needed
      registrationStatus: raw.registered === "true"
        ? "registered"
        : raw.registered || undefined,
      meta: raw,
    };
  }

  private mapSession(raw: RFSession): ExternalSession {
    return {
      externalId: raw.sessionId || raw.externalId || "",
      title: raw.title || raw.name || "Untitled Session",
      description: raw.description,
      startTime: raw.starttime,
      endTime: raw.endtime,
      room: raw.room || raw.location || undefined,
      sessionType: raw.type || undefined,
      capacity: raw.capacity,
      meta: raw,
    };
  }

  // -------------------------------------------------------------------------
  // Public interface implementation
  // -------------------------------------------------------------------------

  /**
   * Rainfocus does not expose an event-list API.
   * The apiProfile token is scoped to a specific show/event.
   * We return one synthetic event using the orgId as the externalId.
   * The connection name in the UI serves as the human-readable event label.
   */
  async getEvents(): Promise<ExternalEvent[]> {
    return [
      {
        externalId: this.orgId,
        name: `Rainfocus Event (${this.orgId})`,
        meta: { orgId: this.orgId, adapter: "rainfocus" },
      },
    ];
  }

  /**
   * Pull full attendee roster via attendee/search.
   * Handles cursor-based pagination automatically.
   * Pass `since` (ms-epoch from previous sync) for incremental pulls.
   *
   * From the docs, default page size is 1000; we request that explicitly.
   */
  async getAttendees(
    _externalEventId: string,
    options?: { since?: string }
  ): Promise<ExternalAttendee[]> {
    const params: Record<string, string> = { pageSize: "1000" };
    if (options?.since) params.since = options.since;

    const { results } = await this.searchAll<RFAttendee>("attendee/search", params);
    return results.map(this.mapAttendee.bind(this));
  }

  /**
   * Incremental attendee sync — returns only changed records plus the
   * new timestamp to store for the next delta pull.
   *
   * Usage:
   *   const { attendees, nextTimestamp } = await adapter.getAttendeesIncremental(id, lastTs);
   *   // persist nextTimestamp → pass back as sinceTimestamp next time
   */
  async getAttendeesIncremental(
    externalEventId: string,
    sinceTimestamp?: string
  ): Promise<{ attendees: ExternalAttendee[]; nextTimestamp?: string }> {
    const params: Record<string, string> = { pageSize: "1000" };
    if (sinceTimestamp) params.since = sinceTimestamp;

    const { results, timestamp } = await this.searchAll<RFAttendee>("attendee/search", params);
    return {
      attendees: results.map(this.mapAttendee.bind(this)),
      nextTimestamp: timestamp,
    };
  }

  /**
   * Real-time badge scan lookup — called on every QR scan at check-in.
   *
   * Rainfocus field: `regcode` = the barcode/QR value printed on the badge.
   * Falls back to email search if no badge code provided.
   *
   * Uses attendee/search with pageSize=1 for minimal latency.
   */
  async lookupAttendee(
    _externalEventId: string,
    query: { badgeCode?: string; email?: string }
  ): Promise<ExternalAttendee | null> {
    if (!query.badgeCode && !query.email) return null;

    const params: Record<string, string> = { pageSize: "1" };

    if (query.badgeCode) {
      // regcode is the Rainfocus field for the badge QR/barcode
      params.regcode = query.badgeCode;
    } else if (query.email) {
      params.email = query.email;
    }

    const data = await this.get<RFAttendee>("attendee/search", params);
    const results = data.results || [];
    if (results.length === 0) return null;

    return this.mapAttendee(results[0]);
  }

  /**
   * Load a single attendee by Rainfocus attendeeId.
   * Uses attendee/load which returns a single `data` object.
   */
  async loadAttendeeById(attendeeId: string): Promise<ExternalAttendee | null> {
    const data = await this.get<RFAttendee>("attendee/load", { attendeeId });
    if (!data.data) return null;
    return this.mapAttendee(data.data);
  }

  /**
   * Pull sessions via session/search.
   * Session fields: sessionId, title, description, starttime, endtime, room, type, capacity.
   */
  async getSessions(_externalEventId: string): Promise<ExternalSession[]> {
    const { results } = await this.searchAll<RFSession>("session/search", {
      pageSize: "1000",
    });
    return results.map(this.mapSession.bind(this));
  }

  /**
   * Write check-in back to Rainfocus via attendee/update.
   * Sets checkedin=true with current date/time.
   *
   * Note: attendee/update errors if the attendee doesn't exist.
   * Use attendee/store if upserting.
   */
  async pushCheckIn(_externalEventId: string, externalAttendeeId: string): Promise<void> {
    const now = new Date();
    await this.post("attendee/update", {
      attendeeId: externalAttendeeId,
      checkedin: "true",
      checkinDate: now.toISOString().split("T")[0],          // YYYY-MM-DD
      checkinTime: now.toTimeString().split(" ")[0],          // HH:MM:SS
    });
  }

  /**
   * Upsert an attendee record back to Rainfocus (attendee/store).
   * Useful for writing back enriched lead data, custom attributes, etc.
   */
  async pushAttendeeData(data: Record<string, unknown>): Promise<void> {
    await this.post("attendee/store", data);
  }

  /**
   * Search attendees with arbitrary Rainfocus filter params.
   * Supports wildcards: firstname=*ing*, companyname=*
   * Useful for custom lookups not covered by lookupAttendee.
   */
  async searchAttendees(
    filters: Record<string, string>
  ): Promise<ExternalAttendee[]> {
    const { results } = await this.searchAll<RFAttendee>("attendee/search", {
      pageSize: "100",
      ...filters,
    });
    return results.map(this.mapAttendee.bind(this));
  }
}
