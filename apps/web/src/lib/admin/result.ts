// What an inline admin action (one that does not redirect) returns to the screen that called it.
// Screens show `message` next to the Save button; `at` tells two identical results apart.
import { errorMessage, isRedirect } from "./form";

export interface SaveResult {
  ok: boolean;
  message: string;
  at: number;
  /** Set when the action created something the screen should open (a new section's id). */
  id?: number;
}

export const LIVE = "Saved. The website shows it now.";

export const saved = (message: string = LIVE, id?: number): SaveResult => ({ ok: true, message, at: Date.now(), id });
export const failed = (message: string): SaveResult => ({ ok: false, message, at: Date.now() });

/** Run a write and turn its outcome into a result. Redirects (sign-in, missing role) pass through. */
export async function runSave(fn: () => Promise<string | { message: string; id?: number } | void>): Promise<SaveResult> {
  try {
    const out = await fn();
    if (typeof out === "string") return saved(out);
    if (out) return saved(out.message, out.id);
    return saved();
  } catch (e) {
    if (isRedirect(e)) throw e;
    return failed(errorMessage(e));
  }
}
