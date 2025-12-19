import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Card>
          <CardContent className="prose dark:prose-invert max-w-none p-8">
            <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-muted-foreground mb-8">Last updated: December 14, 2024</p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
              <p>
                Welcome to Sandbox ("Platform", "we", "us", or "our"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Platform.
              </p>
              <p>
                By using the Platform, you agree to the collection and use of information in accordance with this policy. If you do not agree with the terms of this Privacy Policy, please do not access the Platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium mb-2">Personal Information</h3>
              <p>We collect personal information that you voluntarily provide to us when you:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Register for an account</li>
                <li>Create or manage events</li>
                <li>Register as an attendee for events</li>
                <li>Contact us for support</li>
                <li>Subscribe to marketing communications</li>
              </ul>
              <p>This information may include:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Name and contact information (email address, phone number)</li>
                <li>Organization name and details</li>
                <li>Event registration information</li>
                <li>Payment and billing information</li>
                <li>Speaker and session information</li>
                <li>Profile photos and biographical information</li>
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
              <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6">
                <li>Provide, maintain, and improve the Platform</li>
                <li>Process event registrations and manage attendee data</li>
                <li>Send transactional emails (confirmations, reminders, updates)</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Process payments and prevent fraud</li>
                <li>Analyze usage patterns to improve user experience</li>
                <li>Send marketing communications (with your consent)</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>
              <p>We may share your information in the following circumstances:</p>
              
              <h3 className="text-lg font-medium mb-2">Service Providers</h3>
              <p>We share data with third-party service providers who perform services on our behalf, including:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Payment processors for secure transaction handling</li>
                <li>Email service providers for communications</li>
                <li>Cloud hosting providers for data storage</li>
                <li>Analytics providers for usage insights</li>
              </ul>

              <h3 className="text-lg font-medium mb-2">Event Organizers</h3>
              <p>
                When you register for an event, your registration information is shared with the event organizer to facilitate your participation.
              </p>

              <h3 className="text-lg font-medium mb-2">Legal Requirements</h3>
              <p>
                We may disclose your information if required by law, legal process, or government request, or to protect the rights, property, or safety of our users or others.
              </p>

              <h3 className="text-lg font-medium mb-2">Business Transfers</h3>
              <p>
                In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any such change.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
              </p>
              <p>
                When you close your account, we will delete or anonymize your personal information within a reasonable timeframe, except where we need to retain it for legal, regulatory, or legitimate business purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Your Rights and Choices</h2>
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
              <h2 className="text-xl font-semibold mb-4">7. Data Security</h2>
              <p>
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc pl-6">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security assessments and monitoring</li>
                <li>Employee training on data protection practices</li>
              </ul>
              <p className="mt-4">
                Security scanning powered by Semgrep and privacy scanning powered by HoundDog.ai, both running locally on Sandbox infrastructure. No code or data is transmitted to any third party, including Semgrep or HoundDog.ai.
              </p>
              <p className="mt-4">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Cookies and Tracking Technologies</h2>
              <p>
                We use cookies and similar tracking technologies to collect and store information about your use of the Platform. These technologies help us:
              </p>
              <ul className="list-disc pl-6">
                <li>Remember your preferences and settings</li>
                <li>Authenticate your identity and maintain your session</li>
                <li>Analyze usage patterns and improve our services</li>
                <li>Deliver relevant content and features</li>
              </ul>
              <p className="mt-4">
                You can control cookies through your browser settings. However, disabling cookies may affect the functionality of certain features.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. When we transfer your information internationally, we take appropriate safeguards to ensure your information remains protected.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Children's Privacy</h2>
              <p>
                The Platform is not intended for use by individuals under the age of 16. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child without parental consent, we will take steps to delete that information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. We will notify you of any material changes by posting the updated policy on the Platform and updating the "Last updated" date. We encourage you to review this policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">12. Contact Us</h2>
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
