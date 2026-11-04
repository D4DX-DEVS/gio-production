"use server";
// Saving a page's sections and their items. Every write here ends with goLive, so the website shows the
// change at once; the screens call these from a Save button (SectionForm) or a one-click button (ActionButton)
// and get a SaveResult back instead of a redirect, which keeps the editor where they are.
import { and, asc, eq, inArray, max } from "drizzle-orm";
import { PAGE_STATUSES, SECTION_TYPES, type SectionType } from "@gio/db/schema";
import { schema } from "@gio/db";
import { getDb } from "@/lib/db";
import { sanitize } from "@/lib/sanitize";
import { watchUrl, youtubeId } from "@/lib/youtube";
import { audit, done, fail, requireRole } from "@/lib/admin/guard";
import { bool, errorMessage, FormError, int, isRedirect, link, oneOf, req, slugify, str } from "@/lib/admin/form";
import { parseData } from "@/lib/admin/homepage";
import { goLive } from "@/lib/admin/live";
import { runSave, type SaveResult } from "@/lib/admin/result";

const { media, pages, sections, sectionItems } = schema;
const editPath = (pageId: number) => `/admin/pages/${pageId}/`;

/** Section types whose items show an image; a visible item there must have one. */
const IMAGE_ITEMS = new Set<SectionType>(["hero_carousel", "image_banner", "image", "poster_slider", "logo_carousel"]);

export async function savePageMeta(pageId: number, _prev: SaveResult | null, fd: FormData): Promise<SaveResult> {
  const { user } = await requireRole("editor");
  return runSave(async () => {
    const db = getDb();
    const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
    if (!page) throw new FormError("Page not found.");
    // The homepage keeps slug ''.
    const slug = page.slug === "" ? "" : slugify(req(fd, "slug", "Web address"));
    const status = oneOf(fd, "status", PAGE_STATUSES, page.status);
    await db
      .update(pages)
      .set({
        title: req(fd, "title", "Title"),
        slug,
        status,
        publishedAt: status === "published" ? (page.publishedAt ?? new Date()) : page.publishedAt,
        seoTitle: str(fd, "seoTitle"),
        seoDescription: str(fd, "seoDescription"),
        updatedAt: new Date(),
      })
      .where(eq(pages.id, pageId));
    await audit(user.id, "update", "page", pageId, page.title);
    return status === "published" ? "Saved. The page is on the website." : "Saved. The page is not on the website (status is not Published).";
  });
}

async function sectionInPage(pageId: number, sectionId: number) {
  const [sec] = await getDb().select().from(sections).where(and(eq(sections.id, sectionId), eq(sections.pageId, pageId))).limit(1);
  if (!sec) throw new FormError("This section no longer exists. Reload the page.");
  return sec;
}

interface ItemValues {
  mediaId?: number | null;
  heading?: string | null;
  body?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  altText?: string | null;
  openInNewTab: boolean;
  isVisible: boolean;
}

/** One item's fields from a form. Text fields the form did not carry are left alone; videos keep a canonical YouTube link. */
function parseItem(type: SectionType, fd: FormData): ItemValues {
  const v: ItemValues = { isVisible: bool(fd, "isVisible"), openInNewTab: bool(fd, "openInNewTab") };
  for (const f of ["heading", "body", "linkLabel", "altText"] as const) if (fd.has(f)) v[f] = str(fd, f);
  if (type === "featured_video") {
    const id = youtubeId(str(fd, "linkUrl"));
    if (!id) throw new FormError("Paste a YouTube video link, for example https://www.youtube.com/watch?v=… or https://youtu.be/…");
    v.linkUrl = watchUrl(id);
  } else {
    if (fd.has("linkUrl")) v.linkUrl = link(fd, "linkUrl");
    if (fd.has("mediaId")) v.mediaId = int(fd, "mediaId");
  }
  if (v.isVisible && IMAGE_ITEMS.has(type) && v.mediaId === null) throw new FormError("Choose or upload an image before showing this on the website.");
  return v;
}

