import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { PAGE_STATUSES, SECTION_TYPES } from "@gio/db/schema";
import { schema } from "@gio/db";
import { getDb } from "@/lib/db";
import { encodePath } from "@/lib/content";
import { hasRole, requireRole } from "@/lib/admin/guard";
import { fmtDate } from "@/lib/admin/form";
import { AdminIcon, type AdminIconName } from "@/lib/admin/icons";
import { mediaPreviews } from "@/lib/admin/media-options";
import { ConfirmButton, HtmlEditor, MediaPicker, SubmitButton } from "@/lib/admin/client";
import { Badge, Card, Field, PageHeader, RadioCards, Toggle } from "@/lib/admin/ui";
import { addItem, addSection, deleteItem, deleteSection, publishPage, saveItem, savePageMeta, saveSection } from "../actions";

export const metadata = { title: "Edit page" };

const TYPE_LABEL: Record<string, string> = {
  hero_carousel: "Hero slider",
  image_banner: "Image banner",
  image: "Image",
  rich_text: "Text",
  instagram_feed: "Instagram feed",
  poster_slider: "Poster slider",
  featured_video: "Featured video",
  logo_carousel: "Logo carousel",
  embed: "Embedded page",
  map: "Map",
  contact_form: "Contact form",
  document_list: "Document list",
  cta: "Call to action",
  latest_posts: "Latest posts",
  upcoming_events: "Upcoming events",
};
const TYPE_HINT: Record<string, string> = {
  hero_carousel: "Large slides with a headline",
  image_banner: "One wide picture",
  image: "A single picture",
  rich_text: "Headings and paragraphs",
  instagram_feed: "Latest Instagram posts",
  poster_slider: "A row of posters",
  featured_video: "YouTube videos",
  logo_carousel: "A scrolling row of logos",
  embed: "Another page or a form",
  map: "A map of a place",
  contact_form: "The contact form",
  document_list: "PDFs people can open",
  cta: "A button with a message",
  latest_posts: "Newest news posts",
  upcoming_events: "Next events",
};
const TYPE_ICON: Record<string, AdminIconName> = {
  hero_carousel: "banner",
  image_banner: "banner",
  image: "image",
  rich_text: "documents",
  instagram_feed: "gallery",
  poster_slider: "poster",
  featured_video: "video",
  logo_carousel: "logos",
  embed: "link",
  map: "about",
  contact_form: "mail",
  document_list: "documents",
  cta: "arrow",
  latest_posts: "news",
  upcoming_events: "calendar",
};
/** Section types whose content lives in items (slides, images, logos). */
const ITEM_TYPES = new Set(["hero_carousel", "image_banner", "image", "poster_slider", "logo_carousel", "cta"]);

