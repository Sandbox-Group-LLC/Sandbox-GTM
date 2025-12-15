export interface MergeTag {
  tag: string;
  label: string;
  description: string;
}

export interface MergeTagCategory {
  category: string;
  label: string;
  tags: MergeTag[];
}

export const MERGE_TAGS: MergeTagCategory[] = [
  {
    category: "event",
    label: "Event",
    tags: [
      { tag: "{{event.name}}", label: "Event Name", description: "Name of the event" },
      { tag: "{{event.date}}", label: "Event Date", description: "Start date" },
      { tag: "{{event.endDate}}", label: "End Date", description: "End date" },
      { tag: "{{event.time}}", label: "Event Time", description: "Start time" },
      { tag: "{{event.location}}", label: "Location", description: "Venue name" },
      { tag: "{{event.address}}", label: "Address", description: "Full address" },
      { tag: "{{event.description}}", label: "Description", description: "Event details" },
      { tag: "{{event.registrationUrl}}", label: "Registration URL", description: "Registration link" },
    ],
  },
  {
    category: "attendee",
    label: "Attendee",
    tags: [
      { tag: "{{attendee.firstName}}", label: "First Name", description: "First name" },
      { tag: "{{attendee.lastName}}", label: "Last Name", description: "Last name" },
      { tag: "{{attendee.fullName}}", label: "Full Name", description: "First and last name" },
      { tag: "{{attendee.email}}", label: "Email", description: "Email address" },
      { tag: "{{attendee.phone}}", label: "Phone", description: "Phone number" },
      { tag: "{{attendee.company}}", label: "Company", description: "Company name" },
      { tag: "{{attendee.jobTitle}}", label: "Job Title", description: "Job title" },
      { tag: "{{attendee.checkInCode}}", label: "Check-in Code", description: "Unique code" },
      { tag: "{{attendee.ticketType}}", label: "Ticket Type", description: "Registration type" },
    ],
  },
  {
    category: "package",
    label: "Package",
    tags: [
      { tag: "{{package.name}}", label: "Package Name", description: "Selected package" },
      { tag: "{{package.price}}", label: "Package Price", description: "Package cost" },
    ],
  },
  {
    category: "organization",
    label: "Organization",
    tags: [
      { tag: "{{organization.name}}", label: "Org Name", description: "Organization name" },
      { tag: "{{organization.website}}", label: "Website", description: "Organization website" },
      { tag: "{{organization.phone}}", label: "Phone", description: "Contact phone" },
    ],
  },
];

export interface MergeTagContext {
  event?: {
    name?: string;
    date?: string;
    endDate?: string;
    time?: string;
    location?: string;
    address?: string;
    description?: string;
    registrationUrl?: string;
  };
  attendee?: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    checkInCode?: string;
    ticketType?: string;
  };
  package?: {
    name?: string;
    price?: string;
  };
  organization?: {
    name?: string;
    website?: string;
    phone?: string;
  };
}

export function replaceMergeTags(text: string | null | undefined, context: MergeTagContext): string {
  if (!text) return "";

  const replacements: Record<string, string> = {
    "event.name": context.event?.name || "",
    "event.date": context.event?.date || "",
    "event.enddate": context.event?.endDate || "",
    "event.time": context.event?.time || "",
    "event.location": context.event?.location || "",
    "event.address": context.event?.address || "",
    "event.description": context.event?.description || "",
    "event.registrationurl": context.event?.registrationUrl || "",
    "attendee.firstname": context.attendee?.firstName || "",
    "attendee.lastname": context.attendee?.lastName || "",
    "attendee.fullname": context.attendee?.fullName || `${context.attendee?.firstName || ""} ${context.attendee?.lastName || ""}`.trim(),
    "attendee.email": context.attendee?.email || "",
    "attendee.phone": context.attendee?.phone || "",
    "attendee.company": context.attendee?.company || "",
    "attendee.jobtitle": context.attendee?.jobTitle || "",
    "attendee.checkincode": context.attendee?.checkInCode || "",
    "attendee.tickettype": context.attendee?.ticketType || "",
    "package.name": context.package?.name || "",
    "package.price": context.package?.price || "",
    "organization.name": context.organization?.name || "",
    "organization.website": context.organization?.website || "",
    "organization.phone": context.organization?.phone || "",
  };

  return text.replace(/\{\{([^}]+)\}\}/gi, (match, key) => {
    const normalizedKey = key.trim().toLowerCase();
    if (normalizedKey in replacements) {
      return replacements[normalizedKey];
    }
    return match;
  });
}

export function replaceMergeTagsWithLabels(text: string | null | undefined): string {
  if (!text) return "";

  const tagToLabel: Record<string, string> = {};
  for (const category of MERGE_TAGS) {
    for (const tag of category.tags) {
      const key = tag.tag.replace(/\{\{|\}\}/g, '').trim().toLowerCase();
      tagToLabel[key] = `[${tag.label}]`;
    }
  }

  return text.replace(/\{\{([^}]+)\}\}/gi, (match, key) => {
    const normalizedKey = key.trim().toLowerCase();
    if (normalizedKey in tagToLabel) {
      return tagToLabel[normalizedKey];
    }
    return match;
  });
}
