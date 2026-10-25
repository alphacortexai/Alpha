import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readlinkSync, readdirSync, readFileSync } from "node:fs";

import { doorSuffix, rewriteDoorLocation } from "./site.js";

type HealthBody = {
  ok?: boolean;
  name?: string;
  agents?: Array<{ slug?: string; name?: string }>;
};

const DOOR_HOST = "127.0.0.1";
const MAX_BODY = 1_000_000;
const MAX_RESPONSE = 2_000_000;

let booting = false;
let stopped = false;
let server: Server | undefined;
let doorOrigin = "";
let log: (line: string) => void = () => {};

/** Short address once the door is listening, otherwise empty. */
export function friendlyDoorUrl(): string {
  return doorOrigin ? `${doorOrigin}/` : "";
}

/**
 * Opens http://127.0.0.1:8080/ (or the next free port) onto the product pages.
 * Safe to call from channel onStart: the agent is not listening yet, so the
 * probe retries in the background.
 */
export function startPoeDoor(logger: (line: string) => void): void {
  if (process.env.POE_DOOR === "1" || booting || server) return;
  booting = true;
  stopped = false;
  log = logger;
  void boot().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "error";
    log(`Poe site did not open a short address (${message.slice(0, 180)}).`);
  });
}

export async function stopPoeDoor(): Promise<void> {
  stopped = true;
  const current = server;
  server = undefined;
  doorOrigin = "";
  if (!current) return;
  await new Promise<void>((resolve) => current.close(() => resolve()));
}

async function boot(): Promise<void> {
  const upstream = await findUpstream();
  if (!upstream || stopped) {
    if (!stopped) log("Poe site stayed on the channel address. A short address was not opened.");
    return;
  }
  const preferred = portFromEnv(process.env.POE_DOOR_PORT) ?? 8080;
  const bound = await listen(upstream, preferred);
  if (!bound || stopped) return;
  doorOrigin = `http://${DOOR_HOST}:${bound.port}`;
  log(`Poe  ${doorOrigin}/`);
}

async function findUpstream(): Promise<string | undefined> {
  const preferred = portFromArgv(process.argv) ?? portFromEnv(process.env.POE_UPSTREAM_PORT);
  for (let attempt = 0; attempt < 120; attempt++) {
    if (stopped) return undefined;
    if (preferred) {
      const exact = await probePort(preferred);
      if (exact) return exact;
    }
    if (!preferred || attempt >= 40) {
      const ports = candidatePorts().filter((port) => port !== preferred);
      const found = await Promise.all(ports.map((port) => probePort(port)));
      const upstream = found.find((value) => value !== undefined);
      if (upstream) return upstream;
    }
    await delay(250);
  }
  return undefined;
}

function candidatePorts(): number[] {
  const ports = new Set<number>();
  const fromArg = portFromArgv(process.argv);
  const fromEnv = portFromEnv(process.env.POE_UPSTREAM_PORT);
  if (fromArg) ports.add(fromArg);
  if (fromEnv) ports.add(fromEnv);
  for (const port of ownListeningPorts()) ports.add(port);
  for (let port = 3000; port <= 3010; port++) ports.add(port);
  if (server) ports.delete(boundPort(server));
  return [...ports].filter((port) => port > 0 && port < 65536);
}

async function probePort(port: number): Promise<string | undefined> {
  try {
    const healthResponse = await fetch(`http://${DOOR_HOST}:${port}/v1/health`, {
      signal: AbortSignal.timeout(400),
    });
    if (!healthResponse.ok) return undefined;
    const health = (await healthResponse.json()) as HealthBody;
    const upstream = upstreamFromHealth(port, health);
    if (!upstream) return undefined;
    const page = await fetch(`${upstream}/`, { signal: AbortSignal.timeout(800), redirect: "manual" });
    if (!page.ok) return undefined;
    const type = page.headers.get("content-type") ?? "";
    if (!type.includes("text/html")) return undefined;
    const text = await page.text();
    if (!text.includes("<title>Poe</title>")) return undefined;
    return upstream;
  } catch {
    return undefined;
  }
}

export function upstreamFromHealth(port: number, health: HealthBody): string | undefined {
  if (!Number.isInteger(port) || port < 1 || port > 65535) return undefined;
  if (Array.isArray(health.agents)) {
    const agent = health.agents.find((item) => item?.slug === "poe" || item?.name === "Poe");
    if (!agent?.slug || !/^[A-Za-z0-9_-]+$/.test(agent.slug)) return undefined;
    return `http://${DOOR_HOST}:${port}/${agent.slug}/v1/channels/home`;
  }
  if (health.ok === true && health.name === "Poe") return `http://${DOOR_HOST}:${port}/v1/channels/home`;
  return undefined;
}

