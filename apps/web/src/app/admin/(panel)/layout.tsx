import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { schema } from "@gio/db";
import { signOutAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hasRole, requireRole } from "@/lib/admin/guard";
import { Flash } from "@/lib/admin/client";
import { homepageDraft } from "@/lib/admin/homepage";
import { AdminShell, type JumpItem, type QuickAdd, type ShellGroup, type ShellTab } from "./shell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · GIO Admin" },
  robots: { index: false, follow: false },
};

async function signOut() {
  "use server";
  await signOutAdmin();
  redirect("/admin/login/");
}

/** Page ids for the fixed pages the tabs link to by name (home '', about-us, contact-us). */
async function fixedPageIds() {
  const rows = await getDb()
    .select({ id: schema.pages.id, slug: schema.pages.slug })
    .from(schema.pages)
    .where(and(inArray(schema.pages.slug, ["", "about-us", "contact-us"]), isNull(schema.pages.deletedAt)));
  return new Map(rows.map((r) => [r.slug, r.id]));
}

/** Small numbers for the badges: client questions waiting, new messages, old addresses waiting. Never blocks the page. */
async function badgeCounts() {
  const db = getDb();
  const n = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const safe = async (q: Promise<number>) => q.catch(() => 0);
  const [review, messages, urls] = await Promise.all([
    safe(n(db.select({ n: count() }).from(schema.reviewItems).where(eq(schema.reviewItems.status, "pending")))),
    safe(n(db.select({ n: count() }).from(schema.contactSubmissions).where(eq(schema.contactSubmissions.status, "new")))),
    safe(n(db.select({ n: count() }).from(schema.legacyUrls).where(eq(schema.legacyUrls.action, "pending_decision")))),
  ]);
  return { review, messages, urls };
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireRole("contributor");
  const isEditor = hasRole(user, "editor");
  const isAdmin = hasRole(user, "admin");
  const [ids, badges, home] = await Promise.all([fixedPageIds(), badgeCounts(), homepageDraft(getDb()).catch(() => null)]);
  const pageHref = (slug: string, fallback: string) => (ids.has(slug) ? `/admin/pages/${ids.get(slug)}/` : fallback);
  const pagePrefix = (slug: string) => (ids.has(slug) ? [`/admin/pages/${ids.get(slug)}`] : undefined);

  const siteTabs: ShellTab[] = [
    { href: "/admin/homepage/", label: "Home page", match: ["/admin/homepage", ...(pagePrefix("") ?? [])] },
    { href: pageHref("about-us", "/admin/pages/"), label: "About Us", match: pagePrefix("about-us") },
    { href: pageHref("contact-us", "/admin/pages/"), label: "Contact page", match: pagePrefix("contact-us") },
    ...(isAdmin
      ? [
          { href: "/admin/pages/", label: "All pages", match: ["/admin/pages"] },
          { href: "/admin/menus/", label: "Menus and social" },
          { href: "/admin/settings/", label: "Site settings" },
        ]
      : []),
  ].filter((t) => t.match !== undefined || !["About Us", "Contact page"].includes(t.label) || ids.size > 0);

  // Six task areas instead of one long list: the same screens, grouped by what you are trying to do.
  const groups: ShellGroup[] = [
    { key: "today", label: "Today", href: "/admin/", icon: "dashboard", match: ["/admin"], tabs: [] },
    {
      key: "news",
      label: "Newsroom",
      href: "/admin/posts/",
      icon: "news",
      match: ["/admin/posts", "/admin/events"],
      tabs: [
        { href: "/admin/posts/", label: "Stories" },
        { href: "/admin/events/", label: "Events" },
      ],
    },
    { key: "site", label: "Site", href: "/admin/homepage/", icon: "home", match: ["/admin/homepage", "/admin/pages", "/admin/menus", "/admin/settings"], tabs: siteTabs },
    {
      key: "people",
      label: "People",
      href: "/admin/leaders/",
      icon: "leaders",
      match: ["/admin/leaders", "/admin/inbox", "/admin/users"],
      tabs: [
        { href: "/admin/leaders/", label: "Leaders" },
        { href: "/admin/inbox/", label: "Contact inbox", badge: badges.messages },
        ...(isAdmin ? [{ href: "/admin/users/", label: "Admin access" }] : []),
      ],
    },
    {
      key: "library",
      label: "Library",
      href: "/admin/media/",
      icon: "image",
      match: ["/admin/media", "/admin/gallery", "/admin/documents"],
      tabs: [
        { href: "/admin/media/", label: "All files" },
        { href: "/admin/gallery/", label: "Gallery" },
        { href: "/admin/documents/", label: "Documents" },
      ],
    },
    {
      key: "decisions",
      label: "Decisions",
      href: "/admin/review/",
      icon: "review",
      match: ["/admin/review", "/admin/urls"],
      badge: badges.review,
      tabs: [
        { href: "/admin/review/", label: "Client questions", badge: badges.review },
        ...(isAdmin ? [{ href: "/admin/urls/", label: "Old addresses", badge: badges.urls }] : []),
      ],
    },
  ];

  const quickAdd: QuickAdd[] = [
    { href: "/admin/posts/new/", label: "News post", icon: "news" },
    { href: "/admin/events/new/", label: "Event", icon: "calendar" },
    ...(isEditor
      ? ([
          { href: "/admin/leaders/new/", label: "Leader", icon: "leaders" },
          { href: "/admin/documents/", label: "Document", icon: "documents" },
          { href: "/admin/media/", label: "Media upload", icon: "image" },
        ] as QuickAdd[])
      : []),
    ...(isAdmin ? ([{ href: "/admin/pages/new/", label: "Page", icon: "pages" }] as QuickAdd[]) : []),
  ];

  // Everything the ⌘K palette can open: every area and tab, every "add", and the home page blocks.
  const jump: JumpItem[] = [
    ...groups.flatMap((g) => (g.tabs.length ? g.tabs.map((t) => ({ label: t.label, hint: g.label, href: t.href })) : [{ label: g.label, hint: "Dashboard", href: g.href }])),
    ...quickAdd.map((q) => ({ label: `Add a ${q.label.toLowerCase()}`, hint: "Create", href: q.href })),
    { label: "Banners and slides", hint: "Site · Home page", href: "/admin/homepage/banners/" },
    { label: "About section", hint: "Site · Home page", href: "/admin/homepage/about/" },
    { label: "Posters", hint: "Site · Home page", href: "/admin/homepage/posters/" },
    { label: "Videos", hint: "Site · Home page", href: "/admin/homepage/videos/" },
    { label: "Initiative logos", hint: "Site · Home page", href: "/admin/homepage/initiatives/" },
    { label: "Instagram feed", hint: "Site · Home page", href: "/admin/homepage/instagram/" },
  ];

  // Publishing only exists for the home page today; show "Go live" when it has changes visitors cannot see yet.
  const live = isEditor && home?.unpublished ? { count: 1, href: "/admin/homepage/", hint: "The home page has changes that are not live yet" } : null;

  return (
    <AdminShell groups={groups} quickAdd={quickAdd} jump={jump} live={live} user={{ name: user.name, email: user.email, role: user.role }} signOut={signOut}>
      <Suspense>
        <Flash />
      </Suspense>
      {children}
    </AdminShell>
  );
}
