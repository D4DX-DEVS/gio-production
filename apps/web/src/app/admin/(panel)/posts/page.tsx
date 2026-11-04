import Link from "next/link";
import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";
import { POST_STATUSES } from "@gio/db/schema";
import { schema } from "@gio/db";
import { getDb } from "@/lib/db";
import { encodePath } from "@/lib/content";
import { hasRole, requireRole } from "@/lib/admin/guard";
import { contains } from "@/lib/admin/sql";
import { fmtDate } from "@/lib/admin/form";
import { AdminIcon } from "@/lib/admin/icons";
import { ConfirmButton } from "@/lib/admin/client";
import { Badge, EmptyState, PageHeader, Pagination, RowActions, SectionTabs, Table, pageParam, param } from "@/lib/admin/ui";
import { deletePost } from "./actions";

export const metadata = { title: "News" };
const PAGE_SIZE = 25;

export default async function PostsPage({ searchParams }: PageProps<"/admin/posts">) {
  const { user } = await requireRole("contributor");
  const canDelete = hasRole(user, "admin");
  const sp = await searchParams;
  const page = pageParam(sp);
  const q = param(sp, "q")?.trim();
  const status = POST_STATUSES.find((s) => s === param(sp, "status"));
  const p = schema.posts;
  const where = and(
    isNull(p.deletedAt),
    status ? eq(p.status, status) : undefined,
    q ? or(contains(p.title, q), contains(p.slug, q)) : undefined,
  );
  const db = getDb();
  const [rows, [{ n }], statusCounts] = await Promise.all([
    db
      .select({
        id: p.id,
        title: p.title,
        slug: p.slug,
        status: p.status,
        publishedAt: p.publishedAt,
        updatedAt: p.updatedAt,
        reviewState: p.reviewState,
        categories: sql<string | null>`(select group_concat(c.name, ', ') from post_categories pc join categories c on c.id = pc.category_id where pc.post_id = ${p.id})`,
      })
      .from(p)
      .where(where)
      .orderBy(desc(sql`coalesce(${p.publishedAt}, ${p.updatedAt})`), desc(p.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(p).where(where),
    db.select({ status: p.status, n: count() }).from(p).where(isNull(p.deletedAt)).groupBy(p.status),
  ]);
  const byStatus = new Map(statusCounts.map((c) => [c.status, c.n]));
  const total = statusCounts.reduce((a, c) => a + c.n, 0);
  const tabHref = (st?: string) => {
    const qs = new URLSearchParams();
    if (st) qs.set("status", st);
    if (q) qs.set("q", q);
    const t = qs.toString();
    return t ? `/admin/posts/?${t}` : "/admin/posts/";
  };

  return (
    <>
      <PageHeader
        title="News"
        icon="news"
        description="News, reports and articles shown on the website's News page. Published posts appear at their own address."
        actions={
          <>
            <a href="/gio-news/" target="_blank" className="btn btn-ghost">
              View page <AdminIcon name="external" className="h-4 w-4" />
            </a>
            <Link href="/admin/posts/new/" className="btn btn-primary">
              <AdminIcon name="plus" className="h-4 w-4" /> Add news
            </Link>
          </>
        }
      />
      <SectionTabs
        tabs={[
          { href: tabHref(), label: "All", active: !status, count: total },
          ...POST_STATUSES.filter((st) => byStatus.has(st)).map((st) => ({ href: tabHref(st), label: st[0].toUpperCase() + st.slice(1), active: status === st, count: byStatus.get(st) })),
        ]}
      />
      <form className="mb-4 flex flex-wrap gap-2" action="/admin/posts/">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <div className="relative w-full max-w-sm">
          <AdminIcon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Search title or address" className="field pl-9" />
        </div>
        <button className="btn btn-ghost">Search</button>
        {q ? (
          <Link href={tabHref(status)} className="btn btn-quiet">
            Clear
          </Link>
        ) : null}
      </form>
      {rows.length ? (
        <Table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="max-w-md">
                  <Link href={`/admin/posts/${r.id}/`} className="font-medium text-ink hover:text-brand-700 hover:underline">
                    {r.title || "(no title)"}
                  </Link>
                  <div className="truncate text-xs text-muted">/{r.slug}/</div>
                </td>
                <td className="text-muted">{r.categories ?? "—"}</td>
                <td>
                  <div className="flex flex-col items-start gap-1">
                    <Badge value={r.status} />
                    {r.reviewState === "pending_client" ? <Badge value="pending_client" label="needs review" /> : null}
                  </div>
                </td>
                <td className="whitespace-nowrap text-muted">{fmtDate(r.publishedAt ?? r.updatedAt)}</td>
                <td>
                  <RowActions editHref={`/admin/posts/${r.id}/`} viewHref={r.status === "published" ? `/${encodePath(r.slug)}/` : undefined}>
                    {canDelete ? (
                      <form action={deletePost.bind(null, r.id)}>
                        <ConfirmButton className="btn btn-sm btn-danger" message={`Delete “${r.title || "this post"}”? It is removed from the website and moved to the trash.`}>
                          <AdminIcon name="trash" className="h-3.5 w-3.5" /> Delete
                        </ConfirmButton>
                      </form>
                    ) : null}
                  </RowActions>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          icon="news"
          title={q || status ? "No news matches" : "No news yet"}
          action={
            <Link href="/admin/posts/new/" className="btn btn-primary">
              <AdminIcon name="plus" className="h-4 w-4" /> Add news
            </Link>
          }
        >
          {q || status ? "Try a different search or status." : "Write your first news post and it appears on the website once published."}
        </EmptyState>
      )}
      <Pagination basePath="/admin/posts/" page={page} pageSize={PAGE_SIZE} total={n} params={{ q, status }} />
    </>
  );
}
