"use client";

import { useEffect, useRef, useState } from "react";

const SHOW_AFTER = 320; // px scrolled before the button appears
const RING = 2 * Math.PI * 21; // circumference of the progress ring (r = 21)

/**
 * Floating "back to top" button. It pops in once the page has been scrolled a little, a ring around it
 * fills as the reader nears the bottom, and at the very bottom it sends out a soft pulse. Reduced motion
 * keeps the button but drops the bobbing arrow, the pulse and the smooth scroll.
 */
export function BackToTop() {
  const [shown, setShown] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const ring = useRef<SVGCircleElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      const progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      ring.current?.style.setProperty("stroke-dashoffset", String(RING * (1 - progress)));
      setShown(y > SHOW_AFTER);
      setAtEnd(max > 0 && max - y < 120);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const toTop = () => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
  };

  return (
    <div
      className={`fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-40 transition duration-500 ease-(--ease-soft) sm:bottom-6 sm:right-6 ${
        shown ? "visible translate-y-0 scale-100 opacity-100" : "invisible translate-y-6 scale-50 opacity-0"
      }`}
    >
      {atEnd && <span aria-hidden className="ping-ring pointer-events-none absolute inset-0 rounded-full bg-accent-500/60" />}
      <button
        type="button"
        onClick={toTop}
        aria-label="Back to top"
        tabIndex={shown ? 0 : -1}
        aria-hidden={!shown}
        className="shine group relative grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-900/30 ring-1 ring-white/20 transition duration-300 ease-(--ease-soft) hover:-translate-y-1 hover:bg-brand-700 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 active:scale-90 sm:h-14 sm:w-14"
      >
        <svg aria-hidden viewBox="0 0 48 48" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="24" cy="24" r="21" fill="none" stroke="white" strokeOpacity="0.22" strokeWidth="3" />
          <circle ref={ring} cx="24" cy="24" r="21" fill="none" stroke="currentColor" className="text-accent-500" strokeWidth="3" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING} />
        </svg>
        <svg aria-hidden viewBox="0 0 24 24" className="arrow-bob relative h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}
