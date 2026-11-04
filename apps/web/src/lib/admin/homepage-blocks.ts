// Shapes shared by the home page builder (client) and its server actions. Nothing here touches the database.
import type { SectionBg, SectionDevice, SectionSpace } from "@/lib/section-style";

export type BlockKind = "slides" | "wide_banner" | "about" | "instagram" | "posters" | "videos" | "logos" | "news" | "text" | "other";

/** One row of the builder. The About block is two database sections (text + poster) drawn as one. */
export interface BuilderBlock {
  /** `s<firstSectionId>`, or "news" for the latest-news block while it has no database row yet. */
  key: string;
  ids: number[];
  kind: BlockKind;
  name: string;
  /** Short facts under the name: "7 slides", "Cards · 6 logos". */
  meta: string;
  /** The heading stored in sections.title (only blocks whose website heading comes from it). */
  title: string;
  canTitle: boolean;
  /** Blocks whose heading can be switched off with data.showTitle. */
  canHideTitle: boolean;
  showTitle: boolean;
  intro: string;
  visible: boolean;
  bg: SectionBg;
  space: SectionSpace;
  device: SectionDevice;
  /** Slide time in seconds (slideshow only). */
  intervalSeconds: number | null;
  /** Videos block only. */
  maxCards: number | null;
  showLatest: boolean | null;
  editHref: string | null;
  editLabel: string;
  /** The website always draws this block last ("Our initiatives"), wherever it sits in the draft. */
  pinnedLast: boolean;
  /** Not in the database yet; saved the first time it is moved or changed. */
  virtual: boolean;
}

export interface BuilderState {
  homeId: number;
  blocks: BuilderBlock[];
}

export interface BuilderResult {
  ok: boolean;
  message: string;
  state?: BuilderState;
  /** Key of the block the call created or touched, so the screen can select it. */
  key?: string;
}

export const NEWS_KEY = "news";
