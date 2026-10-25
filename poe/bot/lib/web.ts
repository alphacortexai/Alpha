import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

const blocked = new BlockList();
blocked.addSubnet("0.0.0.0", 8, "ipv4");
blocked.addSubnet("10.0.0.0", 8, "ipv4");
blocked.addSubnet("127.0.0.0", 8, "ipv4");
blocked.addSubnet("169.254.0.0", 16, "ipv4");
blocked.addSubnet("172.16.0.0", 12, "ipv4");
blocked.addSubnet("192.0.2.0", 24, "ipv4");
blocked.addSubnet("192.168.0.0", 16, "ipv4");
blocked.addSubnet("198.51.100.0", 24, "ipv4");
blocked.addSubnet("203.0.113.0", 24, "ipv4");
blocked.addSubnet("100.64.0.0", 10, "ipv4");
blocked.addSubnet("224.0.0.0", 4, "ipv4");
blocked.addAddress("255.255.255.255", "ipv4");
blocked.addAddress("::", "ipv6");
blocked.addAddress("::1", "ipv6");
blocked.addSubnet("2001:db8::", 32, "ipv6");
blocked.addSubnet("fc00::", 7, "ipv6");
blocked.addSubnet("fe80::", 10, "ipv6");
blocked.addSubnet("ff00::", 8, "ipv6");

const BLOCKED_HOSTS = new Set(["localhost", "localhost.localdomain", "metadata.google.internal", "metadata.google.com"]);
const MAX_BYTES = 500_000;
const MAX_TEXT = 12_000;
const MAX_HOPS = 4;

export type BrowseResult =
  | { ok: true; url: string; title: string; text: string }
  | { ok: false; error: string };

/** Read a public http(s) page. Private networks, metadata hosts, and redirects to them are refused. */
export async function browseWeb(raw: string): Promise<BrowseResult> {
  let current = raw.trim();
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const target = parsePublicUrl(current);
    if (!target.ok) return target;
    const response = await requestOnce(target.url);
    if (!response.ok) return response;
    if (response.redirect) {
      current = response.redirect;
      continue;
    }
    return { ok: true, url: response.url, title: response.title, text: response.text };
  }
  return { ok: false, error: "That page redirected too many times." };
}

export function isBlockedIp(ip: string): boolean {
  const normalized = unwrapMapped(ip);
  const kind = isIP(normalized);
  if (kind === 0) return true;
  return blocked.check(normalized, kind === 4 ? "ipv4" : "ipv6");
}

export function htmlToText(html: string): { title: string; text: string } {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const withoutCode = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  const text = collapse(decodeEntities(withoutCode.replace(/<[^>]+>/g, " "))).slice(0, MAX_TEXT);
  const title = collapse(decodeEntities(titleMatch?.[1] ?? "")).slice(0, 200);
  return { title, text };
}

function parsePublicUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  if (raw.length > 2000) return { ok: false, error: "That address is too long." };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "That address is not a web page." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, error: "Only public http and https pages can be read." };
  if (url.username || url.password) return { ok: false, error: "That address is not a public page." };
  const host = url.hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (!host || BLOCKED_HOSTS.has(host) || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, error: "That address is not a public page." };
  }
  if (/^\d+$/.test(host)) return { ok: false, error: "That address is not a public page." };
  if (isIP(host) && isBlockedIp(host)) return { ok: false, error: "That address is not a public page." };
  return { ok: true, url };
}

async function requestOnce(url: URL): Promise<BrowseResult & { redirect?: string }> {
  const records = await resolvePublic(url.hostname);
  if (!records.ok) return records;
  const pinned = records.address;
  const family = pinned.includes(":") ? 6 : 4;
  const lookupPinned: LookupFunction = (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [{ address: pinned, family }]);
      return;
    }
    callback(null, pinned, family);
  };
  const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve) => {
    const req = transport(
      url,
      {
        method: "GET",
        headers: {
          accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
          "user-agent": "Poe/1.0",
        },
        lookup: lookupPinned,
        timeout: 8000,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          const location = res.headers.location;
          res.resume();
          if (!location) {
            resolve({ ok: false, error: "That page redirected without a destination." });
            return;
          }
          resolve({ ok: true, url: url.toString(), title: "", text: "", redirect: new URL(location, url).toString() });
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          resolve({ ok: false, error: `That page returned status ${status}.` });
          return;
        }
        const type = String(res.headers["content-type"] ?? "").toLowerCase();
        if (type && !isTextType(type)) {
          res.resume();
          resolve({ ok: false, error: "That address did not return a page of text." });
          return;
        }
        const chunks: Buffer[] = [];
        let total = 0;
        let tooBig = false;
        res.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > MAX_BYTES) {
            tooBig = true;
            res.destroy();
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          if (tooBig) {
            resolve({ ok: false, error: "That page is too large to read." });
            return;
          }
          const buffer = Buffer.concat(chunks);
          if (!type && looksBinary(buffer)) {
            resolve({ ok: false, error: "That address did not return a page of text." });
            return;
          }
          const raw = buffer.toString("utf8");
          const extracted = type.includes("text/plain") ? { title: "", text: collapse(raw).slice(0, MAX_TEXT) } : htmlToText(raw);
          resolve({ ok: true, url: url.toString(), title: extracted.title, text: extracted.text });
        });
        res.on("error", () => resolve({ ok: false, error: "That page could not be read." }));
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "That page took too long." });
    });
    req.on("error", () => resolve({ ok: false, error: "That page could not be read." }));
    req.end();
  });
}

async function resolvePublic(hostname: string): Promise<{ ok: true; address: string } | { ok: false; error: string }> {
  const literal = hostname.replace(/^\[|\]$/g, "");
  if (isIP(literal)) {
    if (isBlockedIp(literal)) return { ok: false, error: "That address is not a public page." };
    return { ok: true, address: unwrapMapped(literal) };
  }
  let records: Array<{ address: string }>;
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    return { ok: false, error: "That address could not be found." };
  }
  if (records.length === 0 || records.some((record) => isBlockedIp(record.address))) {
    return { ok: false, error: "That address is not a public page." };
  }
  return { ok: true, address: unwrapMapped(records[0]?.address ?? "") };
}

function isTextType(type: string): boolean {
  return type.includes("text/html") || type.includes("text/plain") || type.includes("application/xhtml+xml");
}

function looksBinary(buffer: Buffer): boolean {
  return buffer.subarray(0, 1000).includes(0);
}

function unwrapMapped(ip: string): string {
  const lower = ip.toLowerCase();
  if (lower.startsWith("::ffff:")) {
    const rest = ip.slice("::ffff:".length);
    if (isIP(rest) === 4) return rest;
  }
  return ip;
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, digits: string) => safeChar(Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeChar(Number.parseInt(hex, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function safeChar(code: number): string {
  if (!Number.isFinite(code) || code < 32 || code === 127) return " ";
  return String.fromCodePoint(code);
}
