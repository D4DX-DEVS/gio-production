// The homepage's own sections that have dedicated admin screens (About text, About poster, Instagram).
// The rows live in `sections`; every save snapshots them for the website (see ./live.ts).
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

/** The homepage's sections and items, for the focused homepage screens (About block, Instagram feed). */
export async function homepageDraft(db: Db) {
  const home = await findHomePage(db);
  if (!home) return null;
  const rows = await db.select().from(s.sections).where(eq(s.sections.pageId, home.id)).orderBy(asc(s.sections.sort), asc(s.sections.id));
  const secs: HomeSection[] = rows.map((r) => ({ ...r, data: parseData(r.dataJson) }));
  const items = secs.length ? await db.select().from(s.sectionItems).where(inArray(s.sectionItems.sectionId, secs.map((x) => x.id))).orderBy(asc(s.sectionItems.sort), asc(s.sectionItems.id)) : ([] as ItemRow[]);
  return { home, secs, items, ...pickSections(secs) };
}
