// The two parts of the home page "About" block: the text on the left and the poster on the right.
// Each part is its own card with its own Save button; saving puts it on the website at once.
import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { hasRole, requireRole } from "@/lib/admin/guard";
import { AdminIcon } from "@/lib/admin/icons";
import { homepageDraft } from "@/lib/admin/homepage";
import { mediaPreviews } from "@/lib/admin/media-options";
import { HtmlEditor, MediaPicker } from "@/lib/admin/client";
import { ActionButton, SectionForm } from "@/lib/admin/section-form";
import { Badge, Card, CardBody, Field, LiveNote, PageHeader, SectionCard, Toggle } from "@/lib/admin/ui";
import { deleteAboutPoster, deleteAboutText, saveAboutPoster, saveAboutText } from "../actions";

export const metadata: Metadata = { title: "About block" };

export default async function AboutAdmin() {
  const { user } = await requireRole("contributor");
  const db = getDb();
  const draft = await homepageDraft(db);
  if (!draft) {
    return (
      <>
        <PageHeader title="About block" />
        <Card>There is no home page in the database yet. Run the importer first.</Card>
      </>
    );
  }
  const { aboutText, aboutPoster, items } = draft;
  const canEdit = hasRole(user, "editor");
  const canDelete = hasRole(user, "admin");
  const posterItem = aboutPoster ? (items.find((i) => i.sectionId === aboutPoster.id) ?? null) : null;
  const previews = await mediaPreviews(db, [posterItem?.mediaId]);
  const text = aboutText?.data ?? {};
  const state = (row: { isVisible: boolean } | null) => <Badge value={row ? (row.isVisible ? "published" : "hidden") : "draft"} label={row ? (row.isVisible ? "On the website" : "Hidden") : "Not added yet"} />;

  return (
    <>
      <PageHeader title="About block" description="The introduction under the banner: a heading, text and button on the left, and a poster on the right." back={{ href: "/admin/homepage/", label: "Home page" }} />
      <LiveNote viewHref="/" viewLabel="Open the home page" />

      <div className="space-y-8">
        <SectionCard icon="about" title="About us text" subtitle="Heading, paragraphs and the button under them." status={state(aboutText)}>
          <SectionForm
            action={saveAboutText}
            readOnly={!canEdit}
            saveLabel={aboutText ? "Save text" : "Add text"}
            refreshOnSave
            aside={
              aboutText && canDelete ? (
                <ActionButton action={deleteAboutText} confirm="Delete the About text from the home page? It leaves the website." className="btn btn-danger min-h-11">
                  <AdminIcon name="trash" className="h-4 w-4" /> Delete
                </ActionButton>
              ) : null
            }
          >
            <CardBody>
              <Field label="Heading">
                <input name="heading" defaultValue={String(text.heading ?? "")} className="field text-lg font-semibold" placeholder="ജി. ഐ. ഒ (ഗേള്‍സ് ഇസ്‌ലാമിക് ഓര്‍ഗനൈസേഷന്‍)" />
              </Field>
              <div>
                <span className="label">Text</span>
                <HtmlEditor name="html" rows={9} defaultValue={String(text.html ?? "")} />
                <span className="mt-1 block text-xs text-muted">Select text and use the buttons above to format it. Malayalam is fine.</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Button text" hint="Leave empty for no button.">
                  <input name="buttonLabel" defaultValue={String(text.buttonLabel ?? "")} className="field" placeholder="Read more" />
                </Field>
                <Field label="Button link" hint="A page like /about-us/ or a full web address.">
                  <input name="buttonUrl" defaultValue={String(text.buttonUrl ?? "")} className="field" placeholder="/about-us/" />
                </Field>
              </div>
              <Toggle name="isVisible" label="Show on the website" defaultChecked={aboutText?.isVisible ?? true} />
            </CardBody>
          </SectionForm>
        </SectionCard>

        <SectionCard icon="image" title="Poster on the right" subtitle="The picture beside the text. Tapping it on the website opens it full size." status={state(aboutPoster)}>
          <SectionForm
            action={saveAboutPoster}
            readOnly={!canEdit}
            saveLabel={aboutPoster ? "Save poster" : "Add poster"}
            refreshOnSave
            aside={
              aboutPoster && canDelete ? (
                <ActionButton action={deleteAboutPoster} confirm="Delete the poster from the home page? It leaves the website." className="btn btn-danger min-h-11">
                  <AdminIcon name="trash" className="h-4 w-4" /> Delete
                </ActionButton>
              ) : null
            }
          >
            <CardBody>
              <MediaPicker name="mediaId" label="Poster image" defaultId={posterItem?.mediaId} preview={posterItem?.mediaId ? previews.get(posterItem.mediaId) : null} />
              <Field label="Picture description" hint="Read aloud for people who cannot see the picture.">
                <input name="altText" defaultValue={posterItem?.altText ?? ""} className="field" />
              </Field>
              <Field label="Link when clicked (optional)" hint="Leave empty to open the picture full size.">
                <input name="linkUrl" defaultValue={posterItem?.linkUrl ?? ""} className="field" placeholder="/about-us/ or https://…" />
              </Field>
              <Toggle name="isVisible" label="Show on the website" defaultChecked={aboutPoster?.isVisible ?? true} />
            </CardBody>
          </SectionForm>
        </SectionCard>
      </div>
    </>
  );
}
