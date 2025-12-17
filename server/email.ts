import { Resend } from 'resend';
import { replaceMergeTags, replaceMergeTagsWithLabels, type MergeTagContext } from '@shared/mergeTags';
import { logInfo, logError, logWarn } from './logger';
import { storage } from './storage';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const ADMIN_EMAIL = 'brian@makemysandbox.com';
const FROM_EMAIL = 'notifications@makemysandbox.com';

export interface CampaignRecipient {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  checkInCode?: string;
  attendeeId?: string;
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
  organizationId: string;
  campaignId?: string;
  baseUrl?: string;
  enableTracking?: boolean;
}

export interface SendCampaignResult {
  totalSent: number;
  totalFailed: number;
  totalSkipped: number;
  errors: Array<{ email: string; error: string }>;
  messageIds: string[];
}

function getBaseUrl(): string {
  return process.env.REPLIT_DEPLOYMENT_URL 
    ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
    : process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'http://localhost:5000';
}

function generateUnsubscribeToken(organizationId: string, email: string): string {
  return Buffer.from(`${organizationId}:${email}`).toString('base64');
}

function wrapLinksForTracking(html: string, messageId: string, baseUrl: string): string {
  let linkIndex = 0;
  return html.replace(
    /<a\s+([^>]*href=["'])([^"']+)(["'][^>]*)>/gi,
    (match, prefix, url, suffix) => {
      if (url.startsWith('mailto:') || url.startsWith('tel:') || url.includes('/api/email/')) {
        return match;
      }
      const trackingUrl = `${baseUrl}/api/email/track/click/${messageId}_${linkIndex}?url=${encodeURIComponent(url)}`;
      linkIndex++;
      return `<a ${prefix}${trackingUrl}${suffix}>`;
    }
  );
}

function addTrackingPixel(html: string, messageId: string, baseUrl: string): string {
  const pixelUrl = `${baseUrl}/api/email/track/open/${messageId}.gif`;
  const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" style="display:none;visibility:hidden;" alt="" />`;
  
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixelHtml}</body>`);
  }
  return html + pixelHtml;
}

function addUnsubscribeFooter(html: string, organizationId: string, email: string, baseUrl: string): string {
  const unsubscribeToken = generateUnsubscribeToken(organizationId, email);
  const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe/${unsubscribeToken}`;
  
  const footer = `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
      <p>If you no longer wish to receive these emails, you can <a href="${unsubscribeUrl}" style="color: #666;">unsubscribe here</a>.</p>
    </div>
  `;
  
  if (html.includes('</div>')) {
    const lastDivIndex = html.lastIndexOf('</div>');
    return html.slice(0, lastDivIndex) + footer + html.slice(lastDivIndex);
  }
  return html + footer;
}

