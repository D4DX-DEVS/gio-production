// Per-section look for the homepage, stored in a section's data JSON as
//   data.style = { bg, space, device }   (what the section looks like and where it shows)
//   data.intro = "…"                     (one short line above the section)
//   data.showTitle = false               (hide the section's own heading)
// Shared by the admin builder and the public site, so both read the same allow-lists.
// A section with none of these renders exactly as before.

export const BG_OPTIONS = ["default", "white", "tint", "blue", "navy", "red"] as const;
export const SPACE_OPTIONS = ["normal", "roomy", "roomier"] as const;
export const DEVICE_OPTIONS = ["all", "desktop", "phone"] as const;

export type SectionBg = (typeof BG_OPTIONS)[number];
export type SectionSpace = (typeof SPACE_OPTIONS)[number];
export type SectionDevice = (typeof DEVICE_OPTIONS)[number];

export interface SectionStyle {
  bg: SectionBg;
  space: SectionSpace;
  device: SectionDevice;
}

export const DEFAULT_STYLE: SectionStyle = { bg: "default", space: "normal", device: "all" };

/** Public-site colours, fixed so they match the admin swatches. `dark` backgrounds get light text. */
export const BG_COLORS: Record<Exclude<SectionBg, "default">, { label: string; bg: string; fg: string; dark: boolean }> = {
  white: { label: "White", bg: "#ffffff", fg: "#0F1A33", dark: false },
  tint: { label: "Blue tint", bg: "#DCE7FB", fg: "#0F1A33", dark: false },
  blue: { label: "Blue", bg: "#1D4ED8", fg: "#ffffff", dark: true },
  navy: { label: "Navy", bg: "#0F1A33", fg: "#ffffff", dark: true },
  red: { label: "Red", bg: "#D7263D", fg: "#ffffff", dark: true },
};

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function readStyle(data: Record<string, unknown>): SectionStyle {
  const raw = typeof data.style === "object" && data.style !== null && !Array.isArray(data.style) ? (data.style as Record<string, unknown>) : {};
  return {
    bg: pick(raw.bg, BG_OPTIONS, "default"),
    space: pick(raw.space, SPACE_OPTIONS, "normal"),
    device: pick(raw.device, DEVICE_OPTIONS, "all"),
  };
}

export function readIntro(data: Record<string, unknown>): string {
  return typeof data.intro === "string" ? data.intro.trim().slice(0, 240) : "";
}

/** False only when the editor has hidden this section's heading. */
export function readShowTitle(data: Record<string, unknown>): boolean {
  return data.showTitle !== false;
}

export function isDefaultStyle(s: SectionStyle): boolean {
  return s.bg === "default" && s.space === "normal" && s.device === "all";
}
