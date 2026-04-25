# Skill: Publish Thought Leadership Article (Sandbox-GTM)

**Purpose:** Add a new article to The Sandbox (Sandbox-GTM's thought leadership blog) given a pasted HTML article from Brian.

**When to use:** Brian pastes article HTML and asks to "add this to the sandbox" / "publish this article" in a Sandbox-GTM context. If he's working in Sandbox-XM, this is the wrong skill — XM has its own publish flow with `forge_import` and `forge_indexnow`.

**Repo:** `Sandbox-Group-LLC/Sandbox-GTM` · branch: `main` (Brian approves every commit)

---

## How articles work in this repo

Articles are **seeded via TypeScript code**, not a CMS write. Every new article is a code change → commit → deploy → server boots → seeder runs → article appears.

- **Seed file:** `server/seed-articles.ts` — exports `SEED_ARTICLES` array
- **Seeder behavior:** runs at server startup, **only inserts if slug doesn't exist** (does not update on subsequent runs — see "Editing existing articles" below)
- **Public listing:** `https://sandbox-gtm.com/the-sandbox`
- **Public article URL:** `https://sandbox-gtm.com/the-sandbox/<slug>`
- **Schema:** `thoughtLeadershipArticles` table in `shared/schema.ts`
- **Admin UI exists** at `/admin/thought-leadership` (super-admin only) — Brian *could* paste articles there, but historically asks Frank to add via code so they're version-controlled.

There is also a **Byword AI** generation path and a **webhook receiver** at `/api/webhooks/byword`. Neither is part of this skill — this skill is for Brian's manually-curated articles.

---

## Required article fields

Every entry in `SEED_ARTICLES` must include:

| Field | Type | Notes |
|---|---|---|
| `slug` | string | kebab-case, derived from title, no trailing punctuation |
| `title` | string | exact article title |
| `status` | `"publish" as const` | always `publish` for production articles |
| `author` | string | `"Brian Morgan"` is the default |
| `metaDescription` | string | from the article's `<meta name="description">` — keep under ~160 chars |
| `heroImageUrl` | string | URL to hero image (typically `v3b.fal.media/...` or `/objects/uploads/...`) |
| `heroImageAlt` | string | alt text — usually mirrors the title |
| `readTimeMinutes` | number | from the byline if present, else estimate (~200 words/min) |
| `tags` | string[] | 5–10 tags, lowercase, no `#` |
| `lang` | string | `"en"` |
| `contentHtml` | string | the **body only** — see "What to strip" below |

---

## What to strip from pasted HTML

Brian typically pastes a full standalone HTML document. Strip everything except the body content:

**Always remove:**
- `<!DOCTYPE>`, `<html>`, `<head>`, `<body>` wrappers
- `<meta>`, `<title>`, `<link rel="canonical">` (data goes into seed fields, not content)
- `<nav class="navbar">` placeholder + `<footer class="site-footer">` placeholder
- The duplicate `<section class="article-hero">` block — it contains the eyebrow, H1 title, byline, and hero `<img>`. The article template renders all of this from seed fields. Including it duplicates the title and hero on the rendered page.
- `<a href="...the-sandbox" class="article-back">Back to Articles</a>` — template provides this
- Wrapping `<section class="article-body-section">` and `<div class="article-body">` — template provides them

**Always keep:**
- `<h2>`, `<h3>` headings
- `<p>` paragraphs
- `<ul>`, `<ol>`, `<li>` lists
- `<blockquote>`, `<strong>`, `<em>`, `<a href>`, `<sup>`, `<hr />`, `<table>`
- Inline footnotes / methodology notes if Brian included them

---

## HTML conventions to enforce

When cleaning the body before saving:

1. **Convert "paragraph-bullets" to real lists.** If the source has `<p>- item one</p><p>- item two</p>` blocks, rewrite as `<ul><li>item one</li><li>item two</li></ul>`. Same for any block where every paragraph starts with a dash, bullet character, or numbered prefix.
2. **HTML entities for special characters.** Use `&mdash;` for em dashes (—), `&ndash;` for en dashes (–), `&rsquo;` for apostrophes when surrounding text is already entity-encoded. If the source uses Unicode characters consistently, leave them alone — don't half-convert. Pick one style per article.
3. **Preserve inline links exactly.** Keep `target="_blank" rel="noopener"` if present.
4. **Don't add the title or hero image.** The article template renders both from seed fields. Including either inside `contentHtml` causes visual duplicates.
5. **Don't add a "Back to Articles" link.** The template provides one.
6. **Wrap `contentHtml` in backticks (template literals)** in TypeScript. The existing seed entries use backticks consistently — match that style for diff cleanliness.

---

## Slug rules

- All lowercase
- Words separated by single hyphens
- No trailing punctuation, no special chars (`?`, `!`, `:`, `,`, `'`, `"`)
- Derive from title: drop articles (a, the) only if it makes the slug awkward; otherwise preserve them
- Max ~80 chars — long titles get the trailing colon-clauses trimmed (e.g. "Multi-Touch Event Attribution vs. Single-Touch: The Real Decision Framework for B2B GTM Teams" → `multi-touch-event-attribution-vs-single-touch-the-real-decision-framework-for-b2b-gtm-teams`)

If the source HTML has a `<link rel="canonical">` URL, use the slug from that URL instead of deriving — Brian has often already chosen the slug.

---

## Step-by-step process

1. **Confirm sandbox.** If Brian's request is ambiguous about which sandbox, ask. GTM = this repo, articles via code. XM = different repo, different flow. Don't guess.
2. **Read the seed file first** — `github_read` on `server/seed-articles.ts`. Capture the current state.
3. **Read the README** — `github_read` on `README.md`. Confirm the article system hasn't changed since this skill was written. Specifically check the "The Sandbox (Thought Leadership Blog)" feature spec.
4. **Extract metadata** from the pasted HTML's `<head>`: title, meta description, canonical URL (for slug), og:image (for `heroImageUrl`).
5. **Extract body content** — everything inside `<section class="article-body-section">` minus the wrapping divs and the back link.
6. **Clean per "HTML conventions" above.** Convert paragraph-bullets to real lists. Pick one entity style. Drop the duplicate hero/title/byline.
7. **Determine read time.** Use the byline's "X min read" if present. If not, count words in the body and divide by 200, round to nearest minute.
8. **Choose tags.** Pull 5–10 from the article's actual content, themes, and target audience. Match the tag style of existing entries in the seed file (lowercase phrases, no hashtags).
9. **Construct the new entry** as a TypeScript object literal matching the existing schema in `seed-articles.ts`. Use `status: "publish" as const`.
10. **Append to `SEED_ARTICLES`.** Use `github_patch` to insert the new entry before the closing `];`. Don't `github_write` the whole file unless multiple entries need editing simultaneously.
11. **Commit message:** `feat: add article — <short title>` or `feat(thought-leadership): add <slug>`.
12. **Tell Brian** the slug, the URL it'll live at (`https://sandbox-gtm.com/the-sandbox/<slug>`), and that Render auto-deploys (2–4 min). Don't poll deploy status unless he asks.

---

## What this skill does NOT do (yet)

These are platform gaps, not skill gaps. Don't try to call these tools for GTM articles:

- **No `forge_import`.** The Forge Intelligence brain-loop auditor is not wired into Sandbox-GTM. Calling `forge_import` for a GTM article will fail or attribute to the wrong project.
- **No `forge_indexnow`.** That tool is hardcoded to `sandbox-xm.com` URLs — it will reject any `sandbox-gtm.com` URL. GTM articles rely on organic crawl until IndexNow is added to the platform.
- **No sitemap update.** GTM doesn't currently maintain a manual sitemap.xml that needs entries added. (If that changes, this skill needs an update.)

If Brian asks for any of those, tell him they're not available for GTM yet and confirm whether he still wants to proceed with just the article publish.

---

## Editing an existing article (slug already exists)

The seeder **only inserts when slug is absent** — it does NOT update existing rows. So editing an already-published article via the seed file alone won't take effect.

Two options when Brian wants to edit:

1. **Recommended for prose changes:** Edit through the admin UI at `/admin/thought-leadership`. The DB row gets updated directly. The seed file stays out of sync but that's harmless — the seeder only fires when the slug is missing entirely (e.g. fresh DB, new environment).
2. **For permanence in code:** Edit the seed file entry **and** ask Brian to update the live row via the admin UI (or run a one-off DB update). Don't rely on the seeder alone for an edit.

If Brian asks to "edit" an existing article and only mentions code changes, flag this gap before committing — otherwise he'll think the change shipped when it didn't.

---

## Worked example

**Brian pastes:** an article titled "Event Lead Handoff SLAs: How to Stop Losing Pipeline to Routing Delays and Context Decay" with hero image `https://v3b.fal.media/files/b/0a97a0fc/A9APJa4mYk9sQi1Yr9OuN_image.png`, 13 min read, body content with `<p>- item</p>` paragraph-bullets in two sections.

**Frank does:**
1. Reads `server/seed-articles.ts`
2. Extracts canonical slug from `<link rel="canonical">`: `event-lead-handoff-slas-how-to-stop-losing-pipeline-to-routing-delays-and-context-decay`
3. Strips DOCTYPE, head, nav, footer, hero `<section>`, body-section wrappers, back link
4. Converts paragraph-bullet blocks to `<ul><li>...</li></ul>`
5. Replaces em dashes with `&mdash;` (matching the source's existing entity-encoded text)
6. Constructs entry with `status: "publish" as const`, `author: "Brian Morgan"`, `readTimeMinutes: 13`, `lang: "en"`, 9 tags
7. `github_patch`es `server/seed-articles.ts` to insert the entry before the closing `];`
8. Commits as `feat: add article — Event Lead Handoff SLAs`
9. Reports back: slug, URL, auto-deploys in 2–4 min

This is the literal flow that produced commit `bb7ca4e`.
