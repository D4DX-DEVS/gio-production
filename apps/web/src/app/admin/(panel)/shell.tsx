"use client";
// The admin frame ("GIO Studio"): a top bar with six task areas, a second row of tabs for the area you are in,
// a ⌘K "Jump to…" palette, "Go live" when something is waiting to be published, quick add and the account menu.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AdminIcon, type AdminIconName } from "@/lib/admin/icons";

export interface ShellTab {
  href: string;
  label: string;
  /** Path prefixes that keep this tab highlighted (defaults to its own path). */
  match?: string[];
  badge?: number;
}
export interface ShellGroup {
  key: string;
  label: string;
  href: string;
  icon: AdminIconName;
  /** Path prefixes that belong to this area. "/admin" only matches the dashboard itself. */
  match: string[];
  badge?: number;
  tabs: ShellTab[];
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

/** Longest matching prefix wins, so /admin/homepage/banners belongs to Site and "/admin" only to Today. */
function score(path: string, prefixes: string[] | undefined): number {
  let best = -1;
  for (const raw of prefixes ?? []) {
    const p = norm(raw);
    const hit = p === "/admin" ? path === "/admin" : path === p || path.startsWith(`${p}/`);
    if (hit && p.length > best) best = p.length;
  }
  return best;
}

function pickGroup(groups: ShellGroup[], path: string): ShellGroup | null {
  let best: ShellGroup | null = null;
  let bestScore = -1;
  for (const g of groups) {
    const s = score(path, g.match);
    if (s > bestScore) {
      best = g;
      bestScore = s;
    }
  }
  return best;
}

function pickTab(group: ShellGroup | null, path: string): ShellTab | null {
  if (!group) return null;
  let best: ShellTab | null = null;
  let bestScore = -1;
  for (const t of group.tabs) {
    const s = score(path, t.match ?? [pathOf(t.href)]);
    if (s > bestScore) {
      best = t;
      bestScore = s;
    }
  }
  return best;
}

function Badge({ n, on = false }: { n: number; on?: boolean }) {
  if (!n) return null;
  return (
    <span className={`grid h-[22px] min-w-7 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums ${on ? "bg-accent-600 text-white" : "bg-accent-600/10 text-accent-700"}`}>{n > 999 ? "999+" : n}</span>
  );
}

function Palette({ items, onClose }: { items: JumpItem[]; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const results = items.filter((i) => !needle || `${i.label} ${i.hint}`.toLowerCase().includes(needle)).slice(0, 14);
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-brand-900/50 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Jump to" className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <AdminIcon name="search" className="h-5 w-5 shrink-0 text-muted" />
          <label htmlFor="jump-q" className="sr-only">
            What do you want to do?
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
            placeholder="What do you want to do?"
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
                <span className="font-mono text-xs text-muted">{r.hint}</span>
              </button>
            </li>
          ))}
        </ul>
        {results.length === 0 ? <p className="px-5 pb-6 pt-2 text-sm text-muted">Nothing matches that. Try “news”, “photos” or “banner”.</p> : null}
      </div>
    </div>
  );
}

