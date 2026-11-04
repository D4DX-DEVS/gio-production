// Focused home page screens: banners, posters, videos and initiative logos. Each block of the home page is one
// card with its own Save button; saving puts the change on the website at once.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { SectionType } from "@gio/db/schema";
import { schema as s } from "@gio/db";
import { getDb } from "@/lib/db";
import { youtubeId } from "@/lib/youtube";
import { hasRole, requireRole } from "@/lib/admin/guard";
import { findHomePage, parseData } from "@/lib/admin/homepage";
import { mediaPreviews } from "@/lib/admin/media-options";
import { ItemCard } from "@/lib/admin/item-card";
import { MediaMultiPicker, MediaPicker } from "@/lib/admin/client";
import { ActionButton, SectionForm } from "@/lib/admin/section-form";
import { Badge, CardBody, Card, Field, LiveNote, PageHeader, SectionCard, Toggle } from "@/lib/admin/ui";
import type { AdminIconName } from "@/lib/admin/icons";
import { ReorderStrip } from "@/lib/admin/reorder-strip";
import { HOME_POSTER_LIMIT } from "@/lib/posters";
import { addItem, adoptLegacyVideo, createSection, reorderItems, saveSectionBundle, sortItemsNewestFirst } from "../../pages/actions";
import { VideoField } from "../video-field";

interface Kind {
  title: string;
  description: string;
  types: SectionType[];
  folder: string;
  noun: string;
  icon: AdminIconName;
  /** Tailwind aspect class for the preview tile. */
  aspect: string;
  fit: "cover" | "contain";
  /** The "Add" form takes several images at once (one item each). */
  multi?: boolean;
}

const KINDS: Record<string, Kind> = {
  banners: {
    title: "Banners and slides",
    description: "The large slides at the top of the home page, and the wide banner under them.",
    types: ["hero_carousel", "image_banner"],
    folder: "banners",
    noun: "banner",
    icon: "banner",
    aspect: "aspect-[16/7]",
    fit: "cover",
  },
  posters: {
    title: "Posters",
    description: "The “Posters” row on the home page, and any single feature poster.",
    types: ["poster_slider", "image"],
    folder: "banners",
    noun: "poster",
    icon: "poster",
    aspect: "aspect-[4/5]",
    fit: "cover",
    multi: true,
  },
  videos: {
    title: "Videos",
    description: "The YouTube videos in the “Watch” block. Videos stay on YouTube; only the link is saved here.",
    types: ["featured_video"],
    folder: "images",
    noun: "video",
    icon: "video",
    aspect: "aspect-video",
    fit: "cover",
  },
  initiatives: {
    title: "Our initiatives (logos)",
    description: "The scrolling row of logos near the bottom of the home page.",
    types: ["logo_carousel"],
    folder: "logos",
    noun: "logo",
    icon: "logos",
    aspect: "aspect-[2/1]",
    fit: "contain",
  },
};

const SECTION_LABEL: Partial<Record<SectionType, string>> = {
  hero_carousel: "Top slideshow",
  image_banner: "Wide banner",
  poster_slider: "Poster row",
  image: "Feature poster",
  featured_video: "Watch (videos)",
  logo_carousel: "Logo row",
};

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  return { title: KINDS[(await params).kind]?.title ?? "Home page" };
}

