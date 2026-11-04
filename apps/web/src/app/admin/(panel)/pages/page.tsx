import Link from "next/link";
import { asc, isNull, sql } from "drizzle-orm";
import { schema } from "@gio/db";
import { getDb } from "@/lib/db";
import { encodePath } from "@/lib/content";
import { hasRole, requireRole } from "@/lib/admin/guard";
import { fmtDate } from "@/lib/admin/form";
import { AdminIcon } from "@/lib/admin/icons";
import { ConfirmButton } from "@/lib/admin/client";
import { Badge, PageHeader, RowActions, Table } from "@/lib/admin/ui";
import { deletePage } from "./actions";

export const metadata = { title: "All pages" };

const TEMPLATE_LABEL: Record<string, string> = {
  sections: "Sections",
  leaders: "Leaders list",
  post_listing: "News list",
  contact: "Contact",
  embed: "Embed",
};

export default async function PagesPage() {
  const { user } = await requireRole("contributor");
  const isAdmin = hasRole(user, "admin");
  const p = schema.pages;
  const rows = await getDb()
    .select({
      id: p.id,
      slug: p.slug,
      title: p.title,
      template: p.template,
      status: p.status,
      updatedAt: p.updatedAt,
      sectionCount: sql<number>`(select count(*) from sections s where s.page_id = ${p.id})`,
      publishedAt: sql<number | null>`(select published_at from published_layouts l where l.page_id = ${p.id} and l.is_current = 1)`,
    })
    .from(p)
    .where(isNull(p.deletedAt))
    .orderBy(sql`${p.slug} <> ''`, asc(p.title));

  return (
    <>
      <PageHeader
        title="All pages"
        icon="pages"
        description="The home page and every fixed page of the website. Section pages are edited as a draft and go live when you click Publish."
        actions={
          isAdmin ? (
            <Link href="/admin/pages/new/" className="btn btn-primary">
              <AdminIcon name="plus" className="h-4 w-4" /> Add page
            </Link>
          ) : null
        }
      />
      <Table>
        <thead>
          <tr>
            <th>Page</th>
            <th>Type</th>
            <th>Status</th>
            <th>Last published</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const removable = isAdmin && r.slug !== "" && (r.template === "sections" || r.template === "embed");
            return (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/pages/${r.id}/`} className="font-medium text-ink hover:text-brand-700 hover:underline">
                    {r.slug === "" ? "Home page" : r.title}
                  </Link>
                  <div className="text-xs text-muted">{r.slug === "" ? "/" : `/${r.slug}/`}</div>
                </td>
                <td className="text-muted">
                  {TEMPLATE_LABEL[r.template] ?? r.template}
                  {r.sectionCount ? ` · ${r.sectionCount} sections` : ""}
                </td>
                <td>
                  <Badge value={r.status} />
                </td>
                <td className="whitespace-nowrap text-muted">{r.publishedAt ? fmtDate(r.publishedAt, true) : "—"}</td>
                <td>
                  <RowActions editHref={`/admin/pages/${r.id}/`} viewHref={r.slug === "" ? "/" : `/${encodePath(r.slug)}/`}>
                    {removable ? (
                      <form action={deletePage.bind(null, r.id)}>
                        <ConfirmButton className="btn btn-sm btn-danger" message={`Delete the page “${r.title}”? It disappears from the website. Links to it in menus will stop working.`}>
                          <AdminIcon name="trash" className="h-3.5 w-3.5" /> Delete
                        </ConfirmButton>
                      </form>
                    ) : null}
                  </RowActions>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <p className="mt-4 text-sm text-muted">
        Leader pages list the people from <Link href="/admin/leaders/" className="text-brand-700 underline">Leaders</Link>; news list pages show{" "}
        <Link href="/admin/posts/" className="text-brand-700 underline">News</Link> from their category. Built-in pages can be set to Draft to hide them, but not deleted.
      </p>
    </>
  );
}
