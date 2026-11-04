import type { Metadata } from "next";
import { requireRole } from "@/lib/admin/guard";
import { SubmitButton } from "@/lib/admin/client";
import { Card, Field, PageHeader } from "@/lib/admin/ui";
import { createPage } from "../actions";

export const metadata: Metadata = { title: "Add page" };

export default async function NewPage() {
  await requireRole("admin");
  return (
    <>
      <PageHeader title="Add a page" icon="pages" back={{ href: "/admin/pages/", label: "All pages" }} description="A new page starts as a draft. After creating it you add text, images and other sections, then publish." />
      <Card className="max-w-2xl">
        <form action={createPage} className="space-y-5">
          <Field label="Page title" hint="Shown as the heading and in the browser tab.">
            <input name="title" className="field" required autoFocus />
          </Field>
          <Field label="Address" hint="The web address after the site name, for example “our-work” gives /our-work/. Leave empty to use the title.">
            <input name="slug" className="field" placeholder="our-work" autoCapitalize="none" spellCheck={false} />
          </Field>
          <div className="flex gap-2">
            <SubmitButton>Create page</SubmitButton>
          </div>
        </form>
      </Card>
    </>
  );
}
