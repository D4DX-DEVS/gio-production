"use server";
// Save and delete for the three homepage blocks with their own screens: About text, About poster
// (the picture on its right) and the Instagram feed, plus the order-and-look builder. Like every page edit
// they end with goLive, so the website changes the moment the editor saves.
import { and, eq, gte, inArray, max, sql } from "drizzle-orm";
import { schema as s } from "@gio/db";
import { getDb } from "@/lib/db";
import { sanitize } from "@/lib/sanitize";
import { audit, requireRole } from "@/lib/admin/guard";
import { bool, errorMessage, FormError, int, isRedirect, link, oneOf, str } from "@/lib/admin/form";
import { findHomePage, parseData, type HomeSection, pickSections } from "@/lib/admin/homepage";
import { groupSections, loadBuilderState, type Group } from "@/lib/admin/homepage-builder";
import { NEWS_KEY, type BuilderResult } from "@/lib/admin/homepage-blocks";
import { goLive } from "@/lib/admin/live";
import { runSave, type SaveResult } from "@/lib/admin/result";
import { BG_OPTIONS, DEFAULT_STYLE, DEVICE_OPTIONS, SPACE_OPTIONS, readStyle } from "@/lib/section-style";

/** The homepage and its current sections (with parsed data). */
async function load() {
  const db = getDb();
  const home = await findHomePage(db);
  if (!home) throw new FormError("There is no homepage in the database yet.");
  const rows = await db.select().from(s.sections).where(eq(s.sections.pageId, home.id));
  const secs: HomeSection[] = rows.map((r) => ({ ...r, data: parseData(r.dataJson) }));
  return { db, home, secs, ...pickSections(secs) };
}

/** Sort value that puts a new section right after the banner(s) at the top of the page. */
async function sortAfterBanners(pageId: number) {
  const [row] = await getDb()
    .select({ m: max(s.sections.sort) })
    .from(s.sections)
    .where(and(eq(s.sections.pageId, pageId), inArray(s.sections.type, ["hero_carousel", "image_banner"])));
  return (row?.m ?? 0) + 1;
}

export async function saveAboutText(_prev: SaveResult | null, fd: FormData): Promise<SaveResult> {
  const { user } = await requireRole("editor");
  return runSave(async () => {
    const { db, home, aboutText } = await load();
    const heading = str(fd, "heading");
    const html = sanitize(str(fd, "html") ?? "");
    if (!heading && !html) throw new FormError("Add a heading or some text.");
    const buttonLabel = str(fd, "buttonLabel");
    const buttonUrl = link(fd, "buttonUrl");
    if (buttonLabel && !buttonUrl) throw new FormError("The button needs a link, for example /about-us/.");
    const data = { kind: "about", heading, html, buttonLabel, buttonUrl };
    if (aboutText) {
      await db.update(s.sections).set({ title: null, isVisible: bool(fd, "isVisible"), dataJson: JSON.stringify(data), updatedAt: new Date() }).where(eq(s.sections.id, aboutText.id));
      await audit(user.id, "update", "section", aboutText.id, "homepage about text");
    } else {
      const [row] = await db
        .insert(s.sections)
        .values({ pageId: home.id, type: "rich_text", dataJson: JSON.stringify(data), sort: await sortAfterBanners(home.id), isVisible: bool(fd, "isVisible"), source: "manual" })
        .returning({ id: s.sections.id });
      await audit(user.id, "create", "section", row.id, "homepage about text");
    }
    await goLive(db, home.id, user.id);
  });
}

export async function deleteAboutText(): Promise<SaveResult> {
  const { user } = await requireRole("admin");
  return runSave(async () => {
    const { db, home, aboutText } = await load();
    if (!aboutText) throw new FormError("There is no About text to delete.");
    await db.delete(s.sections).where(eq(s.sections.id, aboutText.id));
    await audit(user.id, "delete", "section", aboutText.id, "homepage about text");
    await goLive(db, home.id, user.id);
    return "About text deleted. It is gone from the website.";
  });
}

