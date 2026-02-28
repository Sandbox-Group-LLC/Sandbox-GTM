import { createHmac, timingSafeEqual } from "crypto";
import { logInfo, logError, logWarn } from "./logger";
import { storage } from "./storage";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getWebhookSecret(): string {
  const secret = process.env.BYWORD_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("BYWORD_WEBHOOK_SECRET environment variable is not set");
  }
  return secret;
}

export function verifyBywordSignature(
  body: string,
  timestamp: string,
  signature: string
): boolean {
  try {
    const secret = getWebhookSecret();
    const message = `${timestamp}.${body}`;
    const expected = createHmac("sha256", secret)
      .update(message)
      .digest("hex");
    const expectedSig = `sha256=${expected}`;

    if (signature.length !== expectedSig.length) {
      return false;
    }

    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig)
    );
  } catch (error) {
    logError("Byword webhook signature verification error:", error);
    return false;
  }
}

interface BywordArticlePayload {
  id?: string;
  title?: string;
  content?: string;
  html_content?: string;
  keyword?: string;
  meta_description?: string;
  slug?: string;
  status?: string;
  domain_id?: string;
  domain_name?: string;
  hero_image_url?: string;
  hero_image_alt?: string;
  author?: string;
  tags?: string[];
  [key: string]: any;
}

interface BywordWebhookBody {
  event: string;
  data?: BywordArticlePayload;
  article?: BywordArticlePayload;
  [key: string]: any;
}

function extractArticleData(body: BywordWebhookBody): BywordArticlePayload | null {
  return body.data || body.article || null;
}

export async function handleBywordWebhook(
  event: string,
  body: BywordWebhookBody,
  deliveryId: string
): Promise<{ success: boolean; message: string; articleId?: string }> {
  logInfo(`Byword webhook received: event=${event}, deliveryId=${deliveryId}`, "byword-webhook");

  if (event === "article.completed") {
    return handleArticleCompleted(body, deliveryId);
  }

  if (event === "article.published") {
    return handleArticleCompleted(body, deliveryId, "publish");
  }

  if (event === "campaign.completed") {
    logInfo(`Byword campaign completed: deliveryId=${deliveryId}`, "byword-webhook");
    return { success: true, message: "Campaign completion noted" };
  }

  logWarn(`Byword webhook: unhandled event type "${event}"`, "byword-webhook");
  return { success: true, message: `Event "${event}" acknowledged` };
}

async function handleArticleCompleted(
  body: BywordWebhookBody,
  deliveryId: string,
  overrideStatus?: string
): Promise<{ success: boolean; message: string; articleId?: string }> {
  const articleData = extractArticleData(body);

  if (!articleData) {
    logError(`Byword webhook: no article data in payload, deliveryId=${deliveryId}`, "byword-webhook");
    return { success: false, message: "No article data found in webhook payload" };
  }

  const title = articleData.title;
  const content = articleData.content || articleData.html_content;

  if (!title || !content) {
    logError(`Byword webhook: missing title or content, deliveryId=${deliveryId}, hasTitle=${!!title}, hasContent=${!!content}`, "byword-webhook");
    return { success: false, message: "Article missing title or content" };
  }

  const slug = articleData.slug || slugify(title);
  const status = overrideStatus || articleData.status || "draft";

  try {
    const tags = articleData.tags && articleData.tags.length > 0
      ? articleData.tags
      : articleData.keyword ? [articleData.keyword] : null;

    const article = await storage.upsertArticle({
      title,
      slug,
      contentHtml: content,
      metaDescription: articleData.meta_description || null,
      heroImageUrl: articleData.hero_image_url || null,
      heroImageAlt: articleData.hero_image_alt || null,
      author: articleData.author || null,
      status,
      lang: "en",
      tags,
    });

    logInfo(`Byword webhook: article saved, id=${article.id}, slug=${slug}, status=${status}, deliveryId=${deliveryId}`, "byword-webhook");

    return {
      success: true,
      message: `Article "${title}" saved successfully`,
      articleId: article.id,
    };
  } catch (error) {
    logError(`Byword webhook: failed to save article, deliveryId=${deliveryId}:`, error);
    return { success: false, message: "Failed to save article to database" };
  }
}
