"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicMedia } from "@/lib/content";
import { Img } from "./Img";
import { Lightbox } from "./Lightbox";

export interface PosterTile {
  id: number;
  media: PublicMedia;
  /** Where a click goes. Null: the poster opens full size in the lightbox. */
  href: string | null;
  newTab: boolean;
}

/** Posters added per step: 12 fills whole rows at 2, 3 and 4 columns. */
const STEP = 12;
/** Start loading the next rows this far before the end of the list reaches the screen. */
const LEAD = "900px 0px";

/**
 * Every poster in four columns (three and two on smaller screens). Only the first rows are drawn; the next
 * rows are added as the end of the list nears the screen, and each picture loads only when it is close.
 * A button below the list does the same for keyboard users and when scrolling is not available.
 * Posters without a link open in the lightbox, which steps through all of them.
 */
export function PosterGrid({ posters }: { posters: PosterTile[] }) {
  const [shown, setShown] = useState(STEP);
  const [index, setIndex] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const more = shown < posters.length;

  useEffect(() => {
    const el = end.current;
    if (!more || !el) return;
    // Observing again after each step asks once more, so a tall screen keeps filling until the end is out of reach.
    const watch = new IntersectionObserver((hits) => hits.some((h) => h.isIntersecting) && setShown((n) => Math.min(n + STEP, posters.length)), { rootMargin: LEAD });
    watch.observe(el);
    return () => watch.disconnect();
  }, [more, shown, posters.length]);

  const zoomable = posters.filter((p) => !p.href);
  const zoom = zoomable.map((p) => ({ src: p.media.url, alt: p.media.alt, width: p.media.width, height: p.media.height, caption: p.media.alt || undefined }));

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:gap-5">
        {posters.slice(0, shown).map((p) => {
          const card = "lit group relative block overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-line transition duration-300 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0";
          const picture = <Img media={p.media} className="skeleton aspect-[4/5] h-auto w-full object-cover" />;
          return (
            <li key={p.id}>
              {p.href ? (
                <a href={p.href} className={card} {...(p.newTab || /^https?:/.test(p.href) || p.href.endsWith(".pdf") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                  {picture}
                </a>
              ) : (
                <a
                  href={p.media.url}
                  aria-label={p.media.alt ? `View poster: ${p.media.alt}` : "View poster"}
                  className={`${card} cursor-pointer`}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                    e.preventDefault();
                    setIndex(zoomable.indexOf(p));
                    setOpen(true);
                  }}
                >
                  {picture}
                </a>
              )}
            </li>
          );
        })}
      </ul>
      {more ? (
        <div ref={end} className="mt-8 flex justify-center">
          <button type="button" className="btn btn-ghost" onClick={() => setShown((n) => Math.min(n + STEP, posters.length))}>
            Show more posters ({posters.length - shown} left)
          </button>
        </div>
      ) : null}
      <Lightbox items={zoom} index={index} open={open} onClose={() => setOpen(false)} onIndex={setIndex} />
    </>
  );
}
