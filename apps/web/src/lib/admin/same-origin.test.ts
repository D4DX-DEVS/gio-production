import assert from "node:assert/strict";
import { test } from "node:test";
import { isSameOrigin } from "./same-origin.ts";

test("the page's own address is accepted, whichever header carries it", () => {
  const origin = "https://giokerala.org";
  assert.equal(isSameOrigin({ origin, host: "giokerala.org" }), true);
  assert.equal(isSameOrigin({ origin, forwardedHost: "giokerala.org", host: "internal.example" }), true);
  assert.equal(isSameOrigin({ origin, urlHost: "giokerala.org" }), true);
});

test("Cloudflare: the URL host is not the browser's, the Host header is", () => {
  assert.equal(isSameOrigin({ origin: "https://giokerala.org", host: "giokerala.org", urlHost: "gio-kerala-web.example.workers.dev" }), true);
});

test("the first of several forwarded hosts is the one that counts", () => {
  assert.equal(isSameOrigin({ origin: "https://giokerala.org", forwardedHost: "giokerala.org, proxy.example" }), true);
  assert.equal(isSameOrigin({ origin: "https://giokerala.org", forwardedHost: "proxy.example, giokerala.org" }), false);
});

test("the configured site address is always accepted", () => {
  assert.equal(isSameOrigin({ origin: "https://giokerala.org", host: "other.example", trusted: ["https://giokerala.org"] }), true);
});

test("another site is refused", () => {
  assert.equal(isSameOrigin({ origin: "https://evil.example", host: "giokerala.org", forwardedHost: "giokerala.org", urlHost: "giokerala.org", trusted: ["https://giokerala.org"] }), false);
  // a look-alike that only starts or ends with ours
  assert.equal(isSameOrigin({ origin: "https://giokerala.org.evil.example", host: "giokerala.org" }), false);
  assert.equal(isSameOrigin({ origin: "https://evilgiokerala.org", host: "giokerala.org" }), false);
});

test("a missing, empty or unusable Origin is refused", () => {
  assert.equal(isSameOrigin({ origin: null, host: "giokerala.org" }), false);
  assert.equal(isSameOrigin({ origin: "", host: "giokerala.org" }), false);
  assert.equal(isSameOrigin({ origin: "null", host: "null" }), false);
  assert.equal(isSameOrigin({ origin: "https://giokerala.org", host: "", forwardedHost: null, urlHost: undefined }), false);
});

test("the port is part of the address", () => {
  assert.equal(isSameOrigin({ origin: "http://localhost:3000", host: "localhost:3000" }), true);
  assert.equal(isSameOrigin({ origin: "http://localhost:3000", host: "localhost:3001" }), false);
});
