"use client";

import { useEffect } from "react";

/** Elements that light up under the pointer (see "Lighting on hover" in globals.css). */
const TARGETS = ".lit, .shine, .btn-fx, .btn";

/**
 * Tells image frames and buttons where the pointer is, as --mx / --my (percent of their box), so the
 * light on them follows it. Only mouse-like devices; touch screens show no hover light.
 */
export function LightFx() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    let frame = 0;
    let last: { el: HTMLElement; x: number; y: number } | null = null;

    const paint = () => {
      frame = 0;
      if (!last) return;
      const { el, x, y } = last;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      el.style.setProperty("--mx", `${(((x - r.left) / r.width) * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(((y - r.top) / r.height) * 100).toFixed(1)}%`);
    };
    const onMove = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target.closest<HTMLElement>(TARGETS) : null;
      if (!el) return;
      last = { el, x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(paint);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
