import assert from "node:assert/strict";

import { authorizationUrl, codeChallenge, withGmailTokens } from "./gmail-signin.mjs";

const challenge = codeChallenge("verifier");
assert.equal(challenge.length > 20, true);
const url = authorizationUrl("client-id", challenge, "state-1");
assert.equal(url.origin, "https://accounts.google.com");
assert.equal(url.searchParams.get("client_id"), "client-id");
assert.equal(url.searchParams.get("redirect_uri"), "http://localhost:8787/callback");
assert.equal(url.searchParams.get("access_type"), "offline");
assert.equal(url.searchParams.get("prompt"), "consent");
assert.equal(url.searchParams.get("code_challenge_method"), "S256");
assert.equal(url.href.includes("client_secret"), false);
assert.equal(url.href.includes("gmail.send"), false);

const saved = withGmailTokens(
  { alphavantage: { resourceUrl: "https://mcp.alphavantage.co/mcp" } },
  { client_id: "id", client_secret: "secret" },
  { access_token: "token", token_type: "Bearer", refresh_token: "refresh" },
);
assert.equal(saved.alphavantage.resourceUrl, "https://mcp.alphavantage.co/mcp");
assert.equal(saved.gmail.resourceUrl, "https://gmailmcp.googleapis.com/mcp/v1");
assert.equal(saved.gmail.tokens.refresh_token, "refresh");
assert.deepEqual(saved.gmail.clientInfo.redirect_uris, ["http://localhost:8787/callback"]);

console.log("gmail-signin.test.mjs ok");
