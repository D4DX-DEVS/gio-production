import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { signOutAdmin } from "@/lib/auth";
import { hasRole, requireRole } from "@/lib/admin/guard";
import { Flash } from "@/lib/admin/client";
import { badgeCounts, fixedPageIds } from "@/lib/admin/nav-data";
import { AdminShell, type JumpItem, type NavGroup, type NavLeaf, type QuickAdd } from "./shell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · GIO Admin" },
  robots: { index: false, follow: false },
};

async function signOut() {
  "use server";
  await signOutAdmin();
  redirect("/admin/login/");
}

/** The sections of the home page, in the order visitors see them. Each has its own screen and its own Save button. */
const HOME_SECTIONS: NavLeaf[] = [
  { href: "/admin/homepage/banners/", label: "Banners and slides" },
  { href: "/admin/homepage/about/", label: "About block" },
  { href: "/admin/homepage/videos/", label: "Videos" },
  { href: "/admin/homepage/instagram/", label: "Instagram feed" },
  { href: "/admin/homepage/initiatives/", label: "Our initiatives (logos)" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireRole("contributor");
  const isEditor = hasRole(user, "editor");
  const isAdmin = hasRole(user, "admin");
  const [ids, badges] = await Promise.all([fixedPageIds(), badgeCounts()]);
  const pageHref = (slug: string, fallback: string) => (ids.has(slug) ? `/admin/pages/${ids.get(slug)}/` : fallback);
  const pagePrefix = (slug: string) => (ids.has(slug) ? [`/admin/pages/${ids.get(slug)}`] : undefined);

  const groups: NavGroup[] = [
    { key: "start", label: "Start", items: [{ href: "/admin/", label: "Dashboard", icon: "dashboard" }] },
    {
      key: "site",
      label: "Website pages",
      items: [
        {
          href: "/admin/homepage/",
          label: "Home page",
          icon: "home",
          children: [{ href: "/admin/homepage/", label: "Order and look", match: ["/admin/homepage", ...(pagePrefix("") ?? [])] }, ...HOME_SECTIONS.map((s) => ({ ...s, match: [s.href] }))],
        },
        // Posters are edited often, so they get their own entry instead of hiding under Home page.
        { href: "/admin/homepage/posters/", label: "Posters", icon: "poster" },
        ...(ids.has("about-us") ? [{ href: pageHref("about-us", "/admin/pages/"), label: "About Us", icon: "about" as const, match: pagePrefix("about-us") }] : []),
        ...(ids.has("contact-us") ? [{ href: pageHref("contact-us", "/admin/pages/"), label: "Contact page", icon: "mail" as const, match: pagePrefix("contact-us") }] : []),
        ...(isAdmin
          ? [
              { href: "/admin/pages/", label: "All other pages", icon: "pages" as const, match: ["/admin/pages"] },
              { href: "/admin/menus/", label: "Menus and social links", icon: "menu" as const },
              { href: "/admin/settings/", label: "Site settings", icon: "settings" as const },
            ]
          : []),
      ],
    },
    {
      key: "news",
      label: "News and events",
      items: [
        { href: "/admin/posts/", label: "News", icon: "news" },
        { href: "/admin/events/", label: "Events", icon: "calendar" },
      ],
    },
    { key: "people", label: "People", items: [{ href: "/admin/leaders/", label: "Leaders", icon: "leaders" }] },
    {
      key: "files",
      label: "Photos and files",
      items: [
        { href: "/admin/media/", label: "All files", icon: "image" },
        { href: "/admin/gallery/", label: "Gallery", icon: "gallery" },
        { href: "/admin/documents/", label: "Documents", icon: "documents" },
      ],
    },
    {
      key: "inbox",
      label: "Messages",
      items: [{ href: "/admin/inbox/", label: "Contact inbox", icon: "mail", badge: badges.messages }],
    },
    ...(isAdmin ? [{ key: "admin", label: "Administration", items: [{ href: "/admin/users/", label: "Admin access", icon: "access" as const }] }] : []),
  ];

  const quickAdd: QuickAdd[] = [
    { href: "/admin/posts/new/", label: "News story", icon: "news" },
    { href: "/admin/events/new/", label: "Event", icon: "calendar" },
    ...(isEditor
      ? ([
          { href: "/admin/leaders/new/", label: "Leader", icon: "leaders" },
          { href: "/admin/documents/", label: "Document", icon: "documents" },
          { href: "/admin/media/", label: "Photo upload", icon: "image" },
        ] as QuickAdd[])
      : []),
    ...(isAdmin ? ([{ href: "/admin/pages/new/", label: "Page", icon: "pages" }] as QuickAdd[]) : []),
  ];

  // Everything ⌘K can open: every entry and every section of the home page, then every "add".
  const jump: JumpItem[] = [
    ...groups.flatMap((g) => g.items.flatMap((i) => (i.children?.length ? i.children.map((c) => ({ label: c.label, hint: `${g.label} · ${i.label}`, href: c.href })) : [{ label: i.label, hint: g.label, href: i.href }]))),
    ...quickAdd.map((q) => ({ label: `Add a ${q.label.toLowerCase()}`, hint: "Create", href: q.href })),
  ];

  return (
    <AdminShell groups={groups} quickAdd={quickAdd} jump={jump} user={{ name: user.name, email: user.email, role: user.role }} signOut={signOut}>
      <Suspense>
        <Flash />
      </Suspense>
      {children}
    </AdminShell>
  );
}
