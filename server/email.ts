import { Resend } from 'resend';
import { replaceMergeTags, type MergeTagContext } from '@shared/mergeTags';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const ADMIN_EMAIL = 'brian@makemysandbox.com';
const FROM_EMAIL = 'notifications@makemysandbox.com';

export interface CampaignRecipient {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  checkInCode?: string;
}

export interface CampaignEmailParams {
  subject: string;
  content: string;
  recipients: CampaignRecipient[];
  eventContext: {
    name?: string;
    date?: string;
    location?: string;
    description?: string;
  };
  organizationContext: {
    name?: string;
  };
}

export interface SendCampaignResult {
  totalSent: number;
  totalFailed: number;
  errors: Array<{ email: string; error: string }>;
}

export async function sendCampaignEmails(params: CampaignEmailParams): Promise<SendCampaignResult> {
  const { subject, content, recipients, eventContext, organizationContext } = params;
  
  if (!resend) {
    console.log('[Email] Resend not configured - skipping campaign emails');
    return { totalSent: 0, totalFailed: recipients.length, errors: [{ email: 'all', error: 'Resend not configured' }] };
  }

  const result: SendCampaignResult = {
    totalSent: 0,
    totalFailed: 0,
    errors: [],
  };

  for (const recipient of recipients) {
    const context: MergeTagContext = {
      event: eventContext,
      attendee: {
        firstName: recipient.firstName,
        lastName: recipient.lastName,
        email: recipient.email,
        company: recipient.company,
        checkInCode: recipient.checkInCode,
      },
      organization: organizationContext,
    };

    const personalizedSubject = replaceMergeTags(subject, context);
    const personalizedContent = replaceMergeTags(content, context);

    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: recipient.email,
        subject: personalizedSubject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${personalizedContent.replace(/\n/g, '<br/>')}
          </div>
        `,
      });

      if (error) {
        console.error(`[Email] Failed to send to ${recipient.email}:`, error);
        result.totalFailed++;
        result.errors.push({ email: recipient.email, error: error.message || 'Unknown error' });
      } else {
        result.totalSent++;
      }
    } catch (err: any) {
      console.error(`[Email] Error sending to ${recipient.email}:`, err);
      result.totalFailed++;
      result.errors.push({ email: recipient.email, error: err.message || 'Unknown error' });
    }
  }

  console.log(`[Email] Campaign complete: ${result.totalSent} sent, ${result.totalFailed} failed`);
  return result;
}

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
