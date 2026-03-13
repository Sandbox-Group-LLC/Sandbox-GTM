import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";
import { eq } from "drizzle-orm";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const updates = [
  { slug: "event-platform-analytics-vs-gtm-which-is-better", heroImageUrl: "/article-images/event-platform-analytics-vs-gtm.png", heroImageAlt: "Event platform analytics vs GTM" },
  { slug: "how-to-build-an-event-go-to-market-strategy", heroImageUrl: "/article-images/thought-leadership-team-collaboration.png", heroImageAlt: "Team collaboration for event go to market strategy" },
  { slug: "how-to-create-surprise-and-delight-in-human-centric-events", heroImageUrl: "/article-images/surprise-and-delight-hero.jpg", heroImageAlt: "Surprise and delight in human centric events" },
];

async function main() {
  for (const u of updates) {
    await db.update(schema.thoughtLeadershipArticles)
      .set({ heroImageUrl: u.heroImageUrl, heroImageAlt: u.heroImageAlt })
      .where(eq(schema.thoughtLeadershipArticles.slug, u.slug));
    console.log("Updated:", u.slug, "→", u.heroImageUrl);
  }
  await pool.end();
}

main().catch(console.error);
