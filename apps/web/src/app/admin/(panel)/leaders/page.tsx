import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq, inArray } from "drizzle-orm";
import { schema as s } from "@gio/db";
import { mediaUrl } from "@/lib/admin/media-options";
import { getDb } from "@/lib/db";
import { requireRole, hasRole } from "@/lib/admin/guard";
import { AdminIcon } from "@/lib/admin/icons";
import { Badge, Card, EmptyRow, Field, PageHeader, RowActions, SectionTabs, param, Table } from "@/lib/admin/ui";
import { ConfirmButton, SubmitButton } from "@/lib/admin/client";
import { createGroup, deleteLeader, saveGroup } from "./actions";

export const metadata: Metadata = { title: "Leaders" };

const SCOPES = [
  { key: "state", label: "State leaders", page: "/team/" },
  { key: "district", label: "District leaders", page: "/district-leaders/" },
  { key: "former", label: "Former leaders", page: "/former-leaders/" },
] as const;

export default async function LeadersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireRole("contributor");
  const sp = await searchParams;
  const scope = SCOPES.find((x) => x.key === param(sp, "scope")) ?? SCOPES[0];
  const db = getDb();
  const groups = await db.select().from(s.leaderGroups).where(eq(s.leaderGroups.scope, scope.key)).orderBy(asc(s.leaderGroups.sort), asc(s.leaderGroups.id));
  const people = groups.length
    ? await db
        .select({ l: s.leaders, key: s.media.r2Key })
        .from(s.leaders)
        .leftJoin(s.media, eq(s.media.id, s.leaders.photoMediaId))
        .where(inArray(s.leaders.groupId, groups.map((g) => g.id)))
        .orderBy(asc(s.leaders.sort), asc(s.leaders.id))
    : [];
  const canEdit = hasRole(user, "editor");
  const canDelete = hasRole(user, "admin");

  return (
    <>
      <PageHeader
        title="Leaders"
        icon="leaders"
        description={
          <>
            Names, roles and links are shown exactly as entered. Entries flagged <Badge value="pending_client" /> are waiting for the client in the review queue.
          </>
        }
        actions={
          <Link href={scope.page} target="_blank" className="btn btn-ghost">
            View page <AdminIcon name="external" className="h-4 w-4" />
          </Link>
        }
      />
      <SectionTabs tabs={SCOPES.map((x) => ({ href: `/admin/leaders/?scope=${x.key}`, label: x.label, active: x.key === scope.key }))} />

      <div className="space-y-6">
        {groups.map((g) => {
          const members = people.filter((p) => p.l.groupId === g.id);
          return (
            <Card key={g.id}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                {canEdit ? (
                  <form action={saveGroup} className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="scope" value={scope.key} />
                    <Field label={scope.key === "former" ? "Term (as shown)" : "Heading (optional)"}>
                      <input name="heading" className="field" defaultValue={g.heading ?? ""} placeholder={scope.label} />
                    </Field>
                    <Field label="Order" className="w-24">
                      <input name="sort" type="number" className="field" defaultValue={g.sort} />
                    </Field>
                    <label className="flex items-center gap-2 pb-2 text-sm">
                      <input type="checkbox" name="isVisible" defaultChecked={g.isVisible} /> Visible
                    </label>
                    <SubmitButton className="btn btn-ghost">Save group</SubmitButton>
                  </form>
                ) : (
                  <h2 className="text-lg font-semibold text-brand-900">{g.heading ?? scope.label}</h2>
                )}
                {canEdit ? (
                  <Link href={`/admin/leaders/new/?group=${g.id}`} className="btn btn-primary">
                    <AdminIcon name="plus" className="h-4 w-4" /> Add person
                  </Link>
                ) : null}
              </div>
              <Table>
                <thead>
                  <tr>
                    <th className="w-16">Photo</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th className="w-16">Order</th>
                    <th>Status</th>
                    <th className="w-48" />
                  </tr>
                </thead>
                <tbody>
                  {members.map(({ l, key }) => (
                    <tr key={l.id}>
                      <td>
                        {key ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl(key)} alt="" className="h-12 w-12 rounded-full object-cover" loading="lazy" />
                        ) : (
                          <span className="inline-block h-12 w-12 rounded-full bg-paper" />
                        )}
                      </td>
                      <td className="font-medium">{l.name}</td>
                      <td className="text-muted">{l.roleTitle}</td>
                      <td>{l.sort}</td>
                      <td className="space-x-1">
                        {!l.isVisible ? <Badge value="hidden" /> : null}
                        {l.reviewState !== "verified" ? <Badge value={l.reviewState} /> : null}
                      </td>
                      <td>
                        <RowActions editHref={`/admin/leaders/${l.id}/`}>
                          {canDelete ? (
                            <form action={deleteLeader}>
                              <input type="hidden" name="id" value={l.id} />
                              <ConfirmButton className="btn btn-sm btn-danger" message={`Remove ${l.name} from the website? This cannot be undone.`}>
                                <AdminIcon name="trash" className="h-3.5 w-3.5" /> Delete
                              </ConfirmButton>
                            </form>
                          ) : null}
                        </RowActions>
                      </td>
                    </tr>
                  ))}
                  {members.length === 0 ? <EmptyRow colSpan={6} /> : null}
                </tbody>
              </Table>
            </Card>
          );
        })}
        {groups.length === 0 ? <Card>No groups yet.</Card> : null}

        {canEdit ? (
          <Card title={scope.key === "former" ? "Add a term" : "Add a group"}>
            <form action={createGroup} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="scope" value={scope.key} />
              <Field label={scope.key === "former" ? "Term, e.g. 2027 - 2028" : "Heading"}>
                <input name="heading" className="field" required={scope.key === "former"} />
              </Field>
              <SubmitButton>Add</SubmitButton>
            </form>
          </Card>
        ) : null}
      </div>
    </>
  );
}
