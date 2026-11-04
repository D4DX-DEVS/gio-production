// Server side of the home page builder: turns the homepage's draft `sections` rows into builder blocks.
// Used by the page (first render) and by every builder action (the fresh state it returns).
import { and, asc, eq, inArray } from "drizzle-orm";
import { schema as s, type Db } from "@gio/db";
import { parseData } from "@/lib/admin/homepage";
import { readIntro, readShowTitle, readStyle } from "@/lib/section-style";
import { NEWS_KEY, type BlockKind, type BuilderBlock, type BuilderState } from "@/lib/admin/homepage-blocks";

type SectionRow = typeof s.sections.$inferSelect;

/** A block's database rows. `primary` carries the block's style, title and options. */
export interface Group {
  key: string;
  kind: BlockKind;
  rows: SectionRow[];
  primary: SectionRow;
  sort: number;
}

const rowKind = (r: SectionRow, data: Record<string, unknown>): BlockKind => {
  switch (r.type) {
    case "hero_carousel":
      return "slides";
    case "image_banner":
      return "wide_banner";
    case "rich_text":
      return data.kind === "about" ? "about" : "text";
    case "image":
      return data.kind === "about_poster" ? "about" : "other";
    case "instagram_feed":
      return "instagram";
    case "poster_slider":
      return "posters";
    case "featured_video":
      return "videos";
    case "logo_carousel":
      return "logos";
    case "latest_posts":
      return "news";
    default:
      return "other";
  }
};

/** Rows in page order, with the About text and its poster joined into one block. */
export function groupSections(rows: SectionRow[]): Group[] {
  const sorted = [...rows].sort((a, b) => a.sort - b.sort || a.id - b.id);
  const aboutText = sorted.find((r) => r.type === "rich_text" && parseData(r.dataJson).kind === "about");
  const aboutPoster = sorted.find((r) => r.type === "image" && parseData(r.dataJson).kind === "about_poster");
  const groups: Group[] = [];
  for (const r of sorted) {
    if (r === aboutPoster && aboutText) continue;
    const members = r === aboutText && aboutPoster ? [aboutText, aboutPoster] : [r];
    groups.push({ key: `s${r.id}`, kind: rowKind(r, parseData(r.dataJson)), rows: members, primary: r, sort: r.sort });
  }
  return groups;
}

/** Where the website puts the latest news when the draft has no row for it: after the first text block. */
function defaultNewsIndex(groups: Group[]): number {
  const i = groups.findIndex((g) => g.rows.some((r) => r.type === "rich_text"));
  return (i >= 0 ? i : 0) + 1;
}

const EDIT: Record<BlockKind, { href: string | null; label: string }> = {
  slides: { href: "/admin/homepage/banners/", label: "Edit the banners" },
  wide_banner: { href: "/admin/homepage/banners/", label: "Edit the banner" },
  about: { href: "/admin/homepage/about/", label: "Edit the text and poster" },
  instagram: { href: "/admin/homepage/instagram/", label: "Edit the feed" },
  posters: { href: "/admin/homepage/posters/", label: "Edit the posters" },
  videos: { href: "/admin/homepage/videos/", label: "Edit the videos" },
  logos: { href: "/admin/homepage/initiatives/", label: "Edit the logos" },
  news: { href: "/admin/posts/", label: "Open the news list" },
  text: { href: null, label: "Edit the text" },
  other: { href: null, label: "Edit the section" },
};

const NAME: Record<BlockKind, string> = {
  slides: "Banner slideshow",
  wide_banner: "Wide banner",
  about: "About",
  instagram: "Instagram feed",
  posters: "Posters",
  videos: "Videos",
  logos: "Our initiatives",
  news: "Latest news",
  text: "Text block",
  other: "Section",
};