export function AdminShell({
  groups,
  quickAdd,
  jump,
  live,
  user,
  signOut,
  children,
}: {
  groups: ShellGroup[];
  quickAdd: QuickAdd[];
  jump: JumpItem[];
  /** Things waiting to be published; links to where. */
  live: { count: number; href: string; hint: string } | null;
  user: { name: string; email: string; role: string };
  signOut: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const path = norm(pathname);
  // Each popup remembers the page it was opened on, so navigating closes it without an effect.
  const [popup, setPopup] = useState<{ which: "quick" | "user" | "jump"; path: string } | null>(null);
  const is = (w: "quick" | "user" | "jump") => popup?.which === w && popup.path === pathname;
  const toggle = (w: "quick" | "user" | "jump") => setPopup(is(w) ? null : { which: w, path: pathname });
  const close = () => setPopup(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPopup({ which: "jump", path: pathname });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname]);

  const group = pickGroup(groups, path);
  const tab = pickTab(group, path);
  const initial = (user.name.trim()[0] ?? "A").toUpperCase();

  return (
    <div className="admin-theme flex min-h-screen flex-1 flex-col bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-5 gap-y-2 px-4 pb-2 pt-3 sm:px-8">
          <Link href="/admin/" onClick={close} className="order-1 flex min-h-11 shrink-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="" className="h-10 w-10 rounded-xl bg-white object-contain p-0.5 ring-1 ring-line" />
            <span className="text-lg font-bold leading-none tracking-tight text-brand-900">
              GIO Studio
              <span className="mt-1 block font-mono text-[11px] font-normal uppercase tracking-[0.1em] text-muted">Kerala · Admin</span>
            </span>
          </Link>

          <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] lg:order-2 lg:w-auto lg:flex-1 [&::-webkit-scrollbar]:hidden">
            {groups.map((g) => {
              const on = group?.key === g.key;
              return (
                <Link
                  key={g.key}
                  href={g.href}
                  onClick={close}
                  aria-current={on ? "true" : undefined}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors ${on ? "bg-brand-900 text-white" : "text-muted hover:bg-brand-50 hover:text-brand-900"}`}
                >
                  <AdminIcon name={g.icon} className="h-[18px] w-[18px]" />
                  {g.label}
                  {g.badge ? <Badge n={g.badge} on={on} /> : null}
                </Link>
              );
            })}
          </nav>

          <div className="order-2 ml-auto flex items-center gap-2 lg:order-3">
            <button
              type="button"
              onClick={() => toggle("jump")}
              aria-label="Jump to…"
              className="inline-flex h-11 items-center gap-2.5 rounded-full border border-line bg-paper px-3.5 text-sm text-muted transition-colors hover:border-brand-200 hover:text-brand-900 sm:min-w-[11.5rem]"
            >
              <AdminIcon name="search" className="h-[17px] w-[17px] shrink-0" />
              <span className="hidden flex-1 text-left sm:block">Jump to…</span>
              <kbd className="hidden rounded-md border border-line bg-white px-1.5 font-mono text-xs sm:block">⌘K</kbd>
            </button>
            <Link href="/" target="_blank" aria-label="View website" title="View website" className="grid h-11 w-11 place-items-center rounded-full border border-line text-muted transition-colors hover:bg-brand-50 hover:text-brand-700">
              <AdminIcon name="external" className="h-[18px] w-[18px]" />
            </Link>
            {live ? (
              <Link href={live.href} title={live.hint} className="inline-flex h-11 items-center gap-2.5 rounded-full bg-brand-600 pl-4 pr-1.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700">
                Go live
                <span className="grid h-8 min-w-8 place-items-center rounded-full bg-accent-600 px-1.5 text-[13px]">{live.count}</span>
              </Link>
            ) : null}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggle("quick")}
                aria-expanded={is("quick")}
                className="inline-flex h-11 items-center gap-1.5 rounded-full border border-brand-600 px-3.5 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-50"
              >
                <AdminIcon name="plus" className="h-4 w-4" /> <span className="hidden sm:inline">Add new</span>
              </button>
              {is("quick") ? (
                <>
                  <button type="button" aria-label="Close" onClick={close} className="fixed inset-0 z-40 cursor-default" />
                  <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-pop">
                    {quickAdd.map((q) => (
                      <Link key={q.href + q.label} href={q.href} onClick={close} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink transition-colors hover:bg-brand-50 hover:text-brand-700">
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
        </div>

        {group && group.tabs.length > 0 ? (
          <div className="border-t border-line">
            <nav aria-label="This section" className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden">
              {group.tabs.map((t) => {
                const on = tab?.href === t.href;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    onClick={close}
                    aria-current={on ? "page" : undefined}
                    className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-[3px] px-4 text-sm font-semibold transition-colors ${
                      on ? "border-brand-600 text-brand-700" : "rounded-t-lg border-transparent text-muted hover:bg-brand-50 hover:text-brand-900"
                    }`}
                  >
                    {t.label}
                    {t.badge ? <Badge n={t.badge} /> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}
      </header>

      {is("jump") ? <Palette items={jump} onClose={close} /> : null}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
