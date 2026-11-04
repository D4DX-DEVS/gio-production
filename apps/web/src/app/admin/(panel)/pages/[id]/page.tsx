// The page editor: the page's details, then every section of the page as its own card with its own Save button.
// Saving a section puts it on the website at once; the page's status decides whether the page itself is visible.
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { PAGE_STATUSES, SECTION_TYPES } from "@gio/db/schema";
import { schema } from "@gio/db";
import { getDb } from "@/lib/db";
import { encodePath } from "@/lib/content";
import { hasRole, requireRole } from "@/lib/admin/guard";
import { AdminIcon, type AdminIconName } from "@/lib/admin/icons";
import { mediaPreviews } from "@/lib/admin/media-options";
import { HtmlEditor } from "@/lib/admin/client";
import { ItemCard } from "@/lib/admin/item-card";
import { ActionButton, SectionForm } from "@/lib/admin/section-form";
import { Badge, Card, CardBody, Field, LiveNote, PageHeader, RadioCards, SectionCard, Toggle } from "@/lib/admin/ui";
import { addBlankItem, addSection, deleteSection, moveSectionBy, savePageMeta, saveSectionBundle } from "../actions";

export const metadata = { title: "Edit page" };

const TYPE_LABEL: Record<string, string> = {
  hero_carousel: "Top slideshow",
  image_banner: "Wide banner",
  image: "Picture",
  rich_text: "Text",
  instagram_feed: "Instagram feed",
  poster_slider: "Poster row",
  featured_video: "Videos",
  logo_carousel: "Logo row",
  embed: "Embedded page",
  map: "Map",
  contact_form: "Contact form",
  document_list: "Document list",
  cta: "Call to action",
  latest_posts: "Latest news",
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
/** Section types whose content lives in items (slides, images, logos, videos). */
const ITEM_TYPES = new Set(["hero_carousel", "image_banner", "image", "poster_slider", "logo_carousel", "featured_video", "cta"]);
const ITEM_NOUN: Record<string, string> = { logo_carousel: "logo", featured_video: "video", cta: "button", poster_slider: "poster", hero_carousel: "slide", image_banner: "banner" };

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
  const items = secs.length
    ? await db
        .select()
        .from(schema.sectionItems)
        .where(inArray(schema.sectionItems.sectionId, secs.map((s) => s.id)))
        .orderBy(asc(schema.sectionItems.sort), asc(schema.sectionItems.id))
    : [];
  const previews = await mediaPreviews(db, items.map((i) => i.mediaId));
  const canEdit = hasRole(user, "editor");
  const canDelete = hasRole(user, "admin");
  const isHome = page.slug === "";
  const publicUrl = isHome ? "/" : `/${encodePath(page.slug)}/`;
  const onSite = page.status === "published";

  return (
    <>
      <PageHeader
        back={isHome ? { href: "/admin/homepage/", label: "Home page" } : { href: "/admin/pages/", label: "All pages" }}
        title={isHome ? "Home page: all sections" : page.title}
        description={
          <>
            {isHome ? "/" : `/${page.slug}/`} · {page.template === "sections" ? "built from sections" : `template: ${page.template}`}
          </>
        }
        actions={
          <>
            {secs.length ? (
              <a href={`/admin/preview/page/${pageId}/`} target="_blank" className="btn btn-ghost min-h-11">
                Preview <AdminIcon name="external" className="h-4 w-4" />
              </a>
            ) : null}
            <a href={publicUrl} target="_blank" className="btn btn-ghost min-h-11">
              View on website <AdminIcon name="external" className="h-4 w-4" />
            </a>
          </>
        }
      />

      {onSite ? (
        <LiveNote viewHref={publicUrl}>
          Each section below has its own <strong>Save</strong> button. When you save, the change is on the website straight away.
        </LiveNote>
      ) : (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
          <AdminIcon name="draft" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            This page is not on the website yet: its status is <strong>{page.status}</strong>. You can edit its sections now. To show the page, set the status to <strong>Published</strong> and save the page details.
          </p>
        </div>
      )}
      {isHome ? (
        <p className="mb-6 text-sm text-muted">
          This lists every section of the home page. The pages under <strong>Home page</strong> in the menu on the left are the easier way to edit banners, posters, videos and the rest.
        </p>
      ) : null}

      <SectionCard icon="pages" title="Page details" subtitle="Title, web address, status and search engine text.">
        <SectionForm action={savePageMeta.bind(null, pageId)} readOnly={!canEdit} saveLabel="Save details">
          <CardBody className="grid gap-4 md:grid-cols-2">
            <Field label="Page title">
              <input name="title" required defaultValue={page.title} className="field" />
            </Field>
            <Field label="Web address" hint={isHome ? "The home page is always /." : "Changing it breaks links to the old address."}>
              <input name="slug" defaultValue={page.slug} className="field font-mono text-sm" disabled={isHome} required={!isHome} />
            </Field>
            <div className="md:col-span-2">
              <span className="label">Status</span>
              <RadioCards
                name="status"
                defaultValue={page.status}
                className="sm:grid-cols-2 xl:grid-cols-3"
                // Draft or Published. A page that is already private or archived keeps that as an extra choice, so saving never changes it by accident.
                options={PAGE_STATUSES.filter((st) => st === "draft" || st === "published" || st === page.status).map((st) => ({
                  value: st,
                  label: st[0].toUpperCase() + st.slice(1),
                  hint: { draft: "Not on the website", published: "Visible on the website", private: "Only people who sign in", archived: "Hidden, kept for the record" }[st],
                }))}
              />
            </div>
            <details className="group md:col-span-2">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-brand-700">
                <AdminIcon name="chevron" className="h-4 w-4 transition-transform group-open:rotate-90" /> Search engine details (optional)
              </summary>
              <div className="mt-3 grid gap-4">
                <Field label="Search title">
                  <input name="seoTitle" defaultValue={page.seoTitle ?? ""} className="field" />
                </Field>
                <Field label="Search description">
                  <textarea name="seoDescription" rows={2} defaultValue={page.seoDescription ?? ""} className="field" />
                </Field>
              </div>
            </details>
          </CardBody>
        </SectionForm>
      </SectionCard>

      {page.template !== "sections" && !secs.length ? (
        <Card className="mt-6">
          <p className="text-sm text-muted">
            This page is built from {page.template === "leaders" ? "the leaders list" : page.template === "post_listing" ? "posts in its category" : "its template"}, not from sections. Edit that content in{" "}
            <Link href={page.template === "leaders" ? "/admin/leaders/" : "/admin/posts/"} className="font-semibold text-brand-700 underline">
              {page.template === "leaders" ? "Leaders" : "News"}
            </Link>
            .
          </p>
        </Card>
      ) : null}

      {secs.length ? <h2 className="mb-3 mt-10 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Sections on this page, top to bottom ({secs.length})</h2> : null}
      <div className="space-y-8">
        {secs.map((s, n) => {
          const data = JSON.parse(s.dataJson) as Record<string, unknown>;
          const own = items.filter((i) => i.sectionId === s.id);
          const noun = ITEM_NOUN[s.type] ?? "picture";
          return (
            <SectionCard
              key={s.id}
              id={`section-${s.id}`}
              icon={TYPE_ICON[s.type] ?? "pages"}
              title={`${TYPE_LABEL[s.type] ?? s.type}${s.title ? `: ${s.title}` : ""}`}
              subtitle={`Section ${n + 1} of ${secs.length} · ${TYPE_HINT[s.type] ?? ""}`}
              status={
                <span className="flex gap-1.5">
                  <Badge value={s.isVisible ? "published" : "hidden"} label={s.isVisible ? "On the website" : "Hidden"} />
                  {s.reviewState === "pending_client" ? <Badge value="pending_client" label="needs review" /> : null}
                </span>
              }
              actions={
                canEdit ? (
                  <span className="flex gap-1.5">
                    <ActionButton action={moveSectionBy.bind(null, pageId, s.id, -1)} disabled={n === 0} label={`Move section ${n + 1} up`} className="btn btn-ghost btn-sm min-h-10 px-3">
                      ↑ Up
                    </ActionButton>
                    <ActionButton action={moveSectionBy.bind(null, pageId, s.id, 1)} disabled={n === secs.length - 1} label={`Move section ${n + 1} down`} className="btn btn-ghost btn-sm min-h-10 px-3">
                      ↓ Down
                    </ActionButton>
                  </span>
                ) : null
              }
            >
              <SectionForm
                action={saveSectionBundle.bind(null, pageId, s.id)}
                readOnly={!canEdit}
                aside={
                  canDelete ? (
                    <ActionButton action={deleteSection.bind(null, pageId, s.id)} confirm="Delete this section and everything in it? It leaves the website." className="btn btn-danger min-h-11">
                      <AdminIcon name="trash" className="h-4 w-4" /> Delete section
                    </ActionButton>
                  ) : null
                }
              >
                <CardBody>
                  <input type="hidden" name="itemIds" value={own.map((i) => i.id).join(",")} />
                  <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
                    <Field label="Heading (optional)">
                      <input name="title" defaultValue={s.title ?? ""} className="field" />
                    </Field>
                    <div className="pb-2">
                      <Toggle name="isVisible" label="Show on the website" defaultChecked={s.isVisible} />
                    </div>
                  </div>
                  {s.type === "rich_text" ? (
                    <div>
                      <span className="label">Text</span>
                      <HtmlEditor name="html" rows={10} defaultValue={String(data.html ?? "")} />
                      <span className="mt-1 block text-xs text-muted">Select text and use the buttons above to format it. Malayalam is fine.</span>
                    </div>
                  ) : (
                    <details className="group">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-brand-700">
                        <AdminIcon name="chevron" className="h-4 w-4 transition-transform group-open:rotate-90" /> Advanced settings (for the web team)
                      </summary>
                      <Field label="Settings (JSON)" className="mt-2" hint="For example autoplay, interval, video id or embed address. Leave this alone unless you were asked to change it.">
                        <textarea name="dataJson" rows={Math.min(8, Math.max(2, JSON.stringify(data, null, 2).split("\n").length))} defaultValue={JSON.stringify(data, null, 2)} className="field font-mono text-xs" />
                      </Field>
                    </details>
                  )}

                  {ITEM_TYPES.has(s.type) ? (
                    <div className="space-y-4 border-t border-line pt-5">
                      <h3 className="text-sm font-semibold text-ink">
                        {noun[0].toUpperCase() + noun.slice(1)}s in this section ({own.length})
                      </h3>
                      {own.length ? (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {own.map((it, k) => (
                            <ItemCard
                              key={it.id}
                              pageId={pageId}
                              type={s.type}
                              item={it}
                              index={k}
                              count={own.length}
                              preview={it.mediaId ? previews.get(it.mediaId) : null}
                              noun={noun}
                              folder={s.type === "logo_carousel" ? "logos" : "images"}
                              aspect={s.type === "logo_carousel" ? "aspect-[2/1]" : s.type === "featured_video" ? "aspect-video" : "aspect-[16/9]"}
                              fit={s.type === "logo_carousel" ? "contain" : "cover"}
                              canDelete={canDelete}
                              full
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-muted">Nothing here yet.</p>
                      )}
                      {canEdit ? (
                        <ActionButton action={addBlankItem.bind(null, pageId, s.id)} className="btn btn-ghost min-h-11">
                          <AdminIcon name="plus" className="h-4 w-4" /> Add a {noun}
                        </ActionButton>
                      ) : null}
                    </div>
                  ) : null}
                </CardBody>
              </SectionForm>
            </SectionCard>
          );
        })}
      </div>

      {canEdit && (page.template === "sections" || secs.length) ? (
        <SectionCard icon="plus" title="Add a section" subtitle="Pick what the new block should show. It is added at the bottom and stays hidden until you switch it on." id="add-section">
          <SectionForm action={addSection.bind(null, pageId)} saveLabel="Add the section" refreshOnSave resetOnSave sticky={false}>
            <CardBody>
              <RadioCards name="type" defaultValue="rich_text" className="sm:grid-cols-2 xl:grid-cols-3" options={SECTION_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] ?? t, hint: TYPE_HINT[t] }))} />
              <Field label="Heading (optional)" className="max-w-md">
                <input name="title" className="field" />
              </Field>
            </CardBody>
          </SectionForm>
        </SectionCard>
      ) : null}
    </>
  );
}
