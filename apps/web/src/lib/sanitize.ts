// HTML allow-list for content written in the admin or imported from WordPress.
import sanitizeHtml from "sanitize-html";

// Classes the admin text editor writes (see lib/admin/rich-editor.tsx). Every other class is dropped.
const ALIGN = ["ta-left", "ta-center", "ta-right"];

const EMBED_HOSTS = ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "player.vimeo.com", "www.google.com", "www.facebook.com", "www.instagram.com"];

export function sanitize(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "figure", "figcaption", "iframe", "h1", "h2", "span", "u", "s", "video", "source"]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel", "title", "class"],
      p: ["class"],
      h1: ["class"],
      h2: ["class"],
      h3: ["class"],
      h4: ["class"],
      li: ["class"],
      blockquote: ["class"],
      div: ["class"],
      table: ["class"],
      img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
      iframe: ["src", "width", "height", "title", "allow", "allowfullscreen", "frameborder", "loading"],
      video: ["src", "controls", "width", "height", "poster"],
      source: ["src", "type"],
      td: ["colspan", "rowspan", "class"],
      th: ["colspan", "rowspan", "class"],
      "*": ["lang", "dir"],
    },
    allowedClasses: {
      a: ["gio-btn", "gio-btn-outline"],
      div: ["gio-embed"],
      table: ["gio-table"],
      p: ALIGN,
      h1: ALIGN,
      h2: ALIGN,
      h3: ALIGN,
      h4: ALIGN,
      li: ALIGN,
      blockquote: ALIGN,
      td: ALIGN,
      th: ALIGN,
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowedIframeHostnames: EMBED_HOSTS,
    transformTags: {
      a: (tagName, attribs) => {
        const external = /^https?:\/\//i.test(attribs.href ?? "") && !/^https?:\/\/(www\.)?giokerala\.org/i.test(attribs.href ?? "");
        return { tagName, attribs: external ? { ...attribs, target: "_blank", rel: "noopener noreferrer" } : attribs };
      },
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy", decoding: "async" } }),
    },
  });
}
