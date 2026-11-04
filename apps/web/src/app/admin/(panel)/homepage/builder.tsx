"use client";
// Home page builder: the sections in order, a preview, and a Customize panel for the selected one.
// Every change is saved straight away and is on the website at once (see ./actions.ts).
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AdminIcon } from "@/lib/admin/icons";
import { NEWS_KEY, type BuilderBlock, type BuilderResult, type BuilderState } from "@/lib/admin/homepage-blocks";
import { BG_COLORS, DEVICE_OPTIONS, SPACE_OPTIONS, type SectionBg, type SectionDevice, type SectionSpace } from "@/lib/section-style";
import { addHomeSection, moveSection, reorderSections, saveSectionStyle, setBlockVisible } from "./actions";

type Status = { kind: "idle" | "saving" | "saved" | "error"; text: string };

const BG_CHOICES: { value: SectionBg; label: string; swatch: string }[] = [
  { value: "default", label: "As it is now", swatch: "linear-gradient(135deg,#fff 50%,#e3e8ef 50%)" },
  { value: "white", label: BG_COLORS.white.label, swatch: BG_COLORS.white.bg },
  { value: "tint", label: BG_COLORS.tint.label, swatch: BG_COLORS.tint.bg },
  { value: "blue", label: BG_COLORS.blue.label, swatch: BG_COLORS.blue.bg },
  { value: "navy", label: BG_COLORS.navy.label, swatch: BG_COLORS.navy.bg },
  { value: "red", label: BG_COLORS.red.label, swatch: BG_COLORS.red.bg },
];
const SPACE_LABEL: Record<SectionSpace, string> = { normal: "Normal", roomy: "Roomy", roomier: "Extra roomy" };
const DEVICE_LABEL: Record<SectionDevice, string> = { all: "All screens", desktop: "Desktop only", phone: "Phones only" };

/** Block order after moving one block; the block the website draws last stays last. */
function reordered(blocks: BuilderBlock[], key: string, to: number): BuilderBlock[] {
  const from = blocks.findIndex((b) => b.key === key);
  if (from < 0) return blocks;
  const next = blocks.filter((b) => b.key !== key);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, blocks[from]);
  return [...next.filter((b) => !b.pinnedLast), ...next.filter((b) => b.pinnedLast)];
}

const optionClass = (on: boolean) =>
  `inline-flex min-h-11 items-center gap-2 rounded-xl border-2 px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    on ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-white text-ink hover:border-brand-200 hover:bg-paper"
  }`;

function Group({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="min-w-0">
      <p className="mb-1.5 text-sm font-semibold text-ink">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onChange} disabled={disabled} className={`${optionClass(on)} rounded-full pl-2`}>
      <span aria-hidden className={`grid h-6 w-6 place-items-center rounded-full ${on ? "bg-brand-600 text-white" : "bg-slate-300 text-white"}`}>
        {on ? <AdminIcon name="check" className="h-3.5 w-3.5" /> : null}
      </span>
      {label}
    </button>
  );
}

