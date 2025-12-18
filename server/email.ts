import { Resend } from 'resend';
import { replaceMergeTags, replaceMergeTagsWithLabels, type MergeTagContext } from '@shared/mergeTags';
import { logInfo, logError, logWarn } from './logger';
import { storage } from './storage';
import { createHmac, timingSafeEqual } from 'crypto';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const ADMIN_EMAIL = 'brian@makemysandbox.com';
const FROM_EMAIL = 'Sandbox <notifications@makemysandbox.com>';

// Token expiry times in seconds
const TOKEN_EXPIRY = {
  open: 365 * 24 * 60 * 60, // 1 year for open tracking
  click: 365 * 24 * 60 * 60, // 1 year for click tracking
  unsubscribe: 30 * 24 * 60 * 60, // 30 days for unsubscribe
};

function getSigningSecret(): string {
  return process.env.EMAIL_TRACKING_SECRET || process.env.SESSION_SECRET || 'default-dev-secret';
}

// Generate HMAC-SHA256 signature for tracking data
function generateSignature(data: string): string {
  return createHmac('sha256', getSigningSecret()).update(data).digest('hex');
}

// Create a signed token for tracking (base64url encoded JSON with signature)
export function createTrackingToken(payload: {
  type: 'open' | 'click' | 'unsubscribe';
  messageId?: string;
  linkIndex?: number;
  url?: string;
  organizationId?: string;
  email?: string;
}): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const data = { ...payload, ts: timestamp };
  const dataStr = JSON.stringify(data);
  const signature = generateSignature(dataStr);
  const token = Buffer.from(JSON.stringify({ d: data, s: signature })).toString('base64url');
  return token;
}

// Validate and decode a tracking token
export function validateTrackingToken(token: string): {
  valid: boolean;
  expired: boolean;
  data?: {
    type: 'open' | 'click' | 'unsubscribe';
    messageId?: string;
    linkIndex?: number;
    url?: string;
    organizationId?: string;
    email?: string;
    ts: number;
  };
} {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'));
    const { d: data, s: signature } = decoded;
    
    if (!data || !signature) {
      return { valid: false, expired: false };
    }
    
    // Verify signature using timing-safe comparison
    const expectedSignature = generateSignature(JSON.stringify(data));
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return { valid: false, expired: false };
    }
    
    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    const expiry = TOKEN_EXPIRY[data.type as keyof typeof TOKEN_EXPIRY] || TOKEN_EXPIRY.click;
    if (now - data.ts > expiry) {
      return { valid: true, expired: true, data };
    }
    
    return { valid: true, expired: false, data };
  } catch {
    return { valid: false, expired: false };
  }
}

// Verify Resend webhook signature (Svix-based)
export function verifyResendWebhookSignature(
  payload: string,
  headers: {
    svixId?: string;
    svixTimestamp?: string;
    svixSignature?: string;
  }
): boolean {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    logWarn('RESEND_WEBHOOK_SECRET not configured - skipping signature verification', 'EmailWebhook');
    return true; // Allow in development if not configured
  }
  
  const { svixId, svixTimestamp, svixSignature } = headers;
  
  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }
  
  // Check timestamp is within 5 minutes
  const now = Math.floor(Date.now() / 1000);
  const timestamp = parseInt(svixTimestamp, 10);
  if (isNaN(timestamp) || Math.abs(now - timestamp) > 300) {
    return false;
  }
  
  // Svix signature format: v1,signature1 v1,signature2 ...
  // Build the signed payload: msgId.timestamp.payload
  const signedPayload = `${svixId}.${svixTimestamp}.${payload}`;
  
  // Decode the webhook secret (it's base64 encoded, prefixed with "whsec_")
  let secretBytes: Buffer;
  try {
    const secretValue = webhookSecret.startsWith('whsec_') 
      ? webhookSecret.slice(6) 
      : webhookSecret;
    secretBytes = Buffer.from(secretValue, 'base64');
  } catch {
    logError('Invalid RESEND_WEBHOOK_SECRET format', 'EmailWebhook');
    return false;
  }
  
  // Generate expected signature
  const expectedSignature = createHmac('sha256', secretBytes)
    .update(signedPayload)
    .digest('base64');
  
  // Parse signatures (format: "v1,base64sig v1,base64sig ...")
  const signatures = svixSignature.split(' ').map(s => {
    const parts = s.split(',');
    return parts.length === 2 ? parts[1] : null;
  }).filter(Boolean) as string[];
  
  // Check if any signature matches using timing-safe comparison
  for (const sig of signatures) {
    try {
      const sigBuffer = Buffer.from(sig, 'base64');
      const expectedBuffer = Buffer.from(expectedSignature, 'base64');
      if (sigBuffer.length === expectedBuffer.length && timingSafeEqual(sigBuffer, expectedBuffer)) {
        return true;
      }
    } catch {
      continue;
    }
  }
  
  return false;
}

