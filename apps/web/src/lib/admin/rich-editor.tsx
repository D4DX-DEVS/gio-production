"use client";
// The text editor for every text box in the admin (news stories, events, page sections, the home page About block).
// You write on a page that looks like the website, with buttons for formatting, links, pictures, videos, tables and
// buttons. It edits the HTML directly, so text imported from the old site keeps every tag it had. An "HTML" button
// shows the raw code for the rare case that needs it. The server cleans the HTML again on save (lib/sanitize.ts).
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { EMBED_ALLOW, youtubeId } from "@/lib/youtube";
import { AdminIcon, type AdminIconName } from "./icons";
import { MediaDialog } from "./media-dialog";

type Dialog = "link" | "image" | "video" | "table" | "button" | null;

interface Fmt {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  ul: boolean;
  ol: boolean;
  block: "p" | "h2" | "h3" | "quote" | "other";
  align: "left" | "center" | "right";
  inTable: boolean;
}
const NO_FMT: Fmt = { bold: false, italic: false, underline: false, strike: false, ul: false, ol: false, block: "p", align: "left", inTable: false };

const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "BLOCKQUOTE", "TD", "TH", "DIV"]);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A web address, a site path, mailto: or tel:. A bare "example.org" gets https://. Null when it is none of those. */
function cleanUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return `https://${v}`;
  return null;
}

/** Embed address for a YouTube or Vimeo link, else null. */
function embedUrl(raw: string): string | null {
  const yt = youtubeId(raw.trim());
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}`;
  const vimeo = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/i)?.[1];
  return vimeo ? `https://player.vimeo.com/video/${vimeo}` : null;
}

const PASTE_TAGS = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "S", "STRIKE", "H2", "H3", "H4", "UL", "OL", "LI", "A", "BLOCKQUOTE", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "IMG", "HR"]);
const PASTE_DROP = new Set(["SCRIPT", "STYLE", "META", "LINK", "TITLE", "HEAD", "IFRAME", "OBJECT", "NOSCRIPT"]);

/** Pasted text keeps its structure (headings, lists, links, tables, bold) but not fonts, colours or page styles. */
function cleanPasted(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return esc(node.textContent ?? "").replace(/ /g, " ");
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const tag = el.tagName;
    if (PASTE_DROP.has(tag)) return "";
    const inner = Array.from(el.childNodes).map(walk).join("");
    // Google Docs wraps everything in <b style="font-weight:normal">.
    if (tag === "B" && /font-weight:\s*(normal|400)/i.test(el.getAttribute("style") ?? "")) return inner;
    if (tag === "H1") return `<h2>${inner}</h2>`;
    if (!PASTE_TAGS.has(tag)) return inner;
    const t = tag.toLowerCase();
    if (tag === "BR" || tag === "HR") return `<${t}>`;
    if (tag === "A") {
      const href = cleanUrl(el.getAttribute("href") ?? "");
      return href ? `<a href="${esc(href)}">${inner}</a>` : inner;
    }
    if (tag === "IMG") {
      const src = el.getAttribute("src") ?? "";
      return /^(https?:\/\/|\/)/i.test(src) ? `<img src="${esc(src)}" alt="${esc(el.getAttribute("alt") ?? "")}">` : "";
    }
    if (tag === "TD" || tag === "TH") {
      const span = ["colspan", "rowspan"].map((a) => (el.getAttribute(a) ? ` ${a}="${esc(el.getAttribute(a)!)}"` : "")).join("");
      return `<${t}${span}>${inner}</${t}>`;
    }
    return `<${t}>${inner}</${t}>`;
  };
  return Array.from(doc.body.childNodes).map(walk).join("");
}

