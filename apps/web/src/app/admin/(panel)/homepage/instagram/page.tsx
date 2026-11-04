// The homepage Instagram block, which follows the club's own Instagram page.
import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { hasRole, requireRole } from "@/lib/admin/guard";
import { AdminIcon } from "@/lib/admin/icons";
import { homepageDraft } from "@/lib/admin/homepage";
import { ConfirmButton, SubmitButton } from "@/lib/admin/client";
import { Badge, Card, Field, PageHeader, Toggle } from "@/lib/admin/ui";
import { deleteInstagram, saveInstagram } from "../actions";
import { HomepageHeader } from "../publish-banner";

export const metadata: Metadata = { title: "Instagram feed" };

export default async function InstagramAdmin() {
  const { user } = await requireRole("contributor");
  const draft = await homepageDraft(getDb());
  if (!draft) {
    return (
      <>
        <PageHeader icon="home" title="Instagram feed" />
        <Card>There is no homepage in the database yet. Run the importer first.</Card>
      </>
    );
  }
  const { home, instagram, current, unpublished } = draft;
  const canEdit = hasRole(user, "editor");
  const canDelete = hasRole(user, "admin");
  const data = instagram?.data ?? {};
  const profileUrl = String(data.profileUrl ?? "https://www.instagram.com/gio_keralam/");

  return (
    <>
      <HomepageHeader
        title="Instagram feed"
        description="Replaces the old gallery block on the homepage. It shows the newest posts from the club's Instagram page and updates by itself."
        homeId={home.id}
        back="/admin/homepage/instagram/"
        canEdit={canEdit}
        current={current}
        unpublished={unpublished}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card title="Instagram block" aside={instagram ? <Badge value={instagram.isVisible ? "published" : "hidden"} label={instagram.isVisible ? "Shown" : "Hidden"} /> : <Badge value="draft" label="Not added yet" />}>
          <form action={saveInstagram} className="space-y-5">
            <Field label="Heading">
              <input name="title" defaultValue={instagram?.title ?? "Follow us on Instagram"} className="field text-lg font-semibold" disabled={!canEdit} />
            </Field>
            <Field label="Instagram page link" hint="The page the posts come from.">
              <input name="profileUrl" defaultValue={profileUrl} className="field" placeholder="https://www.instagram.com/gio_keralam/" disabled={!canEdit} />
            </Field>
            <Field label="Posts to show" hint="3 to 12, in rows of three. Used when the feed is read through the Instagram API (see the note).">
              <input name="count" type="number" min={3} max={12} defaultValue={Number(data.count) || 6} className="field w-28" disabled={!canEdit} />
            </Field>
            <Toggle name="isVisible" label="Show on the website" defaultChecked={instagram?.isVisible ?? true} disabled={!canEdit} />
            {canEdit ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
                <SubmitButton>{instagram ? "Save" : "Add Instagram block"}</SubmitButton>
                {instagram && canDelete ? (
                  <ConfirmButton formAction={deleteInstagram} message="Delete the Instagram block from the homepage draft?">
                    <AdminIcon name="trash" className="h-4 w-4" /> Delete block
                  </ConfirmButton>
                ) : null}
              </div>
            ) : null}
          </form>
        </Card>

        <div className="space-y-6">
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
            <a href={profileUrl} target="_blank" className="btn btn-ghost mt-4 w-full">
              Open the Instagram page <AdminIcon name="external" className="h-4 w-4" />
            </a>
          </Card>
        </div>
      </div>
    </>
  );
}