/** Every chosen image must still be in the library and, where an image is needed, be one. One query for all of them. */
async function verifyMedia(type: SectionType, values: ItemValues[]) {
  const ids = [...new Set(values.map((v) => v.mediaId).filter((x): x is number => typeof x === "number"))];
  if (!ids.length) return;
  const rows = await getDb().select({ id: media.id, kind: media.kind, deletedAt: media.deletedAt, fileStatus: media.fileStatus }).from(media).where(inArray(media.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const id of ids) {
    const m = byId.get(id);
    if (!m || m.deletedAt || m.fileStatus !== "available") throw new FormError("A chosen image is no longer in the library. Choose another.");
    if (IMAGE_ITEMS.has(type) && m.kind !== "image") throw new FormError("Choose an image (not a PDF) here.");
  }
}

/** The fields of one item out of a section form, where each field is named `i<itemId>_<field>`. */
function itemForm(fd: FormData, id: number) {
  const prefix = `i${id}_`;
  const out = new FormData();
  for (const [k, v] of fd.entries()) if (k.startsWith(prefix)) out.append(k.slice(prefix.length), v);
  return out;
}

const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);

/**
 * One Save for a whole section: its heading, whether it shows, its settings and every item in it.
 * Only rows that really changed are written (imported rows keep their updated_at, which the importer reads).
 */
export async function saveSectionBundle(pageId: number, sectionId: number, _prev: SaveResult | null, fd: FormData): Promise<SaveResult> {
  const { user } = await requireRole("editor");
  return runSave(async () => {
    const db = getDb();
    const sec = await sectionInPage(pageId, sectionId);
    let data = parseData(sec.dataJson);

    if (sec.type === "rich_text") {
      if (fd.has("html")) data.html = sanitize(str(fd, "html") ?? "");
    } else if (fd.has("dataJson")) {
      try {
        const parsed: unknown = JSON.parse(str(fd, "dataJson") ?? "{}");
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error();
        data = parsed as Record<string, unknown>;
      } catch {
        throw new FormError("The advanced settings must be a valid JSON object, for example {\"autoplay\": true}.");
      }
    }
    if (sec.type === "hero_carousel" && fd.has("intervalSeconds")) {
      const secs = Number(str(fd, "intervalSeconds"));
      if (!Number.isFinite(secs) || secs < 2 || secs > 30) throw new FormError("Slide time must be between 2 and 30 seconds.");
      data.intervalMs = Math.round(secs * 1000);
    }
    if (sec.type === "featured_video" && fd.has("maxCards")) {
      const n = int(fd, "maxCards");
      if (n === null || n < 1 || n > 12) throw new FormError("Number of videos must be between 1 and 12.");
      data.maxCards = n;
      data.showLatest = bool(fd, "showLatest");
    }

    const existing = await db.select().from(sectionItems).where(eq(sectionItems.sectionId, sectionId));
    const ids = (str(fd, "itemIds") ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && existing.some((e) => e.id === n));
    const parsed = ids.map((id, i) => {
      try {
        return parseItem(sec.type, itemForm(fd, id));
      } catch (e) {
        if (e instanceof FormError && ids.length > 1) throw new FormError(`Item ${i + 1}: ${e.message}`);
        throw e;
      }
    });
    await verifyMedia(sec.type, parsed);

    const now = new Date();
    const dataJson = JSON.stringify(data);
    const isVisible = bool(fd, "isVisible");
    const title = fd.has("title") ? str(fd, "title") : sec.title;
    const writes = [];
    if (!same(title, sec.title) || isVisible !== sec.isVisible || dataJson !== sec.dataJson) {
      writes.push(db.update(sections).set({ title, isVisible, dataJson, updatedAt: now }).where(eq(sections.id, sectionId)));
    }
    ids.forEach((id, i) => {
      const old = existing.find((e) => e.id === id)!;
      const v = parsed[i];
      const changed = (Object.keys(v) as (keyof ItemValues)[]).some((k) => !same(v[k], old[k]));
      if (changed) writes.push(db.update(sectionItems).set({ ...v, updatedAt: now }).where(eq(sectionItems.id, id)));
    });
    if (writes.length) await db.batch(writes as unknown as [never, ...never[]]);
    await audit(user.id, "update", "section", sectionId, `page ${pageId}, ${sec.type}${ids.length ? `, ${ids.length} item${ids.length === 1 ? "" : "s"}` : ""}`);
    await goLive(db, pageId, user.id);
  });
}

