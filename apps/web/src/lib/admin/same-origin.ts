// The same-origin test for admin route handlers that take a POST (Server Actions are checked by Next itself).
// A browser always sends the real Origin of the page that made the request and a page on another site
// cannot change it, so a request is ours only when that Origin is the address the request was sent to.
//
// Behind Cloudflare the host in `request.nextUrl` is not always the address the browser used, so the
// Host and X-Forwarded-Host headers are compared as well, as Next does for Server Actions.

export interface OriginInputs {
  /** The Origin request header. */
  origin: string | null;
  /** The Host request header. */
  host?: string | null;
  /** The X-Forwarded-Host request header (may list several hosts; the first is the one the browser used). */
  forwardedHost?: string | null;
  /** The host of the request URL (`request.nextUrl.host`). */
  urlHost?: string | null;
  /** Origins that are always ours, for example the configured site address. */
  trusted?: string[];
}

const hostOf = (value: string | null | undefined) => (value ?? "").split(",")[0].trim().toLowerCase();

export function isSameOrigin({ origin, host, forwardedHost, urlHost, trusted = [] }: OriginInputs): boolean {
  if (!origin) return false;
  if (trusted.includes(origin)) return true;
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false; // "null" and other values that are not an address
  }
  return [forwardedHost, host, urlHost].map(hostOf).some((h) => h !== "" && h === originHost);
}
