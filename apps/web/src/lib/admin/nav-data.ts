// The few numbers the admin menu needs on every screen: where the fixed pages live and the badge counts.
// The menu is drawn around every admin page, so these are read in parallel and remembered briefly in the
// server instance instead of being queried again for each click.
import { and, inArray, isNull, sql } from "drizzle-orm";
import { schema as s } from "@gio/db";
import { getDb } from "@/lib/db";

function remember<T>(ttlMs: number, load: () => Promise<T>): () => Promise<T> {
  let hit: { at: number; value: T } | null = null;
  return async () => {
    if (hit && Date.now() - hit.at < ttlMs) return hit.value;
    const value = await load();
    hit = { at: Date.now(), value };
    return value;
  };
}

/** Page ids for the pages the menu links to by name: home (slug ''), about-us, contact-us. */
export const fixedPageIds = remember(5 * 60_000, async () => {
  const rows = await getDb()
    .select({ id: s.pages.id, slug: s.pages.slug })
    .from(s.pages)
    .where(and(inArray(s.pages.slug, ["", "about-us", "contact-us"]), isNull(s.pages.deletedAt)));
  return new Map(rows.map((r) => [r.slug, r.id]));
});

/** New contact messages waiting. One round trip; never blocks the page. */
export const badgeCounts = remember(15_000, async () => {
  try {
    const [row] = await getDb().all<{ messages: number }>(sql`select
      (select count(*) from ${s.contactSubmissions} where ${s.contactSubmissions.status} = 'new') as messages`);
    return { messages: Number(row?.messages) || 0 };
  } catch {
    return { messages: 0 };
  }
});
