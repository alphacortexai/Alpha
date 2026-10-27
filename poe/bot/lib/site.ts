/** Address helpers for the product pages and the short local door. */

const CHANNEL_MARKER = "/v1/channels/home";

const DOOR_PATHS = new Set(["", "run", "follow", "events", "tasks"]);

export function publicBaseFromRequest(request: Request): string {
  const hinted = request.headers.get("x-poe-public-base");
  if (hinted && isDoorBase(hinted)) return normalizeBase(hinted);
  const url = new URL(request.url);
  const index = url.pathname.indexOf(CHANNEL_MARKER);
  if (index >= 0) return `${url.origin}${url.pathname.slice(0, index + CHANNEL_MARKER.length)}/`;
  const path = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  return `${url.origin}${path}`;
}

export function debugViewUrl(request: Request): string {
  const url = new URL(request.url);
  const index = url.pathname.indexOf(CHANNEL_MARKER);
  if (index >= 0) return `${url.origin}${url.pathname.slice(0, index)}/v1/channels/debug/view`;
  return "../debug/view";
}

/** Owner trace. Lives on the agent port, beside the product pages. */
export function playgroundViewUrl(request: Request): string {
  const url = new URL(request.url);
  const index = url.pathname.indexOf(CHANNEL_MARKER);
  if (index >= 0) return `${url.origin}${url.pathname.slice(0, index)}/playground`;
  return "../playground";
}

/** Path under the product root, or undefined when the door must not proxy it. */
export function doorSuffix(pathname: string): string | undefined {
  if (pathname.includes("\\") || pathname.includes("\0") || pathname.includes("%")) return undefined;
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  if (decoded.includes("\\") || decoded.includes("\0") || decoded.includes("%")) return undefined;
  const cleaned = decoded.replace(/^\/+/, "").replace(/\/+$/, "");
  const parts = cleaned === "" ? [] : cleaned.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) return undefined;
  if (!DOOR_PATHS.has(cleaned)) return undefined;
  return cleaned;
}

export function rewriteDoorLocation(location: string, upstream: string, publicBase: string): string {
  const source = upstream.endsWith("/") ? upstream : `${upstream}/`;
  const target = publicBase.endsWith("/") ? publicBase : `${publicBase}/`;
  if (location === upstream || location === source) return target;
  if (location.startsWith(source)) return target + location.slice(source.length);
  return location;
}

export function isDoorBase(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return false;
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.pathname !== "/" && url.pathname !== "") return false;
    return url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "::1";
  } catch {
    return false;
  }
}

function normalizeBase(value: string): string {
  const url = new URL(value);
  return `${url.origin}/`;
}