export default async function EditPage({ params }: PageProps<"/admin/pages/[id]">) {
  const { user } = await requireRole("contributor");
  const pageId = Number((await params).id);
  if (!Number.isInteger(pageId)) notFound();
  const db = getDb();
  const [page] = await db
    .select()
    .from(schema.pages)
    .where(and(eq(schema.pages.id, pageId), isNull(schema.pages.deletedAt)))
    .limit(1);
  if (!page) notFound();

  const secs = await db.select().from(schema.sections).where(eq(schema.sections.pageId, pageId)).orderBy(asc(schema.sections.sort), asc(schema.sections.id));
  const [items, [current]] = await Promise.all([
    secs.length
      ? db
          .select()
          .from(schema.sectionItems)
          .where(
            inArray(
              schema.sectionItems.sectionId,
              secs.map((s) => s.id),
            ),
          )
          .orderBy(asc(schema.sectionItems.sort), asc(schema.sectionItems.id))
      : Promise.resolve([]),
    db
      .select({ publishedAt: schema.publishedLayouts.publishedAt })
      .from(schema.publishedLayouts)
      .where(and(eq(schema.publishedLayouts.pageId, pageId), eq(schema.publishedLayouts.isCurrent, true)))
      .limit(1),
  ]);
  const previews = await mediaPreviews(
    db,
    items.map((i) => i.mediaId),
  );
  const lastDraftChange = Math.max(0, ...secs.map((s) => s.updatedAt.getTime()), ...items.map((i) => i.updatedAt.getTime()));
  const unpublished = !current || lastDraftChange > current.publishedAt.getTime();
  const canEdit = hasRole(user, "editor");
  const canDelete = hasRole(user, "admin");
  const isHome = page.slug === "";
  const publicUrl = isHome ? "/" : `/${encodePath(page.slug)}/`;

  return (
    <>
      <PageHeader
        icon="pages"
        back={{ href: "/admin/pages/", label: "All pages" }}
        title={isHome ? "Home page" : page.title}
        description={
          <>
            {isHome ? "/" : `/${page.slug}/`} · {page.template === "sections" ? "built from sections" : `template: ${page.template}`}
          </>
        }
        actions={
          <>
            {secs.length ? (
              <a href={`/admin/preview/page/${pageId}/`} target="_blank" className="btn btn-ghost">
                Preview draft <AdminIcon name="external" className="h-4 w-4" />
              </a>
            ) : null}
            <a href={publicUrl} target="_blank" className="btn btn-ghost">
              View on website <AdminIcon name="external" className="h-4 w-4" />
            </a>
            {canEdit && secs.length ? (
              <form action={publishPage.bind(null, pageId)}>
                <SubmitButton>Publish sections</SubmitButton>
              </form>
            ) : null}
          </>
        }
      />

      {secs.length ? (
        <div className={`mb-6 flex items-start gap-3 rounded-xl px-4 py-3 text-sm ring-1 ${unpublished ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-emerald-50 text-emerald-900 ring-emerald-200"}`}>
          <AdminIcon name={unpublished ? "draft" : "check"} className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            {current
              ? unpublished
                ? `The draft has changes made after the last publish (${fmtDate(current.publishedAt, true)}). Click “Publish sections” to put them on the website.`
                : `The website shows the latest draft (published ${fmtDate(current.publishedAt, true)}).`
              : "These sections have never been published. The website shows nothing for them until you publish."}
          </p>
        </div>
      ) : null}

      <Card title="Page details" className="mb-8">
        <form action={savePageMeta.bind(null, pageId)} className="grid gap-4 md:grid-cols-2">
          <Field label="Page title">
            <input name="title" required defaultValue={page.title} className="field" disabled={!canEdit} />
          </Field>
          <Field label="Web address" hint={isHome ? "The home page is always /." : "Changing it breaks links to the old address."}>
            <input name="slug" defaultValue={page.slug} className="field font-mono text-sm" disabled={!canEdit || isHome} required={!isHome} />
          </Field>
          <div className="md:col-span-2">
            <span className="label">Status</span>
            <RadioCards
              name="status"
              defaultValue={page.status}
              disabled={!canEdit}
              className="sm:grid-cols-2 xl:grid-cols-4"
              options={PAGE_STATUSES.map((st) => ({
                value: st,
                label: st[0].toUpperCase() + st.slice(1),
                hint: { draft: "Not on the website", published: "Visible on the website", private: "Only people who sign in", archived: "Hidden, kept for the record" }[st],
              }))}
            />
          </div>
          <details className="group md:col-span-2">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-brand-700">
              <AdminIcon name="chevron" className="h-4 w-4 transition-transform group-open:rotate-90" /> Search engine details (optional)
            </summary>
            <div className="mt-3 grid gap-4">
              <Field label="Search title">
                <input name="seoTitle" defaultValue={page.seoTitle ?? ""} className="field" disabled={!canEdit} />
              </Field>
              <Field label="Search description">
                <textarea name="seoDescription" rows={2} defaultValue={page.seoDescription ?? ""} className="field" disabled={!canEdit} />
              </Field>
            </div>
          </details>
          {canEdit ? (
            <div className="md:col-span-2">
              <SubmitButton>Save details</SubmitButton>
            </div>
          ) : null}
        </form>
      </Card>

      {page.template !== "sections" && !secs.length ? (
        <Card className="mb-6">
          <p className="text-sm text-muted">
            This page is built from {page.template === "leaders" ? "the leaders list" : page.template === "post_listing" ? "posts in its category" : "its template"}, not from
            sections. Edit that content in{" "}
            <Link href={page.template === "leaders" ? "/admin/leaders/" : "/admin/posts/"} className="font-semibold text-brand-700 underline">
              {page.template === "leaders" ? "Leaders" : "News"}
            </Link>
            .
          </p>
        </Card>
      ) : null}

      {secs.length ? <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Sections on this page ({secs.length})</h2> : null}
      <div className="space-y-6">
        {secs.map((s) => {
          const data = JSON.parse(s.dataJson) as Record<string, unknown>;
          const secItems = items.filter((i) => i.sectionId === s.id);
          return (
            <section key={s.id} id={`section-${s.id}`} className="scroll-mt-20 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper/60 px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                    <AdminIcon name={TYPE_ICON[s.type] ?? "pages"} className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-brand-900">{TYPE_LABEL[s.type] ?? s.type}</span>
                      {s.title ? <span className="truncate text-sm text-muted">· {s.title}</span> : null}
                      {!s.isVisible ? <Badge value="hidden" /> : null}
                      {s.reviewState === "pending_client" ? <Badge value="pending_client" label="needs review" /> : null}
                    </div>
                    <p className="text-xs text-muted">{TYPE_HINT[s.type] ?? ""}</p>
                  </div>
                </div>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs tabular-nums text-muted ring-1 ring-line">Position {s.sort}</span>
              </header>

              <form action={saveSection.bind(null, pageId, s.id)} className="grid gap-4 p-5 md:grid-cols-[1fr_8rem_auto] md:items-end">
                <Field label="Heading (optional)">
                  <input name="title" defaultValue={s.title ?? ""} className="field" disabled={!canEdit} />
                </Field>
                <Field label="Position" hint="Lower comes first">
                  <input name="sort" type="number" defaultValue={s.sort} className="field" disabled={!canEdit} />
                </Field>
                <div className="pb-2">
                  <Toggle name="isVisible" label="Visible" defaultChecked={s.isVisible} disabled={!canEdit} />
                </div>
                {s.type === "rich_text" ? (
                  <div className="md:col-span-3">
                    <span className="label">Text</span>
                    <HtmlEditor name="html" rows={10} defaultValue={String(data.html ?? "")} disabled={!canEdit} />
                    <span className="mt-1 block text-xs text-muted">Select text and use the buttons above to format it. Malayalam is fine.</span>
                  </div>
                ) : (
                  <details className="group md:col-span-3">
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-brand-700">
                      <AdminIcon name="chevron" className="h-4 w-4 transition-transform group-open:rotate-90" /> Advanced settings
                    </summary>
                    <Field label="Settings (JSON)" className="mt-3" hint="For example autoplay, interval, video id or embed address.">
                      <textarea name="dataJson" rows={Math.min(8, Math.max(2, JSON.stringify(data, null, 2).split("\n").length))} defaultValue={JSON.stringify(data, null, 2)} className="field font-mono text-xs" disabled={!canEdit} />
                    </Field>
                  </details>
                )}
                {canEdit ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 md:col-span-3">
                    <SubmitButton>Save section</SubmitButton>
                    {canDelete ? (
                      <ConfirmButton formAction={deleteSection.bind(null, pageId, s.id)} message="Delete this section and all its items from the draft?">
                        <AdminIcon name="trash" className="h-4 w-4" /> Delete section
                      </ConfirmButton>
                    ) : null}
                  </div>
                ) : null}
              </form>

              {secItems.length || ITEM_TYPES.has(s.type) ? (
                <div className="border-t border-line bg-paper/50 p-5">
                  <h3 className="mb-3 text-sm font-semibold text-ink">
                    {s.type === "logo_carousel" ? "Logos" : s.type === "cta" ? "Buttons" : "Slides and pictures"} ({secItems.length})
                  </h3>
                  <div className="space-y-3">
                    {secItems.map((it) => (
                      <form key={it.id} action={saveItem.bind(null, pageId, it.id)} className={`grid gap-4 rounded-xl border bg-white p-4 md:grid-cols-[13rem_1fr_1fr] ${it.isVisible ? "border-line" : "border-dashed border-slate-300 opacity-80"}`}>
                        <MediaPicker name="mediaId" defaultId={it.mediaId} preview={it.mediaId ? previews.get(it.mediaId) : null} />
                        <div className="space-y-3">
                          <Field label="Heading">
                            <input name="heading" defaultValue={it.heading ?? ""} className="field" />
                          </Field>
                          <Field label="Text">
                            <textarea name="body" rows={2} defaultValue={it.body ?? ""} className="field" />
                          </Field>
                          <Field label="Picture description" hint="Read aloud for people who cannot see the picture.">
                            <input name="altText" defaultValue={it.altText ?? ""} className="field" />
                          </Field>
                        </div>
                        <div className="space-y-3">
                          <Field label="Link">
                            <input name="linkUrl" defaultValue={it.linkUrl ?? ""} className="field" placeholder="/about-us/ or https://…" />
                          </Field>
                          <Field label="Link text">
                            <input name="linkLabel" defaultValue={it.linkLabel ?? ""} className="field" />
                          </Field>
                          <div className="grid grid-cols-[5rem_1fr] items-end gap-3">
                            <Field label="Position">
                              <input name="sort" type="number" defaultValue={it.sort} className="field" />
                            </Field>
                            <div className="space-y-2 pb-1">
                              <Toggle name="isVisible" label="Visible" defaultChecked={it.isVisible} />
                              <Toggle name="openInNewTab" label="Open link in a new tab" defaultChecked={it.openInNewTab} />
                            </div>
                          </div>
                          {canEdit ? (
                            <div className="flex gap-2 pt-1">
                              <SubmitButton className="btn btn-primary btn-sm">Save</SubmitButton>
                              {canDelete ? (
                                <ConfirmButton className="btn btn-danger btn-sm" formAction={deleteItem.bind(null, pageId, it.id)} message="Delete this item from the draft?">
                                  <AdminIcon name="trash" className="h-3.5 w-3.5" /> Delete
                                </ConfirmButton>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </form>
                    ))}
                  </div>
                  {canEdit ? (
                    <form action={addItem.bind(null, pageId, s.id)} className="mt-3">
                      <SubmitButton className="btn btn-ghost">
                        <AdminIcon name="plus" className="h-4 w-4" /> Add {s.type === "logo_carousel" ? "logo" : s.type === "cta" ? "button" : "picture"}
                      </SubmitButton>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {canEdit && (page.template === "sections" || secs.length) ? (
        <Card title="Add a section" description="Pick what the new block should show. It is added at the end of the draft." className="mt-8">
          <form action={addSection.bind(null, pageId)} className="space-y-5">
            <RadioCards
              name="type"
              defaultValue="rich_text"
              className="sm:grid-cols-2 xl:grid-cols-3"
              options={SECTION_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] ?? t, hint: TYPE_HINT[t] }))}
            />
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Heading (optional)" className="min-w-64 flex-1">
                <input name="title" className="field" />
              </Field>
              <SubmitButton>
                <AdminIcon name="plus" className="h-4 w-4" /> Add section
              </SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}
    </>
  );
}
