"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { NavItem } from "@/lib/content";
import { SearchIcon, SocialIcon } from "./Icons";

const subscribe = () => () => {};

/**
 * Menu for tablets and phones: three lines on the right of the header that turn into a cross, and a
 * drop-down with every menu item (sub-menus open, each can be folded) under the header. The panel is
 * drawn on the page body, because the header's blur makes it the anchor for anything fixed inside it.
 */
export function MobileMenu({ nav, social }: { nav: NavItem[]; social: NavItem[] }) {
  const pathname = usePathname();
  // Remember which page the menu was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    panel.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenOn(null);
      button.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpenOn(null);
  const line = "absolute left-0 block h-0.5 w-6 rounded-full bg-current transition duration-300 ease-(--ease-soft)";

  return (
    <div className="lg:hidden">
      <button
        ref={button}
        type="button"
        onClick={() => setOpenOn(open ? null : pathname)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="relative grid h-11 w-11 place-items-center rounded-full text-ink transition duration-200 hover:bg-brand-50 hover:text-brand-700 active:scale-90"
      >
        <span aria-hidden className="relative block h-5 w-6">
          <span className={`${line} top-0 ${open ? "translate-y-[9px] rotate-45" : ""}`} />
          <span className={`${line} top-[9px] ${open ? "scale-x-0 opacity-0" : ""}`} />
          <span className={`${line} top-[18px] ${open ? "-translate-y-[9px] -rotate-45" : ""}`} />
        </span>
      </button>
      {open &&
        mounted &&
        createPortal(
          <>
            <div aria-hidden onClick={close} className="fixed inset-x-0 bottom-0 top-(--header-h) z-40 animate-fade-in bg-brand-900/40 backdrop-blur-[2px]" />
            <div
              id="mobile-menu"
              ref={panel}
              tabIndex={-1}
              role="dialog"
              aria-label="Menu"
              className="menu-drop fixed inset-x-0 top-(--header-h) z-50 max-h-[calc(100dvh-var(--header-h))] overflow-y-auto overscroll-contain rounded-b-3xl border-t border-line bg-white px-5 pb-6 pt-2 shadow-pop outline-none md:inset-x-auto md:right-6 md:w-96 md:rounded-3xl md:border"
            >
              <ul className="divide-y divide-line">
                {nav.map((item, i) => (
                  <li key={item.id} className="menu-item py-0.5" style={{ animationDelay: `${60 + i * 45}ms` }}>
                    {item.children.length ? (
                      <details className="group" open>
                        <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">
                          {item.label}
                          <svg viewBox="0 0 20 20" className="h-5 w-5 text-brand-600 transition-transform duration-300 group-open:rotate-180" fill="currentColor" aria-hidden>
                            <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
                          </svg>
                        </summary>
                        <ul className="mb-2 ml-1 border-l-2 border-brand-200 pl-4">
                          {item.children.map((c) => (
                            <li key={c.id}>
                              <Link href={c.url ?? "/"} onClick={close} className="block py-2 text-base text-muted transition hover:translate-x-1 hover:text-brand-700">
                                {c.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      <Link href={item.url ?? "/"} onClick={close} className="block py-3 text-lg font-semibold text-ink transition hover:translate-x-1 hover:text-brand-700">
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
                <li className="menu-item py-0.5" style={{ animationDelay: `${60 + nav.length * 45}ms` }}>
                  <Link href="/search/" onClick={close} className="flex items-center gap-2 py-3 text-lg font-semibold text-ink transition hover:translate-x-1 hover:text-brand-700">
                    <SearchIcon className="h-5 w-5 text-brand-600" /> Search
                  </Link>
                </li>
              </ul>
              <div className="menu-item mt-4 flex gap-2.5" style={{ animationDelay: `${60 + (nav.length + 1) * 45}ms` }}>
                {social.map((s) => (
                  <a key={s.id} href={s.url ?? "#"} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="shine grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-700 transition hover:bg-brand-600 hover:text-white active:scale-95">
                    <SocialIcon name={s.icon} className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