export async function saveAboutPoster(_prev: SaveResult | null, fd: FormData): Promise<SaveResult> {
  const { user } = await requireRole("editor");
  return runSave(async () => {
    const { db, home, aboutPoster, aboutText } = await load();
    const mediaId = int(fd, "mediaId");
    const isVisible = bool(fd, "isVisible");
    if (mediaId === null) throw new FormError("Choose or upload a poster image.");
    const [m] = await db.select({ kind: s.media.kind, deletedAt: s.media.deletedAt, fileStatus: s.media.fileStatus }).from(s.media).where(eq(s.media.id, mediaId)).limit(1);
    if (!m || m.deletedAt || m.fileStatus !== "available") throw new FormError("The chosen image is no longer in the library. Choose another.");
    if (m.kind !== "image") throw new FormError("Choose an image (not a PDF).");
    const values = { mediaId, altText: str(fd, "altText"), linkUrl: link(fd, "linkUrl"), isVisible, updatedAt: new Date() };
    let sectionId = aboutPoster?.id ?? 0;
    if (aboutPoster) {
      await db.update(s.sections).set({ isVisible, updatedAt: new Date() }).where(eq(s.sections.id, aboutPoster.id));
    } else {
      const [row] = await db
        .insert(s.sections)
        .values({ pageId: home.id, type: "image", dataJson: JSON.stringify({ kind: "about_poster" }), sort: aboutText?.sort ?? (await sortAfterBanners(home.id)), isVisible, source: "manual" })
        .returning({ id: s.sections.id });
      sectionId = row.id;
    }
    const [item] = await db.select({ id: s.sectionItems.id }).from(s.sectionItems).where(eq(s.sectionItems.sectionId, sectionId)).limit(1);
    if (item) await db.update(s.sectionItems).set(values).where(eq(s.sectionItems.id, item.id));
    else await db.insert(s.sectionItems).values({ sectionId, sort: 1, ...values, source: "manual" });
    await audit(user.id, aboutPoster ? "update" : "create", "section", sectionId, "homepage about poster");
    await goLive(db, home.id, user.id);
  });
}

export async function deleteAboutPoster(): Promise<SaveResult> {
  const { user } = await requireRole("admin");
  return runSave(async () => {
    const { db, home, aboutPoster } = await load();
    if (!aboutPoster) throw new FormError("There is no poster to delete.");
    await db.delete(s.sections).where(eq(s.sections.id, aboutPoster.id));
    await audit(user.id, "delete", "section", aboutPoster.id, "homepage about poster");
    await goLive(db, home.id, user.id);
    return "Poster deleted. It is gone from the website.";
  });
}

export async function saveInstagram(_prev: SaveResult | null, fd: FormData): Promise<SaveResult> {
  const { user } = await requireRole("editor");
  return runSave(async () => {
    const { db, home, secs, instagram } = await load();
    const raw = str(fd, "profileUrl") ?? "";
    const handle = raw.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1] ?? (/^@?[A-Za-z0-9._]+$/.test(raw) ? raw.replace(/^@/, "") : null);
    if (!handle) throw new FormError("Paste the Instagram page link, for example https://www.instagram.com/gio_keralam/");
    const count = int(fd, "count") ?? 8;
    if (count < 4 || count > 12) throw new FormError("Posts to show must be between 4 and 12.");
    const data = { ...(instagram?.data ?? {}), handle, profileUrl: `https://www.instagram.com/${handle}/`, count, mode: "embed" };
    const title = str(fd, "title");
    if (instagram) {
      await db.update(s.sections).set({ title, isVisible: bool(fd, "isVisible"), dataJson: JSON.stringify(data), updatedAt: new Date() }).where(eq(s.sections.id, instagram.id));
      await audit(user.id, "update", "section", instagram.id, "homepage instagram");
    } else {
      // New feeds go right above the Posters row; without one, after the other blocks and before the logo row.
      const posters = secs.find((x) => x.type === "poster_slider");
      let sort: number;
      if (posters) {
        sort = posters.sort;
        await db.update(s.sections).set({ sort: sql`${s.sections.sort} + 1` }).where(and(eq(s.sections.pageId, home.id), gte(s.sections.sort, sort)));
      } else {
        sort = Math.max(0, ...secs.filter((x) => x.type !== "logo_carousel").map((x) => x.sort)) + 1;
      }
      const [row] = await db
        .insert(s.sections)
        .values({ pageId: home.id, type: "instagram_feed", title, dataJson: JSON.stringify(data), sort, isVisible: bool(fd, "isVisible"), source: "manual" })
        .returning({ id: s.sections.id });
      await audit(user.id, "create", "section", row.id, "homepage instagram");
    }
    await goLive(db, home.id, user.id);
  });
}

