import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { schema as s } from "@gio/db";
import { getDb } from "@/lib/db";
import { hasRole, requireRole } from "@/lib/admin/guard";
import { Card, PageHeader } from "@/lib/admin/ui";
import { LeaderForm } from "../leader-form";

export const metadata: Metadata = { title: "Edit leader" };

export default async function EditLeader({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireRole("contributor");
  const id = Number((await params).id);
  const db = getDb();
  const [leader] = Number.isInteger(id) ? await db.select().from(s.leaders).where(eq(s.leaders.id, id)) : [];
  if (!leader) notFound();
  return (
    <>
      <PageHeader icon="leaders" back={{ href: "/admin/leaders/", label: "Leaders" }}
        title={leader.name}
        description={`Imported from ${leader.legacySourceUrl}`}
        actions={
          <Link href="/admin/leaders/" className="btn btn-ghost">
            ← All leaders
          </Link>
        }
      />
      {hasRole(user, "editor") ? <LeaderForm leader={leader} canDelete={hasRole(user, "admin")} /> : <Card>You can view leaders. Editing needs the editor role.</Card>}
    </>
  );
}
