// Home page builder: every block of the website's front page in order, with a live draft preview and a
// Customize panel (look, order, visibility). The dedicated screens (banners, about, posters…) edit a block's content.
import type { Metadata } from "next";
import Link from "next/link";
import { hasRole, requireRole } from "@/lib/admin/guard";
import { AdminIcon } from "@/lib/admin/icons";
import { findHomePage } from "@/lib/admin/homepage";
import { loadBuilderState } from "@/lib/admin/homepage-builder";
import { Card, PageHeader } from "@/lib/admin/ui";
import { getDb } from "@/lib/db";
import { HomeBuilder } from "./builder";

export const metadata: Metadata = { title: "Home page" };

export default async function HomepageBuilderPage() {
  const { user } = await requireRole("contributor");
  const db = getDb();
  const home = await findHomePage(db);
  if (!home) {
    return (
      <>
        <PageHeader title="Home page" icon="home" />
        <Card>There is no homepage in the database yet. Run the importer first.</Card>
      </>
    );
  }
  const state = await loadBuilderState(db, home.id);
  return (
    <>
      <PageHeader
        title="Home page"
        icon="home"
        description="Every block of the front page. Restyle one, drag it where you want it, and check the draft on the right. Changes are saved as a draft and go live when you publish."
        actions={
          <Link href={`/admin/preview/page/${home.id}/`} target="_blank" className="btn btn-ghost min-h-11">
            Preview draft <AdminIcon name="external" className="h-4 w-4" />
          </Link>
        }
      />
      <HomeBuilder initial={state} canEdit={hasRole(user, "editor")} />
    </>
  );
}