/** Insert a new section at the end. It starts hidden, so an empty block never reaches the website. */
async function insertSection(pageId: number, type: SectionType, title: string | null, userId: string) {
  const db = getDb();
  const [{ m }] = await db.select({ m: max(sections.sort) }).from(sections).where(eq(sections.pageId, pageId));
  const [row] = await db
    .insert(sections)
    .values({ pageId, type, title, dataJson: type === "rich_text" ? JSON.stringify({ html: "" }) : "{}", sort: (m ?? 0) + 10, isVisible: false, source: "manual" })
    .returning({ id: sections.id });
  await audit(userId, "create", "section", row.id, `page ${pageId}, ${type}`);
  return row.id;
}

/** The "Add a section" form of the page editor. */
export async function addSection(pageId: number, _prev: SaveResult | null, fd: FormData): Promise<SaveResult> {
  const { user } = await requireRole("editor");
  return runSave(async () => {
    const id = await insertSection(pageId, oneOf(fd, "type", SECTION_TYPES, "rich_text"), str(fd, "title"), user.id);
    return { message: "Section added at the bottom of the page. It is hidden until you fill it in and switch it on.", id };
  });
}

/** "Add" for a block the home page does not have yet (the focused home page screens). */
export async function createSection(pageId: number, type: SectionType): Promise<SaveResult> {
  const { user } = await requireRole("editor");
  return runSave(async () => {
    if (!(SECTION_TYPES as readonly string[]).includes(type)) throw new FormError("That kind of section does not exist.");
    await insertSection(pageId, type, null, user.id);
    return "Section added. It is hidden until you add something to it and switch it on.";
  });
}

export async function deleteSection(pageId: number, sectionId: number): Promise<SaveResult> {
  const { user } = await requireRole("admin");
  return runSave(async () => {
    const db = getDb();
    await db.delete(sections).where(and(eq(sections.id, sectionId), eq(sections.pageId, pageId)));
    await audit(user.id, "delete", "section", sectionId, `page ${pageId}`);
    await goLive(db, pageId, user.id);
    return "Section deleted. It is gone from the website.";
  });
}

/** Swap a section with its neighbour (dir -1 = higher on the page). Only the two rows change. */
export async function moveSectionBy(pageId: number, sectionId: number, dir: -1 | 1): Promise<SaveResult> {
  const { user } = await requireRole("editor");
  return runSave(async () => {
    const db = getDb();
    const all = await db.select({ id: sections.id, sort: sections.sort }).from(sections).where(eq(sections.pageId, pageId)).orderBy(asc(sections.sort), asc(sections.id));
    const i = all.findIndex((r) => r.id === sectionId);
    const j = i + dir;
    if (i < 0) throw new FormError("This section no longer exists. Reload the page.");
    if (j < 0 || j >= all.length) return "It is already there.";
    const [a, b] = [all[i], all[j]];
    const now = new Date();
    if (a.sort !== b.sort) {
      await db.batch([db.update(sections).set({ sort: b.sort, updatedAt: now }).where(eq(sections.id, a.id)), db.update(sections).set({ sort: a.sort, updatedAt: now }).where(eq(sections.id, b.id))]);
    } else {
      [all[i], all[j]] = [b, a];
      await db.batch(all.map((r, k) => db.update(sections).set({ sort: (k + 1) * 10, updatedAt: now }).where(eq(sections.id, r.id))) as [never, ...never[]]);
    }
    await audit(user.id, "reorder", "section", sectionId, `page ${pageId}, ${dir < 0 ? "up" : "down"}`);
    await goLive(db, pageId, user.id);
    return "Moved. The website shows the new order.";
  });
}

