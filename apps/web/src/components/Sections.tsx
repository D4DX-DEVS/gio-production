/* eslint-disable @next/next/no-img-element -- original files from R2, no transformation service */
import type { LayoutItem, LayoutMedia, LayoutSection, PageLayout } from "@gio/db/layout";
import { encodePath, type PublicMedia } from "@/lib/content";
import { sanitize } from "@/lib/sanitize";
import { langOf } from "@/lib/text";
import { ChannelVideos } from "./ChannelVideos";
import { ContactSection } from "./ContactSection";
import { HeroCarousel } from "./HeroCarousel";
import { ArrowRight } from "./Icons";
import { Img } from "./Img";
import { InstagramFeed } from "./InstagramFeed";
import { LightboxScope } from "./LightboxScope";
import { PosterMarquee } from "./PosterMarquee";
import { SectionFrame } from "./SectionFrame";
import { Container, SectionHeading } from "./ui";
import { readShowTitle } from "@/lib/section-style";

export function layoutMedia(m: LayoutMedia | null, alt?: string | null): PublicMedia | null {
  if (!m) return null;
  return { id: m.id, url: encodePath(m.url), width: m.width, height: m.height, alt: alt ?? m.altText ?? "", mimeType: m.mimeType };
}

function itemLink(i: LayoutItem) {
  if (!i.linkUrl) return null;
  return i.linkUrl.startsWith("/wp-content/") ? encodePath(i.linkUrl) : i.linkUrl;
}

