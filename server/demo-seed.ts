import { db } from "./db";
import { 
  events, packages, eventPackages, inviteCodes, activationLinks, activationLinkClicks,
  speakers, eventSessions, sessionSpeakers, attendees, emailTemplates, emailCampaigns,
  eventFeedback, eventPages, pageVersions, deliverables, emailMessages, eventLeads,
  attendeeMeetings, engagementSignals, moments, momentResponses
} from "@shared/schema";
import { sql } from "drizzle-orm";
import { storage } from "./storage";

const FIRST_NAMES = [
  "James", "Sarah", "Michael", "Emily", "David", "Jennifer", "Robert", "Amanda", 
  "William", "Jessica", "John", "Ashley", "Richard", "Stephanie", "Thomas", "Nicole",
  "Christopher", "Melissa", "Daniel", "Elizabeth", "Matthew", "Michelle", "Anthony",
  "Laura", "Mark", "Kimberly", "Steven", "Rebecca", "Andrew", "Rachel", "Paul", "Heather",
  "Joshua", "Katherine", "Brian", "Christine", "Kevin", "Maria", "Jason", "Samantha",
  "Timothy", "Andrea", "Jeffrey", "Danielle", "Ryan", "Angela", "Eric", "Victoria",
  "Jacob", "Natalie", "Nicholas", "Lisa", "Gary", "Sharon", "Jonathan", "Sandra",
  "Stephen", "Brenda", "Larry", "Amy", "Justin", "Anna", "Scott", "Helen", "Benjamin"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia",
  "Rodriguez", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez",
  "Moore", "Martin", "Jackson", "Thompson", "White", "Lopez", "Lee", "Gonzalez",
  "Harris", "Clark", "Lewis", "Robinson", "Walker", "Perez", "Hall", "Young",
  "Allen", "Sanchez", "Wright", "King", "Scott", "Green", "Baker", "Adams",
  "Nelson", "Hill", "Ramirez", "Campbell", "Mitchell", "Roberts", "Carter", "Phillips",
  "Evans", "Turner", "Torres", "Parker", "Collins", "Edwards", "Stewart", "Flores"
];

const COMPANIES = [
  "Acme Corp", "TechForward Inc", "Digital Dynamics", "CloudScale Solutions", "DataDriven Co",
  "Innovation Labs", "FutureTech", "GrowthEngine", "Velocity Partners", "Nexus Systems",
  "Quantum Analytics", "Spark Digital", "Elevate AI", "Summit Technologies", "Horizon Group",
  "Catalyst Partners", "Momentum Marketing", "Synergy Solutions", "Apex Consulting", "Prism Software",
  "BlueWave Analytics", "RedPoint Data", "GreenLight Tech", "SilverLine Systems", "GoldStar AI",
  "Pinnacle Digital", "Vertex Solutions", "Orbit Marketing", "Pulse Analytics", "Echo Systems",
  "Beacon Technology", "Atlas AI", "Forge Digital", "Nimbus Cloud", "Radiant Software",
  "Vanguard Tech", "Pioneer Analytics", "Trailblazer Inc", "Frontier Digital", "Odyssey Systems"
];