async function itemInPage(pageId: number, itemId: number) {
  const [row] = await getDb()
    .select({ id: sectionItems.id, sectionId: sectionItems.sectionId, sort: sectionItems.sort, type: sections.type })
    .from(sectionItems)
    .innerJoin(sections, eq(sections.id, sectionItems.sectionId))
    .where(and(eq(sectionItems.id, itemId), eq(sections.pageId, pageId)))
    .limit(1);
  if (!row) throw new FormError("This item no longer exists. Reload the page.");
  return row;
}

/** Add an item at the end of a section, from the "Add" form under it. The form's fields are checked like a save. */
export async function addItem(pageId: number, sectionId: number, _prev: SaveResult | null, fd: FormData): Promise<SaveResult> {
  const { user } = await requireRole("editor");
  return runSave(async () => {
    const db = getDb();
    const sec = await sectionInPage(pageId, sectionId);
    const values = parseItem(sec.type, fd);
    await verifyMedia(sec.type, [values]);
    const [{ m }] = await db.select({ m: max(sectionItems.sort) }).from(sectionItems).where(eq(sectionItems.sectionId, sectionId));
    const [row] = await db
      .insert(sectionItems)
      .values({ ...values, sectionId, sort: (m ?? 0) + 10, source: "manual" })
      .returning({ id: sectionItems.id });
    await audit(user.id, "create", "section_item", row.id, `page ${pageId}, ${sec.type}`);
    await goLive(db, pageId, user.id);
    return values.isVisible ? "Added. It is on the website now." : "Added, but hidden: it is not on the website until you switch it on.";
  });
}

/** A blank, hidden item (the page editor's "Add picture"): nothing reaches the website until it is filled in and shown. */
export async function addBlankItem(pageId: number, sectionId: number): Promise<SaveResult> {
  const { user } = await requireRole("editor");
  return runSave(async () => {
    const db = getDb();
    await sectionInPage(pageId, sectionId);
    const [{ m }] = await db.select({ m: max(sectionItems.sort) }).from(sectionItems).where(eq(sectionItems.sectionId, sectionId));
    const [row] = await db
      .insert(sectionItems)
      .values({ sectionId, sort: (m ?? 0) + 10, isVisible: false, source: "manual" })
      .returning({ id: sectionItems.id });
    await audit(user.id, "create", "section_item", row.id, `page ${pageId}, blank`);
    return "A blank item was added at the end. Fill it in, switch it on and save.";
  });
}

/** Turn the video chosen on the old site into a real, editable item of the Watch block. */
export async function adoptLegacyVideo(pageId: number, sectionId: number): Promise<SaveResult> {
  const { user } = await requireRole("editor");
  return runSave(async () => {
    const db = getDb();
    const sec = await sectionInPage(pageId, sectionId);
    const id = youtubeId(String(parseData(sec.dataJson).youtubeId ?? ""));
    if (sec.type !== "featured_video" || !id) throw new FormError("There is no old video to add.");
    const [row] = await db.insert(sectionItems).values({ sectionId, sort: 10, isVisible: true, linkUrl: watchUrl(id), source: "manual" }).returning({ id: sectionItems.id });
    await audit(user.id, "create", "section_item", row.id, `page ${pageId}, video from old site`);
    await goLive(db, pageId, user.id);
    return "Added to the list. The website shows it now.";
  });
}

/**
 * Swap an item with its neighbour (dir -1 = earlier, 1 = later). Only the two rows change, so
 * imported items elsewhere keep their updated_at (the importer reads it to detect admin edits).
 * Equal sort values cannot be swapped, so then the section is renumbered 10, 20, …
 */
