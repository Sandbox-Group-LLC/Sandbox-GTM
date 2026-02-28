import { logInfo, logError, logWarn } from "./logger";

const BYWORD_CREATE_URL = "https://api.byword.ai/create_article";
const BYWORD_GET_URL = "https://api.byword.ai/get_article";
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 36;
const FETCH_TIMEOUT_MS = 15000;
const MAX_CONSECUTIVE_ERRORS = 5;

interface BywordCreateResponse {
  message: string;
  articleID: string;
}

interface BywordArticleResponse {
  articleID: string;
  title?: string;
  content?: string;
  metaDescription?: string;
  status?: string;
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

function getDomain(): string {
  const domain = process.env.BYWORD_DOMAIN;
  if (!domain) {
    throw new Error("BYWORD_DOMAIN environment variable is not set");
  }
  return domain;
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

async function createArticle(input: string, mode: "keyword" | "title"): Promise<string> {
  const key = getApiKey();
  const domain = getDomain();

  logInfo(`Byword: Creating article with mode="${mode}", input="${input}"`, "byword");

  const response = await fetchWithTimeout(BYWORD_CREATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, input, mode, domain }),
  });

  if (!response.ok) {
    const text = await response.text();
    logError(`Byword create response: status=${response.status}, body="${text}", url=${BYWORD_CREATE_URL}`, "byword");
    throw new Error(`Byword create failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as BywordCreateResponse;

  if (!data.articleID) {
    throw new Error(`Byword create returned no articleID: ${JSON.stringify(data)}`);
  }

  logInfo(`Byword: Article created with ID ${data.articleID}`, "byword");
  return data.articleID;
}

async function pollArticle(articleID: string): Promise<BywordArticleResponse> {
  const key = getApiKey();
  let consecutiveErrors = 0;

  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    try {
      const response = await fetchWithTimeout(BYWORD_GET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, articleID }),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(`Byword authentication failed (${response.status}). Check your API key.`);
      }

      if (response.status === 404) {
        throw new Error(`Byword article ${articleID} not found. It may have been deleted.`);
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
        logInfo(`Byword: Article ${articleID} completed after ${attempt} polls`, "byword");
        return data;
      }

      if (attempt % 6 === 0) {
        logInfo(`Byword: Still waiting for article ${articleID} (attempt ${attempt}/${MAX_POLL_ATTEMPTS})`, "byword");
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

  throw new Error(`Byword article ${articleID} did not complete within ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000} seconds`);
}

export async function generateArticle(options: BywordGenerateOptions): Promise<BywordGeneratedArticle> {
  const articleID = await createArticle(options.input, options.mode);
  const result = await pollArticle(articleID);

  if (!result.title || !result.content) {
    throw new Error("Byword returned incomplete article data");
  }

  const slug = slugify(result.title);

  return {
    title: result.title,
    slug,
    contentHtml: result.content,
    metaDescription: result.metaDescription || null,
    author: options.author || null,
    tags: options.tags || null,
    heroImageUrl: options.heroImageUrl || null,
    heroImageAlt: options.heroImageAlt || null,
    status: options.status || "draft",
  };
}
