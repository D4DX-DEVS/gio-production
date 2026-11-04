import { adminCredentials } from "@/lib/auth";
import { requireRole } from "@/lib/admin/guard";
import { Card, PageHeader } from "@/lib/admin/ui";

export const metadata = { title: "Admin access" };

// Admin access comes only from the server environment; there are no database accounts to manage.
export default async function AdminAccessPage() {
  const { user } = await requireRole("admin");

  return (
    <>
      <PageHeader icon="access" title="Admin access" description="The admin login is set in the server environment, not in this dashboard." />
      <Card title="Current login">
        <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted">Username</dt>
          <dd className="font-medium">{user.email}</dd>
          <dt className="text-muted">Display name</dt>
          <dd className="font-medium">{user.name}</dd>
          <dt className="text-muted">Role</dt>
          <dd className="font-medium">{user.role}</dd>
          <dt className="text-muted">Two-factor</dt>
          <dd className="font-medium">{adminCredentials()?.totpSecret ? "On (authenticator app)" : "Off (username and password only)"}</dd>
        </dl>
      </Card>
      <Card title="Change the username or password" className="mt-6">
        <div className="space-y-3 text-sm">
          <p>
            Edit <code>ADMIN_USERNAME</code>, <code>ADMIN_PASSWORD</code> and optionally <code>ADMIN_NAME</code>:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Local development: <code>apps/web/.dev.vars</code>, then restart the dev server.
            </li>
            <li>
              Production: <code>wrangler secret put ADMIN_PASSWORD --env production</code> (and the same for the username).
            </li>
          </ul>
          <p className="text-muted">
            Changing the username or password signs out every open admin session straight away.
          </p>
        </div>
      </Card>
    </>
  );
}
