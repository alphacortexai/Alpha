import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/** Local stand-in so the chat session always has servers named gmail and google-calendar. */
export const MCP_BRIDGE_PORT = 8791;
export const UNCONNECTED_BEARER = "poe-unconnected";

const UPSTREAMS: Record<string, string> = {
  gmail: "https://gmailmcp.googleapis.com/mcp/v1",
  "google-calendar": "https://calendarmcp.googleapis.com/mcp/v1",
};

const MAX_BODY = 1_000_000;
let server: Server | undefined;
let starting: Promise<void> | undefined;

export function mcpBridgeUrl(service: "gmail" | "google-calendar"): string {
  void ensureMcpBridge();
  return `http://127.0.0.1:${MCP_BRIDGE_PORT}/${service}`;
}

export function ensureMcpBridge(): Promise<void> {
  if (server?.listening) return Promise.resolve();
  if (!starting) {
    starting = listen().catch((error: unknown) => {
      starting = undefined;
      const message = error instanceof Error ? error.message : "bridge failed";
      console.error(`Poe mailbox bridge did not start (${message}).`);
    });
  }
  return starting;
}

/** Tools for one signed-in person. A fresh client so another session's empty list is not reused. */
export async function listConnectedTools(
  service: "gmail" | "google-calendar",
  authorization: string,
): Promise<Array<{ name: string; description: string }>> {
  await ensureMcpBridge();
  const client = new Client({ name: "poe", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(mcpBridgeUrl(service)), {
    requestInit: { headers: { Authorization: authorization } },
  });
  const timeout = setTimeout(() => {
    void transport.close();
  }, 12_000);
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    return listed.tools.slice(0, 40).map((tool) => ({
      name: tool.name,
      description: (tool.description ?? "").slice(0, 160),
    }));
  } finally {
    clearTimeout(timeout);
    await transport.close().catch(() => undefined);
    await client.close().catch(() => undefined);
  }
}

export async function stopMcpBridge(): Promise<void> {
  const current = server;
  server = undefined;
  starting = undefined;
  if (!current) return;
  await new Promise<void>((resolve) => current.close(() => resolve()));
}

/**
 * Google's Gmail MCP answers an unusable token with HTTP 401 and a JSON-RPC
 * body. The MCP client treats any non-2xx status as a transport failure and
 * never reads that body, so a tools list looks like a broken connection.
 * A JSON-RPC body is returned as HTTP 200 so the client can use it.
 */
export function relayMailboxResponse(status: number, raw: string): { status: number; body: string } {
  if (status !== 401) return { status, body: raw };
  try {
    const parsed = JSON.parse(raw) as { jsonrpc?: unknown; result?: unknown; error?: unknown };
    if (parsed.jsonrpc === "2.0" && (parsed.result !== undefined || parsed.error !== undefined)) {
      return { status: 200, body: raw };
    }
  } catch {
    // Not JSON-RPC. Keep the rejection.
  }
  return { status: 401, body: raw || "Google rejected the Gmail sign-in." };
}

/** JSON-RPC answer when this person has not connected the mailbox. */
export function answerUnconnected(raw: string): { status: number; body: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 400, body: "" };
  }
  if (Array.isArray(parsed)) {
    const replies = parsed
      .map((item) => oneReply(item))
      .filter((item): item is Record<string, unknown> => item !== undefined);
    if (replies.length === 0) return { status: 202, body: "" };
    return { status: 200, body: JSON.stringify(replies) };
  }
  const reply = oneReply(parsed);
  if (!reply) return { status: 202, body: "" };
  return { status: 200, body: JSON.stringify(reply) };
}

function oneReply(message: unknown): Record<string, unknown> | undefined {
  if (typeof message !== "object" || message === null) return undefined;
  const record = message as { id?: unknown; method?: unknown; params?: { protocolVersion?: unknown } };
  if (record.id === undefined) return undefined;
  const method = typeof record.method === "string" ? record.method : "";
  if (method === "initialize") {
    const version = typeof record.params?.protocolVersion === "string" ? record.params.protocolVersion : "2025-03-26";
    return {
      jsonrpc: "2.0",
      id: record.id,
      result: {
        protocolVersion: version,
        capabilities: { tools: {} },
        serverInfo: { name: "poe-mailbox", version: "1.0.0" },
      },
    };
  }
  if (method === "tools/list") {
    return { jsonrpc: "2.0", id: record.id, result: { tools: [] } };
  }
  if (method === "tools/call") {
    return {
      jsonrpc: "2.0",
      id: record.id,
      result: {
        content: [{ type: "text", text: "This person has not connected this account. They can use Sign in with Google in Settings." }],
        isError: true,
      },
    };
  }
  return {
    jsonrpc: "2.0",
    id: record.id,
    error: { code: -32601, message: "This account is not connected." },
  };
}

