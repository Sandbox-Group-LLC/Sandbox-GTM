import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Card>
          <CardContent className="prose dark:prose-invert max-w-none p-8">
            <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-muted-foreground mb-8">Last updated: March 10, 2026</p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
              <p>
                Welcome to Sandbox GTM ("Platform", "we", "us", or "our"), operated by Sandbox Group LLC. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Platform at sandbox-gtm.com.
              </p>
              <p className="mt-4">
                By using the Platform, you agree to the collection and use of information in accordance with this policy. If you do not agree with the terms of this Privacy Policy, please do not access the Platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>

              <h3 className="text-lg font-medium mb-2">Personal Information</h3>
              <p>We collect personal information that you voluntarily provide to us when you:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Register for an account or redeem an activation key</li>
                <li>Create or manage events</li>
                <li>Register as an attendee for events</li>
                <li>Contact us for support</li>
                <li>Subscribe to marketing communications</li>
                <li>Submit inquiries through our lead capture or demo request forms</li>
              </ul>
              <p>This information may include:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Name and contact information (email address, phone number)</li>
                <li>Organization name and details</li>
                <li>Event registration information</li>
                <li>Payment and billing information</li>
                <li>Speaker and session information</li>
                <li>Profile photos and biographical information</li>
                <li>Business inquiries and messages submitted through lead forms</li>
              </ul>

              <h3 className="text-lg font-medium mb-2">Automatically Collected Information</h3>
              <p>When you access the Platform, we automatically collect certain information, including:</p>
              <ul className="list-disc pl-6">
                <li>IP address and browser type</li>
                <li>Device information and operating system</li>
                <li>Pages visited and features used</li>
                <li>Date and time of access</li>
                <li>Referring website addresses</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibent mb-4">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6">
                <li>Provide, maintain, and improve the Platform</li>
                <li>Process event registrations and manage attendee data</li>
                <li>Send transactional emails (confirmations, reminders, updates) via Resend</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Process payments and prevent fraud via Stripe</li>
                <li>Analyze usage patterns to improve user experience</li>
                <li>Send marketing communications (with your consent)</li>
                <li>Qualify and follow up on sales leads via HubSpot CRM</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Third-Party Service Providers</h2>
              <p>We share data with trusted third-party service providers who perform services on our behalf. These include:</p>

              <h3 className="text-lg font-medium mb-2 mt-4">Infrastructure and Authentication</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Render</strong> — Cloud hosting and deployment infrastructure (render.com)</li>
                <li><strong>Neon</strong> — Serverless PostgreSQL database hosting (neon.tech)</li>
                <li><strong>Clerk</strong> — User authentication and identity management (clerk.com). Clerk processes your sign-in credentials, session tokens, and account data in accordance with their own privacy policy.</li>
              </ul>

              <h3 className="text-lg font-medium mb-2">Payments</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Stripe</strong> — Payment processing. Payment card data is handled directly by Stripe and is never stored on our servers.</li>
              </ul>

              <h3 className="text-lg font-medium mb-2">Email</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Resend</strong> — Transactional email delivery for confirmations, reminders, and platform notifications.</li>
              </ul>

              <h3 className="text-lg font-medium mb-2">CRM and Lead Management</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>HubSpot</strong> — CRM and marketing platform. Contact information submitted through our lead capture and demo request forms is stored in HubSpot. HubSpot's tracking script is loaded on our public marketing pages (landing, pricing, book a demo, thought leadership) and may set cookies to identify returning visitors and attribute form submissions.</li>
              </ul>

              <h3 className="text-lg font-medium mb-2">Analytics and Visitor Tracking</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Google Analytics and Google Tag Manager</strong> — Website usage analytics, traffic attribution, and conversion tracking.</li>
                <li><strong>Leadsy.ai</strong> — Visitor identification and intent tracking on marketing pages to help us understand which companies are visiting our site.</li>
              </ul>

              <h3 className="text-lg font-medium mb-2">File Uploads</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Transloadit / Uppy</strong> — File upload processing for assets such as images and documents uploaded within the Platform.</li>
              </ul>

              <h3 className="text-lg font-medium mb-2">AI Features</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>OpenAI</strong> — AI-powered features within the Platform may send content you provide (such as session descriptions or email drafts) to OpenAI's API for processing. This data is used solely to generate the requested output and is subject to OpenAI's usage policies.</li>
              </ul>

              <h3 className="text-lg font-medium mb-2">Event Organizers</h3>
              <p>
                When you register for an event, your registration information is shared with the event organizer to facilitate your participation.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. API Access and Third-Party Integrations</h2>
              <p>
                Organization owners may create API keys that allow authorized third-party applications to access certain organizational data. This access is governed by:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Scope-based permissions:</strong> API keys are granted specific scopes (e.g., events, attendees, sessions, speakers, leads, sponsors, analytics) that limit what data can be accessed</li>
                <li><strong>Rate limiting:</strong> API access is subject to rate limits to prevent abuse</li>
                <li><strong>Audit logging:</strong> All API key usage is logged for security and compliance purposes</li>
                <li><strong>Owner control:</strong> Only organization owners can create, modify, or revoke API keys</li>
              </ul>
              <p>
                If you are an attendee or participant, your data may be accessed by third-party systems that event organizers have integrated with the Platform. Contact the event organizer for information about their specific integrations.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">Legal Requirements</h3>
              <p>
                We may disclose your information if required by law, legal process, or government request, or to protect the rights, property, or safety of our users or others.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">Business Transfers</h3>
              <p>
                In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any such change.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
              </p>
              <p className="mt-4">
                When you close your account, we will delete or anonymize your personal information within a reasonable timeframe, except where we need to retain it for legal, regulatory, or legitimate business purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Your Rights and Choices</h2>
              <p>Depending on your location, you may have the following rights regarding your personal information:</p>
              <ul className="list-disc pl-6">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request a copy of your data in a structured, machine-readable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, please contact us using the information provided at the end of this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Data Security</h2>
              <p>
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc pl-6">
                <li>Encryption of data in transit (TLS) and at rest</li>
                <li>Secure authentication via Clerk with industry-standard JWT tokens</li>
                <li>Scope-limited API key access with cryptographic hashing</li>
                <li>Timing-safe comparison for authentication to prevent timing attacks</li>
                <li>Regular security assessments and monitoring</li>
                <li>Payment data handled exclusively by Stripe — never stored on our servers</li>
              </ul>
              <p className="mt-4">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Cookies and Tracking Technologies</h2>
              <p>
                We use cookies and similar tracking technologies to collect and store information about your use of the Platform. These technologies help us:
              </p>
              <ul className="list-disc pl-6">
                <li>Authenticate your identity and maintain your session (via Clerk)</li>
                <li>Remember your preferences and settings</li>
                <li>Analyze usage patterns and improve our services (via Google Analytics)</li>
                <li>Identify visiting companies and attribute interest to marketing efforts (via Leadsy.ai)</li>
                <li>Track marketing lead sources on public pages (via HubSpot)</li>
              </ul>
              <p className="mt-4">
                HubSpot's tracking script is loaded <strong>only on public marketing pages</strong> (landing page, pricing, book a demo, thought leadership). It is not loaded on the sign-in, sign-up, or any authenticated application pages.
              </p>
              <p className="mt-4">
                You can control cookies through your browser settings. However, disabling cookies may affect the functionality of certain features, including authentication.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-6">Email Tracking</h3>
              <p>
                Our email communications sent via Resend may include tracking technologies to help us understand how recipients interact with our messages. This includes:
              </p>
              <ul className="list-disc pl-6 mt-2">
                <li><strong>Open tracking:</strong> Small transparent images (pixels) that record when an email is opened</li>
                <li><strong>Click tracking:</strong> Links that record when recipients click through to our content</li>
                <li><strong>Delivery tracking:</strong> Information about whether emails were successfully delivered, bounced, or marked as spam</li>
              </ul>
              <p className="mt-4">
                You can opt out of email tracking by disabling images in your email client or by unsubscribing from our communications.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-6">Marketing Attribution</h3>
              <p>
                We use activation links and campaign URLs to track the effectiveness of our marketing efforts. These links may contain:
              </p>
              <ul className="list-disc pl-6 mt-2">
                <li>UTM parameters to identify traffic sources and campaigns</li>
                <li>Privacy-compliant visitor identifiers (hashed values) to attribute conversions</li>
              </ul>
              <p className="mt-4">
                This information helps us understand which marketing channels are most effective and improve our outreach. No personally identifiable information is stored in these tracking mechanisms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your country of residence, including through our service providers (Render, Neon, Clerk, Stripe, Resend, HubSpot, Google, OpenAI). These countries may have different data protection laws. When we transfer your information internationally, we take appropriate safeguards to ensure your information remains protected.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Children's Privacy</h2>
              <p>
                The Platform is not intended for use by individuals under the age of 16. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child without parental consent, we will take steps to delete that information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">12. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. We will notify you of any material changes by posting the updated policy on the Platform and updating the "Last updated" date. We encourage you to review this policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">13. Contact Us</h2>
              <p>
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="mt-4">
                <strong>Email:</strong> admin@makemysandbox.com
              </p>
              <p className="mt-4">
                We will respond to your inquiry within a reasonable timeframe.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
