import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HomeNews } from "@/components/HomeNews";
import { SectionFrame } from "@/components/SectionFrame";
import { Sections } from "@/components/Sections";
import { HomeSkeleton, LoadingRegion } from "@/components/Skeletons";
import { Container, EmptyState } from "@/components/ui";
import { getPageLayout, getPublishedPage, getSiteInfo, latestPosts, type SiteInfo } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("");
  return {
    title: { absolute: page?.seoTitle ?? "GIO Kerala | Girls Islamic Organization" },
    description: page?.seoDescription ?? undefined,
    alternates: { canonical: "/" },
  };
}

// The homepage never 404s, so its content can stream in behind a skeleton of the hero and news grid.
export default function HomePage() {
  return (
    <Suspense
      fallback={
        <LoadingRegion label="Loading the homepage">
          <HomeSkeleton />
        </LoadingRegion>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

/** Page heading for screen readers and search engines; the banner carries the visual identity. */
function HomeHeading({ site }: { site: SiteInfo }) {
  return <h1 className="sr-only">{site.name}: Girls Islamic Organization</h1>;
}

async function HomeContent() {
  const page = await getPublishedPage("");
  const [layout, news, site] = await Promise.all([page ? getPageLayout(page.id) : null, latestPosts(5), getSiteInfo()]);

  const latest = <HomeNews posts={news} />;

  if (!layout) {
    return (
      <>
        <Container className="py-12">
          <EmptyState title="The homepage has not been published yet">
            <Link href="/admin/" className="underline">
              Publish it from the admin
            </Link>
          </EmptyState>
        </Container>
        {latest}
      </>
    );
  }

  // "Our initiatives" (logo carousel) closes the page, wherever it sits in the saved layout.
  // Every other block, the Instagram feed included, follows the order set in the admin.
  const main = { ...layout, sections: layout.sections.filter((s) => s.type !== "logo_carousel") };
  const initiatives = { ...layout, sections: layout.sections.filter((s) => s.type === "logo_carousel") };

  // News & Events sits where the admin put its "latest news" row; with no such row it goes after the introduction text.
  const idx = (t: string) => main.sections.findIndex((s) => s.type === t);
  const inserts: Record<number, React.ReactNode> = {};
  const newsAt = idx("latest_posts");
  if (newsAt >= 0) {
    const newsSection = main.sections[newsAt];
    if (!newsSection.data.hidden) inserts[newsAt] = <SectionFrame data={newsSection.data}>{latest}</SectionFrame>;
  } else {
    const intro = idx("rich_text");
    inserts[intro >= 0 ? intro : 0] = latest;
  }
  // The page heading sits right under the banner carousel (or at the top when there is none).
  const hero = idx("hero_carousel");
  const heading = <HomeHeading site={site} />;
  if (hero >= 0)
    inserts[hero] = (
      <>
        {heading}
        {inserts[hero]}
      </>
    );

  return (
    <>
      {hero < 0 && heading}
      <Sections layout={main} inserts={inserts} />
      <Sections layout={initiatives} />
      <section className="pb-10 pt-2 sm:pb-14">
        <Container>
          <div className="reveal relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-7 text-white shadow-lg sm:px-10 sm:py-9">
            <div aria-hidden className="float-slow pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent-600/30 blur-2xl" />
            <div className="relative flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
              <div>
                <h2 className="font-display text-xl font-bold sm:text-2xl lg:text-[1.75rem]">Connect with GIO Kerala</h2>
                <p className="mt-1.5 max-w-2xl text-[0.9375rem] text-brand-100 sm:text-base">Reach the state office for programmes, membership and media enquiries.</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Link href="/contact-us/" className="btn-fx shine rounded-full bg-accent-600 px-6 py-2.5 text-[0.9375rem] font-semibold hover:bg-accent-700">
                  Contact us
                </Link>
                <Link href="/about-us/" className="btn-fx shine rounded-full bg-white/10 px-6 py-2.5 text-[0.9375rem] font-semibold ring-1 ring-white/30 hover:bg-white/20">
                  About GIO
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
