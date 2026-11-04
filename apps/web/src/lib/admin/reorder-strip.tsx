"use client";
// The "Order on the website" strip: every item of a section as a small picture, in the order the website shows
// them. Drag a picture to a new place, or select it and use the arrow keys; the new order is saved at once.
// Remount it (change its `key`) when the list changes on the server, so it starts from the saved order.
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { SaveResult } from "./result";
import { toast } from "./toast";

export interface StripItem {
  id: number;
  /** Picture to show; null when the item has none yet. */
  url: string | null;
  label: string;
  hidden: boolean;
}

/** The pause after the last arrow key before the order is saved, so several presses make one save. */
const KEY_SAVE_DELAY = 700;

export function ReorderStrip({
  items,
  noun,
  save,
  aspect,
  columns,
  homeCount,
}: {
  items: StripItem[];
  noun: string;
  /** Saves the whole order (ids, first to last). */
  save: (ids: number[]) => Promise<SaveResult>;
  /** Tailwind aspect class of a picture. */
  aspect: string;
  /** "dense" for tall pictures (posters), "wide" for banners, logos and videos. */
  columns: "dense" | "wide";
  /** The first this many items are on the homepage; the others are dimmed. */
  homeCount?: number;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(items);
  const [dragging, setDragging] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const live = useRef(items); // the order on screen right now
  const saved = useRef(items); // the order the server has
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (next: StripItem[]) => {
    live.current = next;
    setOrder(next);
  };

  /** Move one item to a place in the list (0 = first). */
  const place = (id: number, to: number) => {
    const from = live.current.findIndex((i) => i.id === id);
    if (from < 0 || to < 0 || to >= live.current.length || from === to) return;
    const next = live.current.slice();
    next.splice(to, 0, next.splice(from, 1)[0]);
    show(next);
  };

  const persist = async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = live.current;
    if (next.map((i) => i.id).join(",") === saved.current.map((i) => i.id).join(",")) return;
    setBusy(true);
    try {
      const r = await save(next.map((i) => i.id));
      toast(r.message, r.ok ? "ok" : "error");
      if (r.ok) {
        saved.current = next;
        router.refresh();
      } else {
        show(saved.current);
      }
    } catch {
      toast("Could not save the order. Check your connection and try again.", "error");
      show(saved.current);
    } finally {
      setBusy(false);
    }
  };

  const grid = columns === "dense" ? "grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

  return (
    <ol className={`grid gap-2.5 ${grid} ${busy ? "opacity-70" : ""}`} aria-busy={busy}>
      {order.map((it, k) => (
        <li
          key={it.id}
          draggable
          tabIndex={0}
          aria-label={`${noun[0].toUpperCase()}${noun.slice(1)} ${k + 1} of ${order.length}${it.hidden ? ", hidden" : ""}. Drag it, or press the left and right arrow keys, to move it.`}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", String(it.id));
            setDragging(it.id);
          }}
          // Entering another picture moves the dragged one into that place, so the strip shows the result as you go.
          onDragEnter={(e) => {
            if (dragging === null) return;
            e.preventDefault();
            place(dragging, k);
          }}
          onDragOver={(e) => dragging !== null && e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          onDragEnd={() => {
            setDragging(null);
            void persist();
          }}
          onKeyDown={(e) => {
            const to = e.key === "ArrowLeft" ? k - 1 : e.key === "ArrowRight" ? k + 1 : e.key === "Home" ? 0 : e.key === "End" ? order.length - 1 : null;
            if (to === null || e.altKey || e.ctrlKey || e.metaKey) return;
            e.preventDefault();
            place(it.id, to);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => void persist(), KEY_SAVE_DELAY);
            // The tile moves to a new place in the list; keep the keyboard on it.
            requestAnimationFrame(() => document.getElementById(`strip-${it.id}`)?.focus());
          }}
          id={`strip-${it.id}`}
          className={`group relative cursor-grab select-none overflow-hidden rounded-lg border bg-paper outline-offset-2 transition focus-visible:outline-2 focus-visible:outline-brand-600 active:cursor-grabbing ${
            dragging === it.id ? "scale-95 border-brand-600 opacity-40" : it.hidden ? "border-dashed border-slate-300" : "border-line"
          } ${homeCount !== undefined && k >= homeCount ? "opacity-60" : ""}`}
        >
          <div className={`${aspect} w-full`}>
            {it.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.url} alt="" draggable={false} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <span className="flex h-full items-center justify-center px-1 text-center text-[11px] text-muted">No image</span>
            )}
          </div>
          <span className="absolute left-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white/95 px-1 text-[11px] font-bold tabular-nums text-brand-900 shadow">{k + 1}</span>
          {it.hidden ? <span className="absolute bottom-1 left-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">Hidden</span> : null}
        </li>
      ))}
    </ol>
  );
}
