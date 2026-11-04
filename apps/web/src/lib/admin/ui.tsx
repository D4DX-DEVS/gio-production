// Server-rendered building blocks for admin pages. Interactive pieces are in ./client.tsx.
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminIcon, type AdminIconName } from "./icons";

// `icon` is accepted so existing pages keep compiling; the studio design leads with the title instead.
export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; icon?: AdminIconName; back?: { href: string; label: string } }) {
  return (
    <div className="mb-7">
      {back ? (
        <Link href={back.href} className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-brand-700">
          <AdminIcon name="arrow" className="h-3.5 w-3.5 rotate-180" /> {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold leading-[1.08] tracking-tight text-brand-900 sm:text-4xl">{title}</h1>
          {description ? <p className="mt-2 max-w-[68ch] text-base text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Card({ title, description, aside, children, className = "" }: { title?: string; description?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      {title || aside ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-base font-semibold text-brand-900">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
          {aside}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/** Pill tabs for switching between the parts of one website section. */
export function SectionTabs({ tabs }: { tabs: { href: string; label: string; active: boolean; count?: number }[] }) {
  return (
    <nav aria-label="Section views" className="mb-5 flex flex-wrap gap-1.5 rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-line">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${t.active ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-paper hover:text-brand-800"}`}
        >
          {t.label}
          {t.count !== undefined ? (
            <span className={`rounded-full px-1.5 text-xs tabular-nums ${t.active ? "bg-white/20 text-white" : "bg-paper text-muted"}`}>{t.count}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

/** Friendly "nothing here yet" block with an optional call to action. */
export function EmptyState({ icon = "plus", title, children, action }: { icon?: AdminIconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
        <AdminIcon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="mt-3 text-base font-semibold text-brand-900">{title}</h3>
      {children ? <p className="mt-1 max-w-md text-sm text-muted">{children}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Pick one option from big labelled cards (a friendlier select). Works without JavaScript. */
export function RadioCards({ name, options, defaultValue, disabled = false, className = "" }: { name: string; options: { value: string; label: string; hint?: string }[]; defaultValue?: string; disabled?: boolean; className?: string }) {
  return (
    <div className={`grid gap-2 ${className}`} role="radiogroup">
      {options.map((o) => (
        <label
          key={o.value}
          className="group flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5 transition hover:border-slate-300 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:ring-2 has-[:checked]:ring-brand-500/20 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
        >
          <input type="radio" name={name} value={o.value} defaultChecked={o.value === defaultValue} disabled={disabled} className="sr-only" />
          <span aria-hidden className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 border-slate-300 transition group-has-[:checked]:border-brand-600">
            <span className="h-2 w-2 rounded-full bg-brand-600 opacity-0 transition group-has-[:checked]:opacity-100" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">{o.label}</span>
            {o.hint ? <span className="block text-xs text-muted">{o.hint}</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}

/** On/off switch that submits like a checkbox. */
export function Toggle({ name, label, hint, defaultChecked = false, disabled = false }: { name: string; label: string; hint?: ReactNode; defaultChecked?: boolean; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
      <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} disabled={disabled} className="peer sr-only" />
        <span className="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-2" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/** A tick-box shown as a pill, for choosing several tags or categories. */
export function ChipCheckbox({ name, value, label, defaultChecked = false }: { name: string; value: string | number; label: string; defaultChecked?: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="inline-flex items-center rounded-full border border-line bg-white px-3 py-1 text-sm text-slate-600 transition hover:border-slate-300 peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:font-medium peer-checked:text-brand-700 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400">
        {label}
      </span>
    </label>
  );
}

/** Save bar pinned to the bottom of a long form, so Save is always in reach. `aside` holds the delete button. */
export function FormActions({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:bottom-4 lg:mx-0 lg:rounded-2xl lg:border lg:px-5 lg:shadow-lg lg:shadow-brand-900/10">
      <div>{aside}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** Edit / View / Delete links at the end of a list row. Pass the delete form as `children`. */
export function RowActions({ editHref, viewHref, children }: { editHref?: string; viewHref?: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
      {editHref ? (
        <Link href={editHref} className="btn btn-sm btn-ghost">
          <AdminIcon name="edit" className="h-3.5 w-3.5" /> Edit
        </Link>
      ) : null}
      {viewHref ? (
        <a href={viewHref} target="_blank" className="btn btn-sm btn-quiet" title="Open on the website" aria-label="View on the website">
          <AdminIcon name="external" className="h-4 w-4" />
        </a>
      ) : null}
      {children}
    </div>
  );
}

/** Label + control + optional hint. */
export function Field({ label, hint, children, className = "" }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

const BADGE: Record<string, string> = {
  published: "bg-green-50 text-green-700 ring-green-200",
  verified: "bg-green-50 text-green-700 ring-green-200",
  keep_as_is: "bg-green-50 text-green-700 ring-green-200",
  change_approved: "bg-green-50 text-green-700 ring-green-200",
  client_approved: "bg-green-50 text-green-700 ring-green-200",
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  new: "bg-brand-50 text-brand-700 ring-brand-200",
  review: "bg-amber-50 text-amber-800 ring-amber-200",
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  pending_client: "bg-amber-50 text-amber-800 ring-amber-200",
  scheduled: "bg-brand-50 text-brand-700 ring-brand-200",
  cancelled: "bg-red-50 text-danger-700 ring-red-200",
  rejected: "bg-red-50 text-danger-700 ring-red-200",
  spam: "bg-red-50 text-danger-700 ring-red-200",
  hidden: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE[value] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
      {label ?? value.replaceAll("_", " ")}
    </span>
  );
}

/** Table wrapper with consistent styling; pass <thead>/<tbody> as children. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
      <table className="w-full text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:bg-paper/70 [&_th]:px-4 [&_th]:py-3 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.1em] [&_th]:text-muted [&_tr]:border-b [&_tr]:border-line [&_tbody_tr:last-child]:border-0 [&_tbody_tr:hover]:bg-brand-50/40">
        {children}
      </table>
    </div>
  );
}

export function EmptyRow({ colSpan, children = "Nothing here yet." }: { colSpan: number; children?: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-muted">
        {children}
      </td>
    </tr>
  );
}

/** Prev/next links that keep the other query params. `page` is 1-based. */
export function Pagination({ basePath, page, pageSize, total, params = {} }: { basePath: string; page: number; pageSize: number; total: number; params?: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <nav className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted">
        Page {page} of {pages} · {total} items
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className="btn btn-ghost" href={href(page - 1)}>
            ← Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link className="btn btn-ghost" href={href(page + 1)}>
            Next →
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

/** Read `?page=` safely from awaited searchParams. */
export function pageParam(sp: Record<string, string | string[] | undefined>): number {
  const n = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/** First value of a search param. */
export function param(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}