export async function deleteInstagram(): Promise<SaveResult> {
  const { user } = await requireRole("admin");
  return runSave(async () => {
    const { db, home, instagram } = await load();
    if (!instagram) throw new FormError("There is no Instagram section to delete.");
    await db.delete(s.sections).where(eq(s.sections.id, instagram.id));
    await audit(user.id, "delete", "section", instagram.id, "homepage instagram");
    await goLive(db, home.id, user.id);
    return "Instagram section deleted. It is gone from the website.";
  });
}

// ---------------------------------------------------------------------------
// Home page builder (order and look). These are called from the builder screen (not from a <form>), so they return
// the fresh builder state instead of redirecting, and report problems as { ok: false } instead of a flash.
// Every successful change goes live at once (see build()).
// ---------------------------------------------------------------------------

type DbHandle = ReturnType<typeof getDb>;

/** Run a builder write: errors become a result the screen shows, redirects (sign-in, role) pass through. */
async function build(pageId: number, message: string, fn: (db: DbHandle, userId: string) => Promise<string | void>, minRole: "editor" | "admin" = "editor"): Promise<BuilderResult> {
  const { user } = await requireRole(minRole);
  const db = getDb();
  try {
    const home = await findHomePage(db);
    if (!home || home.id !== pageId) throw new FormError("This is not the homepage.");
    const key = await fn(db, user.id);
    await goLive(db, home.id, user.id);
    return { ok: true, message, key: key || undefined, state: await loadBuilderState(db, home.id) };
  } catch (e) {
    if (isRedirect(e)) throw e;
    // Send the current state back too, so the screen drops any change it showed ahead of the save.
    const state = await loadBuilderState(db, pageId).catch(() => undefined);
    return { ok: false, message: errorMessage(e), state };
  }
}

async function homeGroups(db: DbHandle, pageId: number) {
  const rows = await db.select().from(s.sections).where(eq(s.sections.pageId, pageId));
  return groupSections(rows);
}

/** The "latest news" block has no row until the editor first moves or changes it; this saves it. */
async function ensureNewsRow(db: DbHandle, pageId: number, userId: string): Promise<Group> {
  const groups = await homeGroups(db, pageId);
  const existing = groups.find((g) => g.kind === "news");
  if (existing) return existing;
  const [{ m }] = await db.select({ m: max(s.sections.sort) }).from(s.sections).where(eq(s.sections.pageId, pageId));
  const [row] = await db.insert(s.sections).values({ pageId, type: "latest_posts", dataJson: "{}", sort: (m ?? 0) + 10, source: "manual" }).returning({ id: s.sections.id });
  await audit(userId, "create", "section", row.id, "homepage latest news");
  const after = await homeGroups(db, pageId);
  return after.find((g) => g.primary.id === row.id)!;
}

async function resolveGroup(db: DbHandle, pageId: number, key: string, userId: string): Promise<Group> {
  if (key === NEWS_KEY) return ensureNewsRow(db, pageId, userId);
  const g = (await homeGroups(db, pageId)).find((x) => x.key === key);
  if (!g) throw new FormError("That section no longer exists. Reload the page.");
  return g;
}

/**
 * Put the blocks in the given order. Sort numbers become 10, 20, 30… (the second row of the About
 * block gets +1 so text and poster stay together). Only rows whose number changes are written, so
 * imported rows elsewhere keep their updated_at. The website draws "Our initiatives" last, so it stays last.
 */
