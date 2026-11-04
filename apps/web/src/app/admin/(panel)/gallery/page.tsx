// The public /gallery/ page is built from the featured images of published posts and events
// (lib/content.ts galleryCollections). This screen shows the same set and links to where each
// photo is chosen, so editors manage the gallery from the post or event itself.
import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { schema as s } from "@gio/db";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/admin/guard";
import { fmtDate } from "@/lib/admin/form";
import { mediaUrl } from "@/lib/admin/media-options";
import { AdminIcon } from "@/lib/admin/icons";
import { Badge, EmptyState, PageHeader } from "@/lib/admin/ui";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryAdmin() {
  await requireRole("contributor");
  const db = getDb();
  const [posts, events] = await Promise.all([
    db
      .select({ id: s.posts.id, title: s.posts.title, date: s.posts.publishedAt, mediaId: s.posts.featuredMediaId })
      .from(s.posts)
      .where(and(eq(s.posts.status, "published"), isNull(s.posts.deletedAt), isNotNull(s.posts.featuredMediaId)))
      .orderBy(desc(s.posts.publishedAt))
      .limit(100),
    db
      .select({ id: s.events.id, title: s.events.title, date: s.events.startsAt, mediaId: s.events.featuredMediaId })
      .from(s.events)
      .where(and(inArray(s.events.status, ["published", "scheduled"]), isNull(s.events.deletedAt), isNotNull(s.events.featuredMediaId)))
      .orderBy(desc(s.events.startsAt))
      .limit(100),
  ]);
  const tiles = [
    ...posts.map((p) => ({ ...p, kind: "post" as const, edit: `/admin/posts/${p.id}/` })),
    ...events.map((e) => ({ ...e, kind: "event" as const, edit: `/admin/events/${e.id}/` })),
  ].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
  const ids = [...new Set(tiles.map((t) => t.mediaId!))];
  const files = ids.length
    ? await db
        .select({ id: s.media.id, r2Key: s.media.r2Key, alt: s.media.altText })
        .from(s.media)
        .where(and(inArray(s.media.id, ids), eq(s.media.fileStatus, "available"), eq(s.media.isPublic, true), isNull(s.media.deletedAt)))
    : [];
  const previews = new Map(files.map((f) => [f.id, { url: mediaUrl(f.r2Key), alt: f.alt }]));
  // Same rule as the website: only files that exist and are public appear.
  const shown = tiles.filter((t) => t.mediaId && previews.has(t.mediaId));

  const fromPosts = shown.filter((t) => t.kind === "post").length;
  const fromEvents = shown.filter((t) => t.kind === "event").length;
  return (
    <>
      <PageHeader
        icon="gallery"
        title="Gallery"
        description="The website's gallery shows the featured image of every published news post and event, newest first. Add a photo by publishing a post or event with a featured image; change or remove one by editing that image."
        actions={
          <>
            <a href="/gallery/" target="_blank" className="btn btn-ghost">
              View gallery <AdminIcon name="external" className="h-4 w-4" />
            </a>
            <Link href="/admin/posts/new/" className="btn btn-primary">
              <AdminIcon name="plus" className="h-4 w-4" /> Add photo
            </Link>
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-white px-3 py-1 font-semibold text-brand-800 shadow-sm ring-1 ring-line">{shown.length} photos on the website</span>
        <span className="rounded-full bg-white px-3 py-1 text-muted shadow-sm ring-1 ring-line">{fromPosts} from news</span>
        <span className="rounded-full bg-white px-3 py-1 text-muted shadow-sm ring-1 ring-line">{fromEvents} from events</span>
        <Link href="/admin/events/new/" className="ml-auto font-semibold text-brand-700 hover:underline">
          + Add via a new event
        </Link>
      </div>
      {shown.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((t) => {
            const img = previews.get(t.mediaId!)!;
            return (
              <Link key={`${t.kind}-${t.id}`} href={t.edit} className="group relative overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-900/10">
                <div className="relative aspect-[4/3] overflow-hidden bg-paper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt ?? ""} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-1.5 bg-brand-900/80 py-2 text-xs font-semibold text-white transition-transform duration-200 group-hover:translate-y-0">
                    <AdminIcon name="edit" className="h-3.5 w-3.5" /> Change or remove
                  </span>
                </div>
                <div className="space-y-1 p-3">
                  <div className="line-clamp-2 text-sm font-medium text-ink">{t.title || "(no title)"}</div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span>{fmtDate(t.date)}</span>
                    <Badge value={t.kind === "post" ? "new" : "scheduled"} label={t.kind === "post" ? "news" : "event"} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="gallery"
          title="No photos yet"
          action={
            <Link href="/admin/posts/new/" className="btn btn-primary">
              <AdminIcon name="plus" className="h-4 w-4" /> Add photo
            </Link>
          }
        >
          No published post or event has a featured image yet.
        </EmptyState>
      )}
    </>
  );
}