function listen(): Promise<void> {
  return new Promise((resolve, reject) => {
    const next = createServer((request, response) => {
      void route(request, response);
    });
    next.once("error", reject);
    next.listen(MCP_BRIDGE_PORT, "127.0.0.1", () => {
      server = next;
      next.unref();
      resolve();
    });
  });
}

async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${MCP_BRIDGE_PORT}`);
    const service = url.pathname.replace(/^\/+|\/+$/g, "");
    const upstream = UPSTREAMS[service];
    if (!upstream) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("Not found");
      return;
    }
    const method = request.method ?? "GET";
    if (method === "GET" || method === "DELETE") {
      if (unconnected(request)) {
        response.writeHead(405, { allow: "POST" });
        response.end();
        return;
      }
      await forward(request, response, upstream, method, undefined);
      return;
    }
    if (method !== "POST") {
      response.writeHead(405);
      response.end();
      return;
    }
    const body = await readBody(request);
    if (unconnected(request)) {
      const answered = answerUnconnected(body.toString("utf8"));
      response.writeHead(answered.status, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      response.end(answered.body);
      return;
    }
    await forward(request, response, upstream, "POST", body);
  } catch (error) {
    if (response.headersSent) {
      response.end();
      return;
    }
    const tooBig = error instanceof Error && error.message === "body too large";
    response.writeHead(tooBig ? 413 : 500, { "content-type": "text/plain" });
    response.end(tooBig ? "Body too large" : "The mailbox server did not answer.");
  }
}

function unconnected(request: IncomingMessage): boolean {
  const header = request.headers.authorization ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token.length === 0 || token === UNCONNECTED_BEARER;
}

async function forward(
  request: IncomingMessage,
  response: ServerResponse,
  upstream: string,
  method: string,
  body: Buffer | undefined,
): Promise<void> {
  const headers = new Headers();
  copy(request, headers, "authorization");
  copy(request, headers, "content-type");
  copy(request, headers, "accept");
  copy(request, headers, "mcp-session-id");
  copy(request, headers, "mcp-protocol-version");
  copy(request, headers, "last-event-id");
  const controller = new AbortController();
  const onClose = () => {
    if (!response.writableEnded) controller.abort();
  };
  response.on("close", onClose);
  try {
    const upstreamResponse = await fetch(upstream, {
      method,
      headers,
      body: body ? new Uint8Array(body) : undefined,
      redirect: "manual",
      signal: controller.signal,
    });
    if (upstreamResponse.status === 401) {
      const raw = await upstreamResponse.text();
      const relayed = relayMailboxResponse(401, raw);
      if (!response.headersSent) {
        response.writeHead(relayed.status, {
          "content-type": "application/json",
          "cache-control": "no-store",
        });
        response.end(relayed.body);
      }
      return;
    }
    const out: Record<string, string> = {};
    for (const name of ["content-type", "mcp-session-id", "mcp-protocol-version", "cache-control"]) {
      const value = upstreamResponse.headers.get(name);
      if (value) out[name] = value;
    }
    response.writeHead(upstreamResponse.status, out);
    if (!upstreamResponse.body) {
      response.end();
      return;
    }
    const reader = upstreamResponse.body.getReader();
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      response.write(Buffer.from(chunk.value));
    }
    response.end();
  } catch {
    if (!response.headersSent) {
      response.writeHead(502, { "content-type": "text/plain" });
      response.end("The mailbox server did not answer.");
    } else {
      response.end();
    }
  } finally {
    response.off("close", onClose);
  }
}

function copy(request: IncomingMessage, headers: Headers, name: string): void {
  const value = request.headers[name];
  if (typeof value === "string" && value.length > 0) headers.set(name, value);
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