const JOB_TITLES = [
  "VP of Marketing", "Director of Demand Gen", "CMO", "Head of Growth", "Marketing Manager",
  "Director of Revenue Operations", "VP of Sales", "Chief Revenue Officer", "Head of Product Marketing",
  "Director of Digital Marketing", "Growth Marketing Lead", "Senior Marketing Manager",
  "VP of Product", "Director of Customer Success", "Head of Partnerships", "Marketing Operations Manager",
  "Demand Generation Manager", "Content Marketing Director", "Brand Marketing Manager",
  "Performance Marketing Lead", "RevOps Manager", "GTM Strategy Lead", "Account Executive",
  "Sales Director", "Business Development Manager", "Customer Marketing Manager"
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEmail(firstName: string, lastName: string, company: string): string {
  const domain = company.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

function generateCheckInCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateSectionId(pageType: string, sectionType: string, index: number): string {
  return `section-${pageType}-${sectionType}-${index}`;
}

export async function seedAIGTMSummit(organizationId: string, createdBy: string): Promise<{ eventId: string; message: string }> {
  console.log("Starting AI GTM Summit demo data seed...");

  // Generate unique suffix for this seed run to avoid conflicts
  const uniqueSuffix = Date.now().toString(36);
  const publicSlug = `ai-gtm-summit-${uniqueSuffix}`;

  // Check if there's already an AI GTM Summit event for this organization
  const existingEvents = await db.select().from(events)
    .where(sql`${events.organizationId} = ${organizationId} AND ${events.name} = 'AI GTM Summit'`);
  
  if (existingEvents.length > 0) {
    // Auto-delete existing event(s) and reseed fresh
    console.log(`Found ${existingEvents.length} existing AI GTM Summit event(s). Deleting to reseed fresh...`);
    for (const existingEvent of existingEvents) {
      console.log(`Deleting existing event: ${existingEvent.id}`);
      await storage.deleteEvent(organizationId, existingEvent.id);
    }
    console.log("Existing event(s) deleted. Proceeding with fresh seed...");
  }

  // 1. Create the event
  const eventStartDate = "2025-03-12";
  const eventEndDate = "2025-03-14";
  
  const [event] = await db.insert(events).values({
    organizationId,
    name: "AI GTM Summit",
    description: "A multi-day event for marketing, revenue, and product leaders exploring how AI is transforming go-to-market strategy, demand generation, and customer engagement.",
    startDate: eventStartDate,
    endDate: eventEndDate,
    location: "Moscone Center",
    address: "747 Howard St",
    city: "San Francisco",
    state: "CA",
    country: "United States",
    postalCode: "94103",
    status: "active",
    isPublic: true,
    registrationOpen: true,
    maxAttendees: 1200,
    publicSlug,
    createdBy,
  }).returning();

  const eventId = event.id;
  console.log(`Created event: ${event.name} (${eventId})`);

  // 2. Create packages
  const [generalPackage] = await db.insert(packages).values({
    organizationId,
    name: "General Admission",
    description: "Access to all keynotes, main sessions, and networking events",
    price: "0",
    features: ["Keynote Access", "Main Sessions", "Networking Events", "Expo Hall"],
    isActive: true,
    isPublic: true,
  }).returning();

  const [executivePackage] = await db.insert(packages).values({
    organizationId,
    name: "Executive Pass",
    description: "VIP access including exclusive workshops, executive networking, and premium seating",
    price: "1495.00",
    features: ["All General Admission Benefits", "Executive Workshops", "VIP Networking Dinner", "Premium Seating", "1:1 Expert Sessions"],
    isActive: true,
    isPublic: true,
  }).returning();

  const [partnerPackage] = await db.insert(packages).values({
    organizationId,
    name: "Partner Access",
    description: "Complimentary access for strategic partners",
    price: "0",
    features: ["All General Admission Benefits", "Partner Lounge Access", "Co-Marketing Opportunities"],
    isActive: true,
    isPublic: false,
  }).returning();

  console.log("Created packages");

  // 3. Link packages to event
  await db.insert(eventPackages).values([
    { organizationId, eventId, packageId: generalPackage.id, isEnabled: true },
    { organizationId, eventId, packageId: executivePackage.id, priceOverride: "1495.00", isEnabled: true },
    { organizationId, eventId, packageId: partnerPackage.id, isEnabled: true },
  ]);

  // 4. Create invite codes (activation keys)
  const [linkedInCode] = await db.insert(inviteCodes).values({
    organizationId,
    eventId,
    code: `LINKEDIN${uniqueSuffix.toUpperCase()}`,
    quantity: 500,
    usedCount: 142,
    packageId: generalPackage.id,
    discountType: "percentage",
    discountValue: "15",
    isActive: true,
  }).returning();

  const [partnerCode] = await db.insert(inviteCodes).values({
    organizationId,
    eventId,
    code: `PARTNER${uniqueSuffix.toUpperCase()}`,
    quantity: 100,
    usedCount: 48,
    packageId: partnerPackage.id,
    forcePackage: true,
    isActive: true,
  }).returning();

  const [vipCode] = await db.insert(inviteCodes).values({
    organizationId,
    eventId,
    code: `VIP${uniqueSuffix.toUpperCase()}`,
    quantity: 50,
    usedCount: 23,
    packageId: executivePackage.id,
    discountType: "percentage",
    discountValue: "25",
    isActive: true,
  }).returning();

  console.log("Created invite codes");

  // 5. Create activation links
  // Click counts should result in ~30% conversion rate: ~2,800 clicks -> ~826 registrations
  const [linkedInLink] = await db.insert(activationLinks).values({
    organizationId,
    eventId,
    name: "AI GTM Summit - LinkedIn Paid",
    description: "Primary LinkedIn advertising campaign",
    destinationType: "registration",
    utmSource: "linkedin",
    utmMedium: "paid_social",
    utmCampaign: "ai-gtm-summit-2025",
    utmContent: "awareness",
    inviteCodeId: linkedInCode.id,
    status: "active",
    shortCode: `li-${uniqueSuffix}`,
    clickCount: 1200,
    conversionCount: 360,
    createdBy,
  }).returning();

  const [partnerLink] = await db.insert(activationLinks).values({
    organizationId,
    eventId,
    name: "AI GTM Summit - Partner Outreach",
    description: "Partner referral campaign",
    destinationType: "registration",
    utmSource: "partner",
    utmMedium: "referral",
    utmCampaign: "ai-gtm-summit-partners",
    inviteCodeId: partnerCode.id,
    status: "active",
    shortCode: `ptr-${uniqueSuffix}`,
    clickCount: 450,
    conversionCount: 135,
    createdBy,
  }).returning();

  const [vipLink] = await db.insert(activationLinks).values({
    organizationId,
    eventId,
    name: "VIP Executive Link",
    description: "Exclusive link for executive invitations",
    destinationType: "registration",
    utmSource: "direct",
    utmMedium: "email",
    utmCampaign: "vip-executive-invite",
    inviteCodeId: vipCode.id,
    status: "active",
    shortCode: `vip-${uniqueSuffix}`,
    clickCount: 150,
    conversionCount: 68,
    createdBy,
  }).returning();

  const [emailLink] = await db.insert(activationLinks).values({
    organizationId,
    eventId,
    name: "AI GTM Summit - Email Invite Wave 1",
    description: "Email campaign to existing database",
    destinationType: "registration",
    utmSource: "email",
    utmMedium: "newsletter",
    utmCampaign: "ai-gtm-summit-wave1",
    status: "active",
    shortCode: `eml-${uniqueSuffix}`,
    clickCount: 1000,
    conversionCount: 263,
    createdBy,
  }).returning();

  console.log("Created activation links");

  // 6. Create speakers
  const speakerData = [
    { firstName: "Sarah", lastName: "Chen", company: "AI Ventures", jobTitle: "CEO", bio: "Pioneer in AI-driven marketing automation with 15+ years experience.", isFeatured: true },
    { firstName: "Marcus", lastName: "Johnson", company: "RevOps Labs", jobTitle: "Chief Revenue Officer", bio: "Led revenue transformation at 3 unicorn startups.", isFeatured: true },
    { firstName: "Elena", lastName: "Rodriguez", company: "GrowthAI", jobTitle: "VP of Product", bio: "Building the future of product-led growth with AI.", isFeatured: true },
    { firstName: "David", lastName: "Kim", company: "DemandGen Pro", jobTitle: "Head of Demand Generation", bio: "Generated $500M+ pipeline through innovative demand strategies.", isFeatured: false },
    { firstName: "Rachel", lastName: "Thompson", company: "CloudScale", jobTitle: "CMO", bio: "Award-winning marketer focused on B2B SaaS growth.", isFeatured: false },
    { firstName: "Alex", lastName: "Patel", company: "DataDriven Co", jobTitle: "Director of Analytics", bio: "Data scientist turned marketing leader.", isFeatured: false },
    { firstName: "Jennifer", lastName: "Wu", company: "TechForward", jobTitle: "VP of Marketing", bio: "Scaling marketing teams from seed to IPO.", isFeatured: false },
    { firstName: "Michael", lastName: "Brown", company: "Catalyst AI", jobTitle: "Founder", bio: "Serial entrepreneur building AI tools for GTM teams.", isFeatured: true },
  ];

  const createdSpeakers = await db.insert(speakers).values(
    speakerData.map((s, idx) => ({
      organizationId,
      eventId,
      firstName: s.firstName,
      lastName: s.lastName,
      email: generateEmail(s.firstName, s.lastName, s.company),
      company: s.company,
      jobTitle: s.jobTitle,
      bio: s.bio,
      isFeatured: s.isFeatured,
      displayOrder: idx,
    }))
  ).returning();

  console.log(`Created ${createdSpeakers.length} speakers`);

  // 7. Create sessions organized by tracks
  const tracks = [
    { name: "AI for Demand Gen", sessions: [
      { title: "The Future of AI-Powered Demand Generation", time: "09:00", endTime: "10:00", type: "keynote", capacity: 500 },
      { title: "Predictive Lead Scoring with Machine Learning", time: "10:30", endTime: "11:30", type: "session", capacity: 200 },
      { title: "Automating Campaign Optimization with AI", time: "13:00", endTime: "14:00", type: "session", capacity: 200 },
      { title: "Intent Data and AI: The Perfect Match", time: "14:30", endTime: "15:30", type: "workshop", capacity: 75 },
    ]},
    { name: "AI for RevOps", sessions: [
      { title: "Building an AI-First Revenue Operations Stack", time: "09:00", endTime: "10:00", type: "keynote", capacity: 500 },
      { title: "Sales Forecasting with Predictive AI", time: "10:30", endTime: "11:30", type: "session", capacity: 200 },
      { title: "Automated Pipeline Management", time: "13:00", endTime: "14:00", type: "session", capacity: 200 },
      { title: "RevOps Metrics That Matter in the AI Era", time: "14:30", endTime: "15:30", type: "panel", capacity: 150 },
    ]},
    { name: "AI for Product-Led Growth", sessions: [
      { title: "PLG + AI: Accelerating User Activation", time: "09:00", endTime: "10:00", type: "keynote", capacity: 500 },
      { title: "AI-Driven Product Analytics", time: "10:30", endTime: "11:30", type: "session", capacity: 200 },
      { title: "Personalization at Scale with AI", time: "13:00", endTime: "14:00", type: "session", capacity: 200 },
      { title: "Building AI Features Your Users Actually Want", time: "14:30", endTime: "15:30", type: "workshop", capacity: 75 },
    ]},
  ];

  const sessionDates = ["2025-03-12", "2025-03-13", "2025-03-14"];
  const createdSessions: any[] = [];

  for (const track of tracks) {
    for (let dayIdx = 0; dayIdx < sessionDates.length; dayIdx++) {
      for (const session of track.sessions) {
        const [created] = await db.insert(eventSessions).values({
          organizationId,
          eventId,
          title: session.title,
          description: `${track.name} track session exploring ${session.title.toLowerCase()}.`,
          sessionDate: sessionDates[dayIdx],
          startTime: session.time,
          endTime: session.endTime,
          room: `Room ${Math.floor(Math.random() * 10) + 1}`,
          capacity: session.capacity,
          track: track.name,
          sessionType: session.type,
        }).returning();
        createdSessions.push(created);
      }
    }
  }

  console.log(`Created ${createdSessions.length} sessions`);

  // 8. Link some speakers to sessions
  const speakerSessionLinks = [];
  for (let i = 0; i < Math.min(createdSessions.length, createdSpeakers.length * 3); i++) {
    speakerSessionLinks.push({
      sessionId: createdSessions[i].id,
      speakerId: createdSpeakers[i % createdSpeakers.length].id,
    });
  }
  await db.insert(sessionSpeakers).values(speakerSessionLinks);

  // 8.5 Create engagement moments (polls, ratings, Q&A, etc.)
  const momentData = [
    {
      organizationId,
      eventId,
      sessionId: createdSessions[0]?.id,
      type: 'poll_single',
      title: 'AI Adoption Readiness',
      prompt: 'How ready is your organization to adopt AI in GTM?',
      optionsJson: [
        { id: '1', text: 'Already using AI extensively' },
        { id: '2', text: 'Experimenting with AI tools' },
        { id: '3', text: 'Just getting started' },
        { id: '4', text: 'Not yet, but planning' },
      ],
      status: 'ended',
    },
    {
      organizationId,
      eventId,
      sessionId: createdSessions[1]?.id,
      type: 'rating',
      title: 'Session Quality Rating',
      prompt: 'How would you rate this session?',
      optionsJson: { min: 1, max: 5, labels: { 1: 'Poor', 5: 'Excellent' } },
      status: 'ended',
    },
    {
      organizationId,
      eventId,
      sessionId: createdSessions[2]?.id,
      type: 'poll_single',
      title: 'Top GTM Challenge',
      prompt: 'What is your biggest GTM challenge right now?',
      optionsJson: [
        { id: '1', text: 'Lead generation' },
        { id: '2', text: 'Sales enablement' },
        { id: '3', text: 'Pipeline velocity' },
        { id: '4', text: 'Customer retention' },
      ],
      status: 'ended',
    },
    {
      organizationId,
      eventId,
      type: 'qa',
      title: 'Ask the Experts',
      prompt: 'Submit your questions for our panel',
      status: 'ended',
    },
    {
      organizationId,
      eventId,
      type: 'pulse',
      title: 'Event Energy Check',
      prompt: 'How are you feeling about the event so far?',
      optionsJson: { type: 'emoji', options: ['🔥', '👍', '😐', '😴'] },
      status: 'ended',
    },
  ];

  const createdMoments = [];
  for (const moment of momentData) {
    const [created] = await db.insert(moments).values(moment).returning();
    createdMoments.push(created);
  }
  console.log(`Created ${createdMoments.length} engagement moments`);

  // 9. Create attendees (~850)
  const attendeeCount = 850;
  const attendeeValues = [];
  const packageDistribution = [
    { pkg: generalPackage, weight: 0.70 },
    { pkg: executivePackage, weight: 0.20 },
    { pkg: partnerPackage, weight: 0.10 },
  ];

  const linkDistribution = [
    { link: linkedInLink, weight: 0.35 },
    { link: partnerLink, weight: 0.20 },
    { link: vipLink, weight: 0.10 },
    { link: emailLink, weight: 0.30 },
    { link: null, weight: 0.05 },
  ];

  const statusDistribution = [
    { status: "checked_in", weight: 0.85 },  // 85% checked in for realistic post-event demo
    { status: "confirmed", weight: 0.08 },
    { status: "registered", weight: 0.05 },
    { status: "cancelled", weight: 0.02 },
  ];

  for (let i = 0; i < attendeeCount; i++) {
    const firstName = randomElement(FIRST_NAMES);
    const lastName = randomElement(LAST_NAMES);
    const company = randomElement(COMPANIES);
    
    // Select package based on weight
    let selectedPackage = generalPackage;
    const pkgRand = Math.random();
    let cumWeight = 0;
    for (const pd of packageDistribution) {
      cumWeight += pd.weight;
      if (pkgRand < cumWeight) {
        selectedPackage = pd.pkg;
        break;
      }
    }

    // Select activation link based on weight
    let selectedLink = null;
    const linkRand = Math.random();
    cumWeight = 0;
    for (const ld of linkDistribution) {
      cumWeight += ld.weight;
      if (linkRand < cumWeight) {
        selectedLink = ld.link;
        break;
      }
    }

    // Select status based on weight
    let status = "registered";
    const statusRand = Math.random();
    cumWeight = 0;
    for (const sd of statusDistribution) {
      cumWeight += sd.weight;
      if (statusRand < cumWeight) {
        status = sd.status;
        break;
      }
    }

    // Assign intent status based on distribution
    // 6% hot_lead, 14% high_intent, 25% engaged, 55% none
    const intentRand = Math.random();
    let intentStatus: "none" | "engaged" | "high_intent" | "hot_lead" = "none";
    let salesReady = false;
    if (intentRand < 0.06) {
      intentStatus = "hot_lead";
      salesReady = true; // All hot leads are sales ready
    } else if (intentRand < 0.20) {
      intentStatus = "high_intent";
      salesReady = Math.random() < 0.5; // 50% of high intent are sales ready
    } else if (intentRand < 0.45) {
      intentStatus = "engaged";
    }

    attendeeValues.push({
      organizationId,
      eventId,
      attendeeType: selectedPackage.id === executivePackage.id ? "executive" : "general",
      firstName,
      lastName,
      email: generateEmail(firstName, lastName, company) + i,
      company,
      jobTitle: randomElement(JOB_TITLES),
      registrationStatus: status,
      ticketType: selectedPackage.name,
      checkInCode: generateCheckInCode(),
      checkedIn: status === "checked_in",
      checkInTime: status === "checked_in" ? new Date() : null,
      packageId: selectedPackage.id,
      activationLinkId: selectedLink?.id || null,
      utmSource: selectedLink?.utmSource || null,
      utmMedium: selectedLink?.utmMedium || null,
      utmCampaign: selectedLink?.utmCampaign || null,
      intentStatus,
      salesReady,
    });
  }

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < attendeeValues.length; i += batchSize) {
    const batch = attendeeValues.slice(i, i + batchSize);
    await db.insert(attendees).values(batch);
  }

  console.log(`Created ${attendeeCount} attendees`);

  // 9.5 Create moment responses for 86% of attendees (engagement rate)
  // Get created attendees for moment responses
  const createdAttendees = await db.select().from(attendees).where(sql`event_id = ${eventId}`);
  const participatingAttendees = createdAttendees.slice(0, Math.floor(createdAttendees.length * 0.86));
  
  const momentResponseData: any[] = [];
  const qaQuestions = [
    "How do you see AI impacting pipeline generation in the next 2 years?",
    "What's the best way to measure AI ROI for GTM teams?",
    "Can you share examples of successful AI-driven lead scoring?",
    "How do you balance automation with the human touch in sales?",
    "What are the biggest risks of over-relying on AI for customer engagement?",
  ];
  
  for (const attendee of participatingAttendees) {
    // Each participating attendee responds to 1-3 random moments
    const numResponses = Math.floor(Math.random() * 3) + 1;
    const shuffledMoments = [...createdMoments].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < Math.min(numResponses, shuffledMoments.length); i++) {
      const moment = shuffledMoments[i];
      let payload: any = {};
      
      if (moment.type === 'poll_single') {
        const options = moment.optionsJson as any[];
        payload = { selectedOption: randomElement(options)?.id || '1' };
      } else if (moment.type === 'rating') {
        payload = { rating: Math.floor(Math.random() * 3) + 3 }; // 3-5 ratings
      } else if (moment.type === 'qa') {
        payload = { question: randomElement(qaQuestions) };
      } else if (moment.type === 'pulse') {
        const pulseOptions = ['fire', 'thumbsup', 'neutral', 'sleepy'];
        payload = { reaction: randomElement(pulseOptions) };
      }
      
      momentResponseData.push({
        momentId: moment.id,
        organizationId,
        eventId,
        sessionId: moment.sessionId || null,
        attendeeId: attendee.id,
        payloadJson: payload,
      });
    }
  }
  
  // Insert moment responses in batches
  for (let i = 0; i < momentResponseData.length; i += batchSize) {
    const batch = momentResponseData.slice(i, i + batchSize);
    await db.insert(momentResponses).values(batch);
  }
  console.log(`Created ${momentResponseData.length} moment responses from ${participatingAttendees.length} attendees (${Math.round(participatingAttendees.length / createdAttendees.length * 100)}% engagement rate)`);

  // 10. Create email templates
  const [inviteTemplate] = await db.insert(emailTemplates).values({
    organizationId,
    eventId,
    name: "Event Invitation",
    subject: "You're Invited: AI GTM Summit 2025",
    content: `<h1>Join Us at AI GTM Summit 2025</h1>
<p>Hi {{firstName}},</p>
<p>You're invited to the premier event for marketing, revenue, and product leaders exploring how AI is transforming go-to-market strategy.</p>
<p><strong>When:</strong> March 12-14, 2025</p>
<p><strong>Where:</strong> San Francisco, CA</p>
<p><a href="{{registrationUrl}}">Register Now</a></p>
<p>Best regards,<br>The AI GTM Summit Team</p>`,
    category: "invitation",
    isDefault: true,
  }).returning();

  const [confirmTemplate] = await db.insert(emailTemplates).values({
    organizationId,
    eventId,
    name: "Registration Confirmation",
    subject: "You're Registered for AI GTM Summit!",
    content: `<h1>Welcome to AI GTM Summit 2025!</h1>
<p>Hi {{firstName}},</p>
<p>Thank you for registering! Your spot is confirmed.</p>
<p><strong>Your Check-in Code:</strong> {{checkInCode}}</p>
<p><strong>Package:</strong> {{ticketType}}</p>
<p>We'll send you more details as the event approaches.</p>
<p>See you in San Francisco!</p>`,
    category: "confirmation",
    isDefault: true,
  }).returning();

  const [reminderTemplate] = await db.insert(emailTemplates).values({
    organizationId,
    eventId,
    name: "Event Reminder",
    subject: "AI GTM Summit Starts in 1 Week!",
    content: `<h1>One Week Until AI GTM Summit!</h1>
<p>Hi {{firstName}},</p>
<p>We're excited to see you next week! Here's what you need to know:</p>
<ul>
<li><strong>Dates:</strong> March 12-14, 2025</li>
<li><strong>Location:</strong> Moscone Center, San Francisco</li>
<li><strong>Check-in Code:</strong> {{checkInCode}}</li>
</ul>
<p><a href="{{portalUrl}}">View Your Personalized Agenda</a></p>`,
    category: "reminder",
    isDefault: false,
  }).returning();

  const [followUpTemplate] = await db.insert(emailTemplates).values({
    organizationId,
    eventId,
    name: "Post-Event Follow-Up",
    subject: "Thank You for Attending AI GTM Summit!",
    content: `<h1>Thank You for Joining Us!</h1>
<p>Hi {{firstName}},</p>
<p>Thank you for being part of AI GTM Summit 2025. We hope you found the sessions valuable.</p>
<p><strong>What's Next:</strong></p>
<ul>
<li>Session recordings are now available</li>
<li>Connect with speakers on LinkedIn</li>
<li>Join our community for year-round insights</li>
</ul>
<p><a href="{{portalUrl}}">Access Your Content</a></p>`,
    category: "follow-up",
    isDefault: false,
  }).returning();

  console.log("Created email templates");

  // 11. Create email campaigns with realistic metrics
  const [inviteCampaign] = await db.insert(emailCampaigns).values({
    organizationId,
    eventId,
    subject: "You're Invited: AI GTM Summit 2025",
    content: inviteTemplate.content,
    recipientType: "all",
    status: "sent",
    sentAt: new Date("2025-01-15T09:00:00Z"),
    isInviteEmail: true,
    createdBy,
  }).returning();

  const [confirmCampaign] = await db.insert(emailCampaigns).values({
    organizationId,
    eventId,
    subject: "You're Registered for AI GTM Summit!",
    content: confirmTemplate.content,
    recipientType: "registered",
    status: "sent",
    sentAt: new Date("2025-02-01T10:00:00Z"),
    createdBy,
  }).returning();

  const [reminderCampaign] = await db.insert(emailCampaigns).values({
    organizationId,
    eventId,
    subject: "AI GTM Summit Starts in 1 Week!",
    content: reminderTemplate.content,
    recipientType: "registered",
    status: "scheduled",
    scheduledAt: new Date("2025-03-05T09:00:00Z"),
    createdBy,
  }).returning();

  console.log("Created email campaigns");

  // 12. Generate activation link clicks for analytics
  // Create realistic click counts that result in ~30% conversion rate
  // With ~826 registrations, we need ~2,750 unique visitors for 30% conversion
  const clickData = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Define click counts per link (total ~2,800 unique visitors)
  const linkClickCounts: Record<string, number> = {
    [linkedInLink.id]: 1200,   // LinkedIn campaign - high volume
    [partnerLink.id]: 450,     // Partner referrals
    [vipLink.id]: 150,         // VIP invites - smaller, targeted
    [emailLink.id]: 1000,      // Email campaigns
  };

  for (const link of [linkedInLink, partnerLink, vipLink, emailLink]) {
    const clickCount = linkClickCounts[link.id] || 500;
    for (let i = 0; i < clickCount; i++) {
      clickData.push({
        activationLinkId: link.id,
        visitorHash: `${link.id.substring(0, 8)}_${i}_${Math.random().toString(36).substring(2, 10)}`,
        ipHash: Math.random().toString(36).substring(2, 18),
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        clickedAt: randomDate(thirtyDaysAgo, now),
      });
    }
  }

  // Insert clicks in batches
  for (let i = 0; i < clickData.length; i += batchSize) {
    const batch = clickData.slice(i, i + batchSize);
    await db.insert(activationLinkClicks).values(batch);
  }

  console.log(`Created ${clickData.length} activation link clicks (unique visitors)`);

  // 13. Create event feedback with NPS scores for analytics
  const checkedInAttendees = await db.select().from(attendees)
    .where(sql`${attendees.eventId} = ${eventId} AND ${attendees.registrationStatus} = 'checked_in'`)
    .limit(50);
  
  const feedbackData = [];
  // NPS distribution: ~55% Promoters (9-10), ~30% Passives (7-8), ~15% Detractors (0-6)
  // Target NPS: ~40 (55% - 15% = 40)
  const npsDistribution = [
    { scores: [9, 10], weight: 0.55 },        // Promoters
    { scores: [7, 8], weight: 0.30 },          // Passives  
    { scores: [4, 5, 6], weight: 0.15 },       // Detractors (mild, 4-6 only)
  ];

  for (const attendee of checkedInAttendees) {
    const rand = Math.random();
    let recommendationScore = 5;
    let cumWeight = 0;
    
    for (const dist of npsDistribution) {
      cumWeight += dist.weight;
      if (rand < cumWeight) {
        recommendationScore = randomElement(dist.scores);
        break;
      }
    }

    feedbackData.push({
      organizationId,
      eventId,
      attendeeId: attendee.id,
      overallRating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
      venueRating: Math.floor(Math.random() * 2) + 4,
      contentRating: Math.floor(Math.random() * 2) + 4,
      networkingRating: Math.floor(Math.random() * 3) + 3, // 3-5 stars
      organizationRating: Math.floor(Math.random() * 2) + 4,
      recommendationScore,
      wouldRecommend: recommendationScore >= 7,
      highlights: randomElement([
        "Great networking opportunities",
        "Excellent keynote speakers",
        "Valuable AI insights",
        "Well-organized sessions",
        "Innovative content",
      ]),
      improvements: randomElement([
        "More hands-on workshops",
        "Better food options",
        "Longer break times",
        "More seating in main hall",
        null,
      ]),
      isAnonymous: Math.random() < 0.2, // 20% anonymous
    });
  }

  if (feedbackData.length > 0) {
    await db.insert(eventFeedback).values(feedbackData);
  }
  
  console.log(`Created ${feedbackData.length} event feedback responses`);

  // 14. Create deliverables for Program Health dashboard
  const eventStartDateObj = new Date(eventStartDate);
  const deliverableData = [
    // Pre-program deliverables (completed and in-progress)
    {
      organizationId,
      eventId,
      title: "Finalize speaker lineup",
      description: "Confirm all keynote and breakout session speakers",
      workstream: "Content",
      phase: "pre_program",
      status: "completed",
      priority: "high",
      dueDate: new Date(eventStartDateObj.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 60 days before
    },
    {
      organizationId,
      eventId,
      title: "Launch registration page",
      description: "Deploy public event registration with all packages configured",
      workstream: "Marketing",
      phase: "pre_program",
      status: "completed",
      priority: "high",
      dueDate: new Date(eventStartDateObj.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      organizationId,
      eventId,
      title: "Secure venue contract",
      description: "Finalize Moscone Center contract and payment",
      workstream: "Operations",
      phase: "pre_program",
      status: "completed",
      priority: "high",
      dueDate: new Date(eventStartDateObj.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      organizationId,
      eventId,
      title: "Sponsor prospectus distribution",
      description: "Send sponsor packages to all target companies",
      workstream: "Partnerships",
      phase: "pre_program",
      status: "completed",
      priority: "medium",
      dueDate: new Date(eventStartDateObj.getTime() - 75 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      organizationId,
      eventId,
      title: "Email campaign sequences",
      description: "Set up automated email sequences for registrants",
      workstream: "Marketing",
      phase: "pre_program",
      status: "in_progress",
      priority: "medium",
      dueDate: new Date(eventStartDateObj.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    // During program deliverables
    {
      organizationId,
      eventId,
      title: "Print attendee badges",
      description: "Print all pre-registered attendee badges with QR codes",
      workstream: "Operations",
      phase: "during_program",
      status: "todo",
      priority: "high",
      dueDate: new Date(eventStartDateObj.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      organizationId,
      eventId,
      title: "AV equipment setup",
      description: "Configure all rooms with presentation equipment and recording",
      workstream: "Operations",
      phase: "during_program",
      status: "todo",
      priority: "high",
      dueDate: new Date(eventStartDateObj.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      organizationId,
      eventId,
      title: "Staff briefing session",
      description: "Pre-event briefing for all volunteers and staff",
      workstream: "Operations",
      phase: "during_program",
      status: "todo",
      priority: "medium",
      dueDate: new Date(eventStartDateObj.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    // Post-program deliverables
    {
      organizationId,
      eventId,
      title: "Send post-event surveys",
      description: "Distribute NPS and session feedback surveys to all attendees",
      workstream: "Marketing",
      phase: "post_program",
      status: "todo",
      priority: "high",
      dueDate: new Date(eventStartDateObj.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    {
      organizationId,
      eventId,
      title: "Compile attendee report",
      description: "Generate comprehensive report with engagement metrics and lead data",
      workstream: "Analytics",
      phase: "post_program",
      status: "todo",
      priority: "medium",
      dueDate: new Date(eventStartDateObj.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  ];

  await db.insert(deliverables).values(deliverableData);
  console.log(`Created ${deliverableData.length} deliverables`);

  // 15. Create email messages for email campaign analytics
  // Get attendees to link messages to
  const allAttendees = await db.select().from(attendees)
    .where(sql`${attendees.eventId} = ${eventId}`)
    .limit(200);

  const emailMessageData = [];
  const emailStatuses = ['delivered', 'delivered', 'delivered', 'opened', 'opened', 'clicked', 'bounced'];
  
  // Create messages for each campaign
  for (const campaign of [inviteCampaign, confirmCampaign]) {
    const recipientCount = Math.min(allAttendees.length, 150);
    for (let i = 0; i < recipientCount; i++) {
      const attendee = allAttendees[i];
      const status = randomElement(emailStatuses);
      const sentAt = campaign.sentAt || new Date();
      
      emailMessageData.push({
        organizationId,
        campaignId: campaign.id,
        attendeeId: attendee.id,
        recipientEmail: attendee.email,
        recipientName: `${attendee.firstName} ${attendee.lastName}`,
        subject: campaign.subject,
        status,
        sentAt,
        deliveredAt: status !== 'bounced' ? new Date(sentAt.getTime() + Math.random() * 60000) : null,
        openedAt: ['opened', 'clicked'].includes(status) ? new Date(sentAt.getTime() + Math.random() * 3600000) : null,
        clickedAt: status === 'clicked' ? new Date(sentAt.getTime() + Math.random() * 7200000) : null,
      });
    }
  }

  // Insert in batches
  for (let i = 0; i < emailMessageData.length; i += batchSize) {
    const batch = emailMessageData.slice(i, i + batchSize);
    await db.insert(emailMessages).values(batch);
  }
  console.log(`Created ${emailMessageData.length} email messages for campaign analytics`);

  // 16. Create event leads (lead scans) for engagement dashboard
  const captureMethodWeights = [
    { method: 'qr_scan', weight: 0.5 },
    { method: 'badge_scan', weight: 0.35 },
    { method: 'manual', weight: 0.15 },
  ];
  
  const leadNotes = [
    "Interested in enterprise demo",
    "Looking for Q2 implementation",
    "Currently evaluating competitors",
    "Budget approved for this quarter",
    "Needs to involve CTO in decision",
    "Follow up with case study",
    "Expanding team, needs scalable solution",
    "Very engaged during conversation",
    null,
    null,
  ];

  const eventLeadData = [];
  const leadCount = 35; // Create 35 lead scans
  
  for (let i = 0; i < leadCount; i++) {
    const firstName = randomElement(FIRST_NAMES);
    const lastName = randomElement(LAST_NAMES);
    const company = randomElement(COMPANIES);
    
    let captureMethod = 'qr_scan';
    const methodRand = Math.random();
    let cumWeight = 0;
    for (const cm of captureMethodWeights) {
      cumWeight += cm.weight;
      if (methodRand < cumWeight) {
        captureMethod = cm.method;
        break;
      }
    }
    
    eventLeadData.push({
      organizationId,
      eventId,
      firstName,
      lastName,
      email: generateEmail(firstName, lastName, company),
      company,
      jobTitle: randomElement(JOB_TITLES),
      notes: randomElement(leadNotes),
      captureMethod,
      capturedAt: randomDate(new Date(eventStartDate), new Date(eventEndDate)),
    });
  }

  await db.insert(eventLeads).values(eventLeadData);
  console.log(`Created ${eventLeadData.length} event leads (lead scans)`);

  // 17. Create attendee meetings with outcomes for Revenue Impact dashboard
  const meetingIntentTypes = ['partnership', 'demo_request', 'consulting', 'product_feedback', 'networking'];
  const meetingOutcomeTypes = ['no_fit', 'early_interest', 'active_opportunity', 'follow_up_scheduled', 'deal_in_progress'];
  const dealRanges = ['under_25k', '25k_to_100k', 'over_100k'];
  const timelines = ['now', 'this_quarter', 'later'];
  const confidenceLevels = ['low', 'medium', 'high'];
  
  // Weight toward positive outcomes for impressive dashboard
  const outcomeWeights = [
    { outcome: 'deal_in_progress', weight: 0.15 },
    { outcome: 'active_opportunity', weight: 0.25 },
    { outcome: 'follow_up_scheduled', weight: 0.25 },
    { outcome: 'early_interest', weight: 0.25 },
    { outcome: 'no_fit', weight: 0.10 },
  ];

  const dealRangeWeights = [
    { range: 'over_100k', weight: 0.25 },
    { range: '25k_to_100k', weight: 0.45 },
    { range: 'under_25k', weight: 0.30 },
  ];

  const meetingData = [];
  const meetingCount = 28; // Create 28 meetings
  const meetingAttendees = allAttendees.filter(a => a.registrationStatus === 'checked_in');
  
  for (let i = 0; i < Math.min(meetingCount, meetingAttendees.length - 1); i++) {
    const invitee = meetingAttendees[i];
    
    // Select weighted outcome
    let outcomeType = 'early_interest';
    let outcomeRand = Math.random();
    let cumWeight = 0;
    for (const ow of outcomeWeights) {
      cumWeight += ow.weight;
      if (outcomeRand < cumWeight) {
        outcomeType = ow.outcome;
        break;
      }
    }

    // Select weighted deal range (only for opportunities)
    let dealRange = null;
    if (['active_opportunity', 'deal_in_progress', 'follow_up_scheduled'].includes(outcomeType)) {
      let dealRand = Math.random();
      cumWeight = 0;
      for (const dr of dealRangeWeights) {
        cumWeight += dr.weight;
        if (dealRand < cumWeight) {
          dealRange = dr.range;
          break;
        }
      }
    }

    const startTime = randomDate(new Date(eventStartDate), new Date(eventEndDate));
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 min meetings

    meetingData.push({
      organizationId,
      eventId,
      inviteeId: invitee.id,
      startTime,
      endTime,
      location: randomElement(['Meeting Room A', 'Meeting Room B', 'Expo Hall Booth', 'VIP Lounge', 'Coffee Area']),
      status: 'completed',
      intentType: randomElement(meetingIntentTypes),
      outcomeType,
      dealRange,
      timeline: dealRange ? randomElement(timelines) : null,
      outcomeNotes: outcomeType !== 'no_fit' ? `Discussed ${randomElement(['product roadmap', 'implementation timeline', 'pricing options', 'use cases', 'integration requirements'])}` : null,
      outcomeConfidence: dealRange ? randomElement(confidenceLevels) : null,
      outcomeCapturedAt: new Date(),
    });
  }

  await db.insert(attendeeMeetings).values(meetingData);
  console.log(`Created ${meetingData.length} attendee meetings with outcomes`);

  // 18. Create engagement signals for high-intent tracking
  const engagementData = [];
  const highIntentCount = Math.floor(checkedInAttendees.length * 0.3); // 30% show high intent
  
  for (let i = 0; i < checkedInAttendees.length; i++) {
    const attendee = checkedInAttendees[i];
    const isHighIntent = i < highIntentCount;
    const engagementScore = isHighIntent 
      ? Math.floor(Math.random() * 30) + 70  // 70-100 for high intent
      : Math.floor(Math.random() * 50) + 20; // 20-70 for regular
    
    engagementData.push({
      organizationId,
      eventId,
      attendeeId: attendee.id,
      engaged: true,
      engagementScore,
      highIntent: isHighIntent,
      lastEngagedAt: randomDate(new Date(eventStartDate), new Date(eventEndDate)),
      signalSummaryJson: {
        sessions_attended: Math.floor(Math.random() * 8) + 1,
        questions_asked: isHighIntent ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 2),
        booth_visits: Math.floor(Math.random() * 6),
        content_downloads: isHighIntent ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 2),
        meetings_booked: isHighIntent ? Math.floor(Math.random() * 2) + 1 : 0,
      },
    });
  }

  // Insert in batches
  for (let i = 0; i < engagementData.length; i += batchSize) {
    const batch = engagementData.slice(i, i + batchSize);
    await db.insert(engagementSignals).values(batch);
  }
  console.log(`Created ${engagementData.length} engagement signals (${highIntentCount} high-intent)`);

  // 19. Create beautiful event pages for site builder
  const aiGtmTheme = {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    baseFontSize: '16px',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    backgroundColor: '#0f0f23',
    textColor: '#f8fafc',
    textSecondaryColor: '#94a3b8',
    buttonColor: '#6366f1',
    buttonTextColor: '#ffffff',
    cardBackground: '#1a1a2e',
    borderColor: '#2d2d44',
    borderRadius: 'medium' as const,
    buttonStyle: 'filled' as const,
    containerWidth: 'wide' as const,
    sectionSpacing: 'relaxed' as const,
    textDecoration: 'none' as const,
  };

  // Landing page sections
  const landingSections = [
    {
      id: generateSectionId('landing', 'navigation', 0),
      type: 'navigation',
      order: 0,
      config: {
        logoText: 'AI GTM Summit',
        links: [
          { label: 'Speakers', href: '#speakers' },
          { label: 'Agenda', href: '#agenda' },
          { label: 'Sponsors', href: '#sponsors' },
          { label: 'Register', href: '#register' },
        ],
        sticky: true,
        showCta: true,
        ctaText: 'Register Now',
        ctaLink: '#register',
      },
    },
    {
      id: generateSectionId('landing', 'hero', 1),
      type: 'hero',
      order: 1,
      config: {
        title: 'AI GTM Summit 2025',
        subtitle: 'Where Innovation Meets Go-To-Market Excellence',
        description: 'Join 1,200+ marketing, revenue, and product leaders exploring how AI is transforming go-to-market strategy, demand generation, and customer engagement.',
        buttonText: 'Register Now',
        buttonLink: '#register',
        secondaryButtonText: 'View Agenda',
        secondaryButtonLink: '#agenda',
        alignment: 'center',
        overlayOpacity: 70,
      },
      styles: {
        paddingTop: 'large',
        paddingBottom: 'large',
      },
    },
    {
      id: generateSectionId('landing', 'countdown', 2),
      type: 'countdown',
      order: 2,
      config: {
        heading: 'Event Starts In',
        targetDate: eventStartDate,
        showDays: true,
        showHours: true,
        showMinutes: true,
        showSeconds: true,
      },
      styles: {
        paddingTop: 'medium',
        paddingBottom: 'medium',
      },
    },
    {
      id: generateSectionId('landing', 'features', 3),
      type: 'features',
      order: 3,
      config: {
        heading: 'Why Attend AI GTM Summit?',
        subheading: 'Three days of insights, connections, and actionable strategies',
        features: [
          { icon: 'Zap', title: 'AI-Powered Strategies', description: 'Learn how leading companies are using AI to transform their GTM motions' },
          { icon: 'Users', title: 'Expert Speakers', description: 'Hear from CEOs, CMOs, and CROs of the fastest-growing AI companies' },
          { icon: 'Target', title: 'Hands-on Workshops', description: 'Build real AI-powered marketing tools in interactive sessions' },
          { icon: 'Network', title: 'Executive Networking', description: 'Connect with 1,200+ marketing, revenue, and product leaders' },
          { icon: 'BookOpen', title: 'Best Practices', description: 'Take home proven playbooks for AI-driven demand generation' },
          { icon: 'Trophy', title: 'Innovation Awards', description: 'Celebrate the best AI GTM innovations of the year' },
        ],
        columns: 3,
      },
      styles: {
        paddingTop: 'large',
        paddingBottom: 'large',
      },
    },
    {
      id: generateSectionId('landing', 'speakers', 4),
      type: 'speakers',
      order: 4,
      config: {
        heading: 'Featured Speakers',
        subheading: 'Learn from the best minds in AI and Go-To-Market',
        showBio: true,
        showCompany: true,
        showTitle: true,
        columns: 4,
        featuredOnly: true,
      },
      styles: {
        paddingTop: 'large',
        paddingBottom: 'large',
      },
    },
    {
      id: generateSectionId('landing', 'agenda', 5),
      type: 'agenda',
      order: 5,
      config: {
        heading: 'Conference Schedule',
        subheading: 'Three days of transformative content',
        showRoom: true,
        showTrack: true,
        showSpeakers: true,
        groupByDate: true,
        showFilters: true,
      },
      styles: {
        paddingTop: 'large',
        paddingBottom: 'large',
      },
    },
    {
      id: generateSectionId('landing', 'testimonials', 6),
      type: 'testimonials',
      order: 6,
      config: {
        heading: 'What Past Attendees Say',
        items: [
          { name: 'Sarah Chen', role: 'CEO, AI Ventures', quote: 'The most actionable AI marketing conference I have ever attended. Left with 3 new strategies we implemented immediately.', image: '' },
          { name: 'Marcus Johnson', role: 'CRO, RevOps Labs', quote: 'Incredible networking and cutting-edge content. Made connections that led to our next major partnership.', image: '' },
          { name: 'Elena Rodriguez', role: 'VP Product, GrowthAI', quote: 'The workshops alone were worth the trip. Our product-led growth metrics improved 40% after implementing what we learned.', image: '' },
        ],
        layout: 'grid',
      },
      styles: {
        paddingTop: 'large',
        paddingBottom: 'large',
      },
    },
    {
      id: generateSectionId('landing', 'sponsors', 7),
      type: 'sponsors',
      order: 7,
      config: {
        heading: 'Our Partners & Sponsors',
        subheading: 'Thank you to our amazing sponsors',
        showTierLabels: true,
      },
      styles: {
        paddingTop: 'large',
        paddingBottom: 'large',
      },
    },
    {
      id: generateSectionId('landing', 'map', 8),
      type: 'map',
      order: 8,
      config: {
        heading: 'Event Location',
        address: '747 Howard St, San Francisco, CA 94103',
        venue: 'Moscone Center',
        showDirectionsLink: true,
        zoom: 15,
      },
      styles: {
        paddingTop: 'large',
        paddingBottom: 'medium',
      },
    },
    {
      id: generateSectionId('landing', 'cta', 9),
      type: 'cta',
      order: 9,
      config: {
        heading: 'Ready to Transform Your GTM Strategy?',
        description: 'Join 1,200+ leaders at the premier AI GTM event of the year. Early bird pricing ends soon.',
        buttonText: 'Register Now',
        buttonLink: '#register',
        secondaryButtonText: 'Download Brochure',
        secondaryButtonLink: '#',
      },
      styles: {
        paddingTop: 'large',
        paddingBottom: 'large',
      },
    },
    {
      id: generateSectionId('landing', 'footer', 10),
      type: 'footer',
      order: 10,
      config: {
        showContactInfo: true,
        email: 'info@aigtmsummit.com',
        phone: '+1 (415) 555-0123',
        showSocialIcons: true,
        twitterUrl: 'https://twitter.com/aigtmsummit',
        linkedinUrl: 'https://linkedin.com/company/aigtmsummit',
        copyright: '2025 AI GTM Summit. All rights reserved.',
        links: [
          { label: 'Privacy Policy', href: '/privacy' },
          { label: 'Terms of Service', href: '/terms' },
          { label: 'Contact Us', href: 'mailto:info@aigtmsummit.com' },
        ],
      },
    },
  ];

  // Registration page sections
  const registrationSections = [
    {
      id: generateSectionId('registration', 'navigation', 0),
      type: 'navigation',
      order: 0,
      config: {
        logoText: 'AI GTM Summit',
        links: [
          { label: 'Back to Home', href: '/' },
        ],
        sticky: true,
      },
    },
    {
      id: generateSectionId('registration', 'hero', 1),
      type: 'hero',
      order: 1,
      config: {
        title: 'Register for AI GTM Summit 2025',
        subtitle: 'March 12-14, 2025 | San Francisco, CA',
        alignment: 'center',
        compact: true,
      },
      styles: {
        paddingTop: 'medium',
        paddingBottom: 'small',
      },
    },
    {
      id: generateSectionId('registration', 'registration-form', 2),
      type: 'registration-form',
      order: 2,
      config: {
        heading: 'Complete Your Registration',
        showPackages: true,
        showPayment: true,
      },
      styles: {
        paddingTop: 'medium',
        paddingBottom: 'large',
      },
    },
    {
      id: generateSectionId('registration', 'footer', 3),
      type: 'footer',
      order: 3,
      config: {
        showContactInfo: true,
        email: 'registration@aigtmsummit.com',
        copyright: '2025 AI GTM Summit',
      },
    },
  ];

  // Portal page sections
  const portalSections = [
    {
      id: generateSectionId('portal', 'navigation', 0),
      type: 'navigation',
      order: 0,
      config: {
        logoText: 'AI GTM Summit',
        links: [
          { label: 'My Schedule', href: '#schedule' },
          { label: 'Recommendations', href: '#recommendations' },
          { label: 'Feedback', href: '#feedback' },
        ],
        sticky: true,
        showLogout: true,
      },
    },
    {
      id: generateSectionId('portal', 'hero', 1),
      type: 'hero',
      order: 1,
      config: {
        title: 'Welcome to Your Attendee Portal',
        subtitle: 'AI GTM Summit 2025 | March 12-14',
        alignment: 'center',
        compact: true,
      },
      styles: {
        paddingTop: 'medium',
        paddingBottom: 'small',
      },
    },
    {
      id: generateSectionId('portal', 'attendee-profile', 2),
      type: 'attendee-profile',
      order: 2,
      config: {
        heading: 'Your Profile',
        showQrCode: true,
      },
      styles: {
        paddingTop: 'medium',
        paddingBottom: 'medium',
      },
    },
    {
      id: generateSectionId('portal', 'attendee-qrcode', 3),
      type: 'attendee-qrcode',
      order: 3,
      config: {
        heading: 'Your Check-In QR Code',
        description: 'Show this at registration for fast check-in',
      },
      styles: {
        paddingTop: 'small',
        paddingBottom: 'medium',
      },
    },
    {
      id: generateSectionId('portal', 'attendee-interests', 4),
      type: 'attendee-interests',
      order: 4,
      config: {
        heading: 'Your Interests',
        description: 'Tell us what topics interest you for personalized recommendations',
      },
      styles: {
        paddingTop: 'medium',
        paddingBottom: 'medium',
      },
    },
    {
      id: generateSectionId('portal', 'personal-schedule', 5),
      type: 'personal-schedule',
      order: 5,
      config: {
        heading: 'My Schedule',
        description: 'Sessions you have saved to your personal agenda',
        showAddToCalendar: true,
      },
      styles: {
        paddingTop: 'medium',
        paddingBottom: 'medium',
      },
    },
    {
      id: generateSectionId('portal', 'recommendations', 6),
      type: 'recommendations',
      order: 6,
      config: {
        heading: 'Recommended For You',
        description: 'AI-powered session recommendations based on your interests',
        maxItems: 6,
      },
      styles: {
        paddingTop: 'medium',
        paddingBottom: 'medium',
      },
    },
    {
      id: generateSectionId('portal', 'agenda', 7),
      type: 'agenda',
      order: 7,
      config: {
        heading: 'Full Conference Schedule',
        showRoom: true,
        showTrack: true,
        showSpeakers: true,
        groupByDate: true,
        showFilters: true,
        enableSave: true,
      },
      styles: {
        paddingTop: 'medium',
        paddingBottom: 'large',
      },
    },
    {
      id: generateSectionId('portal', 'session-feedback', 8),
      type: 'session-feedback',
      order: 8,
      config: {
        heading: 'Session Feedback',
        description: 'Rate the sessions you attended',
      },
      styles: {
        paddingTop: 'medium',
        paddingBottom: 'medium',
      },
    },
    {
      id: generateSectionId('portal', 'event-feedback', 9),
      type: 'event-feedback',
      order: 9,
      config: {
        heading: 'Event Feedback',
        description: 'Share your overall experience to help us improve',
      },
      styles: {
        paddingTop: 'medium',
        paddingBottom: 'large',
      },
    },
    {
      id: generateSectionId('portal', 'footer', 10),
      type: 'footer',
      order: 10,
      config: {
        showContactInfo: true,
        email: 'support@aigtmsummit.com',
        copyright: '2025 AI GTM Summit',
      },
    },
  ];

  // Live page sections
  const liveSections = [
    {
      id: generateSectionId('live', 'navigation', 0),
      type: 'navigation',
      order: 0,
      config: {
        logoText: 'AI GTM Summit Live',
        sticky: true,
      },
    },
    {
      id: generateSectionId('live', 'hero', 1),
      type: 'hero',
      order: 1,
      config: {
        title: 'Live Engagement',
        subtitle: 'Participate in real-time polls, Q&A, and more',
        alignment: 'center',
        compact: true,
      },
      styles: {
        paddingTop: 'medium',
        paddingBottom: 'small',
      },
    },
    {
      id: generateSectionId('live', 'live-moments', 2),
      type: 'live-moments',
      order: 2,
      config: {
        heading: 'Live Moments',
        description: 'Engage with the current session',
        showResults: true,
      },
      styles: {
        paddingTop: 'medium',
        paddingBottom: 'large',
      },
    },
    {
      id: generateSectionId('live', 'footer', 3),
      type: 'footer',
      order: 3,
      config: {
        copyright: '2025 AI GTM Summit',
      },
    },
  ];

  // Create the pages and their initial versions
  const pageData = [
    { pageType: 'landing', name: 'Landing Page', sections: landingSections },
    { pageType: 'registration', name: 'Registration Page', sections: registrationSections },
    { pageType: 'portal', name: 'Attendee Portal', sections: portalSections },
    { pageType: 'live', name: 'Live Experience', sections: liveSections },
  ];

  for (const pageInfo of pageData) {
    const [createdPage] = await db.insert(eventPages).values({
      organizationId,
      eventId,
      pageType: pageInfo.pageType,
      name: pageInfo.name,
      isPublished: true,
      theme: aiGtmTheme,
      sections: pageInfo.sections,
    }).returning();

    // Create initial page version for version history
    await db.insert(pageVersions).values({
      organizationId,
      eventPageId: createdPage.id,
      version: 1,
      label: 'Initial Version',
      sections: pageInfo.sections,
      theme: aiGtmTheme,
    });
  }

  console.log("Created 4 beautiful event pages with version history (landing, registration, portal, live)");

  console.log("AI GTM Summit demo data seed completed successfully!");

  return {
    eventId,
    message: `Successfully created AI GTM Summit with ${attendeeCount} attendees, ${createdSessions.length} sessions, ${createdSpeakers.length} speakers, 4 activation links, ${feedbackData.length} feedback responses, ${deliverableData.length} deliverables, ${emailMessageData.length} email messages, ${eventLeadData.length} lead scans, ${meetingData.length} meetings with outcomes, ${engagementData.length} engagement signals, and 4 beautiful event pages.`
  };
}