function Btn({ label, active, onClick, children, wide = false, disabled = false }: { label: string; active?: boolean; onClick: () => void; children: ReactNode; wide?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the caret and selection in the text while a toolbar button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 ${wide ? "px-2.5" : "min-w-9 px-2"} ${
        active ? "bg-brand-100 text-brand-700" : "text-slate-700 hover:bg-white hover:text-brand-700 hover:shadow-sm"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span aria-hidden className="mx-1 hidden h-6 w-px bg-line sm:block" />;
const icon = (name: AdminIconName) => <AdminIcon name={name} className="h-[17px] w-[17px]" />;

/** A window over the editor. Not a <form>: it sits inside the section's own form, and Enter must not save that. */
function EditorDialog({ title, children, onClose, onDone, doneLabel }: { title: string; children: ReactNode; onClose: () => void; onDone: () => void; doneLabel: string }) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      onDone();
    }
  };
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4" onClick={onClose} onInput={(e) => e.stopPropagation()} onChange={(e) => e.stopPropagation()} onKeyDown={onKey}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-brand-900">{title}</h3>
        <div className="mt-4 space-y-4">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost min-h-11" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary min-h-11 px-5" onClick={onDone}>
            {doneLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, hint, autoFocus, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string; autoFocus?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input type={type} className="field min-h-11" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} autoComplete="off" />
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function RichEditor({ name, defaultValue = "", rows = 14, disabled = false, label = "Text" }: { name: string; defaultValue?: string; rows?: number; disabled?: boolean; label?: string }) {
  const surface = useRef<HTMLDivElement>(null);
  const range = useRef<Range | null>(null);
  // The value the form sends. Kept in state (not written to the field directly) so a re-render can never reset it.
  const [value, setValue] = useState(defaultValue);
  const [mode, setMode] = useState<"visual" | "html">("visual");
  // What the writing area starts with each time it appears (first load, or back from the HTML view).
  const [seed, setSeed] = useState(defaultValue);
  const [source, setSource] = useState(defaultValue);
  const [fmt, setFmt] = useState<Fmt>(NO_FMT);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  // Dialog fields
  const [linkUrl, setLinkUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [tableRows, setTableRows] = useState("3");
  const [tableCols, setTableCols] = useState("3");
  const [tableHead, setTableHead] = useState(true);
  const [btnText, setBtnText] = useState("");
  const [btnUrl, setBtnUrl] = useState("");
  const [btnStyle, setBtnStyle] = useState<"solid" | "outline">("solid");
  const [btnAlign, setBtnAlign] = useState<"ta-left" | "ta-center">("ta-left");

  const heightRem = Math.max(10, rows * 1.5);

  /** Copy the writing area into the field the form sends. Browsers sometimes leave inline styles behind when text is merged; the website ignores them, so they are dropped here. */
  const sync = useCallback(() => {
    const el = surface.current;
    if (!el) return;
    if (el.querySelector("[style]")) el.querySelectorAll("[style]").forEach((n) => n.removeAttribute("style"));
    setValue(el.innerHTML);
  }, []);

  /** Tell the form (and this editor) that the text changed without a keystroke. */
  const changed = useCallback(() => {
    surface.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, []);

  const inEditor = (node: Node | null) => !!node && !!surface.current && surface.current.contains(node);
  const elOf = (node: Node | null) => (node && node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement | null));
  const closestIn = (node: Node | null, selector: string) => {
    const el = elOf(node)?.closest(selector) ?? null;
    return el && surface.current?.contains(el) && el !== surface.current ? (el as HTMLElement) : null;
  };
  const blockOf = (node: Node | null): HTMLElement | null => {
    let el = elOf(node);
    while (el && el !== surface.current) {
      if (BLOCK_TAGS.has(el.tagName)) return el;
      el = el.parentElement;
    }
    return null;
  };

  const refresh = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode || !surface.current?.contains(sel.anchorNode)) return;
    const q = (c: string) => {
      try {
        return document.queryCommandState(c);
      } catch {
        return false;
      }
    };
    const block = blockOf(sel.anchorNode);
    const tag = block?.tagName ?? "P";
    const li = closestIn(sel.anchorNode, "li");
    const cls = (li ?? block)?.className ?? "";
    const next: Fmt = {
      bold: q("bold"),
      italic: q("italic"),
      underline: q("underline"),
      strike: q("strikeThrough"),
      ul: q("insertUnorderedList"),
      ol: q("insertOrderedList"),
      block: closestIn(sel.anchorNode, "blockquote") ? "quote" : tag === "H2" || tag === "H1" ? "h2" : tag === "H3" || tag === "H4" ? "h3" : tag === "P" || tag === "DIV" || tag === "LI" || tag === "TD" || tag === "TH" ? "p" : "other",
      align: cls.includes("ta-center") ? "center" : cls.includes("ta-right") ? "right" : "left",
      inTable: !!closestIn(sel.anchorNode, "td, th"),
    };
    setFmt((cur) => (JSON.stringify(cur) === JSON.stringify(next) ? cur : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode !== "visual") return;
    document.addEventListener("selectionchange", refresh);
    return () => document.removeEventListener("selectionchange", refresh);
  }, [mode, refresh]);

  const saveSelection = () => {
    const sel = window.getSelection();
    range.current = sel && sel.rangeCount && inEditor(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
  };
  const restoreSelection = () => {
    const el = surface.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    if (range.current) {
      sel.removeAllRanges();
      sel.addRange(range.current);
    } else {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  };

  const exec = (cmd: string, value?: string) => {
    surface.current?.focus();
    document.execCommand(cmd, false, value);
    refresh();
  };
  const insertHtml = (html: string) => {
    restoreSelection();
    document.execCommand("insertHTML", false, html);
    refresh();
  };

  /** Pictures, videos, tables and buttons are whole blocks: they go after the paragraph the cursor is in, never inside a heading or a sentence. */
  const insertBlock = (html: string) => {
    const el = surface.current;
    if (!el) return;
    restoreSelection();
    const sel = window.getSelection();
    if (!sel) return;
    let top: Node | null = sel.anchorNode && el.contains(sel.anchorNode) && sel.anchorNode !== el ? sel.anchorNode : null;
    while (top && top.parentNode !== el) top = top.parentNode;
    const r = document.createRange();
    if (top) {
      const empty = top.nodeType === Node.ELEMENT_NODE && !(top as HTMLElement).textContent?.trim() && !(top as HTMLElement).querySelector("img, iframe, table");
      // An empty paragraph is replaced by the new block; otherwise the block goes right after the paragraph.
      if (empty) r.selectNode(top);
      else {
        r.setStartAfter(top);
        r.collapse(true);
      }
    } else {
      r.selectNodeContents(el);
      r.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(r);
    document.execCommand("insertHTML", false, html);
    refresh();
  };

  const setBlock = (tag: "p" | "h2" | "h3" | "blockquote") => {
    // Pressing Quote again, or Normal, turns the block back into a plain paragraph.
    exec("formatBlock", `<${tag === "blockquote" && fmt.block === "quote" ? "p" : tag}>`);
  };

  /** Every block the selection touches (so aligning a few paragraphs aligns all of them). */
  const selectedBlocks = (): HTMLElement[] => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !inEditor(sel.anchorNode)) return [];
    const r = sel.getRangeAt(0);
    const found = new Set<HTMLElement>();
    const start = blockOf(r.startContainer);
    if (start) found.add(start);
    if (!r.collapsed) surface.current?.querySelectorAll<HTMLElement>("p, h1, h2, h3, h4, li, blockquote, td, th").forEach((b) => r.intersectsNode(b) && found.add(b));
    return [...found];
  };
  const align = (cls: "ta-left" | "ta-center" | "ta-right") => {
    surface.current?.focus();
    for (const b of selectedBlocks()) {
      b.classList.remove("ta-left", "ta-center", "ta-right");
      if (cls !== "ta-left") b.classList.add(cls);
      if (!b.getAttribute("class")) b.removeAttribute("class");
    }
    changed();
    refresh();
  };

  // ---- Table tools ------------------------------------------------------------------------------
  const currentCell = () => {
    const sel = window.getSelection();
    return sel && inEditor(sel.anchorNode) ? (closestIn(sel.anchorNode, "td, th") as HTMLTableCellElement | null) : null;
  };
  const focusCell = (cell: Element | null | undefined) => {
    if (!cell) return;
    const r = document.createRange();
    r.selectNodeContents(cell);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  };
  const newCell = (tag: "td" | "th") => {
    const c = document.createElement(tag);
    c.innerHTML = "<br>";
    return c;
  };
  const tableOp = (op: "rowAbove" | "rowBelow" | "colLeft" | "colRight" | "delRow" | "delCol" | "delTable") => {
    const cell = currentCell();
    const table = cell?.closest("table");
    const tr = cell?.parentElement as HTMLTableRowElement | null;
    if (!cell || !table || !tr) return;
    const col = cell.cellIndex;
    let focus: Element | null | undefined = cell;
    if (op === "rowAbove" || op === "rowBelow") {
      const fresh = document.createElement("tr");
      const header = tr.parentElement?.tagName === "THEAD";
      Array.from(tr.cells).forEach(() => fresh.appendChild(newCell(header && op === "rowAbove" ? "th" : "td")));
      if (header && op === "rowBelow") {
        let body = table.tBodies[0];
        if (!body) body = table.appendChild(document.createElement("tbody"));
        body.insertBefore(fresh, body.firstChild);
      } else tr.parentElement?.insertBefore(fresh, op === "rowAbove" ? tr : tr.nextSibling);
      focus = fresh.cells[col];
    } else if (op === "colLeft" || op === "colRight") {
      Array.from(table.rows).forEach((row) => {
        const ref = row.cells[col];
        const made = newCell(ref?.tagName === "TH" ? "th" : "td");
        row.insertBefore(made, op === "colLeft" ? ref : (ref?.nextSibling ?? null));
        if (row === tr) focus = made;
      });
    } else if (op === "delRow") {
      focus = (tr.nextElementSibling ?? tr.previousElementSibling)?.children[col];
      if (table.rows.length <= 1) table.remove();
      else tr.remove();
    } else if (op === "delCol") {
      focus = cell.nextElementSibling ?? cell.previousElementSibling;
      Array.from(table.rows).forEach((row) => row.cells[col]?.remove());
      if (!table.rows[0]?.cells.length) table.remove();
    } else {
      table.remove();
      focus = null;
    }
    changed();
    focusCell(focus);
    refresh();
  };

  // ---- Dialogs ----------------------------------------------------------------------------------
  const open = (d: Exclude<Dialog, null>) => {
    saveSelection();
    setError(null);
    const sel = window.getSelection();
    const selected = sel && !sel.isCollapsed && inEditor(sel.anchorNode) ? sel.toString() : "";
    if (d === "link") setLinkUrl(closestIn(sel?.anchorNode ?? null, "a")?.getAttribute("href") ?? "");
    if (d === "button") {
      const a = closestIn(sel?.anchorNode ?? null, "a.gio-btn");
      setBtnText(a?.textContent ?? selected);
      setBtnUrl(a?.getAttribute("href") ?? "");
    }
    if (d === "video") setVideoUrl("");
    if (d === "image") setError(null);
    setDialog(d);
  };
  const close = () => {
    setDialog(null);
    setError(null);
    surface.current?.focus();
  };

  const doLink = () => {
    const raw = linkUrl.trim();
    restoreSelection();
    if (!raw) {
      document.execCommand("unlink");
      return close();
    }
    const url = cleanUrl(raw);
    if (!url) return setError("Type a web address like https://example.org, or a page on this site like /about-us/.");
    const sel = window.getSelection();
    if (sel && sel.isCollapsed && !closestIn(sel.anchorNode, "a")) document.execCommand("insertHTML", false, `<a href="${esc(url)}">${esc(url)}</a>`);
    else document.execCommand("createLink", false, url);
    setDialog(null);
    refresh();
  };

  const doVideo = () => {
    const src = embedUrl(videoUrl);
    if (!src) return setError("Paste a YouTube or Vimeo video link, for example https://www.youtube.com/watch?v=…");
    insertBlock(`<div class="gio-embed"><iframe src="${src}" title="Video" allow="${EMBED_ALLOW}" allowfullscreen loading="lazy"></iframe></div><p><br></p>`);
    setDialog(null);
  };

  const doTable = () => {
    const r = Math.round(Number(tableRows));
    const c = Math.round(Number(tableCols));
    if (!(r >= 1 && r <= 30) || !(c >= 1 && c <= 8)) return setError("Use 1 to 30 rows and 1 to 8 columns.");
    const cells = (tag: string, text = "<br>") => Array.from({ length: c }, () => `<${tag}>${text}</${tag}>`).join("");
    const head = tableHead ? `<thead><tr>${Array.from({ length: c }, (_, i) => `<th>Heading ${i + 1}</th>`).join("")}</tr></thead>` : "";
    const body = Array.from({ length: tableHead ? r - 1 : r }, () => `<tr>${cells("td")}</tr>`).join("");
    insertBlock(`<table class="gio-table">${head}<tbody>${body}</tbody></table><p><br></p>`);
    setDialog(null);
  };

  const doButton = () => {
    const text = btnText.trim();
    const url = cleanUrl(btnUrl);
    if (!text) return setError("Type the words that go on the button.");
    if (!url) return setError("Type where the button goes: a web address like https://example.org, or a page like /contact-us/.");
    const cls = btnStyle === "outline" ? "gio-btn gio-btn-outline" : "gio-btn";
    insertBlock(`<p${btnAlign === "ta-center" ? ' class="ta-center"' : ""}><a class="${cls}" href="${esc(url)}">${esc(text)}</a></p>`);
    setDialog(null);
  };

  const pickImage = (o: { url: string; alt: string | null }) => {
    insertHtml(`<img src="${esc(o.url)}" alt="${esc(o.alt ?? "")}">`);
    setDialog(null);
  };

  // ---- Typing, pasting, switching views -----------------------------------------------------------
  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    if (html) document.execCommand("insertHTML", false, cleanPasted(html));
    else document.execCommand("insertText", false, text);
  };

  const showHtml = () => {
    setSource(surface.current?.innerHTML ?? source);
    setMode("html");
  };
  const showEditor = () => {
    setSeed(source);
    setValue(source);
    setMode("visual");
  };

  // New lines make paragraphs, not <div>s.
  const onFocus = () => document.execCommand("defaultParagraphSeparator", false, "p");

  return (
    <div className="rounded-[0.6rem] border border-[#cfd8e3] bg-white transition-shadow focus-within:border-brand-500 focus-within:shadow-[0_0_0_3px_rgb(29_78_216/0.2)]">
      <input type="hidden" name={name} value={value} />

      {disabled ? null : (
        <div className="sticky top-16 z-20 rounded-t-[0.6rem] border-b border-line bg-paper" role="toolbar" aria-label="Text tools">
          {mode === "visual" ? (
            <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1.5">
              <Btn label="Undo" onClick={() => exec("undo")}>{icon("undo")}</Btn>
              <Btn label="Redo" onClick={() => exec("redo")}>{icon("redo")}</Btn>
              <Sep />
              <Btn label="Normal text" wide active={fmt.block === "p"} onClick={() => setBlock("p")}>Normal</Btn>
              <Btn label="Heading" wide active={fmt.block === "h2"} onClick={() => setBlock("h2")}>Heading</Btn>
              <Btn label="Smaller heading" wide active={fmt.block === "h3"} onClick={() => setBlock("h3")}>Subheading</Btn>
              <Sep />
              <Btn label="Bold" active={fmt.bold} onClick={() => exec("bold")}><b>B</b></Btn>
              <Btn label="Italic" active={fmt.italic} onClick={() => exec("italic")}><i className="font-serif">I</i></Btn>
              <Btn label="Underline" active={fmt.underline} onClick={() => exec("underline")}><u>U</u></Btn>
              <Btn label="Strikethrough" active={fmt.strike} onClick={() => exec("strikeThrough")}><s>S</s></Btn>
              <Sep />
              <Btn label="Bulleted list" wide active={fmt.ul} onClick={() => exec("insertUnorderedList")}>• List</Btn>
              <Btn label="Numbered list" wide active={fmt.ol} onClick={() => exec("insertOrderedList")}>1. List</Btn>
              <Btn label="Quote" active={fmt.block === "quote"} onClick={() => setBlock("blockquote")}>“ ”</Btn>
              <Sep />
              <Btn label="Align left" active={fmt.align === "left"} onClick={() => align("ta-left")}>{icon("alignLeft")}</Btn>
              <Btn label="Align centre" active={fmt.align === "center"} onClick={() => align("ta-center")}>{icon("alignCenter")}</Btn>
              <Btn label="Align right" active={fmt.align === "right"} onClick={() => align("ta-right")}>{icon("alignRight")}</Btn>
              <Btn label="Clear formatting" onClick={() => exec("removeFormat")}>{icon("eraser")}</Btn>
              <Sep />
              <Btn label="Add a link" wide onClick={() => open("link")}>{icon("link")} Link</Btn>
              <Btn label="Add a picture" wide onClick={() => open("image")}>{icon("image")} Picture</Btn>
              <Btn label="Add a video" wide onClick={() => open("video")}>{icon("video")} Video</Btn>
              <Btn label="Add a table" wide onClick={() => open("table")}>{icon("table")} Table</Btn>
              <Btn label="Add a button" wide onClick={() => open("button")}>{icon("button")} Button</Btn>
              <span className="ml-auto" />
              <Btn label="Show the HTML code" wide onClick={showHtml}>{icon("code")} HTML</Btn>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm text-muted">
              <span>You are editing the HTML code. Most people never need this.</span>
              <Btn label="Back to the editor" wide onClick={showEditor}>← Back to the editor</Btn>
            </div>
          )}
          {mode === "visual" && fmt.inTable ? (
            <div className="flex flex-wrap items-center gap-0.5 border-t border-line bg-brand-50/60 px-1.5 py-1" role="toolbar" aria-label="Table tools">
              <span className="px-2 text-xs font-bold uppercase tracking-wide text-brand-700">Table</span>
              <Btn label="Add a row above" wide onClick={() => tableOp("rowAbove")}>Row above</Btn>
              <Btn label="Add a row below" wide onClick={() => tableOp("rowBelow")}>Row below</Btn>
              <Btn label="Add a column on the left" wide onClick={() => tableOp("colLeft")}>Column left</Btn>
              <Btn label="Add a column on the right" wide onClick={() => tableOp("colRight")}>Column right</Btn>
              <Sep />
              <Btn label="Delete this row" wide onClick={() => tableOp("delRow")}>Delete row</Btn>
              <Btn label="Delete this column" wide onClick={() => tableOp("delCol")}>Delete column</Btn>
              <Btn label="Delete the whole table" wide onClick={() => window.confirm("Delete the whole table?") && tableOp("delTable")}>Delete table</Btn>
            </div>
          ) : null}
        </div>
      )}

      {mode === "visual" ? (
        <div
          ref={surface}
          contentEditable={!disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          spellCheck
          data-placeholder="Start writing here…"
          className="rich-surface prose-gio overflow-x-auto px-4 py-3"
          style={{ minHeight: `${heightRem}rem` }}
          dangerouslySetInnerHTML={{ __html: seed }}
          onInput={sync}
          onBlur={() => {
            sync();
            saveSelection();
          }}
          onFocus={onFocus}
          onPaste={onPaste}
          onDrop={(e) => e.preventDefault()}
        />
      ) : (
        <textarea
          aria-label={`${label} (HTML code)`}
          value={source}
          rows={rows}
          spellCheck={false}
          className="block w-full rounded-b-[0.6rem] border-0 bg-white px-4 py-3 font-mono text-sm leading-relaxed outline-none"
          onChange={(e) => {
            setSource(e.target.value);
            setValue(e.target.value);
          }}
        />
      )}

      {dialog === "link" ? (
        <EditorDialog title="Add a link" onClose={close} onDone={doLink} doneLabel="Save link">
          <TextField label="Where should it go?" value={linkUrl} onChange={setLinkUrl} placeholder="https://example.org or /about-us/" hint="Select some words first, then add the link. Leave this empty and save to remove a link." autoFocus />
          {error ? <p role="alert" className="text-sm font-medium text-danger-700">{error}</p> : null}
        </EditorDialog>
      ) : null}

      {dialog === "video" ? (
        <EditorDialog title="Add a video" onClose={close} onDone={doVideo} doneLabel="Add video">
          <TextField label="YouTube or Vimeo link" value={videoUrl} onChange={setVideoUrl} placeholder="https://www.youtube.com/watch?v=…" hint="The video stays on YouTube or Vimeo; only the link is saved." autoFocus />
          {youtubeId(videoUrl.trim()) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`https://i.ytimg.com/vi/${youtubeId(videoUrl.trim())}/mqdefault.jpg`} alt="" className="aspect-video w-full rounded-lg object-cover" />
          ) : null}
          {error ? <p role="alert" className="text-sm font-medium text-danger-700">{error}</p> : null}
        </EditorDialog>
      ) : null}

      {dialog === "table" ? (
        <EditorDialog title="Add a table" onClose={close} onDone={doTable} doneLabel="Add table">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Rows" type="number" value={tableRows} onChange={setTableRows} autoFocus />
            <TextField label="Columns" type="number" value={tableCols} onChange={setTableCols} />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={tableHead} onChange={(e) => setTableHead(e.target.checked)} /> The first row is a heading row
          </label>
          <p className="text-xs text-muted">After adding it, click inside the table to add or remove rows and columns.</p>
          {error ? <p role="alert" className="text-sm font-medium text-danger-700">{error}</p> : null}
        </EditorDialog>
      ) : null}

      {dialog === "button" ? (
        <EditorDialog title="Add a button" onClose={close} onDone={doButton} doneLabel="Add button">
          <TextField label="Words on the button" value={btnText} onChange={setBtnText} placeholder="Read more" autoFocus />
          <TextField label="Where it goes" value={btnUrl} onChange={setBtnUrl} placeholder="https://example.org or /contact-us/" />
          <div role="group" aria-label="Button style" className="flex gap-2">
            {(["solid", "outline"] as const).map((s) => (
              <button key={s} type="button" aria-pressed={btnStyle === s} onClick={() => setBtnStyle(s)} className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 px-3 text-sm font-semibold ${btnStyle === s ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line text-ink hover:border-brand-200"}`}>
                {s === "solid" ? "Filled" : "Outline"}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Button position" className="flex gap-2">
            {([["ta-left", "On the left"], ["ta-center", "In the middle"]] as const).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={btnAlign === v} onClick={() => setBtnAlign(v)} className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 px-3 text-sm font-semibold ${btnAlign === v ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line text-ink hover:border-brand-200"}`}>
                {l}
              </button>
            ))}
          </div>
          {error ? <p role="alert" className="text-sm font-medium text-danger-700">{error}</p> : null}
        </EditorDialog>
      ) : null}

      <MediaDialog open={dialog === "image"} onClose={close} onPick={pickImage} />
    </div>
  );
}
