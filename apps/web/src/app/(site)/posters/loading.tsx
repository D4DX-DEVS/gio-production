import { LoadingRegion, PageHeroSkeleton } from "@/components/Skeletons";
import { Container } from "@/components/ui";

export default function Loading() {
  return (
    <LoadingRegion label="Loading the posters">
      <PageHeroSkeleton subtitle />
      <Container className="py-8 sm:py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:gap-5">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton aspect-[4/5] rounded-xl" />
          ))}
        </div>
      </Container>
    </LoadingRegion>
  );
}