function Linked({ item, children, className }: { item: LayoutItem; children: React.ReactNode; className?: string }) {
  const href = itemLink(item);
  if (!href) return <div className={className}>{children}</div>;
  const external = /^https?:/.test(href) || href.endsWith(".pdf");
  return (
    <a href={href} className={className} {...(external || item.openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

function RichText({ html, className = "" }: { html: string; className?: string }) {
  const clean = sanitize(html);
  return <div lang={langOf(clean)} className={`prose-gio ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />;
}

/** Headings for homepage blocks that had none on the old site (labels only, no new content). */
const DEFAULT_TITLES: Partial<Record<LayoutSection["type"], string>> = {
  poster_slider: "Posters",
  featured_video: "Watch",
  logo_carousel: "Our initiatives",
};

interface Props {
  layout: PageLayout;
  /** Extra blocks rendered after the section at that index (homepage: latest news, events). */
  inserts?: Record<number, React.ReactNode>;
  pageTitle?: string;
}

export function Sections({ layout, inserts = {}, pageTitle }: Props) {
  const out: React.ReactNode[] = [];
  const secs = layout.sections;
  // A contact form takes the page's contact details and map into one block (Contact page).
  const form = secs.find((s) => s.type === "contact_form");
  const contactDetails = form && secs.find((s) => s.type === "rich_text" && s.data.kind === "contact_details");
  const contactMap = form && secs.find((s) => s.type === "map");
  // The homepage "About" block is two sections drawn together: the text, and the poster on its right.
  const aboutText = secs.find((s) => s.type === "rich_text" && s.data.kind === "about");
  const aboutPoster = secs.find((s) => s.type === "image" && s.data.kind === "about_poster");
  for (let i = 0; i < secs.length; i++) {
    const s = secs[i];
    const next = secs[i + 1];
    if (s === aboutText || s === aboutPoster) {
      // The poster is drawn with the text; on its own (text deleted) it is drawn alone.
      if (s === aboutText || !aboutText)
        out.push(
          <SectionFrame key={s.id} data={s.data}>
            <AboutSection text={aboutText ?? null} poster={aboutPoster ?? null} />
          </SectionFrame>,
        );
      if (inserts[i]) out.push(<div key={`ins-${i}`}>{inserts[i]}</div>);
      continue;
    }
    if (s === contactDetails || s === contactMap) {
      if (inserts[i]) out.push(<div key={`ins-${i}`}>{inserts[i]}</div>);
      continue;
    }
    if (s === form) {
      out.push(
        <SectionFrame key={s.id} data={s.data}>
          <ContactSection form={s} details={contactDetails} map={contactMap} />
        </SectionFrame>,
      );
      if (inserts[i]) out.push(<div key={`ins-${i}`}>{inserts[i]}</div>);
      continue;
    }
    // An image directly followed by text is shown side by side, as on the old About page.
    if (s.type === "image" && next?.type === "rich_text" && next !== aboutText && s.items[0]?.media) {
      out.push(
        <SectionFrame key={s.id} data={s.data}>
          <ImageWithText image={s} text={next} />
        </SectionFrame>,
      );
      if (inserts[i]) out.push(<div key={`ins-${i}`}>{inserts[i]}</div>);
      i++;
      if (inserts[i]) out.push(<div key={`ins-${i}`}>{inserts[i]}</div>);
      continue;
    }
    out.push(
      <SectionFrame key={s.id} data={s.data}>
        <Section section={s} pageTitle={pageTitle} />
      </SectionFrame>,
    );
    if (inserts[i]) out.push(<div key={`ins-${i}`}>{inserts[i]}</div>);
  }
  return <>{out}</>;
}

/** Homepage "About" block: heading, text and a button on the left, a poster card on the right, on soft lavender waves. */
function AboutSection({ text, poster }: { text: LayoutSection | null; poster: LayoutSection | null }) {
  const item = poster?.items.find((i) => i.media) ?? null;
  const media = item ? layoutMedia(item.media, item.altText) : null;
  const heading = String(text?.data.heading ?? text?.title ?? "");
  const html = String(text?.data.html ?? "");
  const buttonLabel = String(text?.data.buttonLabel ?? "");
  const buttonUrl = String(text?.data.buttonUrl ?? "");
  const external = /^https?:/.test(buttonUrl);
  if (!heading && !html && !media) return null;
  return (
    <section className="relative isolate overflow-hidden bg-white py-12 sm:py-16 lg:py-20">
      <svg aria-hidden className="pointer-events-none absolute inset-0 -z-10 h-full w-full" viewBox="0 0 1440 640" preserveAspectRatio="none">
        <path className="wave-drift" d="M980 -20C1060 120 1240 150 1500 60V-20Z" fill="#eaf5fd" />
        <path className="wave-drift" d="M-60 470C230 400 430 600 760 560S1190 440 1500 520V660H-60Z" fill="#e3f1fc" />
        <path className="wave-drift-b" d="M-60 540C260 480 470 640 800 610S1200 520 1500 590V660H-60Z" fill="#d6eafa" opacity="0.7" />
      </svg>
      <LightboxScope>
        <Container className={`grid items-center gap-10 lg:gap-14 ${media && (heading || html) ? "lg:grid-cols-[1.2fr_0.8fr]" : ""}`}>
          {heading || html ? (
            <div className="reveal-group">
              <div className="mb-5">
                <span aria-hidden className="reveal-line block h-1 w-24 origin-left rounded-full bg-brand-600" />
              </div>
              {heading ? (
                <h2 lang={langOf(heading)} className="text-3xl font-extrabold leading-[1.15] tracking-tight text-brand-600 sm:text-4xl lg:text-[3.25rem] [&:lang(ml)]:text-2xl [&:lang(ml)]:font-bold [&:lang(ml)]:leading-snug [&:lang(ml)]:tracking-normal sm:[&:lang(ml)]:text-3xl lg:[&:lang(ml)]:text-[2.5rem]">
                  {heading}
                </h2>
              ) : null}
              {html ? <RichText html={html} className="mt-6 text-[1.0625rem] leading-8 text-slate-800 sm:text-lg [&_p]:mb-5" /> : null}
              {buttonLabel && buttonUrl ? (
                <a
                  href={buttonUrl}
                  className="btn-fx shine group mt-3 inline-flex items-center gap-3 rounded-full bg-brand-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-700/30 transition hover:bg-brand-700"
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {buttonLabel}
                  <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                </a>
              ) : null}
            </div>
          ) : null}
          {media && item ? (
            <div className="reveal-right mx-auto w-full max-w-md lg:max-w-none">
              <Linked item={item} className="lit block rounded-[1.75rem] bg-white p-1.5 shadow-2xl shadow-brand-700/25 ring-1 ring-brand-100 transition duration-500 ease-(--ease-soft) hover:-translate-y-1.5 hover:rotate-1 hover:shadow-brand-700/35 lg:ml-auto lg:max-w-md">
                <Img media={media} className="reveal-img h-auto w-full rounded-[1.4rem]" />
              </Linked>
            </div>
          ) : null}
        </Container>
      </LightboxScope>
    </section>
  );
}

/** An image followed by text (the About Us page): the picture is a wide banner across the top, the text sits in a card under it. */
function ImageWithText({ image, text }: { image: LayoutSection; text: LayoutSection }) {
  const item = image.items[0];
  return (
    <section className="bg-paper py-8 sm:py-12 lg:py-14">
      {/* Unlinked photos (here and in the text) open full size in the lightbox. */}
      <LightboxScope>
        <Container className="max-w-6xl space-y-6 sm:space-y-8">
          <Linked item={item} className="lit reveal group block overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-line">
            <Img media={layoutMedia(item.media, item.altText)} className="zoom-media reveal-img h-auto w-full" />
          </Linked>
          <article className="reveal relative overflow-hidden rounded-3xl bg-white px-5 pb-8 pt-9 shadow-lift ring-1 ring-line sm:px-10 sm:pb-12 sm:pt-12 lg:px-14">
            <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-600 via-brand-400 to-accent-500" />
            <RichText
              html={String(text.data.html ?? "")}
              className="mx-auto max-w-4xl [&>h2:first-child]:border-b [&>h2:first-child]:border-line [&>h2:first-child]:pb-4 [&>h2:first-child]:text-[1.375rem] sm:[&>h2:first-child]:text-[1.75rem]"
            />
          </article>
        </Container>
      </LightboxScope>
    </section>
  );
}

/** A standalone poster on a light panel with a diagonal brand band, rings and red corner brackets. */
function PosterSpotlight({ item }: { item: LayoutItem }) {
  const media = layoutMedia(item.media, item.altText);
  if (!media) return null;
  const bracket = "pointer-events-none absolute h-8 w-8 border-accent-600 transition-all duration-500 group-hover/poster:h-12 group-hover/poster:w-12";
  return (
    <div className="reveal relative isolate overflow-hidden rounded-3xl bg-paper px-5 py-8 ring-1 ring-line sm:px-10 sm:py-10 lg:py-12">
      <div aria-hidden className="absolute inset-x-[-10%] top-1/2 -z-10 h-[45%] -translate-y-1/2 -skew-y-6 bg-gradient-to-r from-brand-800 via-brand-600 to-brand-800" />
      <div aria-hidden className="absolute inset-x-[-10%] top-1/2 -z-10 mt-[12%] h-2 -skew-y-6 bg-accent-600" />
      <div aria-hidden className="absolute left-1/2 top-1/2 -z-10 h-[26rem] w-[26rem] -translate-x-1/2 lg:h-[33rem] lg:w-[33rem] -translate-y-1/2 rounded-full border border-brand-200" />
      <div aria-hidden className="absolute left-1/2 top-1/2 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 lg:h-[43rem] lg:w-[43rem] -translate-y-1/2 rounded-full border border-dashed border-brand-200" />

      <div className="group/poster relative mx-auto w-full max-w-[16rem] sm:max-w-xs lg:max-w-sm">
        <span aria-hidden className={`${bracket} -left-3 -top-3 rounded-tl-xl border-l-[3px] border-t-[3px]`} />
        <span aria-hidden className={`${bracket} -right-3 -top-3 rounded-tr-xl border-r-[3px] border-t-[3px]`} />
        <span aria-hidden className={`${bracket} -bottom-3 -left-3 rounded-bl-xl border-b-[3px] border-l-[3px]`} />
        <span aria-hidden className={`${bracket} -bottom-3 -right-3 rounded-br-xl border-b-[3px] border-r-[3px]`} />
        <Linked item={item} className="lit relative block overflow-hidden rounded-lg bg-white shadow-xl shadow-brand-900/30 ring-[3px] ring-white">
          <Img media={media} className="reveal-img h-auto w-full transition duration-700 group-hover/poster:scale-[1.03]" />
        </Linked>
      </div>
    </div>
  );
}

function Section({ section: s, pageTitle }: { section: LayoutSection; pageTitle?: string }) {
  // The admin can switch a heading off (data.showTitle === false) on blocks that show one.
  const title = readShowTitle(s.data) ? (s.title ?? DEFAULT_TITLES[s.type]) : undefined;
  switch (s.type) {
    case "hero_carousel": {
      const slides = s.items
        .map((i) => ({ i, m: layoutMedia(i.media, i.altText) }))
        .filter((x) => x.m)
        .map(({ i, m }) => ({ url: m!.url, alt: m!.alt, width: m!.width, height: m!.height, href: itemLink(i) }));
      return <HeroCarousel slides={slides} intervalMs={Number(s.data.intervalMs) || 5000} />;
    }
    case "image_banner":
      return (
        <section className="py-6 sm:py-9">
          <Container>
            {s.items.map((i) => (
              <Linked key={i.id} item={i} className="lit reveal group block overflow-hidden rounded-2xl shadow-md shadow-brand-900/10 ring-1 ring-line transition hover:shadow-xl">
                <Img media={layoutMedia(i.media, i.altText)} className="reveal-img h-auto w-full transition duration-500 group-hover:scale-[1.01]" />
              </Linked>
            ))}
          </Container>
        </section>
      );
    case "image":
      return (
        <section className="py-8 sm:py-10">
          <LightboxScope>
            <Container className="space-y-6">
              {s.items.map((i) => (
                <PosterSpotlight key={i.id} item={i} />
              ))}
            </Container>
          </LightboxScope>
        </section>
      );
    case "rich_text":
      return (
        <section className="py-8 sm:py-10">
          <LightboxScope>
            <Container className="max-w-4xl">
              <RichText html={String(s.data.html ?? "")} className="reveal-group" />
            </Container>
          </LightboxScope>
        </section>
      );
    case "poster_slider":
      return (
        <section className="bg-paper py-10 sm:py-12 lg:py-14">
          <Container>
            {title && <SectionHeading eyebrow="Highlights" title={title} />}
            {/* Tapping a poster without a page link opens it full size in the lightbox. */}
            <LightboxScope className="reveal">
              <PosterMarquee label={title ?? "Highlights"}>
                {s.items.map((i) => (
                  // Spacing is padding, not gap, so each copy of the row is exactly one loop wide.
                  <div key={i.id} className="shrink-0 pr-3.5 sm:pr-4 lg:pr-5">
                    {/* Hover grows the whole card (not the image inside its frame); PosterMarquee leaves room for it. */}
                    <Linked item={i} className="lit relative block w-48 cursor-pointer overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-line transition duration-300 ease-(--ease-soft) hover:z-10 hover:scale-[1.06] hover:shadow-lift motion-reduce:hover:scale-100 sm:w-56 lg:w-64 2xl:w-72 [&_img]:cursor-pointer!">
                      <Img media={layoutMedia(i.media, i.altText)} className="skeleton aspect-[4/5] h-auto w-full object-cover" />
                    </Linked>
                  </div>
                ))}
              </PosterMarquee>
            </LightboxScope>
          </Container>
        </section>
      );
    case "featured_video":
      return <ChannelVideos featuredId={String(s.data.youtubeId ?? "")} title={title ?? "Watch"} items={s.items} maxCards={Number(s.data.maxCards) || 6} showLatest={s.data.showLatest !== false} />;
    case "logo_carousel": {
      const logos = s.items.map((i) => ({ i, m: layoutMedia(i.media, i.altText) })).filter((x) => x.m);
      if (!logos.length) return null;
      // One loop is a row of at least 24 logos, wider than any screen. The track holds two loops and
      // slides exactly one, and spacing is padding (not gap), so the end meets the start with no break.
      const loop = Array.from({ length: Math.ceil(24 / logos.length) }, () => logos).flat();
      return (
        <section className="py-9 sm:py-12">
          {title ? (
            <Container>
              <p className="reveal mb-5 flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted sm:mb-7 sm:text-sm">
                <span aria-hidden className="reveal-line h-0.5 w-8 origin-right rounded-full bg-accent-600" />
                {title}
                <span aria-hidden className="reveal-line h-0.5 w-8 origin-left rounded-full bg-accent-600" />
              </p>
            </Container>
          ) : null}
          <div className="reveal group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="flex w-max animate-[marquee_60s_linear_infinite] group-hover:[animation-play-state:paused]" style={{ animationDuration: `${Math.round(loop.length * 2.6)}s` }}>
              {[0, 1].map((n) => (
                <div key={n} className="flex shrink-0" aria-hidden={n === 1 || undefined}>
                  {loop.map(({ i, m }, k) => (
                    <div key={`${i.id}-${k}`} className="lit flex h-16 w-32 shrink-0 items-center justify-center rounded-xl px-4 lg:h-20 lg:w-44 lg:px-6" aria-hidden={k >= logos.length || undefined}>
                      <img
                        src={m!.url}
                        alt={n === 0 && k < logos.length ? m!.alt : ""}
                        className="max-h-14 w-auto max-w-full object-contain transition duration-300 ease-(--ease-soft) hover:scale-110 hover:opacity-80 hover:grayscale lg:max-h-16"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }
    case "instagram_feed":
      return <InstagramFeed section={s} />;
    case "embed": {
      const src = String(s.data.src ?? "");
      if (!/^https:\/\//.test(src)) return null;
      return (
        <section className="py-8">
          <Container>
            <div className="mb-3 flex justify-end">
              <a href={src} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Open in a new tab ↗
              </a>
            </div>
            <iframe src={src} title={String(s.data.title ?? pageTitle ?? "Embedded content")} className="reveal h-[75vh] w-full rounded-2xl border border-line shadow-md" allowFullScreen loading="lazy" />
          </Container>
        </section>
      );
    }
    case "map": {
      const src = String(s.data.embedUrl ?? "");
      if (!src.startsWith("https://www.google.com/maps/embed?")) return null;
      return (
        <section className="pb-10">
          <Container>
            <iframe src={src} title={String(s.data.title ?? "Office location map")} className="reveal h-64 w-full rounded-2xl border border-line shadow-md sm:h-80" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </Container>
        </section>
      );
    }
    case "contact_form":
      return <ContactSection form={s} />;
    case "cta":
      return (
        <section className="py-10 sm:py-12">
          <Container>
            <div className="reveal rounded-3xl bg-brand-600 p-7 text-center text-white sm:p-10">
              {title && <h2 className="font-display text-xl font-bold sm:text-2xl lg:text-[1.75rem]">{title}</h2>}
              {s.items.map((i) => (
                <Linked key={i.id} item={i} className="btn-fx mt-4 inline-block rounded-full bg-white px-6 py-2.5 text-[0.9375rem] font-semibold text-brand-700 hover:bg-brand-50">
                  {i.linkLabel ?? i.heading ?? "Learn more"}
                </Linked>
              ))}
            </div>
          </Container>
        </section>
      );
    default:
      return null;
  }
}