function Preview({ homeId, view, nonce }: { homeId: number; view: "desktop" | "phone"; nonce: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // The page renders at a real screen width inside the frame, then the frame is shrunk to fit the column.
  const w = view === "phone" ? 390 : 1280;
  const h = view === "phone" ? 780 : 900;
  const scale = width ? Math.min(1, width / w) : 1;
  return (
    <div ref={wrap} className="overflow-hidden rounded-2xl border border-line bg-paper p-0">
      <div className="mx-auto" style={{ width: w * scale, height: h * scale }}>
        <iframe
          key={nonce}
          title={`Home page preview, ${view} size`}
          src={`/admin/preview/page/${homeId}/`}
          className="block border-0 bg-white"
          style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left" }}
        />
      </div>
    </div>
  );
}

export function HomeBuilder({ initial, canEdit }: { initial: BuilderState; canEdit: boolean }) {
  const [blocks, setBlocks] = useState<BuilderBlock[]>(initial.blocks);
  const [sel, setSel] = useState<string | null>(initial.blocks[0]?.key ?? null);
  const [status, setStatus] = useState<Status>({ kind: "idle", text: "" });
  const [view, setView] = useState<"desktop" | "phone">("desktop");
  const [nonce, setNonce] = useState(0);
  // The preview renders the whole website page on the server, so it loads only once the editor asks for it.
  const [showPreview, setShowPreview] = useState(false);
  const [adding, setAdding] = useState(false);
  const [drag, setDrag] = useState<{ from: string | null; over: string | null }>({ from: null, over: null });
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const homeId = initial.homeId;
  const refreshPreview = () => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    if (!showPreview) return;
    previewTimer.current = setTimeout(() => setNonce((n) => n + 1), 1500);
  };
  useEffect(() => () => { if (previewTimer.current) clearTimeout(previewTimer.current); }, []);

  // The "latest news" block changes key the first time it is saved, so follow it; if the selected block is gone, fall back to the first.
  const cur = blocks.find((b) => b.key === sel) ?? (sel === NEWS_KEY ? blocks.find((b) => b.kind === "news") : undefined) ?? blocks[0] ?? null;
  const selKey = cur?.key ?? null;
  const idx = cur ? blocks.findIndex((b) => b.key === cur.key) : -1;

  /** Show a change at once, save it in order, then take the server's answer as the truth. */
  function commit(optimistic: ((b: BuilderBlock[]) => BuilderBlock[]) | null, call: () => Promise<BuilderResult>, after?: (r: BuilderResult) => void) {
    if (!canEdit) return;
    if (optimistic) setBlocks(optimistic);
    setStatus({ kind: "saving", text: "Saving…" });
    pending.current += 1;
    queue.current = queue.current.then(async () => {
      let r: BuilderResult | null = null;
      try {
        r = await call();
      } catch {
        r = null;
      }
      pending.current -= 1;
      const settled = pending.current === 0;
      // While more changes are waiting to save, keep what the editor sees; a failure always shows the real state.
      if (r?.state && (settled || !r.ok)) {
        setBlocks(r.state.blocks);
      }
      if (!r) setStatus({ kind: "error", text: "Could not save. Check your connection and try again." });
      else if (!r.ok) setStatus({ kind: "error", text: r.message });
      else if (settled) setStatus({ kind: "saved", text: r.message });
      // The preview re-renders the whole page on the server, so refresh it once the editor pauses, not after every click.
      if (r?.ok) refreshPreview();
      if (r) after?.(r);
    });
  }

  const patch = (key: string, p: Partial<BuilderBlock>) => (b: BuilderBlock[]) => b.map((x) => (x.key === key ? { ...x, ...p } : x));
  const save = (key: string, fields: Record<string, string>, p: Partial<BuilderBlock>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    commit(patch(key, p), () => saveSectionStyle(homeId, key, fd));
  };
  const moveTo = (key: string, to: number) => {
    if (blocks.find((b) => b.key === key)?.pinnedLast) return;
    commit((b) => reordered(b, key, to), () => moveSection(homeId, key, to));
  };
  const toggleVisible = (b: BuilderBlock) => commit(patch(b.key, { visible: !b.visible }), () => setBlockVisible(homeId, b.key, !b.visible));

  function dropOn(targetKey: string) {
    const from = drag.from;
    setDrag({ from: null, over: null });
    if (!from || from === targetKey) return;
    const to = blocks.findIndex((b) => b.key === targetKey);
    const next = reordered(blocks, from, to);
    commit(() => next, () => reorderSections(homeId, next.map((b) => b.key)));
  }

  const statusTone =
    status.kind === "error" ? "text-danger-700" : status.kind === "saving" ? "text-muted" : "text-brand-700";
  const hasNews = blocks.some((b) => b.kind === "news");
  const fieldClass = "field min-h-11 disabled:bg-paper";

  return (
    <div className="space-y-5">
      <section aria-label="Save state" className="flex flex-wrap items-center gap-3 rounded-2xl bg-emerald-50 px-5 py-3.5 text-emerald-950 ring-1 ring-emerald-200">
        <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${status.kind === "error" ? "bg-danger-600" : status.kind === "saving" ? "bg-amber-500" : "bg-emerald-600"}`} />
        <p className="min-w-0 flex-1 basis-72 text-sm">
          <span className="font-semibold">Every change here is saved and on the website straight away.</span>{" "}
          <span aria-live="polite" className={`font-medium ${statusTone}`}>
            {status.text}
          </span>
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[21rem_minmax(0,1fr)]">
        {/* Sections, top to bottom */}
        <section aria-labelledby="hb-list" className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="hb-list" className="text-lg font-semibold text-brand-900">
              Sections, top to bottom
            </h2>
            {canEdit ? (
              <button type="button" onClick={() => setAdding((a) => !a)} aria-expanded={adding} className="btn btn-primary min-h-11">
                <AdminIcon name="plus" className="h-4 w-4" /> Add
              </button>
            ) : null}
          </div>
          {adding ? (
            <div className="mb-3 space-y-1.5 rounded-2xl bg-brand-50 p-3">
              <p className="px-1 text-sm font-semibold text-ink">What kind of section?</p>
              <button
                type="button"
                disabled={hasNews}
                onClick={() => {
                  setAdding(false);
                  commit(null, () => addHomeSection(homeId, "latest_posts"), (r) => r.key && setSel(r.key));
                }}
                className="flex min-h-12 w-full flex-col items-start rounded-xl border border-line bg-white px-3.5 py-2 text-left hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="font-semibold">Latest news</span>
                <span className="text-xs text-muted">{hasNews ? "Already on the homepage" : "The newest stories, filled in automatically"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  commit(null, () => addHomeSection(homeId, "rich_text"), (r) => r.key && setSel(r.key));
                }}
                className="flex min-h-12 w-full flex-col items-start rounded-xl border border-line bg-white px-3.5 py-2 text-left hover:border-brand-300"
              >
                <span className="font-semibold">Text block</span>
                <span className="text-xs text-muted">Your own words. Stays hidden until you write in it.</span>
              </button>
            </div>
          ) : null}

          <ol aria-label="Home page sections, top to bottom" className="space-y-2.5">
            {blocks.map((b, i) => {
              const on = b.key === selKey;
              const over = drag.over === b.key && drag.from && drag.from !== b.key;
              const fromIdx = blocks.findIndex((x) => x.key === drag.from);
              return (
                <li
                  key={b.key}
                  draggable={canEdit && !b.pinnedLast}
                  onDragStart={(e) => {
                    try {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", b.key);
                    } catch {
                      /* some browsers refuse; the state below is enough */
                    }
                    setDrag({ from: b.key, over: null });
                  }}
                  onDragOver={(e) => {
                    if (!drag.from) return;
                    e.preventDefault();
                    if (drag.over !== b.key) setDrag((d) => ({ ...d, over: b.key }));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropOn(b.key);
                  }}
                  onDragEnd={() => setDrag({ from: null, over: null })}
                  className={`flex items-center gap-2 rounded-2xl border-2 bg-white p-2 pl-1.5 transition-colors ${on ? "border-brand-600 bg-brand-50/60" : "border-line"} ${b.visible ? "" : "border-dashed opacity-80"} ${drag.from === b.key ? "opacity-40" : ""} ${over ? (fromIdx > i ? "shadow-[0_-4px_0_0_var(--color-brand-600)]" : "shadow-[0_4px_0_0_var(--color-brand-600)]") : ""}`}
                >
                  <span aria-hidden title={b.pinnedLast ? "Always last on the website" : "Drag to move"} className={`select-none px-0.5 text-lg leading-none tracking-tighter ${b.pinnedLast ? "text-slate-300" : "cursor-grab text-slate-400"}`}>
                    ⋮⋮
                  </span>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      aria-label={`Move ${b.name} up`}
                      disabled={!canEdit || b.pinnedLast || i === 0}
                      onClick={() => moveTo(b.key, i - 1)}
                      className="btn btn-ghost h-11 w-11 p-0 disabled:opacity-35"
                    >
                      <AdminIcon name="chevron" className="h-4 w-4 -rotate-90" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${b.name} down`}
                      disabled={!canEdit || b.pinnedLast || i >= blocks.length - 1 || blocks[i + 1]?.pinnedLast}
                      onClick={() => moveTo(b.key, i + 1)}
                      className="btn btn-ghost h-11 w-11 p-0 disabled:opacity-35"
                    >
                      <AdminIcon name="chevron" className="h-4 w-4 rotate-90" />
                    </button>
                  </div>
                  <button type="button" onClick={() => setSel(b.key)} aria-pressed={on} className="min-h-11 min-w-0 flex-1 rounded-lg px-1.5 py-0.5 text-left">
                    <span className="block font-mono text-xs text-muted">
                      {String(i + 1).padStart(2, "0")} · {b.visible ? "Showing" : "Hidden"}
                      {b.pinnedLast ? " · always last" : ""}
                    </span>
                    <span className="block truncate text-base font-semibold text-brand-900">{b.title && b.canTitle ? b.title : b.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {b.meta}
                      {b.bg !== "default" ? ` · ${BG_COLORS[b.bg].label}` : ""}
                      {b.device !== "all" ? ` · ${DEVICE_LABEL[b.device]}` : ""}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleVisible(b)}
                    disabled={!canEdit}
                    aria-pressed={!b.visible}
                    aria-label={`${b.visible ? "Hide" : "Show"} ${b.name}`}
                    className="btn btn-ghost min-h-11 min-w-[3.75rem] shrink-0 rounded-full px-3 text-sm"
                  >
                    {b.visible ? "Hide" : "Show"}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Customize + live preview */}
        <div className="min-w-0 space-y-5">
          <section aria-labelledby="hb-custom" className="rounded-2xl border border-line bg-white p-5 shadow-sm">
            {cur ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs uppercase tracking-wider text-muted">
                      Customize · section {idx + 1} of {blocks.length}
                    </p>
                    <h2 id="hb-custom" className="text-xl font-semibold text-brand-900">
                      {cur.name}
                    </h2>
                    <p className="text-sm text-muted">{cur.meta}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cur.editHref ? (
                      <Link href={cur.editHref} className="btn btn-ghost min-h-11">
                        <AdminIcon name="edit" className="h-4 w-4" /> {cur.editLabel}
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {cur.canTitle ? (
                    <label className="block">
                      <span className="label">Section title</span>
                      <input
                        key={`${cur.key}:title:${cur.title}`}
                        type="text"
                        defaultValue={cur.title}
                        disabled={!canEdit}
                        maxLength={120}
                        onBlur={(e) => e.target.value.trim() !== cur.title && save(cur.key, { title: e.target.value }, { title: e.target.value.trim() })}
                        className={fieldClass}
                      />
                      <span className="mt-1 block text-xs text-muted">The heading on the website. Saves when you click away.</span>
                    </label>
                  ) : null}
                  <label className="block">
                    <span className="label">Line above the section</span>
                    <input
                      key={`${cur.key}:intro:${cur.intro}`}
                      type="text"
                      defaultValue={cur.intro}
                      disabled={!canEdit}
                      maxLength={240}
                      placeholder="Optional"
                      onBlur={(e) => e.target.value.trim() !== cur.intro && save(cur.key, { intro: e.target.value }, { intro: e.target.value.trim() })}
                      className={fieldClass}
                    />
                    <span className="mt-1 block text-xs text-muted">One short sentence. Saves when you click away.</span>
                  </label>
                </div>

                {cur.canHideTitle ? (
                  <Switch
                    on={cur.showTitle}
                    disabled={!canEdit}
                    label={cur.showTitle ? "The title is shown on the page" : "The title is hidden on the page"}
                    onChange={() => save(cur.key, { showTitle: cur.showTitle ? "0" : "1" }, { showTitle: !cur.showTitle })}
                  />
                ) : null}

                {cur.intervalSeconds !== null ? (
                  <label className="block max-w-xs">
                    <span className="label">Seconds on each slide</span>
                    <input
                      key={`${cur.key}:sec:${cur.intervalSeconds}`}
                      type="number"
                      min={2}
                      max={30}
                      defaultValue={cur.intervalSeconds}
                      disabled={!canEdit}
                      onBlur={(e) => Number(e.target.value) !== cur.intervalSeconds && save(cur.key, { intervalSeconds: e.target.value }, { intervalSeconds: Number(e.target.value) })}
                      className={fieldClass}
                    />
                    <span className="mt-1 block text-xs text-muted">Between 2 and 30.</span>
                  </label>
                ) : null}

                {cur.maxCards !== null ? (
                  <div className="flex flex-wrap items-end gap-5">
                    <label className="block w-40">
                      <span className="label">Number of videos</span>
                      <input
                        key={`${cur.key}:cards:${cur.maxCards}`}
                        type="number"
                        min={1}
                        max={12}
                        defaultValue={cur.maxCards}
                        disabled={!canEdit}
                        onBlur={(e) => Number(e.target.value) !== cur.maxCards && save(cur.key, { maxCards: e.target.value }, { maxCards: Number(e.target.value) })}
                        className={fieldClass}
                      />
                    </label>
                    <Switch
                      on={cur.showLatest === true}
                      disabled={!canEdit}
                      label={cur.showLatest ? "Fill with the newest from YouTube" : "Only the videos you chose"}
                      onChange={() => save(cur.key, { showLatest: cur.showLatest ? "0" : "1" }, { showLatest: !cur.showLatest })}
                    />
                  </div>
                ) : null}

                <Group label="Background" hint="Light backgrounds keep the section's own look; dark ones switch its text to white.">
                  {BG_CHOICES.map((o) => (
                    <button key={o.value} type="button" disabled={!canEdit} aria-pressed={cur.bg === o.value} onClick={() => cur.bg !== o.value && save(cur.key, { bg: o.value }, { bg: o.value })} className={optionClass(cur.bg === o.value)}>
                      <span aria-hidden className="h-5 w-5 rounded-full border border-slate-400" style={{ background: o.swatch }} />
                      {o.label}
                    </button>
                  ))}
                </Group>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Group label="Space around it">
                    {SPACE_OPTIONS.map((v) => (
                      <button key={v} type="button" disabled={!canEdit} aria-pressed={cur.space === v} onClick={() => cur.space !== v && save(cur.key, { space: v }, { space: v })} className={optionClass(cur.space === v)}>
                        {SPACE_LABEL[v]}
                      </button>
                    ))}
                  </Group>
                  <Group label="Show it on">
                    {DEVICE_OPTIONS.map((v) => (
                      <button key={v} type="button" disabled={!canEdit} aria-pressed={cur.device === v} onClick={() => cur.device !== v && save(cur.key, { device: v }, { device: v })} className={optionClass(cur.device === v)}>
                        {DEVICE_LABEL[v]}
                      </button>
                    ))}
                  </Group>
                </div>

                <Group label="Move this section" hint={cur.pinnedLast ? "The website always draws this block last, so it cannot move." : undefined}>
                  {[
                    { label: "Top", to: 0, off: idx === 0 },
                    { label: "Up", to: idx - 1, off: idx === 0 },
                    { label: "Down", to: idx + 1, off: idx >= blocks.length - 1 || !!blocks[idx + 1]?.pinnedLast },
                    { label: "Bottom", to: blocks.filter((b) => !b.pinnedLast).length - 1, off: idx >= blocks.filter((b) => !b.pinnedLast).length - 1 },
                  ].map((m) => (
                    <button key={m.label} type="button" disabled={!canEdit || cur.pinnedLast || m.off} onClick={() => moveTo(cur.key, m.to)} className="btn btn-ghost min-h-11 px-4">
                      {m.label}
                    </button>
                  ))}
                </Group>

                <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  <button type="button" disabled={!canEdit} onClick={() => toggleVisible(cur)} className={cur.visible ? "btn btn-ghost min-h-11" : "btn btn-primary min-h-11"}>
                    {cur.visible ? "Hide on the website" : "Show on the website"}
                  </button>
                  <Link href={`/admin/pages/${homeId}/`} className="btn btn-quiet min-h-11 text-sm">
                    Advanced section editor
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <h2 id="hb-custom" className="text-lg font-semibold text-brand-900">
                  Customize a section
                </h2>
                <p className="mt-1 text-sm text-muted">Pick a section from the list to change how it looks and where it shows.</p>
              </div>
            )}
          </section>

          <section aria-labelledby="hb-preview">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="hb-preview" className="text-lg font-semibold text-brand-900">
                  Preview of the home page
                </h2>
                <p className="text-sm text-muted">Refreshes a moment after you stop making changes. Latest news is filled in on the live site.</p>
              </div>
              <div className="flex items-center gap-2">
                {showPreview ? (
                  <>
                    <div role="group" aria-label="Preview size" className="flex gap-1 rounded-full bg-white p-1 ring-1 ring-line">
                      {(["desktop", "phone"] as const).map((v) => (
                        <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`min-h-10 rounded-full px-4 text-sm font-semibold ${view === v ? "bg-brand-900 text-white" : "text-brand-900 hover:bg-paper"}`}>
                          {v === "desktop" ? "Desktop" : "Phone"}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => setNonce((n) => n + 1)} className="btn btn-ghost min-h-11">
                      Refresh
                    </button>
                  </>
                ) : null}
                <Link href="/" target="_blank" className="btn btn-ghost min-h-11">
                  Open the website <AdminIcon name="external" className="h-4 w-4" />
                </Link>
              </div>
            </div>
            {showPreview ? (
              <Preview homeId={homeId} view={view} nonce={nonce} />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                <p className="mx-auto max-w-md text-sm text-muted">The preview loads the whole page, so it waits until you want it. Your changes are already live either way.</p>
                <button type="button" onClick={() => setShowPreview(true)} className="btn btn-primary mt-4 min-h-11">
                  Show the preview
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
