// One slide, poster, logo or video inside a section's form. Its fields are named `i<id>_<field>`, so the
// section's single Save (saveSectionBundle) reads every item at once. Move and Remove act at once instead.
import type { SectionType } from "@gio/db/schema";
import { moveItem, deleteItem } from "@/app/admin/(panel)/pages/actions";
import { VideoField } from "@/app/admin/(panel)/homepage/video-field";
import { youtubeId } from "@/lib/youtube";
import { Badge, Field, Toggle } from "./ui";
import { MediaPicker, type MediaOption } from "./client";
import { ActionButton } from "./section-form";
import type { ItemRow } from "./homepage";

export function ItemCard({
  pageId,
  type,
  item,
  index,
  count,
  preview,
  noun,
  folder,
  aspect,
  fit,
  canDelete,
  full = false,
}: {
  pageId: number;
  type: SectionType;
  item: ItemRow;
  index: number;
  count: number;
  preview?: MediaOption | null;
  /** "banner", "poster", "logo", "video" */
  noun: string;
  /** R2 folder for images uploaded from the picker. */
  folder: string;
  aspect: string;
  fit: "cover" | "contain";
  canDelete: boolean;
  /** The page editor shows a heading, text and link text too; the home page screens show only what the website uses. */
  full?: boolean;
}) {
  const p = `i${item.id}_`;
  const isVideo = type === "featured_video";
  const vid = isVideo ? youtubeId(item.linkUrl) : null;
  return (
    <article id={`item-${item.id}`} className={`flex scroll-mt-24 flex-col overflow-hidden rounded-xl border bg-white ${item.isVisible ? "border-line" : "border-dashed border-slate-300"}`}>
      <div className={`relative ${aspect} bg-paper`}>
        {isVideo ? (
          vid ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <span className="flex h-full items-center justify-center text-xs text-muted">No video link yet</span>
          )
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.url} alt={item.altText ?? preview.alt ?? ""} className={`h-full w-full ${fit === "cover" ? "object-cover" : "object-contain p-4"}`} loading="lazy" decoding="async" />
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-muted">No image yet</span>
        )}
        <span className="absolute left-2 top-2 flex gap-1">
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-brand-900 shadow">
            {noun[0].toUpperCase() + noun.slice(1)} {index + 1}
          </span>
          {!item.isVisible ? <Badge value="hidden" label="Hidden" /> : null}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {isVideo ? (
          <>
            <VideoField name={`${p}linkUrl`} defaultValue={item.linkUrl ?? ""} />
            <Field label="Title (optional)" hint="Leave empty to use the title from YouTube.">
              <input name={`${p}heading`} defaultValue={item.heading ?? ""} className="field" />
            </Field>
          </>
        ) : (
          <>
            <MediaPicker name={`${p}mediaId`} label={`${noun[0].toUpperCase()}${noun.slice(1)} image`} folder={folder} defaultId={item.mediaId} preview={preview} />
            {full ? (
              <>
                <Field label="Heading (optional)">
                  <input name={`${p}heading`} defaultValue={item.heading ?? ""} className="field" />
                </Field>
                <Field label="Text (optional)">
                  <textarea name={`${p}body`} rows={2} defaultValue={item.body ?? ""} className="field" />
                </Field>
              </>
            ) : null}
            <Field label="Picture description" hint="Read aloud for people who cannot see the picture.">
              <input name={`${p}altText`} defaultValue={item.altText ?? ""} className="field" />
            </Field>
            <Field label="Link when clicked (optional)" hint="A page like /about-us/ or a full web address.">
              <input name={`${p}linkUrl`} defaultValue={item.linkUrl ?? ""} className="field" placeholder="/about-us/ or https://…" />
            </Field>
            {full ? (
              <Field label="Link text (optional)">
                <input name={`${p}linkLabel`} defaultValue={item.linkLabel ?? ""} className="field" />
              </Field>
            ) : null}
            <Toggle name={`${p}openInNewTab`} label="Open the link in a new tab" defaultChecked={item.openInNewTab} />
          </>
        )}
        <Toggle name={`${p}isVisible`} label="Show on the website" defaultChecked={item.isVisible} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper/50 px-3 py-2.5">
        <ActionButton action={moveItem.bind(null, pageId, item.id, -1)} disabled={index === 0} label={`Move ${noun} ${index + 1} earlier`} className="btn btn-ghost btn-sm min-h-10 px-3">
          ← Earlier
        </ActionButton>
        <ActionButton action={moveItem.bind(null, pageId, item.id, 1)} disabled={index === count - 1} label={`Move ${noun} ${index + 1} later`} className="btn btn-ghost btn-sm min-h-10 px-3">
          Later →
        </ActionButton>
        {canDelete ? (
          <ActionButton action={deleteItem.bind(null, pageId, item.id)} confirm={`Delete this ${noun}? It leaves the website. The image stays in the library.`} label={`Delete ${noun} ${index + 1}`} className="btn btn-danger btn-sm ml-auto min-h-10 px-3">
            Delete
          </ActionButton>
        ) : null}
      </div>
    </article>
  );
}
