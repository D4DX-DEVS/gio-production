import Link from "next/link";
import type { NavItem, SiteInfo } from "@/lib/content";
import { Img } from "./Img";
import { SearchIcon, SocialIcon } from "./Icons";
import { MobileMenu } from "./MobileMenu";

// Row heights here set --header-h in globals.css (sticky sub-navs and the mobile menu sit under it).
export function Header({ site, nav, social }: { site: SiteInfo; nav: NavItem[]; social: NavItem[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="hidden bg-brand-800 text-brand-100 lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-1.5 text-sm lg:px-8 xl:max-w-[88rem] 2xl:max-w-[100rem]">
          <span>{site.tagline}</span>
          <div className="flex items-center gap-4">
            {site.email && (
              <a href={`mailto:${site.email}`} className="link-fx hover:text-white">
                {site.email}
              </a>
            )}
            <span className="flex items-center gap-3">
              {social.map((s) => (
                <a key={s.id} href={s.url ?? "#"} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="transition duration-200 hover:-translate-y-0.5 hover:text-white">
                  <SocialIcon name={s.icon} className="h-4 w-4" />
                </a>
              ))}
            </span>
          </div>
        </div>
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 md:h-18 lg:h-22 lg:gap-5 lg:px-8 xl:max-w-[88rem] 2xl:max-w-[100rem]">
        <Link href="/" className="mr-auto flex shrink-0 items-center gap-3 transition-transform duration-300 ease-(--ease-soft) hover:scale-[1.03]" aria-label={`${site.name} home`}>
          <Img media={site.logo} alt={site.name} eager className="h-11 w-auto sm:h-12 md:h-14 lg:h-16" fallbackLabel={site.name} />
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-0.5 xl:gap-1.5">
            {nav.map((item) => (
              <li key={item.id} className="group relative">
                {item.children.length ? (
                  <>
                    <button
                      type="button"
                      className="nav-link flex items-center gap-1 rounded-full px-3 py-2.5 text-base font-semibold text-ink transition xl:px-4 xl:text-[1.125rem] hover:text-brand-700 group-focus-within:text-brand-700"
                      aria-haspopup="true"
                    >
                      {item.label}
                      <svg viewBox="0 0 20 20" className="h-4 w-4 transition group-hover:rotate-180" fill="currentColor" aria-hidden>
                        <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
                      </svg>
                    </button>
                    <ul className="invisible absolute left-0 top-full w-60 translate-y-1 rounded-xl border border-line bg-white p-1.5 opacity-0 shadow-pop transition duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                      {item.children.map((c) => (
                        <li key={c.id}>
                          <Link href={c.url ?? "/"} className="block rounded-lg px-3 py-2 text-[0.9375rem] text-ink transition hover:translate-x-0.5 hover:bg-brand-50 hover:text-brand-700">
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <Link href={item.url ?? "/"} className="nav-link block rounded-full px-3 py-2.5 text-base font-semibold text-ink transition hover:text-brand-700 xl:px-4 xl:text-[1.125rem]">
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1.5">
          <Link href="/search/" aria-label="Search" className="rounded-full p-2.5 text-ink transition duration-200 hover:scale-110 hover:bg-brand-50 hover:text-brand-700 active:scale-95">
            <SearchIcon className="h-6 w-6" />
          </Link>
          <MobileMenu nav={nav} social={social} />
        </div>
      </div>
    </header>
  );
}