// Validate redirect URL for click tracking (only allow http/https)
export function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface CampaignRecipient {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  checkInCode?: string;
  attendeeId?: string;
}

export interface EmailStyles {
  alignment?: 'left' | 'center' | 'right';
  headingFont?: string;
  headingSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  headingWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  headingColor?: string;
  bodyFont?: string;
  bodySize?: 'sm' | 'base' | 'lg';
  bodyColor?: string;
  lineHeight?: 'tight' | 'normal' | 'relaxed';
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
  styles?: EmailStyles;
}

// Helper function to generate styled email HTML
function generateStyledEmailHtml(content: string, styles?: EmailStyles, headerImageUrl?: string): string {
  const defaultStyles: EmailStyles = {
    alignment: 'left',
    headingFont: 'Arial, sans-serif',
    headingSize: '2xl',
    headingWeight: 'semibold',
    headingColor: '#1f2937',
    bodyFont: 'Arial, sans-serif',
    bodySize: 'base',
    bodyColor: '#4b5563',
    lineHeight: 'normal',
  };

  const mergedStyles = { ...defaultStyles, ...styles };

  // Map size values to CSS font sizes
  const headingSizeMap: Record<string, string> = {
    'sm': '14px',
    'base': '16px',
    'lg': '18px',
    'xl': '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
  };

  const bodySizeMap: Record<string, string> = {
    'sm': '14px',
    'base': '16px',
    'lg': '18px',
  };

  const lineHeightMap: Record<string, string> = {
    'tight': '1.25',
    'normal': '1.5',
    'relaxed': '1.75',
  };

  const fontWeightMap: Record<string, string> = {
    'normal': '400',
    'medium': '500',
    'semibold': '600',
    'bold': '700',
  };

  const headingFontSize = headingSizeMap[mergedStyles.headingSize || '2xl'] || '24px';
  const bodyFontSize = bodySizeMap[mergedStyles.bodySize || 'base'] || '16px';
  const lineHeight = lineHeightMap[mergedStyles.lineHeight || 'normal'] || '1.5';
  const fontWeight = fontWeightMap[mergedStyles.headingWeight || 'semibold'] || '600';

  // Build font imports for Google Fonts if using custom fonts
  const customFonts = new Set<string>();
  if (mergedStyles.headingFont && !['Arial', 'Arial, sans-serif'].includes(mergedStyles.headingFont)) {
    customFonts.add(mergedStyles.headingFont);
  }
  if (mergedStyles.bodyFont && !['Arial', 'Arial, sans-serif'].includes(mergedStyles.bodyFont)) {
    customFonts.add(mergedStyles.bodyFont);
  }

  let fontImports = '';
  if (customFonts.size > 0) {
    const fontFamilies = Array.from(customFonts)
      .map(f => f.replace(/\s+/g, '+'))
      .join('|');
    fontImports = `
      <link href="https://fonts.googleapis.com/css2?family=${fontFamilies}:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=${fontFamilies}:wght@400;500;600;700&display=swap');
      </style>
    `;
  }

  const headerHtml = headerImageUrl 
    ? `<div style="margin-bottom: 20px;">
        <img src="${headerImageUrl}" alt="Email Header" style="max-width: 600px; width: 100%; height: auto; display: block;" />
      </div>`
    : '';

  // Process content to apply heading styles to lines that look like headings
  const processedContent = content
    .split('\n')
    .map(line => {
      const trimmedLine = line.trim();
      // Check if line is a heading (starts with # or is all caps and short)
      if (trimmedLine.startsWith('# ')) {
        return `<h1 style="font-family: ${mergedStyles.headingFont || 'Arial, sans-serif'}; font-size: ${headingFontSize}; font-weight: ${fontWeight}; color: ${mergedStyles.headingColor || '#1f2937'}; margin: 0 0 16px 0; line-height: ${lineHeight};">${trimmedLine.substring(2)}</h1>`;
      } else if (trimmedLine.startsWith('## ')) {
        return `<h2 style="font-family: ${mergedStyles.headingFont || 'Arial, sans-serif'}; font-size: ${bodySizeMap['lg']}; font-weight: ${fontWeight}; color: ${mergedStyles.headingColor || '#1f2937'}; margin: 0 0 12px 0; line-height: ${lineHeight};">${trimmedLine.substring(3)}</h2>`;
      }
      return `<p style="font-family: ${mergedStyles.bodyFont || 'Arial, sans-serif'}; font-size: ${bodyFontSize}; color: ${mergedStyles.bodyColor || '#4b5563'}; margin: 0 0 12px 0; line-height: ${lineHeight};">${trimmedLine || '&nbsp;'}</p>`;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${fontImports}
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="font-family: ${mergedStyles.bodyFont || 'Arial, sans-serif'}; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; text-align: ${mergedStyles.alignment || 'left'};">
        ${headerHtml}
        ${processedContent}
      </div>
    </body>
    </html>
  `;
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

function wrapLinksForTracking(html: string, messageId: string, baseUrl: string): { html: string; trackedUrls: string[] } {
  let linkIndex = 0;
  const trackedUrls: string[] = [];
  
  const wrappedHtml = html.replace(
    /<a\s+([^>]*href=["'])([^"']+)(["'][^>]*)>/gi,
    (match, prefix, url, suffix) => {
      if (url.startsWith('mailto:') || url.startsWith('tel:') || url.includes('/api/email/')) {
        return match;
      }
      // Store the original URL for validation later
      trackedUrls.push(url);
      // Create signed token with messageId, linkIndex, and the URL
      const token = createTrackingToken({
        type: 'click',
        messageId,
        linkIndex,
        url,
      });
      const trackingUrl = `${baseUrl}/api/email/track/click/${token}`;
      linkIndex++;
      return `<a ${prefix}${trackingUrl}${suffix}>`;
    }
  );
  
  return { html: wrappedHtml, trackedUrls };
}

function addTrackingPixel(html: string, messageId: string, baseUrl: string): string {
  const token = createTrackingToken({
    type: 'open',
    messageId,
  });
  const pixelUrl = `${baseUrl}/api/email/track/open/${token}.gif`;
  const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" style="display:none;visibility:hidden;" alt="" />`;
  
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixelHtml}</body>`);
  }
  return html + pixelHtml;
}

function addUnsubscribeFooter(html: string, organizationId: string, email: string, baseUrl: string): string {
  const unsubscribeToken = createTrackingToken({
    type: 'unsubscribe',
    organizationId,
    email,
  });
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
    styles,
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
      let emailHtml = generateStyledEmailHtml(personalizedContent, styles);

      // Add tracking if enabled
      if (enableTracking) {
        const { html: wrappedHtml } = wrapLinksForTracking(emailHtml, emailMessage.id, baseUrl);
        emailHtml = wrappedHtml;
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
  styles?: EmailStyles;
}

export async function sendTestEmail(params: SendTestEmailParams): Promise<{ success: boolean; error?: string }> {
  const { to, subject, content, headerImageUrl, styles } = params;
  
  if (!resend) {
    logWarn('Resend not configured - skipping test email', 'Email');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const processedSubject = replaceMergeTagsWithLabels(subject);
    const processedContent = replaceMergeTagsWithLabels(content);

    // Generate styled email HTML
    let emailHtml = generateStyledEmailHtml(processedContent, styles, headerImageUrl || undefined);
    
    // Add test email notice at the end
    emailHtml = emailHtml.replace('</body>', `
      <div style="max-width: 600px; margin: 20px auto; padding: 0 20px;">
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="color: #999; font-size: 12px; text-align: center;">This is a test email. Merge tags are shown with sample labels like [First Name].</p>
      </div>
    </body>`);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject: `[TEST] ${processedSubject}`,
      html: emailHtml,
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

// Send notification to reviewer when assigned to a submission
export async function sendReviewerNotificationEmail(params: {
  reviewerEmail: string;
  reviewerName: string;
  submissionTitle: string;
  submissionId: number;
  eventName: string;
  eventSlug: string;
}): Promise<{ success: boolean; error?: string }> {
  const { reviewerEmail, reviewerName, submissionTitle, submissionId, eventName, eventSlug } = params;
  
  if (!resend) {
    logWarn('Resend not configured - skipping reviewer notification email', 'Email');
    return { success: false, error: 'Email service not configured' };
  }

  const baseUrl = getBaseUrl();
  const reviewUrl = `${baseUrl}/reviewer`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: reviewerEmail,
      subject: `New Submission Ready for Review: ${submissionTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">New Submission Assigned for Review</h2>
          
          <p style="color: #555; font-size: 16px;">Hello ${reviewerName},</p>
          
          <p style="color: #555; font-size: 16px;">You have been assigned to review a new submission for <strong>${eventName}</strong>.</p>
          
          <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 10px 0;">Submission Details</h3>
            <p style="color: #555; margin: 5px 0;"><strong>Title:</strong> ${submissionTitle}</p>
            <p style="color: #555; margin: 5px 0;"><strong>Event:</strong> ${eventName}</p>
          </div>
          
          <p style="color: #555; font-size: 16px;">Please review this submission and provide your feedback.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewUrl}" style="display: inline-block; background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Review Submission</a>
          </div>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            This is an automated notification from the Event Management CMS. If you have any questions, please contact the event organizer.
          </p>
        </div>
      `,
    });

    if (error) {
      logError(`Failed to send reviewer notification: ${error.message || 'Unknown error'}`, 'Email');
      return { success: false, error: error.message || 'Unknown error' };
    }

    logInfo(`Reviewer notification sent to ${reviewerEmail}: ${data?.id}`, 'Email');
    return { success: true };
  } catch (err) {
    logError(`Error sending reviewer notification: ${err}`, 'Email');
    return { success: false, error: String(err) };
  }
}
