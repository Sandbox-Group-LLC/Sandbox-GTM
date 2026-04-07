/**
 * Base adapter interface — all platform integrations implement this.
 * Engage calls these methods; the adapter handles the platform-specific API.
 */

export interface ExternalEvent {
  externalId: string;
  name: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  venue?: string;
  meta?: Record<string, unknown>;
}

export interface ExternalAttendee {
  externalId: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  badgeCode?: string;           // QR/barcode on physical badge
  registrationType?: string;
  registrationStatus?: string;
  meta?: Record<string, unknown>;
}

export interface ExternalSession {
  externalId: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  sessionType?: string;
  capacity?: number;
  meta?: Record<string, unknown>;
}

export interface AdapterConfig {
  apiUrl?: string;
  apiKey: string;
  profileId?: string;           // Rainfocus show/profile ID, Cvent event ID, etc.
  extra?: Record<string, string>;
}

export abstract class BasePlatformAdapter {
  protected config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  /** List all events/shows available under this API key */
  abstract getEvents(): Promise<ExternalEvent[]>;

  /** Pull full attendee roster for an event */
  abstract getAttendees(externalEventId: string): Promise<ExternalAttendee[]>;

  /** Real-time single attendee lookup — called on badge scan */
  abstract lookupAttendee(
    externalEventId: string,
    query: { badgeCode?: string; email?: string }
  ): Promise<ExternalAttendee | null>;

  /** Pull sessions/agenda for an event */
  abstract getSessions(externalEventId: string): Promise<ExternalSession[]>;

  /** Push a check-in back to the source platform (optional — some platforms support write-back) */
  pushCheckIn?(externalEventId: string, externalAttendeeId: string): Promise<void>;

  /** Push a lead/interaction record back to the source platform (optional) */
  pushLead?(externalEventId: string, data: Record<string, unknown>): Promise<void>;
}
