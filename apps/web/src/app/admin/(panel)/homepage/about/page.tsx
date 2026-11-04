// The two parts of the homepage "About" block: the text on the left and the poster on the right.
import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { hasRole, requireRole } from "@/lib/admin/guard";
import { AdminIcon } from "@/lib/admin/icons";
import { homepageDraft } from "@/lib/admin/homepage";
import { mediaPreviews } from "@/lib/admin/media-options";
import { ConfirmButton, HtmlEditor, MediaPicker, SubmitButton } from "@/lib/admin/client";
import { Badge, Card, Field, PageHeader, Toggle } from "@/lib/admin/ui";
import { deleteAboutPoster, deleteAboutText, saveAboutPoster, saveAboutText } from "../actions";
import { HomepageHeader } from "../publish-banner";

export const metadata: Metadata = { title: "About section" };

export default async function AboutAdmin() {
  const { user } = await requireRole("contributor");
  const db = getDb();
  const draft = await homepageDraft(db);
  if (!draft) {
    return (
      <>
        <PageHeader icon="home" title="About section" />
        <Card>There is no homepage in the database yet. Run the importer first.</Card>
      </>
    );
  }
  const { home, aboutText, aboutPoster, items, current, unpublished } = draft;
  const canEdit = hasRole(user, "editor");
  const canDelete = hasRole(user, "admin");
  const posterItem = aboutPoster ? (items.find((i) => i.sectionId === aboutPoster.id) ?? null) : null;
  const previews = await mediaPreviews(db, [posterItem?.mediaId]);
  const text = aboutText?.data ?? {};

  return (
    <>
      <HomepageHeader
        title="About section"
        description="The introduction block under the banner: a heading, text and button on the left, and a poster on the right."
        homeId={home.id}
        back="/admin/homepage/about/"
        canEdit={canEdit}
        current={current}
        unpublished={unpublished}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card
          title="About us text"
          description="Heading, paragraphs and the button under them."
          aside={aboutText ? <Badge value={aboutText.isVisible ? "published" : "hidden"} label={aboutText.isVisible ? "Shown" : "Hidden"} /> : <Badge value="draft" label="Not added yet" />}
        >
          <form action={saveAboutText} className="space-y-5">
            <Field label="Heading">
              <input name="heading" defaultValue={String(text.heading ?? "")} className="field text-lg font-semibold" placeholder="ജി. ഐ. ഒ (ഗേള്‍സ് ഇസ്‌ലാമിക് ഓര്‍ഗനൈസേഷന്‍)" disabled={!canEdit} />
            </Field>
            <div>
              <span className="label">Text</span>
              <HtmlEditor name="html" rows={9} defaultValue={String(text.html ?? "")} disabled={!canEdit} />
              <span className="mt-1 block text-xs text-muted">Select text and use the buttons above to format it. Malayalam is fine.</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Button text" hint="Leave empty for no button.">
                <input name="buttonLabel" defaultValue={String(text.buttonLabel ?? "")} className="field" placeholder="Read more" disabled={!canEdit} />
              </Field>
              <Field label="Button link" hint="A page like /about-us/ or a full web address.">
                <input name="buttonUrl" defaultValue={String(text.buttonUrl ?? "")} className="field" placeholder="/about-us/" disabled={!canEdit} />
              </Field>
            </div>
            <Toggle name="isVisible" label="Show on the website" defaultChecked={aboutText?.isVisible ?? true} disabled={!canEdit} />
            {canEdit ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
                <SubmitButton>{aboutText ? "Save text" : "Add text"}</SubmitButton>
                {aboutText && canDelete ? (
                  <ConfirmButton formAction={deleteAboutText} message="Delete the About text from the homepage draft?">
                    <AdminIcon name="trash" className="h-4 w-4" /> Delete text
                  </ConfirmButton>
                ) : null}
              </div>
            ) : null}
          </form>
        </Card>

        <Card
          title="Poster on the right"
          description="The picture shown beside the text. Tap it on the website to open it full size."
          aside={aboutPoster ? <Badge value={aboutPoster.isVisible ? "published" : "hidden"} label={aboutPoster.isVisible ? "Shown" : "Hidden"} /> : <Badge value="draft" label="Not added yet" />}
        >
          <form action={saveAboutPoster} className="space-y-5">
            <MediaPicker name="mediaId" label="Poster image" defaultId={posterItem?.mediaId} preview={posterItem?.mediaId ? previews.get(posterItem.mediaId) : null} />
            <Field label="Picture description" hint="Read aloud for people who cannot see the picture.">
              <input name="altText" defaultValue={posterItem?.altText ?? ""} className="field" disabled={!canEdit} />
            </Field>
            <Field label="Link (optional)" hint="Where the poster goes when tapped. Empty opens the picture full size.">
              <input name="linkUrl" defaultValue={posterItem?.linkUrl ?? ""} className="field" placeholder="/about-us/ or https://…" disabled={!canEdit} />
            </Field>
            <Toggle name="isVisible" label="Show on the website" defaultChecked={aboutPoster?.isVisible ?? true} disabled={!canEdit} />
            {canEdit ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
                <SubmitButton>{aboutPoster ? "Save poster" : "Add poster"}</SubmitButton>
                {aboutPoster && canDelete ? (
                  <ConfirmButton formAction={deleteAboutPoster} message="Delete the poster from the homepage draft?">
                    <AdminIcon name="trash" className="h-4 w-4" /> Delete poster
                  </ConfirmButton>
                ) : null}
              </div>
            ) : null}
          </form>
        </Card>
      </div>
    </>
  );
}
