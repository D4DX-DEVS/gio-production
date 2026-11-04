import Link from "next/link";
import { asc } from "drizzle-orm";
import { POST_STATUSES } from "@gio/db/schema";
import { schema } from "@gio/db";
import { getDb } from "@/lib/db";
import { encodePath } from "@/lib/content";
import type { AdminUser } from "@/lib/auth";
import { hasRole } from "@/lib/admin/guard";
import { toIstInput } from "@/lib/admin/form";
import { AdminIcon } from "@/lib/admin/icons";
import { mediaPreviews } from "@/lib/admin/media-options";
import { ConfirmButton, HtmlEditor, MediaPicker, SubmitButton } from "@/lib/admin/client";
import { Card, ChipCheckbox, Field, FormActions, RadioCards } from "@/lib/admin/ui";
import { deletePost, savePost } from "./actions";

type Post = typeof schema.posts.$inferSelect;

const STATUS_LABEL: Record<(typeof POST_STATUSES)[number], { label: string; hint: string }> = {
  draft: { label: "Draft", hint: "Saved, not on the website" },
  review: { label: "Ready for review", hint: "An editor checks it before it goes live" },
  scheduled: { label: "Scheduled", hint: "Goes live by itself on the publish date below" },
  published: { label: "Published", hint: "Visible on the website" },
  private: { label: "Private", hint: "Only people who sign in can see it" },
  archived: { label: "Archived", hint: "Hidden, kept for the record" },
};

export async function PostForm({ user, post, categoryIds = [] }: { user: AdminUser; post?: Post; categoryIds?: number[] }) {
  const db = getDb();
  const [categories, previews] = await Promise.all([db.select().from(schema.categories).orderBy(asc(schema.categories.name)), mediaPreviews(db, [post?.featuredMediaId])]);
  // Editors choose between Draft, Scheduled and Published. Contributors can only save a draft or hand it over for review.
  // A story that already has another status keeps it as an extra choice, so saving never changes it by accident.
  const statuses: (typeof POST_STATUSES)[number][] = hasRole(user, "editor") ? ["draft", "scheduled", "published"] : ["draft", "review"];
  if (post && !statuses.includes(post.status)) statuses.push(post.status);
  const save = savePost.bind(null, post?.id ?? null);

  return (
    <form action={save}>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <div className="space-y-5">
              <Field label="Headline">
                <input name="title" required defaultValue={post?.title} className="field text-lg font-semibold" placeholder="What is this news about?" />
              </Field>
              <Field label="Short summary" hint="Shown on the news cards, under the headline.">
                <textarea name="excerpt" rows={3} defaultValue={post?.excerpt ?? ""} className="field" />
              </Field>
              <div>
                <span className="label">Story</span>
                <HtmlEditor name="bodyHtml" defaultValue={post?.bodyHtml ?? ""} rows={20} />
                <span className="mt-1 block text-xs text-muted">Select text and use the buttons above to format it. Unsafe tags and scripts are removed when saving.</span>
              </div>
            </div>
          </Card>

          <details className="group rounded-2xl border border-line bg-white shadow-sm open:shadow-md">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6">
              <span>
                <span className="block text-base font-semibold text-brand-900">Web address and search engines</span>
                <span className="block text-sm text-muted">Optional. The address is made from the headline if you leave it empty.</span>
              </span>
              <AdminIcon name="chevron" className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
            </summary>
            <div className="grid gap-4 border-t border-line px-5 py-5 sm:px-6">
              <Field label="Web address" hint="Changing the address of a published post breaks old links to it.">
                <input name="slug" defaultValue={post?.slug} className="field font-mono text-sm" />
              </Field>
              <Field label="Search title">
                <input name="seoTitle" defaultValue={post?.seoTitle ?? ""} className="field" />
              </Field>
              <Field label="Search description">
                <textarea name="seoDescription" rows={2} defaultValue={post?.seoDescription ?? ""} className="field" />
              </Field>
            </div>
          </details>
        </div>

        <div className="space-y-6">
          <Card title="Status">
            <RadioCards name="status" defaultValue={post?.status ?? "draft"} options={statuses.map((s) => ({ value: s, ...STATUS_LABEL[s] }))} />
            <Field label="Publish date (India time)" hint="Needed for Scheduled. For Published, leave it empty to use the moment you save." className="mt-4">
              <input type="datetime-local" name="publishedAt" defaultValue={toIstInput(post?.publishedAt)} className="field" />
            </Field>
          </Card>
          <Card title="Photo">
            <MediaPicker
              name="featuredMediaId"
              defaultId={post?.featuredMediaId}
              preview={post?.featuredMediaId ? previews.get(post.featuredMediaId) : null}
              label="Shown on cards, in the gallery and at the top"
            />
          </Card>
          {categories.length ? (
            <Card title="Categories" description="Choose where it appears.">
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <ChipCheckbox key={c.id} name="categories" value={c.id} label={c.name} defaultChecked={categoryIds.includes(c.id)} />
                ))}
              </div>
            </Card>
          ) : null}
          {post ? (
            <p className="px-1 text-xs text-muted">
              Source: {post.source}
              {post.legacyWpId ? ` · WordPress #${post.legacyWpId}` : ""}
            </p>
          ) : null}
        </div>
      </div>

      <FormActions
        aside={
          post && hasRole(user, "admin") ? (
            <ConfirmButton formAction={deletePost.bind(null, post.id)} message="Move this post to the trash? It will disappear from the website.">
              <AdminIcon name="trash" className="h-4 w-4" /> Delete
            </ConfirmButton>
          ) : null
        }
      >
        {post?.status === "published" ? (
          <a href={`/${encodePath(post.slug)}/`} target="_blank" className="btn btn-ghost">
            View on website <AdminIcon name="external" className="h-4 w-4" />
          </a>
        ) : null}
        <Link href="/admin/posts/" className="btn btn-quiet">
          Cancel
        </Link>
        <SubmitButton>{post ? "Save changes" : "Create news"}</SubmitButton>
      </FormActions>
    </form>
  );
}
