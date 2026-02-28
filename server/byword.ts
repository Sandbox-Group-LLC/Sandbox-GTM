import { logInfo, logError, logWarn } from "./logger";

const BYWORD_BASE_URL = "https://cloud.byword.ai/api/projects";
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 36;
const FETCH_TIMEOUT_MS = 15000;
const MAX_CONSECUTIVE_ERRORS = 5;

interface BywordCreateResponse {
  id: string;
  domain_id: string;
  status: string;
  keyword?: string;
  title?: string;
  created_at: string;
}

interface BywordArticleResponse {
  id: string;
  domain_id?: string;
  status?: string;
  keyword?: string;
  title?: string;
  content?: string;
  meta_description?: string;
  created_at?: string;
}

export interface BywordGenerateOptions {
  input: string;
  mode: "keyword" | "title";
  author?: string;
  tags?: string[];
  heroImageUrl?: string;
  heroImageAlt?: string;
  status?: string;
}

export interface BywordGeneratedArticle {
  title: string;
  slug: string;
  contentHtml: string;
  metaDescription: string | null;
  author: string | null;
  tags: string[] | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  status: string;
}

function getApiKey(): string {
  const key = process.env.BYWORD_API_KEY;
  if (!key) {
    throw new Error("BYWORD_API_KEY environment variable is not set");
  }
  return key;
}

function getDomainId(): string {
  const domainId = process.env.BYWORD_DOMAIN_ID || process.env.BYWORD_DOMAIN;
  if (!domainId) {
    throw new Error("BYWORD_DOMAIN_ID environment variable is not set");
  }
  return domainId;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

function getAuthHeaders(): Record<string, string> {
  return {
    "Authorization": `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
  };
}

async function createArticle(input: string, mode: "keyword" | "title"): Promise<string> {
  const domainId = getDomainId();
  const createUrl = `${BYWORD_BASE_URL}/articles`;

  logInfo(`Byword: Creating article with mode="${mode}", input="${input}", url=${createUrl}`, "byword");

  const body: Record<string, string> = {
    domain_id: domainId,
    mode,
  };

  if (mode === "keyword") {
    body.keyword = input;
  } else {
    body.title = input;
  }

  const response = await fetchWithTimeout(createUrl, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    logError(`Byword create response: status=${response.status}, body="${text}", url=${createUrl}`, "byword");
    throw new Error(`Byword create failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as BywordCreateResponse;

  if (!data.id) {
    throw new Error(`Byword create returned no article id: ${JSON.stringify(data)}`);
  }

  logInfo(`Byword: Article created with ID ${data.id}, status=${data.status}`, "byword");
  return data.id;
}

async function pollArticle(articleId: string): Promise<BywordArticleResponse> {
  let consecutiveErrors = 0;
  const articleUrl = `${BYWORD_BASE_URL}/articles/${articleId}`;

  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    try {
      const response = await fetchWithTimeout(articleUrl, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(`Byword authentication failed (${response.status}). Check your API key.`);
      }

      if (response.status === 404) {
        throw new Error(`Byword article ${articleId} not found. It may have been deleted.`);
      }

      if (!response.ok) {
        consecutiveErrors++;
        logWarn(`Byword: Poll attempt ${attempt} failed (${response.status}), consecutive errors: ${consecutiveErrors}`, "byword");
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          throw new Error(`Byword polling failed after ${MAX_CONSECUTIVE_ERRORS} consecutive errors (last status: ${response.status})`);
        }
        continue;
      }

      consecutiveErrors = 0;
      const data = (await response.json()) as BywordArticleResponse;

      if (data.content && data.title) {
        logInfo(`Byword: Article ${articleId} completed after ${attempt} polls`, "byword");
        return data;
      }

      if (data.status === "failed" || data.status === "error") {
        throw new Error(`Byword article generation failed with status: ${data.status}`);
      }

      if (attempt % 6 === 0) {
        logInfo(`Byword: Still waiting for article ${articleId}, status=${data.status} (attempt ${attempt}/${MAX_POLL_ATTEMPTS})`, "byword");
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        consecutiveErrors++;
        logWarn(`Byword: Poll attempt ${attempt} timed out, consecutive errors: ${consecutiveErrors}`, "byword");
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          throw new Error("Byword polling timed out repeatedly. The service may be unavailable.");
        }
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Byword article ${articleId} did not complete within ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000} seconds`);
}

export async function generateArticle(options: BywordGenerateOptions): Promise<BywordGeneratedArticle> {
  const articleId = await createArticle(options.input, options.mode);
  const result = await pollArticle(articleId);

  if (!result.title || !result.content) {
    throw new Error("Byword returned incomplete article data");
  }

  const slug = slugify(result.title);

  return {
    title: result.title,
    slug,
    contentHtml: result.content,
    metaDescription: result.meta_description || null,
    author: options.author || null,
    tags: options.tags || null,
    heroImageUrl: options.heroImageUrl || null,
    heroImageAlt: options.heroImageAlt || null,
    status: options.status || "draft",
  };
}
