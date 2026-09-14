// Vercel Routing Middleware — the Vercel twin of netlify/edge-functions/
// (api-proxy.js + csp-report.js). Each host ignores the other's files: Netlify
// never runs this, Vercel never reads netlify.toml or netlify/. Behaviour must
// stay identical, so a change to either proxy (the forwarded-header allowlist,
// the Set-Cookie rewrite, the x-forwarded-* headers) goes into both.
//
// Runs on Vercel's Edge runtime ahead of routing, so it sees the original
// request URL and answers /api/* and /_csp-report itself. Every other path
// falls through to the static build and the SPA rewrite in vercel.json.
import { DEFAULT_UPSTREAM_URL } from "./config/upstream.default.js";

export const config = { matcher: ["/api/:path*", "/_csp-report"] };

// Backend base URL: VITE_UPSTREAM_URL from the Vercel project's Environment
// Variables (scoped per environment — Production / Preview), else the shared
// default. Same precedence as config/upstream.js on Netlify.
function upstreamUrl() {
  return String(process.env.VITE_UPSTREAM_URL || DEFAULT_UPSTREAM_URL).replace(/\/+$/, "");
}

// Same allowlist as netlify/edge-functions/api-proxy.js — see the rationale
// there. `origin` is deliberately absent: forwarding it makes `ins`'s CORS
// filter reject every non-GET from this host.
const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "cookie",
  "user-agent",
  "x-xsrf-token",
];

// fetch() transparently decodes a compressed upstream body but keeps the
// Content-Encoding / Content-Length that describe the *encoded* bytes; passing
// them on fails in the browser with ERR_CONTENT_DECODING_FAILED. We ask
// upstream for identity anyway and drop these so Vercel frames (and
// compresses) the response itself. Set-Cookie is re-emitted separately.
const DROPPED_RESPONSE_HEADERS = [
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "set-cookie",
];

/** @returns {string[]} */
function getUpstreamSetCookies(headers) {
  if (typeof headers.getSetCookie === "function") {
    const list = headers.getSetCookie();
    if (list?.length) return list;
  }
  const raw = headers.get("set-cookie");
  return raw ? [raw] : [];
}

/**
 * Rewrites an upstream Set-Cookie into a host-only first-party cookie on this
 * origin — the string form of what the Netlify proxy builds for
 * `context.cookies.set`: keep name=value, HttpOnly, Max-Age, Expires; drop
 * Domain / Path / Partitioned / SameSite; force Path=/ and SameSite=Lax; Secure
 * exactly when this request is HTTPS. Lets iOS Safari (ITP) keep the auth
 * cookie instead of dropping it as cross-site.
 * @returns {string | null}
 */
export function rewriteSetCookie(raw, isHttps) {
  const segments = raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!segments.length) return null;

  const nv = segments[0];
  if (nv.indexOf("=") <= 0) return null;

  let httpOnly = false;
  let maxAge = null;
  let expires = null;
  for (const seg of segments.slice(1)) {
    const sep = seg.indexOf("=");
    const key = (sep === -1 ? seg : seg.slice(0, sep)).trim().toLowerCase();
    const val = sep === -1 ? "" : seg.slice(sep + 1).trim();

    if (key === "httponly") httpOnly = true;
    else if (key === "max-age") {
      const n = Number.parseInt(val, 10);
      if (!Number.isNaN(n)) maxAge = n;
    } else if (key === "expires") {
      const exp = Date.parse(val);
      if (!Number.isNaN(exp)) expires = new Date(exp).toUTCString();
    }
  }

  const parts = [nv, "Path=/"];
  if (expires) parts.push(`Expires=${expires}`);
  if (maxAge !== null) parts.push(`Max-Age=${maxAge}`);
  if (httpOnly) parts.push("HttpOnly");
  if (isHttps) parts.push("Secure");
  parts.push("SameSite=Lax");
  return parts.join("; ");
}

async function proxyApi(request) {
  const url = new URL(request.url);
  const isHttps = url.protocol === "https:";

  try {
    const targetUrl = upstreamUrl() + url.pathname + url.search;

    const headers = new Headers();
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    // Where the browser actually loaded the app from — `ins` builds the
    // DocuSign return URL from it (see the Netlify proxy). Taken from our own
    // request URL, never from inbound headers a caller could spoof.
    headers.set("x-forwarded-host", url.host);
    headers.set("x-forwarded-proto", url.protocol.replace(/:$/, ""));
    headers.set("accept-encoding", "identity");

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (!["GET", "HEAD"].includes(request.method)) {
      init.body = await request.arrayBuffer();
    }

    const upstream = await fetch(targetUrl, init);

    const resHeaders = new Headers(upstream.headers);
    for (const name of DROPPED_RESPONSE_HEADERS) resHeaders.delete(name);
    for (const raw of getUpstreamSetCookies(upstream.headers)) {
      const cookie = rewriteSetCookie(raw, isHttps);
      if (cookie) resHeaders.append("set-cookie", cookie);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    // A bad/unreachable VITE_UPSTREAM_URL (unset → localhost default) would
    // otherwise surface as an opaque middleware crash. Log the real cause to
    // the Vercel runtime log and return a real HTTP response.
    console.error(
      `api-proxy: upstream request failed for ${url.pathname} — ${err?.message || err}`,
    );
    return new Response(JSON.stringify({ error: "Upstream request failed" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}

// CSP violation report sink — same as netlify/edge-functions/csp-report.js:
// accepts both `application/csp-report` and `application/reports+json`, logs
// the body (capped) to the Vercel runtime log, answers 204.
async function cspReport(request) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  try {
    const raw = await request.text();
    console.warn(`[csp-report] ${raw.slice(0, 4000)}`);
  } catch (err) {
    console.error(`[csp-report] could not read report body — ${err?.message || err}`);
  }

  return new Response(null, { status: 204 });
}

export default function middleware(request) {
  const { pathname } = new URL(request.url);
  return pathname === "/_csp-report" ? cspReport(request) : proxyApi(request);
}
