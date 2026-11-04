// Saving a section in the admin updates the website at once. The public site reads only the current
// snapshot in `published_layouts`, so every save of a page's sections ends by snapshotting the draft rows.
// (There is no separate "Publish" step for editors; the draft rows stay the source of truth.)
import { and, desc, eq, inArray } from "drizzle-orm";
import { schema as s, type Db } from "@gio/db";
import { publishPageLayout } from "@gio/db/layout";

/** Old snapshots kept per page. Each save adds one, so the table is trimmed now and then. */
const KEEP_SNAPSHOTS = 20;

/** Put the page's draft sections on the website. Call it after the write that changed them. */
export async function goLive(db: Db, pageId: number, userId: string): Promise<void> {
  const layoutId = await publishPageLayout(db, pageId, userId);
  // Trim on every 10th snapshot instead of every save: one query fewer on the hot path.
  if (layoutId % 10 !== 0) return;
  try {
    const old = await db
      .select({ id: s.publishedLayouts.id })
      .from(s.publishedLayouts)
      .where(and(eq(s.publishedLayouts.pageId, pageId), eq(s.publishedLayouts.isCurrent, false)))
      .orderBy(desc(s.publishedLayouts.id))
      .offset(KEEP_SNAPSHOTS)
      .limit(200);
    if (old.length) await db.delete(s.publishedLayouts).where(inArray(s.publishedLayouts.id, old.map((r) => r.id)));
  } catch (e) {
    // Trimming is housekeeping; the save itself already went live.
    console.error("published_layouts trim failed", e);
  }
}
