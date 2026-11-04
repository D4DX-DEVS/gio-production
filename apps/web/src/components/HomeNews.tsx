import Link from "next/link";
import type { PostCard } from "@/lib/content";
import { formatDate, langOf, postHref, stripHtml } from "@/lib/text";
import { ArrowRight } from "./Icons";
import { Img } from "./Img";
import { Container, EmptyState, SectionHeading } from "./ui";

const categoryName = (p: PostCard) => p.categories[0]?.name.replace(/^gio /i, "GIO ");

function Pill({ post }: { post: PostCard }) {
  const name = categoryName(post);
  if (!name) return null;
  return <span className="absolute left-3 top-3 z-10 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-brand-800 shadow-sm transition duration-300 group-hover:-translate-y-0.5 group-hover:bg-accent-600 group-hover:text-white">{name}</span>;
}

/** Picture frame: the whole picture is shown, never cropped, over a blurred copy of itself that fills any gaps. */
function Thumb({ post, className }: { post: PostCard; className: string }) {
  return (
    <div className={`lit lit-card relative overflow-hidden bg-brand-50 ${post.image ? "skeleton" : ""} ${className}`}>
      {post.image && <Img media={post.image} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-2xl" />}
      <Img media={post.image} alt="" className="reveal-img absolute inset-0 h-full w-full object-contain" fallbackLabel="No image published for this post" />
      <Pill post={post} />
    </div>
  );
}

/** The newest story: a big picture, then date, headline, a few lines and "Read More". */
function LeadCard({ post }: { post: PostCard }) {
  const title = post.title || "Untitled post";
  const excerpt = stripHtml(post.excerpt, 200);
  return (
    <article className="card-lift group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card hover:border-brand-200">
      <Thumb post={post} className="aspect-[4/3] sm:aspect-[16/9] lg:aspect-auto lg:min-h-[20rem] lg:flex-1" />
      <div className="flex shrink-0 flex-col p-5 lg:p-6">
        {post.publishedAt && (
          <time dateTime={post.publishedAt.toISOString()} className="text-xs font-semibold uppercase tracking-wider text-muted">
            {formatDate(post.publishedAt)}
          </time>
        )}
        <h3 lang={langOf(title)} className="mt-2 line-clamp-3 font-display text-xl font-extrabold leading-snug text-brand-900 transition-colors group-hover:text-brand-600 sm:text-2xl">
          <Link href={postHref(post.slug)} className="after:absolute after:inset-0 after:rounded-2xl">
            {title}
          </Link>
        </h3>
        {excerpt && (
          <p lang={langOf(excerpt)} className="mt-2 line-clamp-3 text-[0.9375rem] leading-relaxed text-muted">
            {excerpt}
          </p>
        )}
        <span className="mt-4 inline-flex items-center gap-1.5 text-[0.9375rem] font-bold text-accent-700 transition-colors group-hover:text-accent-600">
          Read More <ArrowRight className="icon-nudge h-4 w-4" />
        </span>
      </div>
    </article>
  );
}

/** One of the four smaller stories: picture, date, headline and an arrow. */
function SmallCard({ post }: { post: PostCard }) {
  const title = post.title || "Untitled post";
  return (
    <article className="card-lift group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card hover:border-brand-200">
      <Thumb post={post} className="aspect-[16/10]" />
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        {post.publishedAt && (
          <time dateTime={post.publishedAt.toISOString()} className="text-xs font-medium text-muted">
            {formatDate(post.publishedAt)}
          </time>
        )}
        <h3 lang={langOf(title)} className="mt-1 line-clamp-3 font-display text-[0.9375rem] font-bold leading-snug text-brand-900 transition-colors group-hover:text-brand-600 sm:text-base">
          <Link href={postHref(post.slug)} className="after:absolute after:inset-0 after:rounded-2xl">
            {title}
          </Link>
        </h3>
        <ArrowRight className="icon-nudge ml-auto mt-auto h-4 w-4 text-muted transition-colors group-hover:text-accent-600" />
      </div>
    </article>
  );
}

/** Homepage "News & Events": the newest story large on the left, the next four in a 2 × 2 grid beside it. */
export function HomeNews({ posts }: { posts: PostCard[] }) {
  const [lead, ...rest] = posts;
  const side = rest.slice(0, 4);
  return (
    <section className="relative isolate overflow-hidden bg-paper py-10 sm:py-14 lg:py-16">
      <div aria-hidden className="float-slow pointer-events-none absolute -left-24 top-10 -z-10 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />
      <div aria-hidden className="float-slow pointer-events-none absolute -right-24 bottom-0 -z-10 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl [animation-direction:alternate-reverse]" />
      <Container>
        <SectionHeading eyebrow="Latest from GIO" title="News & Events" action={{ href: "/news-events/", label: "View All News" }} />
        {lead ? (
          <div className={`grid gap-4 sm:gap-5 ${side.length ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-6" : ""}`}>
            <div className="reveal-left">
              <LeadCard post={lead} />
            </div>
            {side.length ? (
              <div className="reveal-group grid grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                {side.map((p) => (
                  <div key={p.id}>
                    <SmallCard post={p} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState title="No news published yet" />
        )}
      </Container>
    </section>
  );
}
