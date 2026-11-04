/* eslint-disable @next/next/no-img-element -- Instagram CDN pictures, no transformation service */
// Homepage Instagram block, filled from the club's own Instagram page so it updates by itself.
//   - With INSTAGRAM_ACCESS_TOKEN set (Instagram API with Instagram Login), the newest posts and the
//     profile (name, picture, followers, post count) are fetched on the server (cached for 30
//     minutes) and drawn as our own grid.
//   - Without it, Instagram's official profile embed is shown in the grid's place, which always lists
//     the newest posts. Its own profile header is scrolled out of view (the card on the left shows
//     the profile instead); only the picture grid is visible.
import type { LayoutSection } from "@gio/db/layout";
import { getEnv } from "@/lib/db";
import { ArrowRight, SocialIcon } from "./Icons";
import { Container } from "./ui";

interface IgPost {
  id: string;
  permalink: string;
  imageUrl: string;
  caption: string;
  kind: "image" | "video" | "album";
}

interface IgProfile {
  name: string | null;
  avatar: string | null;
  followers: number | null;
  posts: number | null;
}

/** Height of the profile header at the top of Instagram's embed (px), cropped off in the embed layout. */
const EMBED_HEADER = 165;

/** `@name`, a profile link or a bare name all give the account name. */
function instagramHandle(data: Record<string, unknown>): string {
  const fromUrl = String(data.profileUrl ?? "").match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1];
  return (fromUrl ?? String(data.handle ?? "")).replace(/^@/, "").trim() || "gio_keralam";
}

async function fetchPosts(token: string, count: number): Promise<IgPost[]> {
  const fields = "id,caption,media_type,media_url,thumbnail_url,permalink";
  try {
    const res = await fetch(`https://graph.instagram.com/me/media?fields=${fields}&limit=${count}&access_token=${encodeURIComponent(token)}`, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { id: string; caption?: string; media_type?: string; media_url?: string; thumbnail_url?: string; permalink?: string }[] };
    return (json.data ?? [])
      .map((p): IgPost => ({
        id: p.id,
        permalink: p.permalink ?? "",
        imageUrl: (p.media_type === "VIDEO" ? p.thumbnail_url : p.media_url) ?? "",
        caption: p.caption ?? "",
        kind: p.media_type === "VIDEO" ? "video" : p.media_type === "CAROUSEL_ALBUM" ? "album" : "image",
      }))
      .filter((p) => p.permalink && p.imageUrl);
  } catch {
    return [];
  }
}

