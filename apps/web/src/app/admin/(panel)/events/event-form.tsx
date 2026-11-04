import Link from "next/link";
import { asc } from "drizzle-orm";
import { schema as s } from "@gio/db";
import { getDb } from "@/lib/db";
import { AdminIcon } from "@/lib/admin/icons";
import { mediaPreviews } from "@/lib/admin/media-options";
import { ConfirmButton, HtmlEditor, MediaPicker, SubmitButton } from "@/lib/admin/client";
import { toIstInput } from "@/lib/admin/form";
import { Card, Field, FormActions, RadioCards, Toggle } from "@/lib/admin/ui";
import { createEvent, deleteEvent, updateEvent } from "./actions";

type Event = typeof s.events.$inferSelect;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft", hint: "Saved, not on the website" },
  { value: "published", label: "Published", hint: "Visible on the Events page" },
  { value: "cancelled", label: "Cancelled", hint: "Shown as cancelled" },
  { value: "archived", label: "Archived", hint: "Hidden, kept for the record" },
];

export async function EventForm({ event, canDelete }: { event?: Event; canDelete?: boolean }) {
  const db = getDb();
  const [venues, organizers, previews] = await Promise.all([
    db.select().from(s.venues).orderBy(asc(s.venues.name)),
    db.select().from(s.organizers).orderBy(asc(s.organizers.name)),
    mediaPreviews(db, [event?.featuredMediaId]),
  ]);
  return (
    <form action={event ? updateEvent : createEvent}>
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card title="About the event">
            <div className="space-y-5">
              <Field label="Event name">
                <input name="title" className="field text-lg font-semibold" required defaultValue={event?.title ?? ""} placeholder="What is the event called?" />
              </Field>
              <div>
                <span className="label">Description</span>
                <HtmlEditor name="descriptionHtml" defaultValue={event?.descriptionHtml ?? ""} rows={12} />
                <span className="mt-1 block text-xs text-muted">Select text and use the buttons above to format it. Unsafe markup is removed on save.</span>
              </div>
            </div>
          </Card>

          <Card title="When">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts (India time)">
                <input name="startsAt" type="datetime-local" className="field" required defaultValue={toIstInput(event?.startsAt)} />
              </Field>
              <Field label="Ends (India time)" hint="Optional.">
                <input name="endsAt" type="datetime-local" className="field" defaultValue={toIstInput(event?.endsAt)} />
              </Field>
            </div>
            <div className="mt-4">
              <Toggle name="allDay" label="All-day event" hint="Shows the date without a time." defaultChecked={event?.allDay ?? false} />
            </div>
          </Card>

          <Card title="Where and who">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Venue" hint="Add new venues from the Events list page.">
                <select name="venueId" className="field" defaultValue={event?.venueId ?? ""}>
                  <option value="">None</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.city ? `${v.name}, ${v.city}` : v.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Organizer">
                <select name="organizerId" className="field" defaultValue={event?.organizerId ?? ""}>
                  <option value="">None</option>
                  {organizers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cost" hint="For example Free, or ₹200.">
                <input name="cost" className="field" defaultValue={event?.cost ?? ""} />
              </Field>
              <Field label="Registration or website link">
                <input name="websiteUrl" type="url" className="field" defaultValue={event?.websiteUrl ?? ""} placeholder="https://…" />
              </Field>
            </div>
          </Card>

          <details className="group rounded-2xl border border-line bg-white shadow-sm open:shadow-md">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6">
              <span>
                <span className="block text-base font-semibold text-brand-900">Web address</span>
                <span className="block text-sm text-muted">Optional. Made from the event name if you leave it empty.</span>
              </span>
              <AdminIcon name="chevron" className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
            </summary>
            <div className="border-t border-line px-5 py-5 sm:px-6">
              <Field label="Address" hint={event ? `/event/${event.slug}/ (changing it breaks old links)` : undefined}>
                <input name="slug" className="field font-mono text-sm" defaultValue={event?.slug ?? ""} />
              </Field>
            </div>
          </details>
        </div>

        <div className="space-y-6">
          <Card title="Status">
            <RadioCards name="status" defaultValue={event?.status ?? "draft"} options={STATUS_OPTIONS} />
          </Card>
          <Card title="Photo">
            <MediaPicker name="featuredMediaId" label="Shown on the event page and in the gallery" defaultId={event?.featuredMediaId} preview={event?.featuredMediaId ? previews.get(event.featuredMediaId) : undefined} />
          </Card>
        </div>
      </div>

      <FormActions
        aside={
          event && canDelete ? (
            <ConfirmButton formAction={deleteEvent} message={`Delete "${event.title}"? This cannot be undone.`}>
              <AdminIcon name="trash" className="h-4 w-4" /> Delete
            </ConfirmButton>
          ) : null
        }
      >
        <Link href="/admin/events/" className="btn btn-quiet">
          Cancel
        </Link>
        <SubmitButton>{event ? "Save changes" : "Create event"}</SubmitButton>
      </FormActions>
    </form>
  );
}
