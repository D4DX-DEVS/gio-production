import type { ReactNode } from "react";
import { BG_COLORS, isDefaultStyle, readIntro, readStyle } from "@/lib/section-style";
import { Container } from "./ui";

// Light text for the dark backgrounds. Cards (article) keep their own colours.
const DARK_TEXT =
  "text-white [&_:is(h1,h2,h3,h4,p,li,.text-muted):not(article_*)]:text-white [&_.prose-gio]:text-white [&_.prose-gio_:is(h2,h3,h4,a)]:text-white";
// Sections that paint their own light background step aside so the chosen colour shows.
const CLEAR_LIGHT = "[&>section.bg-white]:bg-transparent! [&>section.bg-paper]:bg-transparent!";

/**
 * Wraps one homepage section in the look its editor chose: background, extra space, an intro line and
 * which screens show it (data.style, data.intro). With nothing chosen it adds no markup at all.
 */
export function SectionFrame({ data, children }: { data: Record<string, unknown>; children: ReactNode }) {
  const style = readStyle(data);
  const intro = readIntro(data);
  if (isDefaultStyle(style) && !intro) return <>{children}</>;

  const c = style.bg === "default" ? null : BG_COLORS[style.bg];
  const device = style.device === "desktop" ? "max-md:hidden" : style.device === "phone" ? "md:hidden" : "";
  const space = style.space === "roomy" ? "py-6 sm:py-8" : style.space === "roomier" ? "py-12 sm:py-16" : "";
  const tone = c ? `${CLEAR_LIGHT} ${c.dark ? DARK_TEXT : ""}` : "";
  return (
    <div className={`${device} ${space} ${tone}`.replace(/\s+/g, " ").trim() || undefined} style={c ? { backgroundColor: c.bg, color: c.fg } : undefined}>
      {intro ? (
        <Container>
          <p className="mx-auto max-w-3xl pt-6 text-center text-lg font-medium leading-relaxed sm:pt-8">{intro}</p>
        </Container>
      ) : null}
      {children}
    </div>
  );
}
