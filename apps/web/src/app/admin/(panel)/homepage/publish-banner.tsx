import Link from "next/link";
import { fmtDate } from "@/lib/admin/form";
import { AdminIcon } from "@/lib/admin/icons";
import { SubmitButton } from "@/lib/admin/client";
import { PageHeader } from "@/lib/admin/ui";
import { publishPage } from "../pages/actions";

/** Header with Preview/Publish buttons plus the "draft has unpublished changes" notice, shared by the homepage block screens. */
export function HomepageHeader({
  title,
  description,
  homeId,
  back,
  canEdit,
  current,
  unpublished,
}: {
  title: string;
  description: string;
  homeId: number;
  back: string;
  canEdit: boolean;
  current: { publishedAt: Date } | null;
  unpublished: boolean;
}) {
  return (
    <>
      <PageHeader
        icon="home"
        title={title}
        description={description}
        back={{ href: "/admin/homepage/", label: "Home page" }}
        actions={
          <>
            <Link href={`/admin/preview/page/${homeId}/`} target="_blank" className="btn btn-ghost">
              Preview draft <AdminIcon name="external" className="h-4 w-4" />
            </Link>
            {canEdit ? (
              <form action={publishPage.bind(null, homeId)}>
                <input type="hidden" name="back" value={back} />
                <SubmitButton>Publish homepage</SubmitButton>
              </form>
            ) : null}
          </>
        }
      />
      <div className={`mb-6 flex items-start gap-3 rounded-xl px-4 py-3 text-sm ring-1 ${unpublished ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-emerald-50 text-emerald-900 ring-emerald-200"}`}>
        <AdminIcon name={unpublished ? "draft" : "check"} className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          {current
            ? unpublished
              ? `There are changes after the last publish (${fmtDate(current.publishedAt, true)}). Check them with “Preview draft”, then click “Publish homepage” to put them on the website.`
              : `The website shows the latest version (published ${fmtDate(current.publishedAt, true)}).`
            : "The homepage has never been published. The website shows nothing for it until you publish."}
        </p>
      </div>
    </>
  );
}
