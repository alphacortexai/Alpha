import assert from "node:assert/strict";

import { gmailAuthPath, gmailClientFromEnv, withGmailClient } from "./gmail-auth.js";

const missing = gmailClientFromEnv({});
assert.equal("missing" in missing && missing.missing, "POE_GOOGLE_CLIENT_ID");
const secretOnly = gmailClientFromEnv({ POE_GOOGLE_CLIENT_ID: "id" });
assert.equal("missing" in secretOnly && secretOnly.missing, "POE_GOOGLE_CLIENT_SECRET");

const client = gmailClientFromEnv({ POE_GOOGLE_CLIENT_ID: " id ", POE_GOOGLE_CLIENT_SECRET: " secret " });
assert.equal("client_id" in client && client.client_id, "id");
assert.equal("client_secret" in client && client.client_secret, "secret");
assert.deepEqual("redirect_uris" in client && client.redirect_uris, ["http://localhost:8787/callback"]);

const saved = withGmailClient(
  { alphavantage: { resourceUrl: "https://mcp.alphavantage.co/mcp", tokens: { access_token: "keep" } } },
  client as { client_id: string; client_secret: string; redirect_uris: string[] },
);
assert.equal(saved.alphavantage?.tokens && (saved.alphavantage.tokens as { access_token: string }).access_token, "keep");
assert.equal(saved.gmail?.resourceUrl, "https://gmailmcp.googleapis.com/mcp/v1");
assert.equal(saved.gmail?.clientInfo?.redirect_uris[0], "http://localhost:8787/callback");
assert.equal(gmailAuthPath({ AGENT_SERVE_CONFIG_DIR: "/cfg" }), "/cfg/mcp-auth.json");

console.log("gmail-auth.test.ts ok");
