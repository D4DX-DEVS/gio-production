"use client";
// The editing frame every website section uses: all the section's fields in one form, one Save button
// at the bottom, and a status line that says plainly what happened. Saving puts the change on the
// website (the server action ends with goLive), so there is nothing else to click.
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useId, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { failed, type SaveResult } from "./result";
import { toast } from "./toast";
import { setUnsaved, LEAVE_MESSAGE } from "./unsaved";

const clock = (at: number) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(at);

function Dot({ tone }: { tone: "ok" | "warn" | "error" | "idle" }) {
  const c = { ok: "bg-emerald-500", warn: "bg-amber-500", error: "bg-danger-600", idle: "bg-slate-300" }[tone];
  return <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${c}`} />;
}

export type SectionAction = (prev: SaveResult | null, fd: FormData) => Promise<SaveResult>;

/**
 * `children` are the section's fields (server-rendered). Buttons inside that act at once (move, delete)
 * must be ActionButtons, not submit buttons, so they never send the form.
 */
export function SectionForm({
  action,
  children,
  saveLabel = "Save changes",
  refreshOnSave = false,
  resetOnSave = false,
  sticky = true,
  readOnly = false,
  aside,
  id,
}: {
  action: SectionAction;
  children: ReactNode;
  saveLabel?: string;
  /** Re-read the screen after a save (the save created or removed something the screen lists). */
  refreshOnSave?: boolean;
  /** Clear the fields after a successful save (an "Add" form). */
  resetOnSave?: boolean;
  /** Keep the Save bar at the bottom of the screen while the section is long. */
  sticky?: boolean;
  /** Contributors can look but not save. */
  readOnly?: boolean;
  /** Extra controls on the left of the Save bar, for example a Delete button. */
  aside?: ReactNode;
  id?: string;
}) {
  const router = useRouter();
  const key = useId();
  const [state, setState] = useState<SaveResult | null>(null);
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);
  // Edits since the last save attempt: until then a failed save keeps showing why it failed.
  const [touched, setTouched] = useState(false);
  // Changing `fresh` remounts the fields, which empties an "Add" form (the image picker keeps its own state).
  const [fresh, setFresh] = useState(0);

  // The form sends itself instead of using <form action>: React empties uncontrolled fields after an action,
  // which would show the old saved values again until the screen is re-read.
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (readOnly || pending) return;
    const fd = new FormData(e.currentTarget);
    // Edits made while this save is on its way count as new unsaved changes.
    setDirty(false);
    setTouched(false);
    start(async () => {
      let result: SaveResult;
      try {
        result = await action(state, fd);
      } catch {
        result = failed("Could not save. Check your connection and try again.");
      }
      setState(result);
      if (!result.ok) setDirty(true);
      else if (resetOnSave) setFresh((n) => n + 1);
    });
  };

  useEffect(() => {
    setUnsaved(key, dirty);
    return () => setUnsaved(key, false);
  }, [key, dirty]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = LEAVE_MESSAGE;
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (state?.ok && refreshOnSave) router.refresh();
  }, [state, refreshOnSave, router]);

  const status = pending
    ? { tone: "idle" as const, text: "Saving…" }
    : state && !state.ok && !touched
      ? { tone: "error" as const, text: state.message }
      : dirty
        ? { tone: "warn" as const, text: "You have changes that are not saved yet." }
        : state
          ? { tone: "ok" as const, text: `${state.message} · ${clock(state.at)}` }
          : { tone: "idle" as const, text: "Saving puts your changes on the website straight away." };

  const markDirty = () => {
    if (readOnly) return;
    setDirty(true);
    setTouched(true);
  };

  return (
    <form id={id} onSubmit={submit} onInput={markDirty} onChange={markDirty}>
      <fieldset disabled={readOnly} className="min-w-0 border-0 p-0">
        <Fragment key={fresh}>{children}</Fragment>
      </fieldset>
      {readOnly ? (
        <div className="rounded-b-2xl border-t border-line bg-paper px-5 py-3 text-sm text-muted">You can look at this section, but only editors can change it.</div>
      ) : (
        <div className={`${sticky ? "sticky bottom-0 z-10 " : ""}flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-line bg-white/95 px-5 py-3 backdrop-blur`}>
          <p role={status.tone === "error" ? "alert" : "status"} aria-live="polite" className={`${status.tone === "idle" && !pending ? "max-sm:hidden " : ""}flex min-w-0 flex-1 basis-60 items-start gap-2 text-sm ${status.tone === "error" ? "font-medium text-danger-700" : status.tone === "warn" ? "font-medium text-amber-800" : "text-muted"}`}>
            <Dot tone={status.tone} />
            <span className="min-w-0">{status.text}</span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            {aside}
            <button type="submit" disabled={pending} className="btn btn-primary min-h-11 px-6">
              {pending ? "Saving…" : saveLabel}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

/** A button that does its job at once (move, delete, add) and tells the editor how it went. */
export function ActionButton({
  action,
  children,
  className = "btn btn-ghost",
  confirm,
  label,
  disabled = false,
  refresh = true,
}: {
  action: () => Promise<SaveResult>;
  children: ReactNode;
  className?: string;
  /** Ask first, for example before deleting. */
  confirm?: string;
  /** Accessible name when the button shows only an icon or arrow. */
  label?: string;
  disabled?: boolean;
  /** Re-read the screen afterwards so lists and counts are current. */
  refresh?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={disabled || pending}
      aria-label={label}
      title={label}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          try {
            const r = await action();
            toast(r.message, r.ok ? "ok" : "error");
            if (r.ok && refresh) router.refresh();
          } catch {
            toast("Could not save. Check your connection and try again.", "error");
          }
        });
      }}
    >
      {pending && !label ? "Working…" : children}
    </button>
  );
}