async function fetchProfile(token: string): Promise<IgProfile | null> {
  try {
    const res = await fetch(`https://graph.instagram.com/me?fields=name,username,profile_picture_url,followers_count,media_count&access_token=${encodeURIComponent(token)}`, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const j = (await res.json()) as { name?: string; username?: string; profile_picture_url?: string; followers_count?: number; media_count?: number };
    return { name: j.name || j.username || null, avatar: j.profile_picture_url ?? null, followers: j.followers_count ?? null, posts: j.media_count ?? null };
  } catch {
    return null;
  }
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en");

/** The heading, with the word "Instagram" underlined by a hand-drawn yellow stroke that draws itself in. */
function Title({ text }: { text: string }) {
  const m = text.match(/^(.*?)(instagram)(.*)$/i);
  if (!m) return <>{text}</>;
  return (
    <>
      {m[1]}
      <span className="relative inline-block">
        {m[2]}
        <svg aria-hidden viewBox="0 0 200 12" className="absolute -bottom-2 left-0 w-full overflow-visible">
          <path className="reveal-draw" pathLength={1} d="M3 8.5C45 2.5 120 2 197 7" fill="none" stroke="#f6b100" strokeWidth="5" strokeLinecap="round" style={{ strokeDasharray: 1 }} />
        </svg>
      </span>
      {m[3]}
    </>
  );
}

function PostBadge({ kind }: { kind: IgPost["kind"] }) {
  if (kind === "image") return null;
  return (
    <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-md bg-white/85 text-brand-900 shadow-sm backdrop-blur-sm">
      {kind === "video" ? (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-label="Video">
          <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-label="Several pictures">
          <rect x="8" y="8" width="12" height="12" rx="2.5" />
          <path d="M16 4.5H7A2.5 2.5 0 0 0 4.5 7v9" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

export async function InstagramFeed({ section }: { section: LayoutSection }) {
  const handle = instagramHandle(section.data);
  const profileUrl = `https://www.instagram.com/${handle}/`;
  // The grid is four across, so whole rows only.
  const count = Math.min(12, Math.ceil(Math.max(4, Number(section.data.count) || 8) / 4) * 4);
  const token = (getEnv() as unknown as Record<string, string | undefined>).INSTAGRAM_ACCESS_TOKEN;
  const [posts, profile] = token ? await Promise.all([fetchPosts(token, count), fetchProfile(token)]) : [[] as IgPost[], null];
  const title = section.title ?? "Follow us on Instagram";
  const name = profile?.name ?? handle.replace(/[._]+/g, " ").toUpperCase();
  const stats = [profile?.followers != null ? `${compact.format(profile.followers)} followers` : null, profile?.posts != null ? `${full.format(profile.posts)} posts` : null].filter(Boolean);

  return (
    <section className="relative isolate overflow-hidden bg-white py-12 sm:py-16 lg:py-20">
      <svg aria-hidden className="pointer-events-none absolute inset-0 -z-10 h-full w-full" viewBox="0 0 1440 700" preserveAspectRatio="none">
        <path className="wave-drift" d="M1000 -20C1090 140 1280 200 1500 90V-20Z" fill="#e8f4fd" />
        <path className="wave-drift-b" d="M-60 560C240 480 460 700 820 640S1240 520 1500 600V720H-60Z" fill="#dbeefb" />
      </svg>
      <Container>
        <div className="reveal mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-3 text-sm font-bold uppercase tracking-[0.3em] text-accent-600">
            <span aria-hidden className="reveal-line h-0.5 w-8 origin-right rounded-full bg-accent-600" />
            Instagram
            <span aria-hidden className="reveal-line h-0.5 w-8 origin-left rounded-full bg-accent-600" />
          </p>
          <h2 className="mt-3 font-display text-[1.875rem] font-extrabold leading-tight tracking-tight text-brand-900 sm:text-4xl lg:text-[2.75rem]">
            <Title text={title} />
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">Moments, campaigns and programmes straight from our Instagram page. This block updates by itself whenever GIO posts something new.</p>
        </div>

        <div className="mx-auto mt-9 rounded-[2rem] bg-white p-5 shadow-[0_30px_80px_-34px_rgb(11_41_68/0.35)] ring-1 ring-line/70 sm:p-7 lg:mt-12 lg:p-9">
          <div className="grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.6fr)] lg:gap-10">
            <div className="reveal-left">
              <div className="flex items-start gap-4">
                <span className="ig-ring relative block h-[4.5rem] w-[4.5rem] shrink-0 sm:h-24 sm:w-24">
                  <span className="absolute inset-[3px] rounded-full bg-white p-[3px]">
                    <img src={profile?.avatar ?? "/icon.png"} alt="" className="h-full w-full rounded-full bg-white object-cover" />
                  </span>
                </span>
                <div className="min-w-0 flex-1 pt-1.5">
                  <p className="truncate text-xl font-bold text-brand-900 sm:text-2xl">{handle}</p>
                  <p className="mt-0.5 truncate text-[0.9375rem] font-medium uppercase tracking-wide text-muted">{name}</p>
                  {stats.length ? <p className="mt-1.5 text-sm text-muted">{stats.join(" · ")}</p> : null}
                </div>
                <span className="soft-pulse grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-md shadow-[#dd2a7b]/30">
                  <SocialIcon name="instagram" className="h-6 w-6" />
                </span>
              </div>
              <hr className="my-6 border-line" />
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-fx shine group inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-accent-500 to-brand-600 px-7 py-4 text-base font-semibold text-white shadow-lg shadow-brand-600/30 sm:w-auto"
              >
                <SocialIcon name="instagram" className="h-6 w-6" />
                Follow @{handle}
                <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
              </a>
            </div>

            {posts.length ? (
              <ul className="reveal-group grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                {posts.map((p) => (
                  <li key={p.id}>
                    <a
                      href={p.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={p.caption ? `Instagram post: ${p.caption.slice(0, 100)}` : "Open this post on Instagram"}
                      className="lit group relative block aspect-square overflow-hidden rounded-xl bg-brand-50 ring-1 ring-line transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:rounded-2xl"
                    >
                      <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 ease-(--ease-soft) group-hover:scale-110" />
                      <span className="absolute inset-0 grid place-items-center bg-gradient-to-t from-brand-900/55 via-brand-900/15 to-transparent text-white opacity-0 transition duration-300 group-hover:opacity-100">
                        <SocialIcon name="instagram" className="h-7 w-7 scale-75 transition duration-300 group-hover:scale-100" />
                      </span>
                      <PostBadge kind={p.kind} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="reveal-right @container">
                {/* The shimmer shows until Instagram's page has loaded and paints over it. */}
                <div className="skeleton h-[66.7cqw] overflow-hidden rounded-2xl">
                  <iframe
                    src={`${profileUrl}embed/`}
                    title={`Latest Instagram posts from @${handle}`}
                    loading="lazy"
                    scrolling="no"
                    style={{ marginTop: -EMBED_HEADER, height: `calc(66.7cqw + ${EMBED_HEADER}px)` }}
                    className="block w-full border-0"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