async function applyOrder(db: DbHandle, pageId: number, userId: string, keys: string[]) {
  if (keys.includes(NEWS_KEY)) await ensureNewsRow(db, pageId, userId);
  const groups = await homeGroups(db, pageId);
  const find = (k: string) => (k === NEWS_KEY ? groups.find((g) => g.kind === "news") : groups.find((g) => g.key === k));
  const seen = new Set<Group>();
  const ordered: Group[] = [];
  for (const k of keys) {
    const g = find(k);
    if (g && !seen.has(g)) {
      seen.add(g);
      ordered.push(g);
    }
  }
  for (const g of groups) if (!seen.has(g)) ordered.push(g); // anything the screen did not know about keeps its place at the end
  const final = [...ordered.filter((g) => g.kind !== "logos"), ...ordered.filter((g) => g.kind === "logos")];
  const now = new Date();
  const writes = final.flatMap((g, i) =>
    g.rows.flatMap((r, j) => {
      const sort = (i + 1) * 10 + j;
      return r.sort === sort ? [] : [getDb().update(s.sections).set({ sort, updatedAt: now }).where(eq(s.sections.id, r.id))];
    }),
  );
  if (writes.length) await db.batch(writes as unknown as [never, ...never[]]);
  if (writes.length) await audit(userId, "reorder", "section", final[0]?.primary.id ?? 0, `homepage order: ${final.map((g) => g.kind).join(", ")}`);
}

/** Set the whole order at once (drag and drop). `keys` are builder block keys, top to bottom. */
export async function reorderSections(pageId: number, keys: string[]): Promise<BuilderResult> {
  return build(pageId, "Order saved. The website shows it now.", async (db, userId) => {
    if (!Array.isArray(keys) || keys.some((k) => typeof k !== "string")) throw new FormError("The order could not be read.");
    await applyOrder(db, pageId, userId, keys);
  });
}

/** Move one block to a position (0 = top). Arrow buttons and "Move to top / bottom" use this. */
export async function moveSection(pageId: number, key: string, toIndex: number): Promise<BuilderResult> {
  return build(pageId, "Order saved. The website shows it now.", async (db, userId) => {
    const state = await loadBuilderState(db, pageId);
    const keys = state.blocks.map((b) => b.key);
    // "news" is the placeholder key of the latest-news block before it has a row; after that it has its own key.
    const k = key === NEWS_KEY ? (state.blocks.find((b) => b.kind === "news")?.key ?? key) : key;
    const from = keys.indexOf(k);
    if (from < 0) throw new FormError("That section no longer exists. Reload the page.");
    const to = Math.max(0, Math.min(keys.length - 1, Math.trunc(Number(toIndex)) || 0));
    keys.splice(from, 1);
    keys.splice(to, 0, k);
    await applyOrder(db, pageId, userId, keys);
    return k;
  });
}

/** Show or hide a block on the website (every row of it). */
export async function setBlockVisible(pageId: number, key: string, visible: boolean): Promise<BuilderResult> {
  return build(pageId, visible ? "Shown. It is on the website now." : "Hidden. It is off the website now.", async (db, userId) => {
    const g = await resolveGroup(db, pageId, key, userId);
    await db.update(s.sections).set({ isVisible: !!visible, updatedAt: new Date() }).where(inArray(s.sections.id, g.rows.map((r) => r.id)));
    await audit(userId, "update", "section", g.primary.id, `homepage ${visible ? "show" : "hide"} ${g.kind}`);
    return g.key;
  });
}

/**
 * Look and options of one block, from the Customize panel. Only the fields present in the form change:
 *   bg, space, device       -> data.style
 *   intro, showTitle        -> data.intro, data.showTitle
 *   title                   -> sections.title (the heading the website shows)
 *   intervalSeconds         -> slideshow slide time (2 to 30 seconds)
 *   maxCards, showLatest    -> videos block (1 to 12 cards)
 * Other keys in the section's data are left alone.
 */
