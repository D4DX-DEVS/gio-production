"use client";
// The admin frame ("GIO Studio"): a vertical menu on the left that follows the website itself (each page, and for the
// home page each of its sections), and a slim bar on top with search (⌘K), "Add new" and the account menu.
// On phones the menu slides in from the left.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AdminIcon, type AdminIconName } from "@/lib/admin/icons";
import { Toaster } from "@/lib/admin/toast";
import { okToLeave } from "@/lib/admin/unsaved";

export interface NavLeaf {
  href: string;
  label: string;
  /** Path prefixes that keep this entry highlighted (defaults to its own path). */
  match?: string[];
  badge?: number;
}
export interface NavItem extends NavLeaf {
  icon: AdminIconName;
  /** Sections of this entry, shown indented underneath it. */
  children?: NavLeaf[];
}
export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}
export interface QuickAdd {
  href: string;
  label: string;
  icon: AdminIconName;
}
export interface JumpItem {
  label: string;
  hint: string;
  href: string;
}

const norm = (p: string) => p.replace(/\/+$/, "") || "/";
const pathOf = (href: string) => norm(href.split("?")[0]);

/** Longest matching prefix wins, so /admin/homepage/banners beats /admin/homepage and "/admin" only matches the dashboard. */
function score(path: string, prefixes: string[]): number {
  let best = -1;
  for (const raw of prefixes) {
    const p = norm(raw);
    const hit = p === "/admin" ? path === "/admin" : path === p || path.startsWith(`${p}/`);
    if (hit && p.length > best) best = p.length;
  }
  return best;
}

interface Active {
  group: NavGroup;
  item: NavItem;
  leaf: NavLeaf;
}

/** The one entry the current page belongs to. Entries with sections are never active themselves, their sections are. */
function findActive(groups: NavGroup[], path: string): Active | null {
  let best: Active | null = null;
  let bestScore = -1;
  for (const group of groups) {
    for (const item of group.items) {
      for (const leaf of item.children?.length ? item.children : [item]) {
        const s = score(path, leaf.match ?? [pathOf(leaf.href)]);
        if (s > bestScore) {
          best = { group, item, leaf };
          bestScore = s;
        }
      }
    }
  }
  return best;
}

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return <span className="grid h-[22px] min-w-6 shrink-0 place-items-center rounded-full bg-accent-600 px-1.5 text-xs font-bold tabular-nums text-white">{n > 999 ? "999+" : n}</span>;
}

function Palette({ items, onClose }: { items: JumpItem[]; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const results = items.filter((i) => !needle || `${i.label} ${i.hint}`.toLowerCase().includes(needle)).slice(0, 14);
  const go = (href: string) => {
    if (!okToLeave()) return;
    onClose();
    router.push(href);
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-brand-900/50 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Find a page" className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <AdminIcon name="search" className="h-5 w-5 shrink-0 text-muted" />
          <label htmlFor="jump-q" className="sr-only">
            What do you want to edit?
          </label>
          <input
            id="jump-q"
            autoFocus
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && results[0]) go(results[0].href);
            }}
            placeholder="What do you want to edit?"
            className="h-14 min-w-0 flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-muted"
          />
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-2.5 py-1.5 font-mono text-xs text-muted hover:bg-paper">
            Esc
          </button>
        </div>
        <ul className="max-h-[22rem] overflow-y-auto p-2">
          {results.map((r) => (
            <li key={r.href + r.label}>
              <button type="button" onClick={() => go(r.href)} className="flex min-h-12 w-full items-baseline gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors hover:bg-brand-50 focus-visible:bg-brand-50">
                <span className="flex-1 font-semibold text-ink">{r.label}</span>
                <span className="text-xs text-muted">{r.hint}</span>
              </button>
            </li>
          ))}
        </ul>
        {results.length === 0 ? <p className="px-5 pb-6 pt-2 text-sm text-muted">Nothing matches that. Try “news”, “banner” or “photos”.</p> : null}
      </div>
    </div>
  );
}