export async function sendCampaignEmails(params: CampaignEmailParams): Promise<SendCampaignResult> {
  const { 
    subject, 
    content, 
    recipients, 
    eventContext, 
    organizationContext,
    organizationId,
    campaignId,
    enableTracking = true,
  } = params;
  
  const baseUrl = params.baseUrl || getBaseUrl();
  
  if (!resend) {
    logWarn('Resend not configured - skipping campaign emails', 'Email');
    return { totalSent: 0, totalFailed: recipients.length, totalSkipped: 0, errors: [{ email: 'all', error: 'Resend not configured' }], messageIds: [] };
  }

  const result: SendCampaignResult = {
    totalSent: 0,
    totalFailed: 0,
    totalSkipped: 0,
    errors: [],
    messageIds: [],
  };

  for (const recipient of recipients) {
    // Check suppression list before sending
    const suppression = await storage.getEmailSuppression(organizationId, recipient.email);
    if (suppression) {
      logInfo(`Skipping suppressed email: ${recipient.email} (reason: ${suppression.reason})`, 'Email');
      result.totalSkipped++;
      continue;
    }

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

    // Create email message record before sending
    const emailMessage = await storage.createEmailMessage({
      organizationId,
      campaignId: campaignId || null,
      attendeeId: recipient.attendeeId || null,
      recipientEmail: recipient.email,
      recipientName: recipient.firstName 
        ? `${recipient.firstName}${recipient.lastName ? ' ' + recipient.lastName : ''}`
        : null,
      subject: personalizedSubject,
      status: 'pending',
    });

    try {
      let emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${personalizedContent.replace(/\n/g, '<br/>')}
        </div>
      `;

      // Add tracking if enabled
      if (enableTracking) {
        emailHtml = wrapLinksForTracking(emailHtml, emailMessage.id, baseUrl);
        emailHtml = addTrackingPixel(emailHtml, emailMessage.id, baseUrl);
        emailHtml = addUnsubscribeFooter(emailHtml, organizationId, recipient.email, baseUrl);
      }

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: recipient.email,
        subject: personalizedSubject,
        html: emailHtml,
      });

      if (error) {
        logError(`Failed to send email: ${error.message || 'Unknown error'}`, 'Email');
        result.totalFailed++;
        result.errors.push({ email: recipient.email, error: error.message || 'Unknown error' });
        
        // Update message status to failed
        await storage.updateEmailMessage(emailMessage.id, {
          status: 'failed',
        });
      } else {
        result.totalSent++;
        result.messageIds.push(emailMessage.id);
        
        // Update message with Resend ID and sent status
        await storage.updateEmailMessage(emailMessage.id, {
          status: 'sent',
          resendMessageId: data?.id || null,
          sentAt: new Date(),
        });
      }
    } catch (err: any) {
      logError(`Error sending email: ${err.message || 'Unknown error'}`, 'Email');
      result.totalFailed++;
      result.errors.push({ email: recipient.email, error: err.message || 'Unknown error' });
      
      // Update message status to failed
      await storage.updateEmailMessage(emailMessage.id, {
        status: 'failed',
      });
    }
  }

  logInfo(`Campaign complete: ${result.totalSent} sent, ${result.totalFailed} failed, ${result.totalSkipped} skipped`, 'Email');
  return result;
}

export interface SendTestEmailParams {
  to: string;
  subject: string;
  content: string;
  headerImageUrl?: string | null;
}

export async function sendTestEmail(params: SendTestEmailParams): Promise<{ success: boolean; error?: string }> {
  const { to, subject, content, headerImageUrl } = params;
  
  if (!resend) {
    logWarn('Resend not configured - skipping test email', 'Email');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const processedSubject = replaceMergeTagsWithLabels(subject);
    const processedContent = replaceMergeTagsWithLabels(content);

    const headerHtml = headerImageUrl 
      ? `<div style="margin-bottom: 20px;">
          <img src="${headerImageUrl}" alt="Email Header" style="max-width: 600px; width: 100%; height: auto; display: block;" />
        </div>`
      : '';

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject: `[TEST] ${processedSubject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${headerHtml}
          ${processedContent.replace(/\n/g, '<br/>')}
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="color: #999; font-size: 12px;">This is a test email. Merge tags are shown with sample labels like [First Name].</p>
        </div>
      `,
    });

    if (error) {
      logError(`Failed to send test email: ${error.message || 'Unknown error'}`, 'Email');
      return { success: false, error: error.message || 'Failed to send email' };
    }

    logInfo('Test email sent successfully', 'Email');
    return { success: true };
  } catch (err: any) {
    logError(`Error sending test email: ${err.message || 'Unknown error'}`, 'Email');
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export async function sendNewOrganizationAlert(organizationName: string, organizationSlug: string, ownerEmail?: string): Promise<void> {
  if (!resend) {
    logWarn('Resend not configured - skipping organization alert email', 'Email');
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
      logError(`Failed to send organization alert: ${error.message || 'Unknown error'}`, 'Email');
    } else {
      logInfo(`Organization alert sent successfully: ${data?.id}`, 'Email');
    }
  } catch (err) {
    logError(`Error sending organization alert: ${err}`, 'Email');
  }
}
