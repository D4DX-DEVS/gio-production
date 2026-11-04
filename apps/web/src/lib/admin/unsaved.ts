// Which section forms on the screen have edits that are not saved. The sidebar asks before it leaves
// such a screen, and the browser asks before the tab closes, so no one loses typing by accident.
const dirty = new Set<string>();

export function setUnsaved(key: string, on: boolean) {
  if (on) dirty.add(key);
  else dirty.delete(key);
}

export const hasUnsaved = () => dirty.size > 0;

export const LEAVE_MESSAGE = "You have changes that are not saved yet. Leave without saving?";

/** Used by links that leave the screen. Returns false when the editor chose to stay. */
export function okToLeave(): boolean {
  return !hasUnsaved() || window.confirm(LEAVE_MESSAGE);
}
