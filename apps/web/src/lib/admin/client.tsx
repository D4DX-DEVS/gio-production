"use client";
// Interactive admin pieces: submit buttons with pending state, confirmed deletes,
// flash messages and the image field.
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { EyeIcon, EyeOffIcon } from "@/components/Icons";
import { ACCEPT, fileProblem, IMAGE_TYPES, MediaDialog, type MediaOption } from "./media-dialog";

export type { MediaOption };

/** Password input with an eye button that switches between hidden and visible text. */
export function PasswordInput({ id, name, autoComplete, required = false }: { id?: string; name: string; autoComplete?: string; required?: boolean }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input id={id} name={name} type={shown ? "text" : "password"} required={required} autoComplete={autoComplete} spellCheck={false} className="field field-with-action" />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        title={shown ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-lg text-muted transition-colors hover:text-brand-700 focus-visible:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-400"
      >
        {shown ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
      </button>
    </div>
  );
}

/** The rich text editor every text box in the admin uses (formatting, images, videos, tables, buttons). See ./rich-editor.tsx. */
export { RichEditor as HtmlEditor } from "./rich-editor";

/** File input that previews chosen images and blocks the submit when a file is the wrong type or too big. */
export function FileInput({ name, accept = "any", multiple = false, required = false }: { name: string; accept?: keyof typeof ACCEPT; multiple?: boolean; required?: boolean }) {
  const [files, setFiles] = useState<{ name: string; url: string | null; size: number }[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => () => files.forEach((f) => f.url && URL.revokeObjectURL(f.url)), [files]);
  return (
    <div>
      <input
        type="file"
        name={name}
        multiple={multiple}
        required={required}
        accept={ACCEPT[accept]}
        className="field"
        onChange={(e) => {
          const list = [...(e.currentTarget.files ?? [])];
          const p = list.map((f) => fileProblem(f, accept)).find(Boolean) ?? null;
          e.currentTarget.setCustomValidity(p ?? "");
          setProblem(p);
          setFiles(list.map((f) => ({ name: f.name, size: f.size, url: IMAGE_TYPES.includes(f.type) ? URL.createObjectURL(f) : null })));
        }}
      />
      {problem ? <p className="mt-1 text-xs font-medium text-danger-700">{problem}</p> : null}
      {files.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {files.map((f) => (
            <figure key={f.name} className="w-24 overflow-hidden rounded-lg border border-line bg-paper text-[11px] text-muted">
              {f.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square items-center justify-center text-base font-bold text-brand-400">PDF</div>
              )}
              <figcaption className="truncate px-1 py-0.5" title={f.name}>
                {(f.size / 1048576).toFixed(1)} MB
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  children = "Save",
  className = "btn btn-primary",
  name,
  value,
  formAction,
  disabled = false,
  label,
}: {
  children?: ReactNode;
  className?: string;
  name?: string;
  value?: string;
  /** Lets one form hold several actions (Save, Move, …). */
  formAction?: (fd: FormData) => void | Promise<void>;
  disabled?: boolean;
  /** Accessible name for icon-only buttons. */
  label?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} name={name} value={value} formAction={formAction} formNoValidate={Boolean(formAction)} aria-label={label} title={label}>
      {pending && !label ? "Working…" : children}
    </button>
  );
}

/**
 * Submit button that asks for confirmation first. Put it inside a <form action={serverAction}>;
 * `formAction` lets one form hold several actions (e.g. Save and Delete).
 */
export function ConfirmButton({
  children = "Delete",
  message = "Delete this item? This cannot be undone.",
  className = "btn btn-danger",
  formAction,
}: {
  children?: ReactNode;
  message?: string;
  className?: string;
  formAction?: (fd: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      formAction={formAction}
      formNoValidate
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

/** Shows ?ok= / ?error= from the URL once, then removes them. */
export function Flash() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ok = sp.get("ok");
  const error = sp.get("error");
  const nonce = sp.get("n");
  const [shown, setShown] = useState<{ ok: string | null; error: string | null }>({ ok: null, error: null });
  // Capture a new message during render (it outlives the URL cleanup below). Tracking the
  // last key, and resetting it once the params are gone, lets the same message show again later.
  const key = ok || error ? `${ok ?? ""}|${error ?? ""}|${nonce ?? ""}` : null;
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (key !== lastKey) {
    setLastKey(key);
    if (key) setShown({ ok, error });
  }

  useEffect(() => {
    if (!ok && !error) return;
    const rest = new URLSearchParams(sp.toString());
    rest.delete("ok");
    rest.delete("error");
    rest.delete("n");
    const q = rest.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [ok, error, sp, router, pathname]);

  const msg = shown.error ?? shown.ok;
  if (!msg) return null;
  return (
    <div
      role="status"
      className={`mb-5 flex items-start justify-between gap-4 rounded-lg px-4 py-3 text-sm ring-1 ${shown.error ? "bg-red-50 text-danger-700 ring-red-200" : "bg-green-50 text-green-800 ring-green-200"}`}
    >
      <span>{msg}</span>
      <button type="button" className="font-semibold opacity-70 hover:opacity-100" onClick={() => setShown({ ok: null, error: null })} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

/**
 * Picks an image from the media library. Submits the chosen id as a hidden input named `name`.
 * Pass `options` (from listImageOptions()) or leave it out: the list is then fetched from
 * /admin/media-options/ when the window opens. `preview` shows the current image before that.
 */
export function MediaPicker({
  name,
  options: given,
  defaultId,
  preview,
  label = "Image",
  folder = "images",
}: {
  name: string;
  options?: MediaOption[];
  defaultId?: number | null;
  preview?: MediaOption | null;
  label?: string;
  /** R2 folder for images uploaded from the picker (images, banners, leaders, logos). */
  folder?: string;
}) {
  const [id, setId] = useState<number | null>(defaultId ?? null);
  const [picked, setPicked] = useState<MediaOption | null>(null);
  const [open, setOpen] = useState(false);
  const hidden = useRef<HTMLInputElement>(null);
  const shownId = useRef(id);
  // The hidden field changes without a keystroke; tell the surrounding form so it knows it has unsaved changes.
  useEffect(() => {
    if (shownId.current === id) return;
    shownId.current = id;
    hidden.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, [id]);

  const current = id === null ? undefined : picked?.id === id ? picked : preview?.id === id ? preview : given?.find((o) => o.id === id);

  return (
    <div>
      <span className="label">{label}</span>
      <input ref={hidden} type="hidden" name={name} value={id ?? ""} />
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-lg border border-line bg-paper">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.url} alt={current.alt ?? ""} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="text-xs text-muted">{id !== null ? `#${id}` : "None"}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
            Choose…
          </button>
          {id !== null ? (
            <button type="button" className="text-left text-xs text-danger-700 hover:underline" onClick={() => setId(null)}>
              Remove
            </button>
          ) : null}
        </div>
        {current ? <span className="hidden max-w-[16rem] truncate text-xs text-muted sm:block">{current.name}</span> : null}
      </div>
      <MediaDialog
        open={open}
        onClose={() => setOpen(false)}
        options={given}
        selectedId={id}
        folder={folder}
        onPick={(o) => {
          setPicked(o);
          setId(o.id);
          setOpen(false);
        }}
      />
    </div>
  );
}