export async function loadBuilderState(db: Db, homeId: number): Promise<BuilderState> {
  const rows = await db.select().from(s.sections).where(eq(s.sections.pageId, homeId)).orderBy(asc(s.sections.sort), asc(s.sections.id));
  const items = rows.length
    ? await db
        .select({ sectionId: s.sectionItems.sectionId, isVisible: s.sectionItems.isVisible, updatedAt: s.sectionItems.updatedAt })
        .from(s.sectionItems)
        .where(inArray(s.sectionItems.sectionId, rows.map((r) => r.id)))
    : [];
  const [current] = await db
    .select({ publishedAt: s.publishedLayouts.publishedAt })
    .from(s.publishedLayouts)
    .where(and(eq(s.publishedLayouts.pageId, homeId), eq(s.publishedLayouts.isCurrent, true)))
    .limit(1);

  const shown = (id: number) => items.filter((i) => i.sectionId === id && i.isVisible).length;
  const groups = groupSections(rows);
  const blocks: BuilderBlock[] = groups.map((g) => {
    const r = g.primary;
    const data = parseData(r.dataJson);
    const style = readStyle(data);
    const kind = g.kind;
    const n = shown(r.id);
    const meta =
      kind === "slides" ? `${n} slide${n === 1 ? "" : "s"}`
      : kind === "wide_banner" ? `${n} banner${n === 1 ? "" : "s"}`
      : kind === "about" ? (g.rows.length > 1 ? "Text and poster" : "Text")
      : kind === "instagram" ? `${Number(data.count) || 6} posts`
      : kind === "posters" ? `${n} poster${n === 1 ? "" : "s"}`
      : kind === "videos" ? `${Number(data.maxCards) || 6} cards`
      : kind === "logos" ? `${n} logo${n === 1 ? "" : "s"}`
      : kind === "news" ? "Newest stories, automatic"
      : kind === "text" ? "Your own words"
      : r.type.replaceAll("_", " ");
    const edit = EDIT[kind];
    const canTitle = kind === "posters" || kind === "videos" || kind === "logos" || kind === "instagram";
    const href = edit.href ?? `/admin/pages/${homeId}/#section-${r.id}`;
    return {
      key: g.key,
      ids: g.rows.map((x) => x.id),
      kind,
      name: kind === "other" ? r.type.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase()) : NAME[kind],
      meta,
      title: r.title ?? "",
      canTitle,
      canHideTitle: kind === "posters" || kind === "logos",
      showTitle: readShowTitle(data),
      intro: readIntro(data),
      visible: g.rows.some((x) => x.isVisible),
      bg: style.bg,
      space: style.space,
      device: style.device,
      intervalSeconds: kind === "slides" ? Math.round((Number(data.intervalMs) || 5000) / 1000) : null,
      maxCards: kind === "videos" ? Number(data.maxCards) || 6 : null,
      showLatest: kind === "videos" ? data.showLatest !== false : null,
      editHref: href,
      editLabel: edit.label,
      pinnedLast: kind === "logos",
      virtual: false,
    };
  });

  // The website shows latest news even with no row for it, so the builder shows it too and saves a row on first use.
  if (!groups.some((g) => g.kind === "news")) {
    const at = defaultNewsIndex(groups);
    blocks.splice(at, 0, {
      key: NEWS_KEY,
      ids: [],
      kind: "news",
      name: NAME.news,
      meta: "Newest stories, automatic",
      title: "",
      canTitle: false,
      canHideTitle: false,
      showTitle: true,
      intro: "",
      visible: true,
      bg: "default",
      space: "normal",
      device: "all",
      intervalSeconds: null,
      maxCards: null,
      showLatest: null,
      editHref: EDIT.news.href,
      editLabel: EDIT.news.label,
      pinnedLast: false,
      virtual: true,
    });
  }
  // Keep the pinned block last in the list, as the website draws it.
  const pinned = blocks.filter((b) => b.pinnedLast);
  const ordered = [...blocks.filter((b) => !b.pinnedLast), ...pinned];

  const lastChange = Math.max(0, ...rows.map((x) => x.updatedAt.getTime()), ...items.map((i) => i.updatedAt.getTime()));
  return { homeId, blocks: ordered, unpublished: !current || lastChange > current.publishedAt.getTime(), publishedAt: current ? current.publishedAt.getTime() : null };
}

