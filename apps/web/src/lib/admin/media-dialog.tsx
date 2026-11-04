"use client";
// The photo library window: search, pick or upload an image. Used by the image field (MediaPicker)
// and by the text editor's "Insert image" button.
import { useEffect, useMemo, useRef, useState } from "react";
import { LIMITS } from "./files";

export interface MediaOption {
  id: number;
  url: string;
  name: string;
  alt: string | null;
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const ACCEPT = { image: IMAGE_TYPES.join(","), pdf: "application/pdf", any: [...IMAGE_TYPES, "application/pdf"].join(",") };

/** Browser-side check before upload (the server checks the bytes again). Null when fine. */
export function fileProblem(f: File, accept: keyof typeof ACCEPT): string | null {
  const isImage = IMAGE_TYPES.includes(f.type);
  const isPdf = f.type === "application/pdf";
  if (accept === "image" && !isImage) return `${f.name}: choose a JPEG, PNG, GIF or WebP image.`;
  if (accept === "pdf" && !isPdf) return `${f.name}: choose a PDF.`;
  if (accept === "any" && !isImage && !isPdf) return `${f.name}: only images (JPEG, PNG, GIF, WebP) and PDFs.`;
  const max = isPdf ? LIMITS.document : LIMITS.image;
  if (f.size > max) return `${f.name} is ${(f.size / 1048576).toFixed(1)} MB; the limit is ${max / 1048576} MB.`;
  return null;
}

/** Pass `options` (from listImageOptions()) or leave it out: the list is then fetched from /admin/media-options/ when the window opens. */
export function MediaDialog({
  open,
  onClose,
  onPick,
  options: given,
  selectedId,
  folder = "images",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (option: MediaOption) => void;
  options?: MediaOption[];
  selectedId?: number | null;
  /** R2 folder for images uploaded from here (images, banners, leaders, logos). */
  folder?: string;
}) {
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(60);
  const [loaded, setLoaded] = useState<MediaOption[] | null>(null);
  const [uploaded, setUploaded] = useState<MediaOption[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const options = useMemo(() => [...uploaded, ...(given ?? loaded ?? []).filter((o) => !uploaded.some((u) => u.id === o.id))], [given, loaded, uploaded]);

  useEffect(() => {
    if (!open || given || loaded) return;
    fetch("/admin/media-options/")
      .then((r) => (r.ok ? (r.json() as Promise<MediaOption[]>) : []))
      .then((x) => setLoaded(x))
      .catch(() => setLoaded([]));
  }, [open, given, loaded]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => o.name.toLowerCase().includes(t) || (o.alt ?? "").toLowerCase().includes(t) || String(o.id) === t) : options;
  }, [q, options]);

  async function upload(f: File) {
    const p = fileProblem(f, "image");
    if (p) return setUploadError(p);
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.set("file", f);
      body.set("kind", "image");
      body.set("folder", folder);
      const res = await fetch("/admin/media-upload/?json=1", { method: "POST", body });
      const data = (await res.json().catch(() => ({ ok: false, error: `Upload failed (${res.status}).` }))) as { ok: boolean; error?: string; media?: MediaOption };
      if (!data.ok || !data.media) throw new Error(data.error ?? "Upload failed.");
      setUploaded((u) => [data.media!, ...u]);
      onPick(data.media);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!open) return null;
  return (
    // Not a <form>, and its typing stays out of the surrounding form: Enter must not save it, and searching is not an edit.
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      onInput={(e) => e.stopPropagation()}
      onChange={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.key === "Enter" && e.target instanceof HTMLInputElement && e.preventDefault()}
    >
      <div role="dialog" aria-modal="true" aria-label="Choose an image" className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <input className="field min-w-0 flex-1" placeholder="Search file name, alt text or id" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT.image}
            className="hidden"
            data-picker-upload
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) void upload(f);
            }}
          />
          <button type="button" className="btn btn-primary" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? "Uploading…" : "Upload new image"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          {uploadError ? <p className="w-full text-sm font-medium text-danger-700">{uploadError}</p> : null}
        </div>
        <div className="grid grid-cols-3 gap-3 overflow-y-auto p-4 sm:grid-cols-4 md:grid-cols-6">
          {filtered.slice(0, limit).map((o) => (
            <button
              key={o.id}
              type="button"
              title={o.name}
              onClick={() => onPick(o)}
              className={`group overflow-hidden rounded-lg border text-left ${o.id === selectedId ? "border-brand-600 ring-2 ring-brand-400" : "border-line hover:border-brand-300"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={o.url} alt={o.alt ?? ""} loading="lazy" className="aspect-square w-full bg-paper object-cover" />
              <span className="block truncate px-1.5 py-1 text-[11px] text-muted">
                #{o.id} {o.name}
              </span>
            </button>
          ))}
          {filtered.length === 0 ? <p className="col-span-full py-8 text-center text-sm text-muted">{!given && !loaded ? "Loading images…" : "No images match."}</p> : null}
        </div>
        {filtered.length > limit ? (
          <div className="border-t border-line p-3 text-center">
            <button type="button" className="btn btn-ghost" onClick={() => setLimit((l) => l + 60)}>
              Show more ({filtered.length - limit} left)
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
