type SectionType = "hero" | "text" | "cta" | "features" | "countdown" | "speakers" | "agenda" | "faq" | "testimonials" | "gallery" | "html" | "sponsors" | "map" | "video" | "footer";

export interface EventPageTheme {
  headingFont?: string;
  bodyFont?: string;
  baseFontSize?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  textSecondaryColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  cardBackground?: string;
  borderColor?: string;
  borderRadius?: 'none' | 'small' | 'medium' | 'large' | 'pill';
  buttonStyle?: 'filled' | 'outline';
  containerWidth?: 'narrow' | 'standard' | 'wide' | 'full';
  sectionSpacing?: 'compact' | 'normal' | 'relaxed';
  textDecoration?: 'none' | 'underline' | 'uppercase' | 'capitalize';
}

export type TemplateCategory = 'conference' | 'tradeshow' | 'gala' | 'workshop' | 'webinar' | 'fundraiser';

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  theme: EventPageTheme;
  sections: Array<{
    type: SectionType;
    config: Record<string, unknown>;
  }>;
}

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'conference', label: 'Conference' },
  { value: 'tradeshow', label: 'Trade Show' },
  { value: 'gala', label: 'Gala' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'fundraiser', label: 'Fundraiser' },
];

export const eventTemplates: EventTemplate[] = [
  // ========== CONFERENCE TEMPLATES (4) ==========
  {
    id: 'conf-tech',
    name: 'Tech Conference',
    description: 'Modern tech conference with speaker lineup and agenda',
    category: 'conference',
    theme: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      baseFontSize: '16px',
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
      backgroundColor: '#0f172a',
      textColor: '#f8fafc',
      textSecondaryColor: '#94a3b8',
      buttonColor: '#3b82f6',
      buttonTextColor: '#ffffff',
      cardBackground: '#1e293b',
      borderColor: '#334155',
      borderRadius: 'medium',
      buttonStyle: 'filled',
      containerWidth: 'wide',
      sectionSpacing: 'relaxed',
      textDecoration: 'none',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'TechSummit 2025',
          subtitle: 'Where Innovation Meets Implementation',
          buttonText: 'Get Your Pass',
          buttonLink: '#register',
          backgroundImage: '',
        },
      },
      {
        type: 'features',
        config: {
          heading: 'Why Attend?',
          features: [
            { title: 'Expert Speakers', description: 'Learn from industry leaders and innovators' },
            { title: 'Hands-on Workshops', description: 'Build real projects with cutting-edge tech' },
            { title: 'Networking', description: 'Connect with 1000+ developers and founders' },
            { title: 'Career Fair', description: 'Meet top tech companies hiring now' },
          ],
        },
      },
      {
        type: 'speakers',
        config: { heading: 'Featured Speakers', showBio: true, columns: 4 },
      },
      {
        type: 'agenda',
        config: { heading: 'Conference Schedule', showRoom: true, showTrack: true },
      },
      {
        type: 'sponsors',
        config: { heading: 'Our Partners', sponsors: [] },
      },
      {
        type: 'cta',
        config: {
          heading: 'Ready to Join?',
          description: 'Early bird pricing ends soon. Secure your spot today.',
          buttonText: 'Register Now',
          buttonLink: '#register',
        },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'info@techsummit.com',
          showSocialIcons: true,
          copyright: '2025 TechSummit. All rights reserved.',
        },
      },
    ],
  },
  {
    id: 'conf-business',
    name: 'Business Summit',
    description: 'Professional business conference for executives and leaders',
    category: 'conference',
    theme: {
      headingFont: 'Montserrat',
      bodyFont: 'Open Sans',
      baseFontSize: '16px',
      primaryColor: '#1e3a5f',
      secondaryColor: '#2d5a87',
      backgroundColor: '#ffffff',
      textColor: '#1a1a1a',
      textSecondaryColor: '#6b7280',
      buttonColor: '#1e3a5f',
      buttonTextColor: '#ffffff',
      cardBackground: '#f8f9fa',
      borderColor: '#e5e7eb',
      borderRadius: 'small',
      buttonStyle: 'filled',
      containerWidth: 'standard',
      sectionSpacing: 'normal',
      textDecoration: 'uppercase',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'Global Business Summit',
          subtitle: 'Shaping the Future of Enterprise',
          buttonText: 'Reserve Your Seat',
          buttonLink: '#register',
        },
      },
      {
        type: 'text',
        config: {
          heading: 'About the Summit',
          content: 'Join 500+ C-suite executives and business leaders for two days of strategic insights, networking, and actionable takeaways. This year\'s theme focuses on sustainable growth and digital transformation.',
          alignment: 'center',
        },
      },
      {
        type: 'speakers',
        config: { heading: 'Keynote Speakers', showBio: true, columns: 3 },
      },
      {
        type: 'agenda',
        config: { heading: 'Summit Agenda', showRoom: true, showTrack: true },
      },
      {
        type: 'testimonials',
        config: {
          heading: 'What Past Attendees Say',
          items: [
            { name: 'Sarah Chen', role: 'CEO, TechVentures', quote: 'The networking opportunities alone made this worth every penny.' },
            { name: 'Michael Brooks', role: 'CFO, GlobalCorp', quote: 'Invaluable insights that we immediately applied to our strategy.' },
          ],
        },
      },
      {
        type: 'sponsors',
        config: { heading: 'Summit Partners', sponsors: [] },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'summit@business.com',
          showSocialIcons: true,
          linkedinUrl: 'https://linkedin.com',
          copyright: '2025 Global Business Summit',
        },
      },
    ],
  },
  {
    id: 'conf-medical',
    name: 'Medical Conference',
    description: 'Healthcare and medical professional conference',
    category: 'conference',
    theme: {
      headingFont: 'Roboto',
      bodyFont: 'Roboto',
      baseFontSize: '16px',
      primaryColor: '#0d9488',
      secondaryColor: '#14b8a6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      textSecondaryColor: '#6b7280',
      buttonColor: '#0d9488',
      buttonTextColor: '#ffffff',
      cardBackground: '#f0fdfa',
      borderColor: '#99f6e4',
      borderRadius: 'medium',
      buttonStyle: 'filled',
      containerWidth: 'standard',
      sectionSpacing: 'normal',
      textDecoration: 'none',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'International Medical Symposium',
          subtitle: 'Advancing Healthcare Through Innovation',
          buttonText: 'Register for CME Credits',
          buttonLink: '#register',
        },
      },
      {
        type: 'features',
        config: {
          heading: 'Conference Highlights',
          features: [
            { title: 'CME Credits', description: 'Earn up to 20 CME credits' },
            { title: 'Research Presentations', description: '100+ peer-reviewed abstracts' },
            { title: 'Workshops', description: 'Hands-on clinical training' },
            { title: 'Networking', description: 'Connect with specialists worldwide' },
          ],
        },
      },
      {
        type: 'speakers',
        config: { heading: 'Distinguished Faculty', showBio: true, columns: 4 },
      },
      {
        type: 'agenda',
        config: { heading: 'Scientific Program', showRoom: true, showTrack: true },
      },
      {
        type: 'faq',
        config: {
          heading: 'Frequently Asked Questions',
          items: [
            { question: 'How do I claim CME credits?', answer: 'CME credits will be awarded upon completion of session evaluations.' },
            { question: 'Is there a virtual attendance option?', answer: 'Yes, hybrid attendance is available with full access to recorded sessions.' },
          ],
        },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'info@medsymposium.org',
          showSocialIcons: true,
          copyright: '2025 International Medical Symposium',
        },
      },
    ],
  },
  {
    id: 'conf-academic',
    name: 'Academic Conference',
    description: 'Research-focused academic and scholarly conference',
    category: 'conference',
    theme: {
      headingFont: 'Merriweather',
      bodyFont: 'Source Sans Pro',
      baseFontSize: '16px',
      primaryColor: '#7c3aed',
      secondaryColor: '#8b5cf6',
      backgroundColor: '#fafafa',
      textColor: '#1f2937',
      textSecondaryColor: '#6b7280',
      buttonColor: '#7c3aed',
      buttonTextColor: '#ffffff',
      cardBackground: '#ffffff',
      borderColor: '#e5e7eb',
      borderRadius: 'small',
      buttonStyle: 'filled',
      containerWidth: 'standard',
      sectionSpacing: 'normal',
      textDecoration: 'none',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'Annual Research Conference',
          subtitle: 'Bridging Theory and Practice',
          buttonText: 'Submit Your Abstract',
          buttonLink: '#register',
        },
      },
      {
        type: 'text',
        config: {
          heading: 'Call for Papers',
          content: 'We invite researchers, scholars, and practitioners to submit abstracts for oral and poster presentations. This year\'s theme explores interdisciplinary approaches to contemporary challenges.',
          alignment: 'left',
        },
      },
      {
        type: 'countdown',
        config: { heading: 'Abstract Submission Deadline', useEventDate: true },
      },
      {
        type: 'speakers',
        config: { heading: 'Plenary Speakers', showBio: true, columns: 3 },
      },
      {
        type: 'agenda',
        config: { heading: 'Conference Program', showRoom: true, showTrack: true },
      },
      {
        type: 'sponsors',
        config: { heading: 'Supporting Organizations', sponsors: [] },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'conference@university.edu',
          showSocialIcons: true,
          copyright: '2025 Academic Research Conference',
        },
      },
    ],
  },

  // ========== TRADE SHOW TEMPLATES (3) ==========
  {
    id: 'trade-general',
    name: 'Trade Show',
    description: 'General trade show and expo template',
    category: 'tradeshow',
    theme: {
      headingFont: 'Poppins',
      bodyFont: 'Open Sans',
      baseFontSize: '16px',
      primaryColor: '#dc2626',
      secondaryColor: '#ef4444',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      textSecondaryColor: '#6b7280',
      buttonColor: '#dc2626',
      buttonTextColor: '#ffffff',
      cardBackground: '#fef2f2',
      borderColor: '#fecaca',
      borderRadius: 'medium',
      buttonStyle: 'filled',
      containerWidth: 'wide',
      sectionSpacing: 'normal',
      textDecoration: 'none',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'Industry Expo 2025',
          subtitle: 'Discover. Connect. Innovate.',
          buttonText: 'Get Exhibitor Info',
          buttonLink: '#register',
        },
      },
      {
        type: 'features',
        config: {
          heading: 'Expo Highlights',
          features: [
            { title: '200+ Exhibitors', description: 'Leading brands and emerging innovators' },
            { title: 'Live Demos', description: 'See products in action' },
            { title: 'B2B Matchmaking', description: 'Pre-scheduled meetings with potential partners' },
            { title: 'Industry Awards', description: 'Celebrating excellence and innovation' },
          ],
        },
      },
      {
        type: 'map',
        config: { heading: 'Venue Location', useEventAddress: true },
      },
      {
        type: 'agenda',
        config: { heading: 'Event Schedule', showRoom: true, showTrack: false },
      },
      {
        type: 'sponsors',
        config: { heading: 'Featured Exhibitors', sponsors: [] },
      },
      {
        type: 'cta',
        config: {
          heading: 'Book Your Booth',
          description: 'Prime locations are filling fast. Reserve your exhibitor space today.',
          buttonText: 'Become an Exhibitor',
          buttonLink: '#exhibitor',
        },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'expo@tradeshow.com',
          phone: '+1 (555) 123-4567',
          showSocialIcons: true,
          copyright: '2025 Industry Expo',
        },
      },
    ],
  },
  {
    id: 'trade-industry',
    name: 'Industry Trade Show',
    description: 'B2B industry-specific trade exhibition',
    category: 'tradeshow',
    theme: {
      headingFont: 'Oswald',
      bodyFont: 'Lato',
      baseFontSize: '16px',
      primaryColor: '#0369a1',
      secondaryColor: '#0284c7',
      backgroundColor: '#f0f9ff',
      textColor: '#0c4a6e',
      textSecondaryColor: '#64748b',
      buttonColor: '#0369a1',
      buttonTextColor: '#ffffff',
      cardBackground: '#ffffff',
      borderColor: '#bae6fd',
      borderRadius: 'small',
      buttonStyle: 'filled',
      containerWidth: 'wide',
      sectionSpacing: 'normal',
      textDecoration: 'uppercase',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'Manufacturing & Technology Expo',
          subtitle: 'The Premier B2B Industrial Event',
          buttonText: 'Register as Buyer',
          buttonLink: '#register',
        },
      },
      {
        type: 'text',
        config: {
          heading: 'About the Expo',
          content: 'Connect with leading manufacturers, suppliers, and technology providers. Source new products, discover innovations, and build partnerships that drive your business forward.',
          alignment: 'center',
        },
      },
      {
        type: 'features',
        config: {
          heading: 'What to Expect',
          features: [
            { title: 'Product Showcases', description: 'Explore cutting-edge industrial solutions' },
            { title: 'Technical Sessions', description: 'Learn from industry experts' },
            { title: 'Sourcing Hub', description: 'Find verified suppliers' },
          ],
        },
      },
      {
        type: 'sponsors',
        config: { heading: 'Key Exhibitors', sponsors: [] },
      },
      {
        type: 'map',
        config: { heading: 'Exhibition Venue', useEventAddress: true },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'info@industryexpo.com',
          showSocialIcons: true,
          linkedinUrl: 'https://linkedin.com',
          copyright: '2025 Industry Expo',
        },
      },
    ],
  },
  {
    id: 'trade-consumer',
    name: 'Consumer Expo',
    description: 'Public-facing consumer trade show',
    category: 'tradeshow',
    theme: {
      headingFont: 'Poppins',
      bodyFont: 'Nunito',
      baseFontSize: '16px',
      primaryColor: '#f97316',
      secondaryColor: '#fb923c',
      backgroundColor: '#fffbeb',
      textColor: '#1f2937',
      textSecondaryColor: '#6b7280',
      buttonColor: '#f97316',
      buttonTextColor: '#ffffff',
      cardBackground: '#ffffff',
      borderColor: '#fed7aa',
      borderRadius: 'large',
      buttonStyle: 'filled',
      containerWidth: 'wide',
      sectionSpacing: 'relaxed',
      textDecoration: 'none',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'Home & Living Expo',
          subtitle: 'Inspiration for Every Room',
          buttonText: 'Get Tickets',
          buttonLink: '#tickets',
        },
      },
      {
        type: 'features',
        config: {
          heading: 'What Awaits You',
          features: [
            { title: 'Expert Talks', description: 'Tips from interior designers and DIY pros' },
            { title: 'Exclusive Deals', description: 'Show-only discounts and offers' },
            { title: 'Live Demonstrations', description: 'See products in action' },
            { title: 'Free Samples', description: 'Try before you buy' },
          ],
        },
      },
      {
        type: 'gallery',
        config: { heading: 'Previous Expo Highlights', images: [], columns: 4 },
      },
      {
        type: 'sponsors',
        config: { heading: 'Participating Brands', sponsors: [] },
      },
      {
        type: 'map',
        config: { heading: 'Find Us Here', useEventAddress: true },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'hello@homeexpo.com',
          showSocialIcons: true,
          instagramUrl: 'https://instagram.com',
          facebookUrl: 'https://facebook.com',
          copyright: '2025 Home & Living Expo',
        },
      },
    ],
  },

  // ========== GALA TEMPLATES (3) ==========
  {
    id: 'gala-charity',
    name: 'Charity Gala',
    description: 'Elegant fundraising gala event',
    category: 'gala',
    theme: {
      headingFont: 'Playfair Display',
      bodyFont: 'Lato',
      baseFontSize: '16px',
      primaryColor: '#b91c1c',
      secondaryColor: '#dc2626',
      backgroundColor: '#1a1a1a',
      textColor: '#ffffff',
      textSecondaryColor: '#d4d4d4',
      buttonColor: '#b91c1c',
      buttonTextColor: '#ffffff',
      cardBackground: '#262626',
      borderColor: '#404040',
      borderRadius: 'small',
      buttonStyle: 'filled',
      containerWidth: 'standard',
      sectionSpacing: 'relaxed',
      textDecoration: 'capitalize',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'Hearts of Gold Gala',
          subtitle: 'An Evening of Elegance and Giving',
          buttonText: 'Purchase Tickets',
          buttonLink: '#tickets',
        },
      },
      {
        type: 'text',
        config: {
          heading: 'About the Evening',
          content: 'Join us for an unforgettable evening of fine dining, live entertainment, and philanthropy. All proceeds support children\'s education programs in underserved communities.',
          alignment: 'center',
        },
      },
      {
        type: 'countdown',
        config: { heading: 'The Gala Begins In', useEventDate: true },
      },
      {
        type: 'features',
        config: {
          heading: 'The Evening Includes',
          features: [
            { title: 'Champagne Reception', description: 'Welcome cocktails and hors d\'oeuvres' },
            { title: 'Gourmet Dinner', description: 'Five-course meal by award-winning chef' },
            { title: 'Live Auction', description: 'Exclusive items and experiences' },
            { title: 'Live Entertainment', description: 'Music and dancing' },
          ],
        },
      },
      {
        type: 'gallery',
        config: { heading: 'Past Gala Moments', images: [], columns: 3 },
      },
      {
        type: 'sponsors',
        config: { heading: 'Our Generous Sponsors', sponsors: [] },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'gala@foundation.org',
          showSocialIcons: true,
          copyright: '2025 Hearts of Gold Foundation',
        },
      },
    ],
  },
  {
    id: 'gala-awards',
    name: 'Corporate Awards',
    description: 'Corporate awards ceremony and gala',
    category: 'gala',
    theme: {
      headingFont: 'Playfair Display',
      bodyFont: 'Open Sans',
      baseFontSize: '16px',
      primaryColor: '#eab308',
      secondaryColor: '#fbbf24',
      backgroundColor: '#0f172a',
      textColor: '#f8fafc',
      textSecondaryColor: '#94a3b8',
      buttonColor: '#eab308',
      buttonTextColor: '#0f172a',
      cardBackground: '#1e293b',
      borderColor: '#334155',
      borderRadius: 'small',
      buttonStyle: 'filled',
      containerWidth: 'standard',
      sectionSpacing: 'relaxed',
      textDecoration: 'uppercase',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'Excellence Awards 2025',
          subtitle: 'Celebrating Outstanding Achievement',
          buttonText: 'Submit Nomination',
          buttonLink: '#nominate',
        },
      },
      {
        type: 'text',
        config: {
          heading: 'Honoring Excellence',
          content: 'The Excellence Awards recognize individuals and organizations that have demonstrated exceptional leadership, innovation, and impact in their respective fields.',
          alignment: 'center',
        },
      },
      {
        type: 'features',
        config: {
          heading: 'Award Categories',
          features: [
            { title: 'Innovation Award', description: 'Breakthrough products or services' },
            { title: 'Leadership Award', description: 'Exceptional executive leadership' },
            { title: 'Rising Star Award', description: 'Outstanding emerging talent' },
            { title: 'Community Impact Award', description: 'Social responsibility excellence' },
          ],
        },
      },
      {
        type: 'countdown',
        config: { heading: 'Nomination Deadline', useEventDate: true },
      },
      {
        type: 'sponsors',
        config: { heading: 'Award Partners', sponsors: [] },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'awards@business.com',
          showSocialIcons: true,
          linkedinUrl: 'https://linkedin.com',
          copyright: '2025 Excellence Awards',
        },
      },
    ],
  },
  {
    id: 'gala-blacktie',
    name: 'Black Tie Gala',
    description: 'Formal black tie evening event',
    category: 'gala',
    theme: {
      headingFont: 'Playfair Display',
      bodyFont: 'Raleway',
      baseFontSize: '16px',
      primaryColor: '#c9a227',
      secondaryColor: '#d4af37',
      backgroundColor: '#000000',
      textColor: '#ffffff',
      textSecondaryColor: '#a3a3a3',
      buttonColor: '#c9a227',
      buttonTextColor: '#000000',
      cardBackground: '#171717',
      borderColor: '#262626',
      borderRadius: 'none',
      buttonStyle: 'outline',
      containerWidth: 'narrow',
      sectionSpacing: 'relaxed',
      textDecoration: 'capitalize',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'The Grand Ball',
          subtitle: 'An Evening of Timeless Elegance',
          buttonText: 'Request Invitation',
          buttonLink: '#invitation',
        },
      },
      {
        type: 'text',
        config: {
          heading: 'A Night to Remember',
          content: 'We cordially invite you to an exclusive evening of sophistication and splendor. Black tie attire required.',
          alignment: 'center',
        },
      },
      {
        type: 'countdown',
        config: { heading: 'The Evening Awaits', useEventDate: true },
      },
      {
        type: 'features',
        config: {
          heading: 'The Program',
          features: [
            { title: 'Cocktail Hour', description: '7:00 PM - Champagne and canapés' },
            { title: 'Dinner Service', description: '8:00 PM - Black tie dinner' },
            { title: 'Live Orchestra', description: '9:30 PM - Dancing under the stars' },
          ],
        },
      },
      {
        type: 'map',
        config: { heading: 'The Venue', useEventAddress: true },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'rsvp@grandball.com',
          showSocialIcons: false,
          copyright: '2025 The Grand Ball',
        },
      },
    ],
  },

  // ========== WORKSHOP TEMPLATES (3) ==========
  {
    id: 'workshop-training',
    name: 'Professional Training',
    description: 'Corporate training and skills workshop',
    category: 'workshop',
    theme: {
      headingFont: 'Montserrat',
      bodyFont: 'Open Sans',
      baseFontSize: '16px',
      primaryColor: '#059669',
      secondaryColor: '#10b981',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      textSecondaryColor: '#6b7280',
      buttonColor: '#059669',
      buttonTextColor: '#ffffff',
      cardBackground: '#ecfdf5',
      borderColor: '#a7f3d0',
      borderRadius: 'medium',
      buttonStyle: 'filled',
      containerWidth: 'standard',
      sectionSpacing: 'normal',
      textDecoration: 'none',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'Leadership Excellence Workshop',
          subtitle: 'Transform Your Management Skills',
          buttonText: 'Enroll Now',
          buttonLink: '#register',
        },
      },
      {
        type: 'features',
        config: {
          heading: 'What You\'ll Learn',
          features: [
            { title: 'Strategic Thinking', description: 'Develop long-term vision and planning skills' },
            { title: 'Team Leadership', description: 'Build and motivate high-performing teams' },
            { title: 'Communication', description: 'Master executive communication techniques' },
            { title: 'Decision Making', description: 'Make confident, data-driven decisions' },
          ],
        },
      },
      {
        type: 'speakers',
        config: { heading: 'Your Facilitators', showBio: true, columns: 2 },
      },
      {
        type: 'agenda',
        config: { heading: 'Workshop Schedule', showRoom: false, showTrack: false },
      },
      {
        type: 'testimonials',
        config: {
          heading: 'Success Stories',
          items: [
            { name: 'David Miller', role: 'VP Operations', quote: 'This workshop completely transformed how I lead my team.' },
          ],
        },
      },
      {
        type: 'cta',
        config: {
          heading: 'Limited Seats Available',
          description: 'Small group size ensures personalized attention.',
          buttonText: 'Reserve Your Spot',
          buttonLink: '#register',
        },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'training@company.com',
          showSocialIcons: true,
          copyright: '2025 Professional Development Institute',
        },
      },
    ],
  },
  {
    id: 'workshop-creative',
    name: 'Creative Workshop',
    description: 'Art, design, or creative skills workshop',
    category: 'workshop',
    theme: {
      headingFont: 'Poppins',
      bodyFont: 'Nunito',
      baseFontSize: '16px',
      primaryColor: '#ec4899',
      secondaryColor: '#f472b6',
      backgroundColor: '#fdf2f8',
      textColor: '#1f2937',
      textSecondaryColor: '#6b7280',
      buttonColor: '#ec4899',
      buttonTextColor: '#ffffff',
      cardBackground: '#ffffff',
      borderColor: '#fbcfe8',
      borderRadius: 'large',
      buttonStyle: 'filled',
      containerWidth: 'standard',
      sectionSpacing: 'relaxed',
      textDecoration: 'none',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'Watercolor Painting Workshop',
          subtitle: 'Discover Your Inner Artist',
          buttonText: 'Join the Class',
          buttonLink: '#register',
        },
      },
      {
        type: 'text',
        config: {
          heading: 'About This Workshop',
          content: 'Whether you\'re a complete beginner or looking to refine your technique, this hands-on workshop will guide you through the fundamentals of watercolor painting in a relaxed, supportive environment.',
          alignment: 'center',
        },
      },
      {
        type: 'features',
        config: {
          heading: 'What\'s Included',
          features: [
            { title: 'All Materials', description: 'Premium watercolor supplies provided' },
            { title: 'Take-Home Kit', description: 'Continue practicing at home' },
            { title: 'Light Refreshments', description: 'Coffee, tea, and snacks' },
            { title: 'Your Artwork', description: 'Leave with your finished piece' },
          ],
        },
      },
      {
        type: 'speakers',
        config: { heading: 'Meet Your Instructor', showBio: true, columns: 1 },
      },
      {
        type: 'gallery',
        config: { heading: 'Student Creations', images: [], columns: 4 },
      },
      {
        type: 'faq',
        config: {
          heading: 'Common Questions',
          items: [
            { question: 'Do I need any experience?', answer: 'No! This workshop is perfect for beginners.' },
            { question: 'What should I wear?', answer: 'Comfortable clothes you don\'t mind getting a little paint on.' },
          ],
        },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'hello@creativestudio.com',
          showSocialIcons: true,
          instagramUrl: 'https://instagram.com',
          copyright: '2025 Creative Studio',
        },
      },
    ],
  },
  {
    id: 'workshop-corporate',
    name: 'Corporate Team Building',
    description: 'Team building and corporate workshop',
    category: 'workshop',
    theme: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      baseFontSize: '16px',
      primaryColor: '#6366f1',
      secondaryColor: '#818cf8',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      textSecondaryColor: '#6b7280',
      buttonColor: '#6366f1',
      buttonTextColor: '#ffffff',
      cardBackground: '#eef2ff',
      borderColor: '#c7d2fe',
      borderRadius: 'medium',
      buttonStyle: 'filled',
      containerWidth: 'standard',
      sectionSpacing: 'normal',
      textDecoration: 'none',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'Team Synergy Workshop',
          subtitle: 'Build Stronger Teams, Achieve Greater Results',
          buttonText: 'Book for Your Team',
          buttonLink: '#book',
        },
      },
      {
        type: 'features',
        config: {
          heading: 'Workshop Benefits',
          features: [
            { title: 'Improved Communication', description: 'Break down silos and enhance collaboration' },
            { title: 'Trust Building', description: 'Strengthen relationships through shared experiences' },
            { title: 'Problem Solving', description: 'Develop collective problem-solving skills' },
            { title: 'Increased Morale', description: 'Boost team spirit and engagement' },
          ],
        },
      },
      {
        type: 'text',
        config: {
          heading: 'Customized for Your Team',
          content: 'Every team is unique. We tailor our workshops to address your specific challenges, goals, and team dynamics. Activities range from collaborative challenges to strategic planning exercises.',
          alignment: 'left',
        },
      },
      {
        type: 'testimonials',
        config: {
          heading: 'Client Feedback',
          items: [
            { name: 'HR Director', role: 'Fortune 500 Company', quote: 'Our team came back energized and more connected than ever.' },
          ],
        },
      },
      {
        type: 'cta',
        config: {
          heading: 'Ready to Transform Your Team?',
          description: 'Contact us to discuss your team\'s needs.',
          buttonText: 'Get a Custom Quote',
          buttonLink: '#contact',
        },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'teams@workshop.com',
          phone: '+1 (555) 987-6543',
          showSocialIcons: true,
          copyright: '2025 Team Synergy',
        },
      },
    ],
  },

  // ========== WEBINAR TEMPLATES (3) ==========
  {
    id: 'webinar-product',
    name: 'Product Launch Webinar',
    description: 'Product announcement and demo webinar',
    category: 'webinar',
    theme: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      baseFontSize: '16px',
      primaryColor: '#0ea5e9',
      secondaryColor: '#38bdf8',
      backgroundColor: '#0f172a',
      textColor: '#f8fafc',
      textSecondaryColor: '#94a3b8',
      buttonColor: '#0ea5e9',
      buttonTextColor: '#ffffff',
      cardBackground: '#1e293b',
      borderColor: '#334155',
      borderRadius: 'medium',
      buttonStyle: 'filled',
      containerWidth: 'standard',
      sectionSpacing: 'normal',
      textDecoration: 'none',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'Introducing ProductX 2.0',
          subtitle: 'The Future of [Industry] is Here',
          buttonText: 'Register Free',
          buttonLink: '#register',
        },
      },
      {
        type: 'countdown',
        config: { heading: 'Going Live In', useEventDate: true },
      },
      {
        type: 'features',
        config: {
          heading: 'What You\'ll See',
          features: [
            { title: 'Live Demo', description: 'See ProductX 2.0 in action' },
            { title: 'New Features', description: 'Explore all the new capabilities' },
            { title: 'Q&A Session', description: 'Get your questions answered live' },
            { title: 'Early Access', description: 'Exclusive offer for attendees' },
          ],
        },
      },
      {
        type: 'speakers',
        config: { heading: 'Your Hosts', showBio: true, columns: 2 },
      },
      {
        type: 'cta',
        config: {
          heading: 'Don\'t Miss the Launch',
          description: 'Join thousands of users discovering the next generation.',
          buttonText: 'Save Your Spot',
          buttonLink: '#register',
        },
      },
      {
        type: 'faq',
        config: {
          heading: 'Questions?',
          items: [
            { question: 'Is this webinar free?', answer: 'Yes, registration is completely free.' },
            { question: 'Will there be a recording?', answer: 'Yes, all registered attendees will receive the recording.' },
          ],
        },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'webinar@productx.com',
          showSocialIcons: true,
          twitterUrl: 'https://twitter.com',
          copyright: '2025 ProductX Inc.',
        },
      },
    ],
  },
  {
    id: 'webinar-educational',
    name: 'Educational Webinar',
    description: 'Educational and training webinar',
    category: 'webinar',
    theme: {
      headingFont: 'Roboto',
      bodyFont: 'Roboto',
      baseFontSize: '16px',
      primaryColor: '#16a34a',
      secondaryColor: '#22c55e',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      textSecondaryColor: '#6b7280',
      buttonColor: '#16a34a',
      buttonTextColor: '#ffffff',
      cardBackground: '#f0fdf4',
      borderColor: '#bbf7d0',
      borderRadius: 'medium',
      buttonStyle: 'filled',
      containerWidth: 'standard',
      sectionSpacing: 'normal',
      textDecoration: 'none',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'Master Digital Marketing in 2025',
          subtitle: 'Free Expert-Led Training Session',
          buttonText: 'Claim Your Seat',
          buttonLink: '#register',
        },
      },
      {
        type: 'features',
        config: {
          heading: 'What You\'ll Learn',
          features: [
            { title: 'Strategy Fundamentals', description: 'Build a solid marketing foundation' },
            { title: 'Latest Trends', description: 'Stay ahead of the curve' },
            { title: 'Practical Tips', description: 'Actionable tactics you can use today' },
            { title: 'Resources', description: 'Templates and tools to get started' },
          ],
        },
      },
      {
        type: 'speakers',
        config: { heading: 'Your Instructor', showBio: true, columns: 1 },
      },
      {
        type: 'countdown',
        config: { heading: 'Webinar Starts In', useEventDate: true },
      },
      {
        type: 'testimonials',
        config: {
          heading: 'What Past Attendees Say',
          items: [
            { name: 'Marketing Manager', role: '', quote: 'Incredibly valuable session. I implemented three tips immediately!' },
          ],
        },
      },
      {
        type: 'cta',
        config: {
          heading: 'Ready to Level Up?',
          description: 'Limited spots available. Register now to secure your place.',
          buttonText: 'Register Free',
          buttonLink: '#register',
        },
      },
      {
        type: 'faq',
        config: {
          heading: 'FAQ',
          items: [
            { question: 'Who is this for?', answer: 'Marketing professionals at any level looking to enhance their skills.' },
            { question: 'How long is the session?', answer: 'The webinar runs approximately 60 minutes plus Q&A.' },
          ],
        },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'learn@academy.com',
          showSocialIcons: true,
          copyright: '2025 Marketing Academy',
        },
      },
    ],
  },
  {
    id: 'webinar-panel',
    name: 'Panel Discussion',
    description: 'Expert panel discussion webinar',
    category: 'webinar',
    theme: {
      headingFont: 'Poppins',
      bodyFont: 'Open Sans',
      baseFontSize: '16px',
      primaryColor: '#8b5cf6',
      secondaryColor: '#a78bfa',
      backgroundColor: '#faf5ff',
      textColor: '#1f2937',
      textSecondaryColor: '#6b7280',
      buttonColor: '#8b5cf6',
      buttonTextColor: '#ffffff',
      cardBackground: '#ffffff',
      borderColor: '#ddd6fe',
      borderRadius: 'medium',
      buttonStyle: 'filled',
      containerWidth: 'standard',
      sectionSpacing: 'normal',
      textDecoration: 'none',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'The Future of Work',
          subtitle: 'Expert Panel Discussion',
          buttonText: 'Join the Conversation',
          buttonLink: '#register',
        },
      },
      {
        type: 'text',
        config: {
          heading: 'About This Panel',
          content: 'Join industry leaders as they discuss the evolving workplace, remote work trends, AI integration, and what the future holds for professionals across industries.',
          alignment: 'center',
        },
      },
      {
        type: 'speakers',
        config: { heading: 'Meet the Panelists', showBio: true, columns: 4 },
      },
      {
        type: 'features',
        config: {
          heading: 'Topics We\'ll Cover',
          features: [
            { title: 'Remote Work Evolution', description: 'The hybrid workplace model' },
            { title: 'AI in the Workplace', description: 'Opportunities and challenges' },
            { title: 'Skills of Tomorrow', description: 'What employers are looking for' },
            { title: 'Work-Life Balance', description: 'Navigating the new normal' },
          ],
        },
      },
      {
        type: 'countdown',
        config: { heading: 'Panel Begins In', useEventDate: true },
      },
      {
        type: 'cta',
        config: {
          heading: 'Have Questions for Our Panelists?',
          description: 'Submit your questions when you register.',
          buttonText: 'Register & Submit Questions',
          buttonLink: '#register',
        },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'events@futureofwork.com',
          showSocialIcons: true,
          linkedinUrl: 'https://linkedin.com',
          twitterUrl: 'https://twitter.com',
          copyright: '2025 Future of Work Series',
        },
      },
    ],
  },

  // ========== FUNDRAISER TEMPLATES (4) ==========
  {
    id: 'fund-charity',
    name: 'Charity Fundraiser',
    description: 'Non-profit charity fundraising event',
    category: 'fundraiser',
    theme: {
      headingFont: 'Montserrat',
      bodyFont: 'Open Sans',
      baseFontSize: '16px',
      primaryColor: '#e11d48',
      secondaryColor: '#f43f5e',
      backgroundColor: '#fff1f2',
      textColor: '#1f2937',
      textSecondaryColor: '#6b7280',
      buttonColor: '#e11d48',
      buttonTextColor: '#ffffff',
      cardBackground: '#ffffff',
      borderColor: '#fecdd3',
      borderRadius: 'large',
      buttonStyle: 'filled',
      containerWidth: 'standard',
      sectionSpacing: 'relaxed',
      textDecoration: 'none',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'Hope for Tomorrow',
          subtitle: 'Together, We Can Make a Difference',
          buttonText: 'Donate Now',
          buttonLink: '#donate',
        },
      },
      {
        type: 'text',
        config: {
          heading: 'Our Mission',
          content: 'For over 20 years, we\'ve been dedicated to providing education, healthcare, and hope to communities in need. Your generosity helps us continue this vital work.',
          alignment: 'center',
        },
      },
      {
        type: 'features',
        config: {
          heading: 'Your Impact',
          features: [
            { title: '$25', description: 'Provides school supplies for one child' },
            { title: '$50', description: 'Feeds a family for one month' },
            { title: '$100', description: 'Funds medical care for one patient' },
            { title: '$500', description: 'Builds a community water well' },
          ],
        },
      },
      {
        type: 'gallery',
        config: { heading: 'Lives You\'ve Changed', images: [], columns: 3 },
      },
      {
        type: 'testimonials',
        config: {
          heading: 'Stories of Hope',
          items: [
            { name: 'Maria', role: 'Scholarship Recipient', quote: 'Thanks to your support, I was able to finish my education and become a teacher.' },
          ],
        },
      },
      {
        type: 'cta',
        config: {
          heading: 'Every Gift Matters',
          description: 'No donation is too small. Every dollar brings us closer to a brighter future.',
          buttonText: 'Make Your Gift',
          buttonLink: '#donate',
        },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'give@hopefortomorrow.org',
          showSocialIcons: true,
          facebookUrl: 'https://facebook.com',
          instagramUrl: 'https://instagram.com',
          copyright: '2025 Hope for Tomorrow Foundation. 501(c)(3) Non-Profit.',
        },
      },
    ],
  },
  {
    id: 'fund-sports',
    name: 'Sports Fundraiser',
    description: 'Athletic team or sports event fundraiser',
    category: 'fundraiser',
    theme: {
      headingFont: 'Oswald',
      bodyFont: 'Lato',
      baseFontSize: '16px',
      primaryColor: '#2563eb',
      secondaryColor: '#3b82f6',
      backgroundColor: '#1e3a8a',
      textColor: '#ffffff',
      textSecondaryColor: '#bfdbfe',
      buttonColor: '#fbbf24',
      buttonTextColor: '#1e3a8a',
      cardBackground: '#1e40af',
      borderColor: '#3b82f6',
      borderRadius: 'medium',
      buttonStyle: 'filled',
      containerWidth: 'wide',
      sectionSpacing: 'normal',
      textDecoration: 'uppercase',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'Support the Eagles',
          subtitle: 'Help Our Team Reach the Championship',
          buttonText: 'Support the Team',
          buttonLink: '#donate',
        },
      },
      {
        type: 'text',
        config: {
          heading: 'Our Goal',
          content: 'We\'re raising funds to cover travel expenses, equipment upgrades, and training programs so our athletes can compete at the highest level. Your support makes champions!',
          alignment: 'center',
        },
      },
      {
        type: 'features',
        config: {
          heading: 'How Your Donation Helps',
          features: [
            { title: 'Equipment', description: 'New gear and training equipment' },
            { title: 'Travel', description: 'Transportation to away games' },
            { title: 'Training', description: 'Professional coaching programs' },
            { title: 'Scholarships', description: 'Support for student athletes' },
          ],
        },
      },
      {
        type: 'countdown',
        config: { heading: 'Fundraiser Ends In', useEventDate: true },
      },
      {
        type: 'sponsors',
        config: { heading: 'Our Team Sponsors', sponsors: [] },
      },
      {
        type: 'cta',
        config: {
          heading: 'Be Part of the Winning Team',
          description: 'Join our community of supporters and help us achieve greatness.',
          buttonText: 'Donate Today',
          buttonLink: '#donate',
        },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'team@eagles.org',
          showSocialIcons: true,
          twitterUrl: 'https://twitter.com',
          instagramUrl: 'https://instagram.com',
          copyright: '2025 Eagles Athletic Association',
        },
      },
    ],
  },
  {
    id: 'fund-community',
    name: 'Community Fundraiser',
    description: 'Local community fundraising event',
    category: 'fundraiser',
    theme: {
      headingFont: 'Poppins',
      bodyFont: 'Nunito',
      baseFontSize: '16px',
      primaryColor: '#059669',
      secondaryColor: '#10b981',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      textSecondaryColor: '#6b7280',
      buttonColor: '#059669',
      buttonTextColor: '#ffffff',
      cardBackground: '#ecfdf5',
      borderColor: '#a7f3d0',
      borderRadius: 'large',
      buttonStyle: 'filled',
      containerWidth: 'standard',
      sectionSpacing: 'relaxed',
      textDecoration: 'none',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'Rebuild Our Community Center',
          subtitle: 'A Place for Everyone to Gather',
          buttonText: 'Contribute Now',
          buttonLink: '#donate',
        },
      },
      {
        type: 'text',
        config: {
          heading: 'Why This Matters',
          content: 'Our community center has served generations of families. After years of wear, it needs critical repairs and renovations. Help us preserve this vital gathering place for future generations.',
          alignment: 'center',
        },
      },
      {
        type: 'features',
        config: {
          heading: 'Planned Improvements',
          features: [
            { title: 'New Roof', description: 'Weather protection for the building' },
            { title: 'Accessible Entrance', description: 'ADA-compliant ramp and doors' },
            { title: 'Updated Kitchen', description: 'Modern appliances for community meals' },
            { title: 'HVAC System', description: 'Year-round comfort for all' },
          ],
        },
      },
      {
        type: 'gallery',
        config: { heading: 'Our Community in Action', images: [], columns: 3 },
      },
      {
        type: 'countdown',
        config: { heading: 'Campaign Ends In', useEventDate: true },
      },
      {
        type: 'cta',
        config: {
          heading: 'Every Dollar Counts',
          description: 'Whether $10 or $1,000, your contribution makes a real difference.',
          buttonText: 'Give Today',
          buttonLink: '#donate',
        },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'info@ourcommunity.org',
          address: '123 Main Street, Hometown, USA',
          showSocialIcons: true,
          facebookUrl: 'https://facebook.com',
          copyright: '2025 Community Rebuilding Fund',
        },
      },
    ],
  },
  {
    id: 'fund-political',
    name: 'Political Campaign',
    description: 'Political campaign fundraising',
    category: 'fundraiser',
    theme: {
      headingFont: 'Montserrat',
      bodyFont: 'Open Sans',
      baseFontSize: '16px',
      primaryColor: '#dc2626',
      secondaryColor: '#1d4ed8',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      textSecondaryColor: '#6b7280',
      buttonColor: '#dc2626',
      buttonTextColor: '#ffffff',
      cardBackground: '#fef2f2',
      borderColor: '#fecaca',
      borderRadius: 'small',
      buttonStyle: 'filled',
      containerWidth: 'standard',
      sectionSpacing: 'normal',
      textDecoration: 'uppercase',
    },
    sections: [
      {
        type: 'hero',
        config: {
          title: 'Vote for Change',
          subtitle: 'A Leader Who Listens, Acts, and Delivers',
          buttonText: 'Contribute to the Campaign',
          buttonLink: '#donate',
        },
      },
      {
        type: 'text',
        config: {
          heading: 'Our Vision',
          content: 'We believe in a future where every voice matters, every family thrives, and every community has the resources it needs to succeed. Join our movement for real change.',
          alignment: 'center',
        },
      },
      {
        type: 'features',
        config: {
          heading: 'Key Priorities',
          features: [
            { title: 'Education', description: 'Invest in our schools and teachers' },
            { title: 'Healthcare', description: 'Affordable care for all families' },
            { title: 'Economy', description: 'Good jobs and fair wages' },
            { title: 'Environment', description: 'Clean energy and sustainability' },
          ],
        },
      },
      {
        type: 'video',
        config: { heading: 'Our Message', videoUrl: '', autoplay: false },
      },
      {
        type: 'countdown',
        config: { heading: 'Days Until Election', useEventDate: true },
      },
      {
        type: 'cta',
        config: {
          heading: 'Stand With Us',
          description: 'Your contribution powers our grassroots campaign.',
          buttonText: 'Donate $25',
          buttonLink: '#donate',
        },
      },
      {
        type: 'footer',
        config: {
          showContactInfo: true,
          email: 'campaign@vote.com',
          showSocialIcons: true,
          twitterUrl: 'https://twitter.com',
          facebookUrl: 'https://facebook.com',
          copyright: 'Paid for by Citizens for Change. Not authorized by any candidate or candidate\'s committee.',
        },
      },
    ],
  },
];

export function getTemplateById(id: string): EventTemplate | undefined {
  return eventTemplates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: TemplateCategory): EventTemplate[] {
  return eventTemplates.filter(t => t.category === category);
}
