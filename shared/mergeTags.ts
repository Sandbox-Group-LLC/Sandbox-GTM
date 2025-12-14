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
      { tag: "{{event.name}}", label: "Event Name", description: "The name of the event" },
      { tag: "{{event.date}}", label: "Event Date", description: "The start date of the event" },
      { tag: "{{event.location}}", label: "Event Location", description: "The venue or location" },
      { tag: "{{event.description}}", label: "Event Description", description: "The event description" },
    ],
  },
  {
    category: "attendee",
    label: "Attendee",
    tags: [
      { tag: "{{attendee.firstName}}", label: "First Name", description: "Attendee's first name" },
      { tag: "{{attendee.lastName}}", label: "Last Name", description: "Attendee's last name" },
      { tag: "{{attendee.email}}", label: "Email", description: "Attendee's email address" },
      { tag: "{{attendee.company}}", label: "Company", description: "Attendee's company name" },
      { tag: "{{attendee.checkInCode}}", label: "Check-in Code", description: "Unique check-in code" },
    ],
  },
  {
    category: "organization",
    label: "Organization",
    tags: [
      { tag: "{{organization.name}}", label: "Organization Name", description: "Your organization name" },
    ],
  },
];

export interface MergeTagContext {
  event?: {
    name?: string;
    date?: string;
    location?: string;
    description?: string;
  };
  attendee?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    checkInCode?: string;
  };
  organization?: {
    name?: string;
  };
}

export function replaceMergeTags(text: string | null | undefined, context: MergeTagContext): string {
  if (!text) return "";

  const replacements: Record<string, string> = {
    "event.name": context.event?.name || "",
    "event.date": context.event?.date || "",
    "event.location": context.event?.location || "",
    "event.description": context.event?.description || "",
    "attendee.firstname": context.attendee?.firstName || "",
    "attendee.lastname": context.attendee?.lastName || "",
    "attendee.email": context.attendee?.email || "",
    "attendee.company": context.attendee?.company || "",
    "attendee.checkincode": context.attendee?.checkInCode || "",
    "organization.name": context.organization?.name || "",
  };

  return text.replace(/\{\{([^}]+)\}\}/gi, (match, key) => {
    const normalizedKey = key.trim().toLowerCase();
    if (normalizedKey in replacements) {
      return replacements[normalizedKey];
    }
    return match;
  });
}
