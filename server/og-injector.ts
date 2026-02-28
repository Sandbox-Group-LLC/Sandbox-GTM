import { storage } from "./storage";

const BASE_URL = "https://www.sandbox-gtm.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/favicon.png`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeUrl(url: string): string {
  const escaped = url.replace(/"/g, "%22").replace(/</g, "%3C").replace(/>/g, "%3E");
  if (/^https?:\/\//i.test(escaped) || escaped.startsWith("/")) {
    return escaped;
  }
  return "";
}

function resolveImageUrl(imageUrl: string): string {
  const sanitized = sanitizeUrl(imageUrl);
  if (!sanitized) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(sanitized)) {
    return sanitized;
  }
  return `${BASE_URL}${sanitized.startsWith("/") ? "" : "/"}${sanitized}`;
}

export async function injectArticleOgTags(html: string, url: string): Promise<string> {
  const match = url.match(/^\/the-sandbox\/([^?#]+)/);
  if (!match) return html;

  const slug = decodeURIComponent(match[1]);

  try {
    const article = await storage.getArticleBySlug(slug);
    if (!article || article.status !== "publish") return html;

    const title = escapeHtml(article.title);
    const description = escapeHtml(article.metaDescription || article.title);
    const safeSlug = encodeURIComponent(article.slug);
    const articleUrl = `${BASE_URL}/the-sandbox/${safeSlug}`;
    const imageUrl = article.heroImageUrl ? resolveImageUrl(article.heroImageUrl) : DEFAULT_OG_IMAGE;

    html = html.replace(
      /<title>.*?<\/title>/,
      `<title>${title} | Sandbox-GTM</title>`
    );

    html = html.replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${description}" />`
    );

    html = html.replace(
      /<meta property="og:title" content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${title}" />`
    );

    html = html.replace(
      /<meta property="og:description" content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${description}" />`
    );

    html = html.replace(
      /<meta property="og:type" content="[^"]*"\s*\/?>/,
      `<meta property="og:type" content="article" />`
    );

    html = html.replace(
      /<meta property="og:url" content="[^"]*"\s*\/?>/,
      `<meta property="og:url" content="${articleUrl}" />`
    );

    html = html.replace(
      /<meta property="og:image" content="[^"]*"\s*\/?>/,
      `<meta property="og:image" content="${imageUrl}" />`
    );

    html = html.replace(
      /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:title" content="${title}" />`
    );

    html = html.replace(
      /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:description" content="${description}" />`
    );

    html = html.replace(
      /<meta name="twitter:image" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:image" content="${imageUrl}" />`
    );

    return html;
  } catch (error) {
    console.error("[og-injector] Error injecting OG tags:", error);
    return html;
  }
}