export async function saveSectionStyle(pageId: number, key: string, fd: FormData): Promise<BuilderResult> {
  return build(pageId, "Saved. The website shows it now.", async (db, userId) => {
    const g = await resolveGroup(db, pageId, key, userId);
    const row = g.primary;
    const data = parseData(row.dataJson);
    const set: { title?: string | null; dataJson?: string } = {};

    if (fd.has("bg") || fd.has("space") || fd.has("device")) {
      const cur = readStyle(data);
      const next = {
        bg: fd.has("bg") ? oneOf(fd, "bg", BG_OPTIONS, cur.bg) : cur.bg,
        space: fd.has("space") ? oneOf(fd, "space", SPACE_OPTIONS, cur.space) : cur.space,
        device: fd.has("device") ? oneOf(fd, "device", DEVICE_OPTIONS, cur.device) : cur.device,
      };
      if (next.bg === DEFAULT_STYLE.bg && next.space === DEFAULT_STYLE.space && next.device === DEFAULT_STYLE.device) delete data.style;
      else data.style = next;
    }
    if (fd.has("intro")) {
      const intro = (str(fd, "intro") ?? "").slice(0, 240);
      if (intro) data.intro = intro;
      else delete data.intro;
    }
    if (fd.has("showTitle")) {
      if (str(fd, "showTitle") === "0") data.showTitle = false;
      else delete data.showTitle;
    }
    if (fd.has("title")) {
      const title = (str(fd, "title") ?? "").slice(0, 120);
      set.title = title || null;
    }
    if (fd.has("intervalSeconds")) {
      if (row.type !== "hero_carousel") throw new FormError("Only the banner slideshow has a slide time.");
      const secs = Number(str(fd, "intervalSeconds"));
      if (!Number.isFinite(secs) || secs < 2 || secs > 30) throw new FormError("Slide time must be between 2 and 30 seconds.");
      data.intervalMs = Math.round(secs * 1000);
    }
    if (fd.has("maxCards")) {
      if (row.type !== "featured_video") throw new FormError("Only the videos block has a number of videos.");
      const n = int(fd, "maxCards");
      if (n === null || n < 1 || n > 12) throw new FormError("Number of videos must be between 1 and 12.");
      data.maxCards = n;
    }
    if (fd.has("showLatest")) {
      if (row.type !== "featured_video") throw new FormError("Only the videos block can fill from YouTube.");
      data.showLatest = str(fd, "showLatest") === "1";
    }
    await db.update(s.sections).set({ ...set, dataJson: JSON.stringify(data), updatedAt: new Date() }).where(eq(s.sections.id, row.id));
    await audit(userId, "update", "section", row.id, `homepage ${g.kind} style`);
    return g.key;
  });
}

/** Add a block from the "Add" menu. Only the kinds that make sense to add by themselves are offered. */
export async function addHomeSection(pageId: number, type: "latest_posts" | "rich_text"): Promise<BuilderResult> {
  return build(pageId, type === "latest_posts" ? "Latest news added. The website shows it now." : "Text block added. It stays hidden until you write something in it.", async (db, userId) => {
    if (type === "latest_posts") {
      const groups = await homeGroups(db, pageId);
      if (groups.some((g) => g.kind === "news")) throw new FormError("The homepage already has a latest news block.");
      const g = await ensureNewsRow(db, pageId, userId);
      return g.key;
    }
    if (type !== "rich_text") throw new FormError("That kind of block cannot be added here.");
    const [{ m }] = await db.select({ m: max(s.sections.sort) }).from(s.sections).where(eq(s.sections.pageId, pageId));
    const [row] = await db
      .insert(s.sections)
      .values({ pageId, type: "rich_text", dataJson: JSON.stringify({ html: "" }), sort: (m ?? 0) + 10, isVisible: false, source: "manual" })
      .returning({ id: s.sections.id });
    await audit(userId, "create", "section", row.id, "homepage text block");
    const state = await loadBuilderState(db, pageId);
    await applyOrder(db, pageId, userId, state.blocks.map((b) => b.key));
    return `s${row.id}`;
  });
}