export function AdminShell({
  groups,
  quickAdd,
  jump,
  user,
  signOut,
  children,
}: {
  groups: NavGroup[];
  quickAdd: QuickAdd[];
  jump: JumpItem[];
  user: { name: string; email: string; role: string };
  signOut: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const path = norm(pathname);
  // Each popup remembers the page it was opened on, so navigating closes it without an effect.
  type Which = "quick" | "user" | "jump" | "menu";
  const [popup, setPopup] = useState<{ which: Which; path: string } | null>(null);
  const is = (w: Which) => popup?.which === w && popup.path === pathname;
  const toggle = (w: Which) => setPopup(is(w) ? null : { which: w, path: pathname });
  const close = () => setPopup(null);
  // Sections the editor opened or closed by hand; every other entry is open when the page is inside it.
  const [manual, setManual] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPopup({ which: "jump", path: pathname });
      }
      if (e.key === "Escape") setPopup(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname]);

  const active = findActive(groups, path);
  const initial = (user.name.trim()[0] ?? "A").toUpperCase();
  const leave = (e: { preventDefault: () => void }) => {
    if (!okToLeave()) e.preventDefault();
    else close();
  };

  const crumbs = active ? [active.group.label, ...(active.item.children?.length ? [active.item.label] : []), active.leaf.label] : ["Admin"];

  // Each group is a card; the entries inside it are rows separated by thin borders.
  const menu = (
    <nav aria-label="Admin menu" className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pb-6 pt-2">
      {groups.map((g) => (
        <section key={g.key} role="group" aria-labelledby={`nav-${g.key}`} className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <p id={`nav-${g.key}`} className="border-b border-line bg-paper px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            {g.label}
          </p>
          <ul className="divide-y divide-line">
            {g.items.map((item) => {
              const kids = item.children ?? [];
              const inside = active?.item === item;
              const open = kids.length ? (manual[item.href] ?? inside) : false;
              const leafOn = !kids.length && inside;
              return (
                <li key={item.href + item.label}>
                  <div className={`flex items-stretch ${leafOn ? "bg-brand-50" : ""}`}>
                    <Link
                      href={item.href}
                      onClick={leave}
                      aria-current={leafOn ? "page" : undefined}
                      className={`relative flex min-h-12 min-w-0 flex-1 items-center gap-3 px-4 text-[15px] transition-colors ${
                        leafOn ? "font-semibold text-brand-700" : inside ? "font-semibold text-brand-900" : "font-medium text-ink hover:bg-paper hover:text-brand-800"
                      }`}
                    >
                      {leafOn || inside ? <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-brand-600" /> : null}
                      <AdminIcon name={item.icon} className={`h-[19px] w-[19px] shrink-0 ${leafOn || inside ? "text-brand-600" : "text-muted"}`} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badge ? <Badge n={item.badge} /> : null}
                    </Link>
                    {kids.length ? (
                      <button
                        type="button"
                        onClick={() => setManual((m) => ({ ...m, [item.href]: !open }))}
                        aria-expanded={open}
                        aria-label={`${open ? "Hide" : "Show"} the parts of ${item.label}`}
                        className="grid w-11 shrink-0 place-items-center border-l border-line text-muted transition-colors hover:bg-paper hover:text-brand-700"
                      >
                        <AdminIcon name="chevron" className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
                      </button>
                    ) : null}
                  </div>
                  {kids.length && open ? (
                    <ul className="divide-y divide-line border-t border-line bg-paper/70">
                      {kids.map((k) => {
                        const on = active?.leaf === k;
                        return (
                          <li key={k.href + k.label}>
                            <Link
                              href={k.href}
                              onClick={leave}
                              aria-current={on ? "page" : undefined}
                              className={`relative flex min-h-11 items-center gap-2 py-2 pl-12 pr-4 text-sm transition-colors ${on ? "bg-brand-50 font-semibold text-brand-700" : "font-medium text-slate-600 hover:bg-white hover:text-brand-800"}`}
                            >
                              {on ? <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-brand-600" /> : null}
                              <span className="min-w-0 flex-1 truncate">{k.label}</span>
                              {k.badge ? <Badge n={k.badge} /> : null}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );

  const brand = (
    <Link href="/admin/" onClick={leave} className="flex min-h-11 items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="" className="h-10 w-10 rounded-xl bg-white object-contain p-0.5 ring-1 ring-line" />
      <span className="text-lg font-bold leading-none tracking-tight text-brand-900">
        GIO Studio
        <span className="mt-1 block font-mono text-[11px] font-normal uppercase tracking-[0.1em] text-muted">Kerala · Admin</span>
      </span>
    </Link>
  );

  return (
    <div className="admin-theme flex min-h-screen flex-1 bg-paper text-ink">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-pop">
        Skip to the content
      </a>

      {/* Desktop menu */}
      <aside className="hidden w-[17.5rem] shrink-0 border-r border-line bg-paper lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="px-5 pb-3 pt-4">{brand}</div>
          {menu}
        </div>
      </aside>

      {/* Phone menu */}
      {is("menu") ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close the menu" onClick={close} className="absolute inset-0 bg-brand-900/50" />
          <aside className="relative flex h-full w-[19rem] max-w-[86vw] flex-col bg-paper shadow-pop">
            <div className="flex items-center justify-between px-5 pb-3 pt-4">
              {brand}
              <button type="button" onClick={close} aria-label="Close the menu" className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-paper">
                <AdminIcon name="close" className="h-5 w-5" />
              </button>
            </div>
            {menu}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-white/95 px-[15px] backdrop-blur sm:gap-3">
          <button type="button" onClick={() => toggle("menu")} aria-expanded={is("menu")} aria-label="Open the menu" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-paper lg:hidden">
            <AdminIcon name="menu" className="h-5 w-5" />
          </button>
          <nav aria-label="You are here" className="hidden min-w-0 flex-1 items-center gap-1.5 truncate text-sm text-muted sm:flex">
            {crumbs.map((c, i) => (
              <span key={c + i} className="flex min-w-0 items-center gap-1.5">
                {i > 0 ? <AdminIcon name="chevron" className="h-3.5 w-3.5 shrink-0" /> : null}
                <span className={i === crumbs.length - 1 ? "truncate font-semibold text-ink" : "truncate"}>{c}</span>
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggle("jump")}
              aria-label="Find a page to edit"
              className="inline-flex h-11 items-center gap-2.5 rounded-full border border-line bg-paper px-3.5 text-sm text-muted transition-colors hover:border-brand-200 hover:text-brand-900 md:min-w-[11rem]"
            >
              <AdminIcon name="search" className="h-[17px] w-[17px] shrink-0" />
              <span className="hidden flex-1 text-left md:block">Find…</span>
              <kbd className="hidden rounded-md border border-line bg-white px-1.5 font-mono text-xs md:block">⌘K</kbd>
            </button>
            <Link href="/" target="_blank" className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-3.5 text-sm font-semibold text-ink transition-colors hover:bg-brand-50 hover:text-brand-700">
              <AdminIcon name="external" className="h-[17px] w-[17px]" />
              <span className="hidden sm:inline">View website</span>
              <span className="sr-only sm:hidden">View website</span>
            </Link>
            <div className="relative">
              <button
                type="button"
                onClick={() => toggle("quick")}
                aria-expanded={is("quick")}
                className="inline-flex h-11 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-bold text-white transition-colors hover:bg-brand-700"
              >
                <AdminIcon name="plus" className="h-4 w-4" /> <span className="hidden sm:inline">Add new</span>
                <span className="sr-only sm:hidden">Add new</span>
              </button>
              {is("quick") ? (
                <>
                  <button type="button" aria-label="Close" onClick={close} className="fixed inset-0 z-40 cursor-default" />
                  <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-pop">
                    {quickAdd.map((q) => (
                      <Link key={q.href + q.label} href={q.href} onClick={leave} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink transition-colors hover:bg-brand-50 hover:text-brand-700">
                        <AdminIcon name={q.icon} className="h-4 w-4 text-brand-500" /> {q.label}
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
            <div className="relative">
              <button type="button" onClick={() => toggle("user")} aria-expanded={is("user")} aria-label="Account menu" className="grid h-11 w-11 place-items-center rounded-full bg-brand-100 text-base font-bold text-brand-700 transition-colors hover:bg-brand-200">
                {initial}
              </button>
              {is("user") ? (
                <>
                  <button type="button" aria-label="Close" onClick={close} className="fixed inset-0 z-40 cursor-default" />
                  <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
                    <div className="border-b border-line px-4 py-3">
                      <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                      <p className="truncate text-xs text-muted">{user.email}</p>
                      <span className="mt-1.5 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold capitalize text-brand-700">{user.role}</span>
                    </div>
                    <form action={signOut} className="p-1.5">
                      <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-ink transition-colors hover:bg-red-50 hover:text-danger-700">
                        <AdminIcon name="logout" className="h-4 w-4" /> Sign out
                      </button>
                    </form>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>

        {is("jump") ? <Palette items={jump} onClose={close} /> : null}

        {/* Screens use the full width next to the menu, with a 15px edge on both sides. */}
        <main id="admin-main" className="min-w-0 flex-1 px-[15px] py-6 lg:py-8">
          <div>{children}</div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
