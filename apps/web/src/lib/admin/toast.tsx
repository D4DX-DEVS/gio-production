"use client";
// A small message at the bottom of the screen for actions that happen at once (move, delete, add):
// they have no Save button to show their result next to.
import { useEffect, useState } from "react";

type Tone = "ok" | "error";
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

let nextId = 1;
const listeners = new Set<(t: Toast) => void>();

export function toast(message: string, tone: Tone = "ok") {
  const t = { id: nextId++, message, tone };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const on = (t: Toast) => {
      setItems((cur) => [...cur.slice(-2), t]);
      const timer = setTimeout(
        () => {
          timers.delete(timer);
          setItems((cur) => cur.filter((x) => x.id !== t.id));
        },
        t.tone === "error" ? 8000 : 3500,
      );
      timers.add(timer);
    };
    listeners.add(on);
    return () => {
      listeners.delete(on);
      timers.forEach(clearTimeout);
    };
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={`pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm font-medium shadow-pop ring-1 ${t.tone === "error" ? "bg-red-50 text-danger-700 ring-red-200" : "bg-brand-900 text-white ring-brand-900"}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
