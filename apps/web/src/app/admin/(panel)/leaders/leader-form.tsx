import Link from "next/link";
import { asc } from "drizzle-orm";
import { schema as s } from "@gio/db";
import { getDb } from "@/lib/db";
import { AdminIcon } from "@/lib/admin/icons";
import { mediaPreviews } from "@/lib/admin/media-options";
import { ConfirmButton, MediaPicker, SubmitButton } from "@/lib/admin/client";
import { Card, Field, FormActions, Toggle } from "@/lib/admin/ui";
import { createLeader, deleteLeader, updateLeader } from "./actions";

type Leader = typeof s.leaders.$inferSelect;

const SCOPE_LABEL = { state: "State", district: "District", former: "Former" } as const;

export async function LeaderForm({ leader, groupId, canDelete }: { leader?: Leader; groupId?: number; canDelete?: boolean }) {
  const db = getDb();
  const [groups, previews] = await Promise.all([
    db.select().from(s.leaderGroups).orderBy(asc(s.leaderGroups.scope), asc(s.leaderGroups.sort)),
    mediaPreviews(db, [leader?.photoMediaId]),
  ]);
  const current = leader?.groupId ?? groupId;
  const scopes = (["state", "district", "former"] as const).map((scope) => ({ scope, groups: groups.filter((g) => g.scope === scope) })).filter((x) => x.groups.length);
  return (
    <form action={leader ? updateLeader : createLeader}>
      {leader ? <input type="hidden" name="id" value={leader.id} /> : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card title="About the person">
            <div className="space-y-4">
              <Field label="Name" hint="Exactly as it should appear, including capital letters.">
                <input name="name" className="field text-lg font-semibold" required defaultValue={leader?.name ?? ""} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Role or position">
                  <input name="roleTitle" className="field" defaultValue={leader?.roleTitle ?? ""} placeholder="President" />
                </Field>
                <Field label="District or unit" hint="For district leaders.">
                  <input name="district" className="field" defaultValue={leader?.district ?? ""} />
                </Field>
              </div>
              <Field label="Description or term">
                <input name="description" className="field" defaultValue={leader?.description ?? ""} />
              </Field>
            </div>
          </Card>

          <Card title="Social links" description="Optional. Shown as icons under the name.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Facebook">
                <input name="facebookUrl" type="url" className="field" defaultValue={leader?.facebookUrl ?? ""} placeholder="https://www.facebook.com/…" />
              </Field>
              <Field label="Instagram">
                <input name="instagramUrl" type="url" className="field" defaultValue={leader?.instagramUrl ?? ""} placeholder="https://www.instagram.com/…" />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Photo">
            <MediaPicker name="photoMediaId" label="Portrait shown on the leaders page" defaultId={leader?.photoMediaId} preview={leader?.photoMediaId ? previews.get(leader.photoMediaId) : undefined} />
          </Card>
          <Card title="Where they appear">
            <div className="space-y-4">
              <Field label="Group">
                <select name="groupId" className="field" defaultValue={current ?? ""} required>
                  <option value="">Choose…</option>
                  {scopes.map(({ scope, groups: gs }) => (
                    <optgroup key={scope} label={`${SCOPE_LABEL[scope]} leaders`}>
                      {gs.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.heading ?? "(no heading)"}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <Field label="Order in group" hint="Lower numbers come first. Empty puts them at the end.">
                <input name="sort" type="number" className="field" defaultValue={leader?.sort ?? ""} />
              </Field>
              <Toggle name="isVisible" label="Show on the website" hint="Turn off to hide without deleting." defaultChecked={leader?.isVisible ?? true} />
            </div>
          </Card>
        </div>
      </div>

      <FormActions
        aside={
          leader && canDelete ? (
            <ConfirmButton formAction={deleteLeader} message={`Delete ${leader.name}? This cannot be undone.`}>
              <AdminIcon name="trash" className="h-4 w-4" /> Delete
            </ConfirmButton>
          ) : null
        }
      >
        <Link href="/admin/leaders/" className="btn btn-quiet">
          Cancel
        </Link>
        <SubmitButton>{leader ? "Save changes" : "Add person"}</SubmitButton>
      </FormActions>
    </form>
  );
}
