// The homepage's own sections that have dedicated admin screens (About text, About poster, Instagram)
// and the draft/published state shared by those screens. Draft rows live in `sections`; the website
// reads the last published snapshot, so every change needs the homepage to be published.
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { schema as s, type Db } from "@gio/db";

export type SectionRow = typeof s.sections.$inferSelect;
export type ItemRow = typeof s.sectionItems.$inferSelect;
export type HomeSection = SectionRow & { data: Record<string, unknown> };

export function parseData(json: string): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(json);
    return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function findHomePage(db: Db) {
  const [home] = await db.select().from(s.pages).where(and(eq(s.pages.slug, ""), isNull(s.pages.deletedAt))).limit(1);
  return home ?? null;
}

/** Sections of one homepage block: `rich_text` / `image` rows are told apart by `data.kind`. */
export function pickSections(secs: HomeSection[]) {
  return {
    aboutText: secs.find((x) => x.type === "rich_text" && x.data.kind === "about") ?? null,
    aboutPoster: secs.find((x) => x.type === "image" && x.data.kind === "about_poster") ?? null,
    instagram: secs.find((x) => x.type === "instagram_feed") ?? null,
  };
}

export async function homepageDraft(db: Db) {
  const home = await findHomePage(db);
  if (!home) return null;
  const rows = await db.select().from(s.sections).where(eq(s.sections.pageId, home.id)).orderBy(asc(s.sections.sort), asc(s.sections.id));
  const secs: HomeSection[] = rows.map((r) => ({ ...r, data: parseData(r.dataJson) }));
  const [items, [current]] = await Promise.all([
    secs.length ? db.select().from(s.sectionItems).where(inArray(s.sectionItems.sectionId, secs.map((x) => x.id))).orderBy(asc(s.sectionItems.sort), asc(s.sectionItems.id)) : Promise.resolve([] as ItemRow[]),
    db
      .select({ publishedAt: s.publishedLayouts.publishedAt })
      .from(s.publishedLayouts)
      .where(and(eq(s.publishedLayouts.pageId, home.id), eq(s.publishedLayouts.isCurrent, true)))
      .limit(1),
  ]);
  const lastChange = Math.max(0, ...secs.map((x) => x.updatedAt.getTime()), ...items.map((i) => i.updatedAt.getTime()));
  return { home, secs, items, current: current ?? null, unpublished: !current || lastChange > current.publishedAt.getTime(), ...pickSections(secs) };
}
