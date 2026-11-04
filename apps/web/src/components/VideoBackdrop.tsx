/**
 * Decoration behind the homepage video section (ChannelVideos.tsx), on the `.video-band` blue-to-red
 * gradient: film strips along the top and bottom edges, a big outlined play button, a clapperboard, a
 * camera, a row of equalizer bars, a blinking REC light and a few play triangles. Pure SVG and CSS, white
 * at low opacity so it never competes with the cards. Hidden from assistive tech; the larger pieces
 * only show from sm up, where the page leaves room around the cards.
 */

const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** A strip of film: a faint band with a row of sprocket holes. */
function FilmStrip({ id, className }: { id: string; className: string }) {
  return (
    <svg aria-hidden className={`absolute inset-x-0 h-7 w-full text-white ${className}`} height="28">
      <defs>
        <pattern id={id} width="36" height="28" patternUnits="userSpaceOnUse">
          <rect x="10" y="8" width="16" height="12" rx="3" fill="currentColor" fillOpacity="0.2" />
        </pattern>
      </defs>
      <rect width="100%" height="28" fill="currentColor" fillOpacity="0.07" />
      <rect width="100%" height="28" fill={`url(#${id})`} />
    </svg>
  );
}

const Triangle = ({ className }: { className: string }) => (
  <svg aria-hidden viewBox="0 0 24 24" className={`absolute ${className}`} fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

// Equalizer bars: resting heights (px); the CSS animation breathes each one at its own pace.
const BARS = [14, 26, 18, 34, 22, 40, 28, 18, 32, 24, 36, 16];

export function VideoBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden text-white">
      <FilmStrip id="film-holes-top" className="top-0" />
      <FilmStrip id="film-holes-bottom" className="bottom-0" />

      {/* Big outlined play button drifting in the right margin. */}
      <svg viewBox="0 0 100 100" className="float-slow absolute -right-14 top-[18%] hidden h-72 w-72 text-white/[0.13] sm:block lg:h-96 lg:w-96" {...stroke} strokeWidth="1.6">
        <circle cx="50" cy="50" r="46" />
        <circle cx="50" cy="50" r="38" strokeDasharray="2 5" />
        <path d="M41 31v38l30-19z" />
      </svg>

      {/* Clapperboard, tilted, in the left margin. */}
      <svg viewBox="0 0 64 64" className="absolute -left-4 bottom-[14%] hidden h-32 w-32 -rotate-12 text-white/[0.16] sm:block lg:left-[3%] lg:h-32 lg:w-32 2xl:h-40 2xl:w-40" {...stroke} strokeWidth="2">
        <rect x="6" y="27" width="52" height="29" rx="4" />
        <path d="M14 38h22M14 46h14" />
        <g transform="rotate(-10 8 25)">
          <rect x="6" y="12" width="52" height="12" rx="3" />
          <path d="M19 12l-6 12M33 12l-6 12M47 12l-6 12" />
        </g>
      </svg>

      {/* Vintage movie camera, bottom right. */}
      <svg viewBox="0 0 64 64" className="absolute bottom-[10%] right-[3%] hidden h-24 w-24 rotate-6 text-white/[0.17] md:block lg:h-28 lg:w-28" {...stroke} strokeWidth="2">
        <rect x="6" y="20" width="36" height="28" rx="5" />
        <path d="M42 30l16-9v26l-16-9z" />
        <circle cx="17" cy="12" r="6.5" />
        <circle cx="32" cy="12" r="6.5" />
      </svg>

      {/* Equalizer bars beside the heading's row, top centre. */}
      <div className="absolute left-[34%] top-9 hidden h-11 items-end gap-1 text-white/[0.16] xl:flex">
        {BARS.map((h, i) => (
          <span key={i} className="eq-bar w-1 rounded-full bg-current" style={{ height: h, ["--i" as string]: i }} />
        ))}
      </div>

      {/* REC light. */}
      <div className="absolute right-5 top-9 hidden items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-white/35 sm:flex lg:right-8">
        <span className="soft-pulse h-2 w-2 rounded-full bg-danger-500 shadow-[0_0_10px_2px_rgb(224_39_42/0.7)]" />
        Rec
      </div>

      <Triangle className="left-[6%] top-[14%] h-5 w-5 rotate-[-8deg] text-white/[0.12]" />
      <Triangle className="right-[24%] top-[12%] hidden h-4 w-4 rotate-6 text-white/10 sm:block" />
      <Triangle className="bottom-[16%] left-[40%] hidden h-6 w-6 text-white/10 md:block" />
      <Triangle className="bottom-[12%] right-[8%] h-4 w-4 text-white/10 md:hidden" />
    </div>
  );
}
