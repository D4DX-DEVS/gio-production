// Home page builder: every block of the website's front page in order, with a live draft preview and a
// Customize panel (look, order, visibility). The dedicated screens (banners, about, posters…) edit a block's content.
import type { Metadata } from "next";
import { hasRole, requireRole } from "@/lib/admin/guard";
import { findHomePage } from "@/lib/admin/homepage";
import { loadBuilderState } from "@/lib/admin/homepage-builder";
import { Card, PageHeader } from "@/lib/admin/ui";
import { getDb } from "@/lib/db";
import { HomeBuilder } from "./builder";

export const metadata: Metadata = { title: "Home page: order and look" };

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
        title="Home page: order and look"
        description="Every block of the front page, top to bottom. Drag a block to move it, hide it, or change how it looks. To change what is inside a block, use the section's own page in the menu on the left."
      />
      <HomeBuilder initial={state} canEdit={hasRole(user, "editor")} />
    </>
  );
}
