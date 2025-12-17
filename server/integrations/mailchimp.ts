import { logInfo, logError, logWarn } from '../logger';

interface MailchimpAudience {
  id: string;
  name: string;
  stats: {
    member_count: number;
  };
}

interface MailchimpMember {
  email_address: string;
  status: string;
  merge_fields: {
    FNAME?: string;
    LNAME?: string;
    PHONE?: string;
    COMPANY?: string;
  };
  tags?: Array<{ name: string }>;
}

interface MailchimpBatchResult {
  total_created: number;
  total_updated: number;
  error_count: number;
  errors: Array<{ email_address: string; error: string }>;
}

export interface EmailMarketingContact {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  tags?: string[];
}

export class MailchimpProvider {
  private apiKey: string;
  private serverPrefix: string;
  private baseUrl: string;

  constructor(apiKey: string, serverPrefix?: string) {
    this.apiKey = apiKey;
    // Extract server prefix from API key if not provided (format: xxx-us21)
    if (serverPrefix) {
      this.serverPrefix = serverPrefix;
    } else {
      const parts = apiKey.split('-');
      this.serverPrefix = parts[parts.length - 1] || 'us1';
    }
    this.baseUrl = `https://${this.serverPrefix}.api.mailchimp.com/3.0`;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Basic ${Buffer.from(`anystring:${this.apiKey}`).toString('base64')}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Mailchimp API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.title || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  async verifyConnection(): Promise<{ accountName: string; accountId: string }> {
    const response = await this.request<{ account_name: string; account_id: string }>('/');
    return {
      accountName: response.account_name,
      accountId: response.account_id,
    };
  }

  async listAudiences(): Promise<Array<{ id: string; name: string; memberCount: number }>> {
    const response = await this.request<{ lists: MailchimpAudience[] }>('/lists?count=100');
    return response.lists.map(list => ({
      id: list.id,
      name: list.name,
      memberCount: list.stats.member_count,
    }));
  }

  async getAudience(audienceId: string): Promise<{ id: string; name: string; memberCount: number }> {
    const response = await this.request<MailchimpAudience>(`/lists/${audienceId}`);
    return {
      id: response.id,
      name: response.name,
      memberCount: response.stats.member_count,
    };
  }

  async getMembers(audienceId: string, count = 1000, offset = 0): Promise<EmailMarketingContact[]> {
    const response = await this.request<{ members: MailchimpMember[] }>(
      `/lists/${audienceId}/members?count=${count}&offset=${offset}`
    );
    return response.members.map(member => ({
      email: member.email_address,
      firstName: member.merge_fields?.FNAME,
      lastName: member.merge_fields?.LNAME,
      phone: member.merge_fields?.PHONE,
      company: member.merge_fields?.COMPANY,
      tags: member.tags?.map(t => t.name),
    }));
  }

  async addOrUpdateMember(
    audienceId: string,
    contact: EmailMarketingContact
  ): Promise<{ created: boolean; updated: boolean; error?: string }> {
    const subscriberHash = this.getSubscriberHash(contact.email);
    
    try {
      await this.request(
        `/lists/${audienceId}/members/${subscriberHash}`,
        'PUT',
        {
          email_address: contact.email,
          status_if_new: 'subscribed',
          merge_fields: {
            FNAME: contact.firstName || '',
            LNAME: contact.lastName || '',
            PHONE: contact.phone || '',
            COMPANY: contact.company || '',
          },
        }
      );
      return { created: false, updated: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logWarn(`Mailchimp add/update member error for ${contact.email}: ${errorMessage}`, 'Mailchimp');
      return { created: false, updated: false, error: errorMessage };
    }
  }

  async batchAddContacts(
    audienceId: string,
    contacts: EmailMarketingContact[]
  ): Promise<MailchimpBatchResult> {
    const result: MailchimpBatchResult = {
      total_created: 0,
      total_updated: 0,
      error_count: 0,
      errors: [],
    };

    // Mailchimp batch operations have limits, so we process in chunks
    const chunkSize = 500;
    for (let i = 0; i < contacts.length; i += chunkSize) {
      const chunk = contacts.slice(i, i + chunkSize);
      
      const operations = chunk.map(contact => ({
        method: 'PUT',
        path: `/lists/${audienceId}/members/${this.getSubscriberHash(contact.email)}`,
        body: JSON.stringify({
          email_address: contact.email,
          status_if_new: 'subscribed',
          merge_fields: {
            FNAME: contact.firstName || '',
            LNAME: contact.lastName || '',
            PHONE: contact.phone || '',
            COMPANY: contact.company || '',
          },
        }),
      }));

      try {
        await this.request('/batches', 'POST', { operations });
        // For simplicity, we count all as updates since we use PUT
        result.total_updated += chunk.length;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logError(`Mailchimp batch error: ${errorMessage}`, 'Mailchimp');
        result.error_count += chunk.length;
        chunk.forEach(contact => {
          result.errors.push({ email_address: contact.email, error: errorMessage });
        });
      }
    }

    return result;
  }

  async syncContacts(
    audienceId: string,
    contacts: EmailMarketingContact[]
  ): Promise<{ created: number; updated: number; failed: number; errors: Array<{ email: string; error: string }> }> {
    const result = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
    };

    for (const contact of contacts) {
      try {
        const res = await this.addOrUpdateMember(audienceId, contact);
        if (res.error) {
          result.failed++;
          result.errors.push({ email: contact.email, error: res.error });
        } else if (res.created) {
          result.created++;
        } else {
          result.updated++;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.failed++;
        result.errors.push({ email: contact.email, error: errorMessage });
      }
    }

    return result;
  }

  private getSubscriberHash(email: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
  }
}

export function createMailchimpProvider(apiKey: string, serverPrefix?: string): MailchimpProvider {
  return new MailchimpProvider(apiKey, serverPrefix);
}
