// The home page Instagram block, which follows the club's own Instagram page.
import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { hasRole, requireRole } from "@/lib/admin/guard";
import { AdminIcon } from "@/lib/admin/icons";
import { homepageDraft } from "@/lib/admin/homepage";
import { ActionButton, SectionForm } from "@/lib/admin/section-form";
import { Badge, Card, CardBody, Field, LiveNote, PageHeader, SectionCard, Toggle } from "@/lib/admin/ui";
import { deleteInstagram, saveInstagram } from "../actions";

export const metadata: Metadata = { title: "Instagram feed" };

export default async function InstagramAdmin() {
  const { user } = await requireRole("contributor");
  const draft = await homepageDraft(getDb());
  if (!draft) {
    return (
      <>
        <PageHeader title="Instagram feed" />
        <Card>There is no home page in the database yet. Run the importer first.</Card>
      </>
    );
  }
  const { instagram } = draft;
  const canEdit = hasRole(user, "editor");
  const canDelete = hasRole(user, "admin");
  const data = instagram?.data ?? {};
  const profileUrl = String(data.profileUrl ?? "https://www.instagram.com/gio_keralam/");

  return (
    <>
      <PageHeader
        title="Instagram feed"
        description="Shows the newest posts from the club's Instagram page and updates by itself."
        back={{ href: "/admin/homepage/", label: "Home page" }}
      />
      <LiveNote viewHref="/" viewLabel="Open the home page" />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <SectionCard
          icon="gallery"
          title="Instagram block"
          subtitle="Heading, page link and how many posts."
          status={<Badge value={instagram ? (instagram.isVisible ? "published" : "hidden") : "draft"} label={instagram ? (instagram.isVisible ? "On the website" : "Hidden") : "Not added yet"} />}
        >
          <SectionForm
            action={saveInstagram}
            readOnly={!canEdit}
            saveLabel={instagram ? "Save" : "Add the Instagram block"}
            refreshOnSave
            aside={
              instagram && canDelete ? (
                <ActionButton action={deleteInstagram} confirm="Delete the Instagram block from the home page? It leaves the website." className="btn btn-danger min-h-11">
                  <AdminIcon name="trash" className="h-4 w-4" /> Delete
                </ActionButton>
              ) : null
            }
          >
            <CardBody>
              <Field label="Heading">
                <input name="title" defaultValue={instagram?.title ?? "Follow us on Instagram"} className="field text-lg font-semibold" />
              </Field>
              <Field label="Instagram page link" hint="The page the posts come from.">
                <input name="profileUrl" defaultValue={profileUrl} className="field" placeholder="https://www.instagram.com/gio_keralam/" />
              </Field>
              <Field label="Posts to show" hint="4 to 12, in rows of four. Used when the feed is read through the Instagram API (see the note).">
                <input name="count" type="number" min={4} max={12} defaultValue={Number(data.count) || 8} className="field w-28" />
              </Field>
              <Toggle name="isVisible" label="Show on the website" defaultChecked={instagram?.isVisible ?? true} />
            </CardBody>
          </SectionForm>
        </SectionCard>

        <Card title="How it updates">
          <ul className="space-y-3 text-sm text-muted">
            <li className="flex gap-2.5">
              <AdminIcon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>The website shows Instagram&rsquo;s own profile box, which always lists the newest posts. Nothing to update by hand.</span>
            </li>
            <li className="flex gap-2.5">
              <AdminIcon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>Visitors tap a post to open it on Instagram, and the Follow button goes to the page.</span>
            </li>
            <li className="flex gap-2.5">
              <AdminIcon name="about" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <span>
                Note: to show your own photo grid (with this many posts), a developer adds an <code className="rounded bg-paper px-1 text-xs">INSTAGRAM_ACCESS_TOKEN</code> to the server settings.
              </span>
            </li>
          </ul>
          <a href={profileUrl} target="_blank" rel="noopener" className="btn btn-ghost mt-4 w-full">
            Open the Instagram page <AdminIcon name="external" className="h-4 w-4" />
          </a>
        </Card>
      </div>
    </>
  );
}