export function portFromArgv(argv: readonly string[]): number | undefined {
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index] ?? "";
    if (arg === "--port") return portFromEnv(argv[index + 1]);
    if (arg.startsWith("--port=")) return portFromEnv(arg.slice("--port=".length));
  }
  return undefined;
}

function portFromEnv(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return undefined;
  return port;
}

function ownListeningPorts(): number[] {
  try {
    const inodes = new Set<string>();
    for (const fd of readdirSync("/proc/self/fd")) {
      try {
        const link = readlinkSync(`/proc/self/fd/${fd}`);
        const match = /^socket:\[(\d+)\]$/.exec(link);
        if (match?.[1]) inodes.add(match[1]);
      } catch {
        // A descriptor can vanish between readdir and readlink.
      }
    }
    const ports: number[] = [];
    for (const file of ["/proc/net/tcp", "/proc/net/tcp6"]) {
      const lines = readFileSync(file, "utf8").split("\n").slice(1);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts[3] !== "0A") continue;
        const inode = parts[9];
        if (!inode || !inodes.has(inode)) continue;
        const portHex = parts[1]?.split(":")[1];
        if (!portHex) continue;
        const port = Number.parseInt(portHex, 16);
        if (port > 0) ports.push(port);
      }
    }
    return ports;
  } catch {
    return [];
  }
}

function listen(upstream: string, preferred: number): Promise<{ port: number } | undefined> {
  return new Promise((resolve) => {
    const attempt = (port: number, remaining: number) => {
      if (stopped) {
        resolve(undefined);
        return;
      }
      const next = createServer((request, response) => {
        void proxy(request, response, upstream, `http://${DOOR_HOST}:${port}/`);
      });
      const onError = () => {
        if (remaining > 0 && port < 8090) attempt(port + 1, remaining - 1);
        else resolve(undefined);
      };
      next.once("error", onError);
      next.listen(port, DOOR_HOST, () => {
        next.removeListener("error", onError);
        server = next;
        resolve({ port });
      });
    };
    attempt(preferred, 10);
  });
}

async function proxy(request: IncomingMessage, response: ServerResponse, upstream: string, publicBase: string): Promise<void> {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", publicBase);
  const suffix = doorSuffix(url.pathname);
  if (suffix === undefined) {
    sendPlain(response, 404, "Not found");
    return;
  }
  if (method !== "GET" && method !== "POST" && method !== "HEAD") {
    sendPlain(response, 405, "Method not allowed");
    return;
  }
  try {
    const body = method === "POST" ? await readBody(request) : undefined;
    const headers = new Headers();
    headers.set("x-poe-public-base", publicBase);
    const cookie = request.headers.cookie;
    const contentType = headerValue(request.headers["content-type"]);
    const accept = headerValue(request.headers.accept);
    if (cookie) headers.set("cookie", cookie);
    if (contentType) headers.set("content-type", contentType);
    if (accept) headers.set("accept", accept);
    const target = suffix ? `${upstream}/${suffix}${url.search}` : `${upstream}/${url.search}`;
    const upstreamResponse = await fetch(target, {
      method,
      headers,
      body: body ? new Uint8Array(body) : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(150_000),
    });
    const out = new Headers();
    copyHeader(upstreamResponse.headers, out, "content-type");
    copyHeader(upstreamResponse.headers, out, "cache-control");
    copyHeader(upstreamResponse.headers, out, "x-content-type-options");
    copyHeader(upstreamResponse.headers, out, "referrer-policy");
    const location = upstreamResponse.headers.get("location");
    if (location) out.set("location", rewriteDoorLocation(location, upstream, publicBase));
    const cookies = upstreamResponse.headers.getSetCookie?.() ?? [];
    const payload = method === "HEAD" ? Buffer.alloc(0) : Buffer.from(await upstreamResponse.arrayBuffer());
    if (payload.length > MAX_RESPONSE) {
      sendPlain(response, 502, "Poe sent a response that was too large.");
      return;
    }
    response.writeHead(upstreamResponse.status, [...out.entries(), ...cookies.map((cookieValue) => ["set-cookie", cookieValue] as [string, string])]);
    response.end(payload);
  } catch {
    if (!response.headersSent) sendPlain(response, 502, "Poe is not available.");
  }
}

function copyHeader(from: Headers, to: Headers, name: string): void {
  const value = from.get(name);
  if (value) to.set(name, value);
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_BODY) throw new Error("body too large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function sendPlain(response: ServerResponse, status: number, message: string): void {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
  response.end(message);
}

function boundPort(current: Server): number {
  const address = current.address();
  return address && typeof address === "object" ? address.port : 0;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
