import assert from "node:assert/strict";

import type { SessionInfo } from "@grok/agent-sdk";

import calendar from "../mcp-connections/google-calendar.js";
import gmail from "../mcp-connections/gmail.js";
import { answerUnconnected, ensureMcpBridge, listConnectedTools, MCP_BRIDGE_PORT, stopMcpBridge, UNCONNECTED_BEARER } from "./mcp-bridge.js";
import { perUserAuth } from "./per-user-connection.js";

assert.equal("url" in gmail ? gmail.url : "", `http://127.0.0.1:${MCP_BRIDGE_PORT}/gmail`);
assert.equal("url" in calendar ? calendar.url : "", `http://127.0.0.1:${MCP_BRIDGE_PORT}/google-calendar`);
assert.equal("advertiseTools" in gmail, false);
assert.equal("advertiseTools" in calendar, false);
assert.equal("optional" in gmail, false);
assert.equal("auth" in gmail && typeof gmail.auth, "function");

const disconnected = await perUserAuth("gmail")({
  auth: { authenticator: "schedule", principalId: "schedule", principalType: "agent" },
} as unknown as SessionInfo);
assert.equal(disconnected.headers.Authorization, `Bearer ${UNCONNECTED_BEARER}`);

const listed = answerUnconnected(
  JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
);
assert.equal(listed.status, 200);
assert.match(listed.body, /"tools":\[\]/);

const init = answerUnconnected(
  JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-03-26" },
  }),
);
assert.match(init.body, /2025-03-26/);

const note = answerUnconnected(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }));
assert.equal(note.status, 202);

await ensureMcpBridge();
try {
  const response = await fetch(`http://127.0.0.1:${MCP_BRIDGE_PORT}/gmail`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${UNCONNECTED_BEARER}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 7, method: "tools/list" }),
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { result?: { tools?: unknown[] } };
  assert.deepEqual(body.result?.tools, []);

  const missing = await fetch(`http://127.0.0.1:${MCP_BRIDGE_PORT}/secret`, { method: "POST" });
  assert.equal(missing.status, 404);

  const forwarded = await fetch(`http://127.0.0.1:${MCP_BRIDGE_PORT}/gmail`, {
    method: "POST",
    headers: {
      authorization: "Bearer poe-forward-check",
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 8, method: "tools/list" }),
    signal: AbortSignal.timeout(8000),
  });
  const forwardedText = await forwarded.text();
  assert.doesNotMatch(forwardedText, /poe-mailbox/);
  assert.notEqual(forwarded.status, 404);

  const signedOut = await listConnectedTools("gmail", `Bearer ${UNCONNECTED_BEARER}`);
  assert.deepEqual(signedOut, []);
  await assert.rejects(() => listConnectedTools("gmail", "Bearer poe-forward-check"));
} finally {
  await stopMcpBridge();
}

console.log("mcp-bridge.test.ts ok");
