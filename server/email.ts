import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const ADMIN_EMAIL = 'brian@makemysandbox.com';
const FROM_EMAIL = 'notifications@resend.dev';

export async function sendNewOrganizationAlert(organizationName: string, organizationSlug: string, ownerEmail?: string): Promise<void> {
  if (!resend) {
    console.log('[Email] Resend not configured - skipping organization alert email');
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New Organization Created: ${organizationName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Organization Created</h2>
          <p>A new organization has been created in your Event Management CMS:</p>
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Organization Name</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${organizationName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Slug</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${organizationSlug}</td>
            </tr>
            ${ownerEmail ? `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Owner Email</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${ownerEmail}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Created At</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
          <p style="color: #666; font-size: 12px;">This is an automated notification from your Event Management CMS.</p>
        </div>
      `,
    });

    if (error) {
      console.error('[Email] Failed to send organization alert:', error);
    } else {
      console.log('[Email] Organization alert sent successfully:', data?.id);
    }
  } catch (err) {
    console.error('[Email] Error sending organization alert:', err);
  }
}