export async function moveItem(pageId: number, itemId: number, dir: -1 | 1): Promise<SaveResult> {
  const { user } = await requireRole("editor");
  return runSave(async () => {
    const db = getDb();
    const item = await itemInPage(pageId, itemId);
    const all = await db
      .select({ id: sectionItems.id, sort: sectionItems.sort })
      .from(sectionItems)
      .where(eq(sectionItems.sectionId, item.sectionId))
      .orderBy(asc(sectionItems.sort), asc(sectionItems.id));
    const i = all.findIndex((r) => r.id === itemId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= all.length) return "It is already there.";
    const [a, b] = [all[i], all[j]];
    const now = new Date();
    if (a.sort !== b.sort) {
      await db.batch([
        db.update(sectionItems).set({ sort: b.sort, updatedAt: now }).where(eq(sectionItems.id, a.id)),
        db.update(sectionItems).set({ sort: a.sort, updatedAt: now }).where(eq(sectionItems.id, b.id)),
      ]);
    } else {
      [all[i], all[j]] = [b, a];
      await db.batch(all.map((r, k) => db.update(sectionItems).set({ sort: (k + 1) * 10, updatedAt: now }).where(eq(sectionItems.id, r.id))) as [never, ...never[]]);
    }
    await audit(user.id, "reorder", "section_item", itemId, `page ${pageId}, ${dir < 0 ? "up" : "down"}`);
    await goLive(db, pageId, user.id);
    return "Moved. The website shows the new order.";
  });
}

export async function deleteItem(pageId: number, itemId: number): Promise<SaveResult> {
  const { user } = await requireRole("admin");
  return runSave(async () => {
    const db = getDb();
    await itemInPage(pageId, itemId);
    await db.delete(sectionItems).where(eq(sectionItems.id, itemId));
    await audit(user.id, "delete", "section_item", itemId, `page ${pageId}`);
    await goLive(db, pageId, user.id);
    return "Deleted. It is gone from the website. The image stays in the library.";
  });
}

/** New, empty section page. It starts as a draft, so nothing appears on the website until its status is Published. */
export async function createPage(fd: FormData) {
  const { user } = await requireRole("admin");
  const back = "/admin/pages/new/";
  let newId = 0;
  try {
    const title = req(fd, "title", "Title");
    const slug = slugify(str(fd, "slug") ?? title);
    if (!slug) throw new FormError("Address is empty. Type one using letters or numbers.");
    const [taken] = await getDb().select({ id: pages.id }).from(pages).where(eq(pages.slug, slug)).limit(1);
    if (taken) throw new FormError(`The address /${slug}/ is already used by another page.`);
    const [row] = await getDb().insert(pages).values({ title, slug, template: "sections", status: "draft", source: "manual" }).returning({ id: pages.id });
    newId = row.id;
    await audit(user.id, "create", "page", newId, title);
  } catch (e) {
    if (isRedirect(e)) throw e;
    fail(back, errorMessage(e));
  }
  done(editPath(newId), "Page created as a draft. Add sections below, then set its status to Published.");
}

/** Soft delete: the page leaves the website and the admin lists, its sections stay in the database. */
export async function deletePage(pageId: number) {
  const { user } = await requireRole("admin");
  try {
    const [page] = await getDb().select().from(pages).where(eq(pages.id, pageId)).limit(1);
    if (!page) throw new FormError("Page not found.");
    if (page.slug === "") throw new FormError("The homepage cannot be deleted.");
    if (page.template !== "sections" && page.template !== "embed") throw new FormError("This page is built by the website itself (leaders, contact or news list) and cannot be deleted. Set it to Draft to hide it.");
    await getDb().update(pages).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(pages.id, pageId));
    await audit(user.id, "delete", "page", pageId, page.title);
  } catch (e) {
    if (isRedirect(e)) throw e;
    fail("/admin/pages/", errorMessage(e));
  }
  done("/admin/pages/", "Page moved to trash.");
}
