// Dashboard: what needs you and the shortest way to start the common jobs.
import Link from "next/link";
import type { ReactNode } from "react";
import { desc, isNull, sql } from "drizzle-orm";
import { galleryCount, homepageCounts } from "@/lib/admin/stats";
import { schema } from "@gio/db";
import { getDb } from "@/lib/db";
import { hasRole, requireRole } from "@/lib/admin/guard";
import { fmtDate } from "@/lib/admin/form";
import { fixedPageIds } from "@/lib/admin/nav-data";
import { AdminIcon, type AdminIconName } from "@/lib/admin/icons";
import { Badge } from "@/lib/admin/ui";

export const metadata = { title: "Dashboard" };

const ACTION_DOT: Record<string, string> = {
  create: "bg-brand-500 ring-brand-100",
  upload: "bg-brand-500 ring-brand-100",
  publish: "bg-brand-700 ring-brand-100",
  update: "bg-brand-400 ring-brand-100",
  replace: "bg-brand-400 ring-brand-100",
  reorder: "bg-brand-300 ring-brand-100",
  delete: "bg-danger-500 ring-red-100",
};

function Panel({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[1.25rem] border border-line bg-white p-2 ${className}`}>
      <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3.5">
        <h2 className="text-xl font-semibold tracking-tight text-brand-900">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const TAG = {
  red: "bg-accent-600 text-white",
  soft: "bg-accent-600/10 text-accent-700",
  blue: "bg-brand-100 text-brand-700",
  grey: "bg-paper text-ink ring-1 ring-inset ring-line",
} as const;

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function Dashboard() {
  const { user } = await requireRole("contributor");
  const isEditor = hasRole(user, "editor");
  const isAdmin = hasRole(user, "admin");
  const db = getDb();
  const s = schema;

  // One round trip for all the counts (eleven separate queries made this the slowest screen), in parallel with the rest.
  const [[c], fixedPages, recentPosts, recentEvents, activity, home, gallery] = await Promise.all([
    db.all<Record<"posts" | "drafts" | "untitled" | "events" | "upcoming" | "leaders" | "documents" | "pendingReview" | "newMessages" | "noAlt" | "oldUrls", number>>(sql`select
      (select count(*) from ${s.posts} where ${s.posts.status} = 'published' and ${s.posts.deletedAt} is null) as posts,
      (select count(*) from ${s.posts} where ${s.posts.status} = 'draft' and ${s.posts.deletedAt} is null) as drafts,
      (select count(*) from ${s.posts} where ${s.posts.status} = 'published' and ${s.posts.deletedAt} is null and (${s.posts.title} is null or ${s.posts.title} = '')) as untitled,
      (select count(*) from ${s.events} where ${s.events.deletedAt} is null) as events,
      (select count(*) from ${s.events} where ${s.events.status} in ('published', 'scheduled') and ${s.events.deletedAt} is null and coalesce(${s.events.endsAt}, ${s.events.startsAt}) >= ${Date.now()}) as upcoming,
      (select count(*) from ${s.leaders}) as leaders,
      (select count(*) from ${s.documents}) as documents,
      (select count(*) from ${s.reviewItems} where ${s.reviewItems.status} = 'pending') as pendingReview,
      (select count(*) from ${s.contactSubmissions} where ${s.contactSubmissions.status} = 'new') as newMessages,
      (select count(*) from ${s.media} where ${s.media.kind} = 'image' and ${s.media.altText} is null and ${s.media.deletedAt} is null and ${s.media.variantOfMediaId} is null) as noAlt,
      ${isAdmin ? sql`(select count(*) from ${s.legacyUrls} where ${s.legacyUrls.action} = 'pending_decision')` : sql`0`} as oldUrls`),
    fixedPageIds(),
    db
      .select({ id: s.posts.id, title: s.posts.title, status: s.posts.status, updatedAt: s.posts.updatedAt })
      .from(s.posts)
      .where(isNull(s.posts.deletedAt))
      .orderBy(desc(s.posts.updatedAt))
      .limit(6),
    db
      .select({ id: s.events.id, title: s.events.title, status: s.events.status, updatedAt: s.events.updatedAt })
      .from(s.events)
      .where(isNull(s.events.deletedAt))
      .orderBy(desc(s.events.updatedAt))
      .limit(6),
    db.select().from(s.auditLog).orderBy(desc(s.auditLog.createdAt)).limit(8),
    homepageCounts(db),
    galleryCount(db),
  ]);
  const { posts, drafts, untitled, events, upcoming, leaders, documents, pendingReview, newMessages, noAlt, oldUrls } = Object.fromEntries(Object.entries(c ?? {}).map(([k, v]) => [k, Number(v) || 0])) as Record<keyof NonNullable<typeof c>, number>;
  const pageHref = (slug: string) => (fixedPages.has(slug) ? `/admin/pages/${fixedPages.get(slug)}/` : "/admin/pages/");

  const recent = [
    ...recentPosts.map((p) => ({ key: `p${p.id}`, kind: "News", title: p.title, status: p.status, updatedAt: p.updatedAt, href: `/admin/posts/${p.id}/` })),
    ...recentEvents.map((e) => ({ key: `e${e.id}`, kind: "Event", title: e.title, status: e.status, updatedAt: e.updatedAt, href: `/admin/events/${e.id}/` })),
  ]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 6);

  const plural = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;
  const today = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  // Most important first. Red is for things that block or confuse visitors; the rest are tidy-ups.
  const needs: { tag: string; tone: keyof typeof TAG; title: string; text: string; action: string; href: string }[] = [
    ...(pendingReview
      ? [{ tag: "Client", tone: "soft" as const, title: `${plural(pendingReview, "decision is", "decisions are")} waiting`, text: "Nothing changes on the site until someone with authority decides.", action: "Open", href: "/admin/review/" }]
      : []),
    ...(oldUrls ? [{ tag: "Redirects", tone: "soft" as const, title: `${plural(oldUrls, "old address", "old addresses")} ${oldUrls === 1 ? "waits" : "wait"} for a decision`, text: "Visitors who open them today reach a missing page.", action: "Decide", href: "/admin/urls/" }] : []),
    ...(newMessages ? [{ tag: "Inbox", tone: "red" as const, title: `${plural(newMessages, "new message")} from the Contact Us form`, text: "Someone is waiting for a reply.", action: "Read", href: "/admin/inbox/" }] : []),
    ...(noAlt ? [{ tag: "Access", tone: "soft" as const, title: `${plural(noAlt, "image")} ${noAlt === 1 ? "has" : "have"} no alt text`, text: "Screen readers skip them. Describe them in the Library.", action: "Fix", href: "/admin/media/?filter=no-alt" }] : []),
    ...(untitled ? [{ tag: "Story", tone: "grey" as const, title: `${plural(untitled, "published story has", "published stories have")} no title`, text: "It is live without a headline. Open it and add one.", action: "Open", href: "/admin/posts/" }] : []),
    ...(drafts ? [{ tag: "Draft", tone: "blue" as const, title: `${plural(drafts, "draft")} not published yet`, text: "Finish and publish them, or delete the ones you no longer need.", action: "Open", href: "/admin/posts/?status=draft" }] : []),
  ];

  const start: { href: string; label: string; path: string; icon: AdminIconName; primary?: boolean }[] = [
    { href: "/admin/posts/new/", label: "Write a story", path: "/gio-news/", icon: "news", primary: true },
    { href: "/admin/events/new/", label: "Announce an event", path: "/gio-events/", icon: "calendar" },
    { href: "/admin/gallery/", label: "Add photos", path: "/gallery/", icon: "gallery" },
    { href: "/admin/homepage/banners/", label: "Swap a banner", path: "/", icon: "banner" },
    ...(isEditor
      ? [
          { href: "/admin/leaders/new/", label: "Add a leader", path: "/team/", icon: "leaders" as const },
          { href: "/admin/documents/", label: "Upload a PDF", path: "/documents/", icon: "documents" as const },
        ]
      : []),
  ];

  const site: { label: string; note: string; href: string }[] = [
    { label: "Home page", note: `${home.banners} banners · ${home.posters} posters`, href: "/admin/homepage/" },
    { label: "About Us", note: "/about-us/", href: pageHref("about-us") },
    { label: "Leaders", note: `${plural(leaders, "person", "people")}`, href: "/admin/leaders/" },
    { label: "News", note: `${posts} published · ${plural(drafts, "draft")}`, href: "/admin/posts/" },
    { label: "Events", note: `${plural(events, "event")} · ${upcoming} upcoming`, href: "/admin/events/" },
    { label: "Gallery", note: plural(gallery, "photo"), href: "/admin/gallery/" },
    { label: "Documents", note: plural(documents, "PDF"), href: "/admin/documents/" },
    { label: "Contact Us", note: plural(newMessages, "new message"), href: "/admin/inbox/" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">{today}</p>
        <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-brand-900 sm:text-5xl">
          {greeting()}, {user.name}.
        </h1>
        <p className="max-w-[60ch] text-lg text-muted">
          {pendingReview || newMessages
            ? [pendingReview ? `${plural(pendingReview, "question")} still waiting on the client` : null, newMessages ? plural(newMessages, "new message") : null].filter(Boolean).join(", ") + "."
            : "Nothing is waiting on you. Pick a job below to get started."}
        </p>
      </section>

      <section aria-labelledby="start" className="flex flex-col gap-3.5">
        <h2 id="start" className="text-xl font-semibold tracking-tight text-brand-900">
          Start something
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {start.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className={`group flex min-h-[8.5rem] flex-col justify-between gap-5 rounded-[1.125rem] border p-[1.125rem] transition-colors ${
                t.primary ? "border-brand-600 bg-brand-600 text-white hover:bg-brand-700" : "border-line bg-white hover:border-brand-600"
              }`}
            >
              <AdminIcon name={t.icon} className={`h-[26px] w-[26px] ${t.primary ? "text-white" : "text-brand-600"}`} />
              <span>
                <span className="block text-xl font-semibold leading-tight tracking-tight">{t.label}</span>
                <span className={`font-mono text-xs ${t.primary ? "text-white/85" : "text-muted"}`}>{t.path}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_36rem] flex-col gap-6">
          <Panel title="Needs you">
            {needs.length ? (
              <ul>
                {needs.map((x) => (
                  <li key={x.title}>
                    <Link href={x.href} className="flex items-start gap-3.5 rounded-2xl px-4 py-3.5 transition-colors hover:bg-brand-50">
                      <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${TAG[x.tone]}`}>{x.tag}</span>
                      <span className="min-w-0 flex-1">
                        <strong className="block font-semibold text-ink">{x.title}</strong>
                        <span className="text-muted">{x.text}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-brand-700">{x.action} →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-muted">All clear. Nothing needs you right now.</p>
            )}
          </Panel>

          <Panel title="Your changes go live at once">
            <div className="flex items-start gap-3.5 px-4 pb-4 pt-1">
              <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600" />
              <p className="text-muted">
                Every section has its own <strong className="text-ink">Save</strong> button. When you save, visitors see the change straight away. There is no Publish step for the home page or other pages.
                {isEditor ? (
                  <>
                    {" "}
                    <Link href="/admin/homepage/" className="font-semibold text-brand-700">
                      Edit the home page →
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
          </Panel>

          <Panel title="Recently updated news and events" aside={<Link href="/admin/posts/" className="text-sm font-semibold text-brand-700">All stories →</Link>}>
            <ul className="pb-2">
              {recent.map((p) => (
                <li key={p.key}>
                  <Link href={p.href} className="group flex items-center gap-3 rounded-2xl px-4 py-2.5 transition-colors hover:bg-brand-50">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${p.kind === "News" ? "bg-brand-100 text-brand-700" : "bg-accent-600/10 text-accent-700"}`}>
                      <AdminIcon name={p.kind === "News" ? "news" : "calendar"} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{p.title || "(no title)"}</span>
                      <span className="text-xs text-muted">
                        {p.kind} · {fmtDate(p.updatedAt)}
                      </span>
                    </span>
                    <Badge value={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-[1_1_21rem] flex-col gap-6">
          <Panel title="Your site">
            <ul className="pb-2">
              {site.map((x) => (
                <li key={x.label}>
                  <Link href={x.href} className="flex items-baseline gap-2.5 rounded-xl px-4 py-2.5 transition-colors hover:bg-brand-50">
                    <strong className="flex-1">{x.label}</strong>
                    <span className="text-sm text-muted">{x.note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Earlier today">
            <div className="px-4 pb-4">
              {activity.length ? (
                <ol className="relative flex flex-col gap-3.5 py-1 before:absolute before:bottom-3 before:left-[5px] before:top-3 before:w-px before:bg-line">
                  {activity.map((a) => (
                    <li key={a.id} className="relative flex justify-between gap-3 pl-7 text-sm">
                      <span aria-hidden className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full ring-4 ${ACTION_DOT[a.action] ?? "bg-slate-400 ring-slate-100"}`} />
                      <span className="min-w-0">
                        <span className="font-semibold capitalize text-ink">{a.action.replaceAll("_", " ")}</span>{" "}
                        <span className="text-ink">
                          {a.entityType} #{a.entityId}
                        </span>
                        {a.summary ? <span className="text-muted"> · {a.summary}</span> : null}
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-muted">{fmtDate(a.createdAt, true)}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-4 text-muted">No changes made in the admin yet.</p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
