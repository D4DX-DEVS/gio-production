import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { schema as s } from "@gio/db";
import { getDb } from "@/lib/db";
import { hasRole, requireRole } from "@/lib/admin/guard";
import { fmtDate } from "@/lib/admin/form";
import { AdminIcon } from "@/lib/admin/icons";
import { ConfirmButton, SubmitButton } from "@/lib/admin/client";
import { Badge, Card, EmptyState, Field, PageHeader, RowActions, SectionTabs, Table, param } from "@/lib/admin/ui";
import { createVenue, deleteEvent } from "./actions";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireRole("contributor");
  const sp = await searchParams;
  const when = ["upcoming", "past"].find((w) => w === param(sp, "when")) ?? "all";
  const all = await getDb()
    .select({ e: s.events, venue: s.venues.name })
    .from(s.events)
    .leftJoin(s.venues, eq(s.venues.id, s.events.venueId))
    .orderBy(desc(s.events.startsAt));
  const now = new Date().getTime();
  const isUpcoming = (e: (typeof all)[number]["e"]) => (e.endsAt ?? e.startsAt).getTime() >= now;
  const upcoming = all.filter((r) => isUpcoming(r.e));
  const past = all.filter((r) => !isUpcoming(r.e));
  const rows = when === "upcoming" ? upcoming : when === "past" ? past : all;
  const canEdit = hasRole(user, "editor");
  const canDelete = hasRole(user, "admin");
  return (
    <>
      <PageHeader
        title="Events"
        icon="calendar"
        description="Programmes and camps shown on the website's Events page. Event reports are news posts in the “gio events” category."
        actions={
          <>
            <a href="/gio-events/" target="_blank" className="btn btn-ghost">
              View page <AdminIcon name="external" className="h-4 w-4" />
            </a>
            {canEdit ? (
              <Link href="/admin/events/new/" className="btn btn-primary">
                <AdminIcon name="plus" className="h-4 w-4" /> Add event
              </Link>
            ) : null}
          </>
        }
      />
      <SectionTabs
        tabs={[
          { href: "/admin/events/", label: "All", active: when === "all", count: all.length },
          { href: "/admin/events/?when=upcoming", label: "Upcoming", active: when === "upcoming", count: upcoming.length },
          { href: "/admin/events/?when=past", label: "Past", active: when === "past", count: past.length },
        ]}
      />
      {rows.length ? (
        <Table>
          <thead>
            <tr>
              <th>Title</th>
              <th>When</th>
              <th>Venue</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ e, venue }) => (
              <tr key={e.id}>
                <td className="max-w-xs">
                  <Link href={`/admin/events/${e.id}/`} className="font-medium text-ink hover:text-brand-700 hover:underline">
                    {e.title}
                  </Link>
                </td>
                <td className="whitespace-nowrap">
                  {fmtDate(e.startsAt, !e.allDay)}
                  {e.endsAt ? <span className="text-muted"> to {fmtDate(e.endsAt, !e.allDay)}</span> : null}
                </td>
                <td className="text-muted">{venue ?? "—"}</td>
                <td>
                  <Badge value={e.status} />
                </td>
                <td>
                  <RowActions editHref={`/admin/events/${e.id}/`} viewHref={e.status === "published" ? `/event/${encodeURIComponent(e.slug)}/` : undefined}>
                    {canDelete ? (
                      <form action={deleteEvent}>
                        <input type="hidden" name="id" value={e.id} />
                        <ConfirmButton className="btn btn-sm btn-danger" message={`Delete the event “${e.title}”? This cannot be undone.`}>
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
          icon="calendar"
          title={when === "all" ? "No events yet" : `No ${when} events`}
          action={
            canEdit ? (
              <Link href="/admin/events/new/" className="btn btn-primary">
                <AdminIcon name="plus" className="h-4 w-4" /> Add event
              </Link>
            ) : undefined
          }
        >
          Add an event and it shows on the Events page once published.
        </EmptyState>
      )}
      {canEdit ? (
        <Card title="Add a venue" description="Venues you add here can be chosen when editing an event." className="mt-6">
          <form action={createVenue} className="grid gap-3 sm:grid-cols-5 sm:items-end">
            <Field label="Name">
              <input name="name" className="field" required />
            </Field>
            <Field label="Address">
              <input name="address" className="field" />
            </Field>
            <Field label="City">
              <input name="city" className="field" />
            </Field>
            <Field label="State">
              <input name="state" className="field" defaultValue="Kerala" />
            </Field>
            <SubmitButton>Add venue</SubmitButton>
          </form>
        </Card>
      ) : null}
    </>
  );
}
