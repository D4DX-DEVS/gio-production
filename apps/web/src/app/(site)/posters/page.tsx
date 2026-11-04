import type { Metadata } from "next";
import { PosterGrid, type PosterTile } from "@/components/PosterGrid";
import { itemLink, layoutMedia } from "@/components/Sections";
import { Container, EmptyState, PageHero } from "@/components/ui";
import { getPageLayout, getPublishedPage } from "@/lib/content";
import { POSTERS_PATH } from "@/lib/posters";

export const metadata: Metadata = {
  title: "Posters",
  description: "Every GIO Kerala poster, newest first.",
  alternates: { canonical: POSTERS_PATH },
};

/** All posters of the homepage's poster row, in the order the admin arranged them (new uploads first). */
async function allPosters(): Promise<PosterTile[]> {
  const home = await getPublishedPage("");
  const layout = home ? await getPageLayout(home.id) : null;
  const tiles: PosterTile[] = [];
  for (const section of layout?.sections ?? []) {
    if (section.type !== "poster_slider") continue;
    for (const item of section.items) {
      const media = layoutMedia(item.media, item.altText);
      if (media) tiles.push({ id: item.id, media, href: itemLink(item), newTab: item.openInNewTab });
    }
  }
  return tiles;
}

export default async function PostersPage() {
  const posters = await allPosters();
  return (
    <>
      <PageHero title="Posters" eyebrow="Highlights" subtitle="Posters from GIO Kerala programmes and campaigns, newest first." crumbs={[{ href: POSTERS_PATH, label: "Posters" }]} />
      <Container className="py-8 sm:py-10">{posters.length ? <PosterGrid posters={posters} /> : <EmptyState title="No posters published yet." />}</Container>
    </>
  );
}
