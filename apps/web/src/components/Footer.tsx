import Link from "next/link";
import type { NavItem, SiteInfo } from "@/lib/content";
import { Img } from "./Img";
import { MailIcon, PhoneIcon, PinIcon, SocialIcon } from "./Icons";

const POWERED_BY = { name: "D4DX Innovations LLP", href: "https://d4dx.co/" };

/** Pages that are not in the main menu but belong in the footer, placed just before "Contact Us". */
const EXTRA_LINKS = [{ id: "call-for-papers", label: "Call for Papers", url: "/call-for-papers/" }];

/** The address as typed in the admin, with stray spaces before commas and missing ones after them put right. */
const tidy = (s: string) => s.replace(/\s+,/g, ",").replace(/,(?=\S)/g, ", ").replace(/\s{2,}/g, " ");

const heading = "relative pb-3.5 font-display text-xl font-bold uppercase tracking-wide text-white after:absolute after:bottom-0 after:left-0 after:h-1 after:w-14 after:rounded-full after:bg-accent-500";

export function Footer({ site, nav, social }: { site: SiteInfo; nav: NavItem[]; social: NavItem[] }) {
  const menu = nav.flatMap((n) => (n.children.length ? n.children : [n]));
  const contact = menu.findIndex((l) => (l.url ?? "").replace(/\/$/, "").endsWith("/contact-us"));
  const links: { id: string | number; label: string; url: string | null }[] = [...menu];
  links.splice(contact >= 0 ? contact : links.length, 0, ...EXTRA_LINKS);
  const half = Math.ceil(links.length / 2);

  return (
    <footer className="relative isolate mt-auto overflow-hidden bg-gradient-to-b from-brand-800 via-brand-900 to-[#071e38] text-white">
      {/* Soft blue swells in the bottom corners. */}
      <svg aria-hidden className="pointer-events-none absolute bottom-0 left-0 -z-10 h-56 w-[38rem] max-w-[60%] text-brand-400/25" viewBox="0 0 600 220" preserveAspectRatio="none" fill="currentColor">
        <path className="wave-drift" d="M-60 220V120C80 110 230 210 420 220Z" />
      </svg>
      <svg aria-hidden className="pointer-events-none absolute bottom-0 right-0 -z-10 h-56 w-[38rem] max-w-[60%] text-brand-400/25" viewBox="0 0 600 220" preserveAspectRatio="none" fill="currentColor">
        <path className="wave-drift-b" d="M660 220V110C520 120 400 200 240 220Z" />
      </svg>

      <div className="reveal-group mx-auto grid max-w-7xl gap-x-0 gap-y-10 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[1fr_1.25fr_1fr] lg:px-8 lg:py-16 xl:max-w-[88rem] 2xl:max-w-[100rem]">
        <div className="text-center lg:pr-10 lg:text-left">
          <Img media={site.logo} alt={site.name} className="mx-auto h-20 w-auto brightness-0 invert sm:h-24 lg:mx-0" fallbackLabel={site.name} />
          <p className="mt-6 text-base leading-relaxed text-white/90 sm:text-lg">
            {site.name} | {site.tagline}
          </p>
          <div className="mt-6 flex justify-center gap-3 lg:justify-start">
            {social.map((s) => (
              <a
                key={s.id}
                href={s.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="shine grid h-11 w-11 place-items-center rounded-full bg-white/10 ring-1 ring-white/10 transition duration-200 hover:-translate-y-1 hover:bg-accent-500 hover:shadow-lg hover:shadow-accent-500/30 active:scale-95"
              >
                <SocialIcon name={s.icon} className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        <div className="hidden lg:block lg:border-l lg:border-white/20 lg:pl-12">
          <h2 className={heading}>Quick links</h2>
          <ul className="mt-6 grid grid-cols-2 gap-x-6">
            {[links.slice(0, half), links.slice(half)].map((col, c) => (
              <li key={c}>
                <ul className="space-y-3.5">
                  {col.map((l) => (
                    <li key={l.id}>
                      <Link href={l.url ?? "/"} className="inline-block text-base text-white/90 transition duration-200 hover:translate-x-1 hover:text-white sm:text-lg">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden lg:block lg:border-l lg:border-white/20 lg:pl-12">
          <h2 className={heading}>Contact</h2>
          <ul className="mt-6 space-y-5 text-base sm:text-lg">
            {site.address && (
              <li className="flex items-start gap-4">
                <PinIcon className="mt-1 h-6 w-6 shrink-0 text-accent-500" />
                <span className="text-white/90">{tidy(site.address)}</span>
              </li>
            )}
            {site.phone && (
              <li className="flex items-center gap-4">
                <PhoneIcon className="h-6 w-6 shrink-0 text-accent-500" />
                <a href={`tel:${site.phone.replace(/\s+/g, "")}`} className="link-fx text-white/90 hover:text-white">
                  {site.phone}
                </a>
              </li>
            )}
            {site.email && (
              <li className="flex items-center gap-4">
                <MailIcon className="h-6 w-6 shrink-0 text-accent-500" />
                <a href={`mailto:${site.email}`} className="link-fx break-all text-white/90 hover:text-white">
                  {site.email}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-accent-500/40">
        <div className="reveal mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 pb-20 pt-5 text-sm text-white/85 sm:flex-row sm:px-6 sm:pb-5 sm:pr-24 sm:text-base lg:px-8 lg:pr-24 min-[1568px]:pr-8 xl:max-w-[88rem] 2xl:max-w-[100rem]">
          <span>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </span>
          <a href={POWERED_BY.href} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2.5 hover:text-white">
            <span>
              Powered by <strong className="font-bold text-white">{POWERED_BY.name}</strong>
            </span>
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent-500 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
            </svg>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