export default async function HomepageKind({ params }: { params: Promise<{ kind: string }> }) {
  const { user } = await requireRole("contributor");
  const key = (await params).kind;
  const kind = KINDS[key];
  if (!kind) notFound();
  const db = getDb();
  const home = await findHomePage(db);
  if (!home) {
    return (
      <>
        <PageHeader title={kind.title} />
        <Card>There is no home page in the database yet. Run the importer first.</Card>
      </>
    );
  }
  const pageId = home.id;
  const canEdit = hasRole(user, "editor");
  const canDelete = hasRole(user, "admin");

  const secs = (await db.select().from(s.sections).where(and(eq(s.sections.pageId, pageId), inArray(s.sections.type, kind.types))).orderBy(asc(s.sections.sort), asc(s.sections.id)))
    .map((sec) => ({ ...sec, data: parseData(sec.dataJson) }))
    // The About block's poster has its own screen (About block).
    .filter((sec) => sec.data.kind !== "about_poster");
  const items = secs.length ? await db.select().from(s.sectionItems).where(inArray(s.sectionItems.sectionId, secs.map((x) => x.id))).orderBy(asc(s.sectionItems.sort), asc(s.sectionItems.id)) : [];
  const previews = await mediaPreviews(db, items.map((i) => i.mediaId));
  const isVideo = kind.types[0] === "featured_video";

  return (
    <>
      <PageHeader title={kind.title} description={kind.description} back={{ href: "/admin/homepage/", label: "Home page" }} />
      <LiveNote viewHref="/" viewLabel="Open the home page" />

      {!secs.length ? (
        <Card>
          <p className="text-sm text-muted">The home page has no {SECTION_LABEL[kind.types[0]]?.toLowerCase()} yet.</p>
          {canEdit ? (
            <div className="mt-3">
              <ActionButton action={createSection.bind(null, pageId, kind.types[0])} className="btn btn-primary min-h-11">
                Add a {SECTION_LABEL[kind.types[0]]?.toLowerCase()}
              </ActionButton>
            </div>
          ) : null}
        </Card>
      ) : null}

      <div className="space-y-8">
        {secs.map((sec) => {
          const own = items.filter((i) => i.sectionId === sec.id);
          const shown = own.filter((i) => i.isVisible).length;
          const legacyVideo = sec.type === "featured_video" ? youtubeId(String(sec.data.youtubeId ?? "")) : null;
          // The "Add" form sits above the list, so a new one never needs a scroll past the existing ones.
          const addForm = canEdit ? (
            <div className="border-b border-line bg-paper/50">
              <SectionForm action={addItem.bind(null, pageId, sec.id)} saveLabel={kind.multi ? `Add ${kind.noun}s` : `Add this ${kind.noun}`} refreshOnSave resetOnSave sticky={false}>
                <CardBody className="grid gap-4 md:grid-cols-2">
                  <h3 className="font-semibold text-brand-900 md:col-span-2">{kind.multi ? `Add ${kind.noun}s` : `Add a ${kind.noun}`}</h3>
                  {isVideo ? (
                    <>
                      <VideoField />
                      <Field label="Title (optional)" hint="Leave empty to use the title from YouTube.">
                        <input name="heading" className="field" />
                      </Field>
                    </>
                  ) : (
                    <>
                      {kind.multi ? (
                        <MediaMultiPicker name="mediaIds" label="Images (choose from the library or upload many at once)" folder={kind.folder} />
                      ) : (
                        <MediaPicker name="mediaId" label="Image (choose from the library or upload)" folder={kind.folder} />
                      )}
                      <div className="space-y-3">
                        <Field label="Picture description" hint={kind.multi ? `Used for every ${kind.noun} added together. You can change each one after.` : undefined}>
                          <input name="altText" className="field" />
                        </Field>
                        <Field label="Link when clicked (optional)">
                          <input name="linkUrl" className="field" placeholder="/a-page/ or https://…" />
                        </Field>
                      </div>
                    </>
                  )}
                  <div className="md:col-span-2">
                    <Toggle name="isVisible" label="Show on the website" defaultChecked />
                  </div>
                </CardBody>
              </SectionForm>
            </div>
          ) : null;
          return (
            <SectionCard
              key={sec.id}
              id={`section-${sec.id}`}
              icon={kind.icon}
              title={SECTION_LABEL[sec.type] ?? sec.type}
              subtitle={`${shown} shown · ${own.length - shown} hidden`}
              status={<Badge value={sec.isVisible ? "published" : "hidden"} label={sec.isVisible ? "On the website" : "Hidden"} />}
            >
              {addForm}
              {canEdit && own.length > 1 ? (
                <div className="border-b border-line px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-brand-900">Order on the website</h3>
                    {sec.type === "poster_slider" ? (
                      <ActionButton action={sortItemsNewestFirst.bind(null, pageId, sec.id)} confirm="Put the newest uploads first? This rearranges the whole list." className="btn btn-ghost btn-sm min-h-10 px-3">
                        Newest first
                      </ActionButton>
                    ) : null}
                  </div>
                  <p className="mb-3 mt-0.5 text-sm text-muted">
                    Drag a {kind.noun} to a new place, or select it and press the left and right arrow keys. The new order is saved at once.
                    {sec.type === "poster_slider" ? ` The first ${HOME_POSTER_LIMIT} are in the home page row (the faded ones are only on the Posters page). New uploads are added at the start.` : ""}
                  </p>
                  <ReorderStrip
                    key={own.map((i) => `${i.id}:${i.mediaId ?? 0}:${i.isVisible ? 1 : 0}`).join(",")}
                    items={own.map((i, k) => ({
                      id: i.id,
                      url: isVideo ? (youtubeId(i.linkUrl) ? `https://i.ytimg.com/vi/${youtubeId(i.linkUrl)}/mqdefault.jpg` : null) : i.mediaId ? (previews.get(i.mediaId)?.url ?? null) : null,
                      label: `${kind.noun} ${k + 1}`,
                      hidden: !i.isVisible,
                    }))}
                    noun={kind.noun}
                    save={reorderItems.bind(null, pageId, sec.id)}
                    aspect={kind.aspect}
                    columns={kind.multi ? "dense" : "wide"}
                    homeCount={sec.type === "poster_slider" ? HOME_POSTER_LIMIT : undefined}
                  />
                </div>
              ) : null}
              <SectionForm action={saveSectionBundle.bind(null, pageId, sec.id)} readOnly={!canEdit}>
                <CardBody>
                  <input type="hidden" name="itemIds" value={own.map((i) => i.id).join(",")} />
                  <div className="grid items-end gap-4 sm:grid-cols-2">
                    <Field label="Heading on the website" hint="Leave empty to keep the usual heading.">
                      <input name="title" defaultValue={sec.title ?? ""} className="field" />
                    </Field>
                    {sec.type === "hero_carousel" ? (
                      <Field label="Seconds on each slide" hint="Between 2 and 30.">
                        <input name="intervalSeconds" type="number" min={2} max={30} step={0.5} defaultValue={Number(sec.data.intervalMs ?? 5000) / 1000} className="field w-32" />
                      </Field>
                    ) : null}
                    {sec.type === "featured_video" ? (
                      <Field label="How many videos to show" hint="Between 1 and 12.">
                        <input name="maxCards" type="number" min={1} max={12} defaultValue={Number(sec.data.maxCards ?? 6)} className="field w-32" />
                      </Field>
                    ) : null}
                  </div>
                  {sec.type === "featured_video" ? <Toggle name="showLatest" label="Fill empty places with the channel’s newest uploads" hint="Turn off to show only the videos listed below." defaultChecked={sec.data.showLatest !== false} /> : null}
                  <Toggle name="isVisible" label="Show this block on the website" hint="Turn off to hide the whole block without deleting it." defaultChecked={sec.isVisible} />

                  {legacyVideo && !own.length ? (
                    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-paper/60 p-4 text-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`https://i.ytimg.com/vi/${legacyVideo}/mqdefault.jpg`} alt="" className="h-16 w-28 rounded object-cover" loading="lazy" />
                      <p className="min-w-0 flex-1 basis-60 text-muted">The website shows the video chosen on the old site until you add videos here.</p>
                      {canEdit ? (
                        <ActionButton action={adoptLegacyVideo.bind(null, pageId, sec.id)} className="btn btn-ghost min-h-11">
                          Add it to the list
                        </ActionButton>
                      ) : null}
                    </div>
                  ) : null}

                  {own.length ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {own.map((it, k) => (
                        <ItemCard
                          key={it.id}
                          pageId={pageId}
                          type={sec.type}
                          item={it}
                          index={k}
                          count={own.length}
                          preview={it.mediaId ? previews.get(it.mediaId) : null}
                          noun={kind.noun}
                          folder={kind.folder}
                          aspect={kind.aspect}
                          fit={kind.fit}
                          canDelete={canDelete}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-muted">No {kind.noun}s here yet. Add the first one above.</p>
                  )}
                </CardBody>
              </SectionForm>
            </SectionCard>
          );
        })}
      </div>
    </>
  );
}
