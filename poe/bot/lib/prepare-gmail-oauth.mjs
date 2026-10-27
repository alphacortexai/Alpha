import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const GMAIL_MCP_URL = "https://gmailmcp.googleapis.com/mcp/v1";
const GMAIL_OAUTH_REDIRECT = "http://localhost:8787/callback";

function authPath(env) {
  const root = env.AGENT_SERVE_CONFIG_DIR ?? join(env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "agent-serve");
  return join(root, "mcp-auth.json");
}

function clientFromEnv(env) {
  const clientId = env.POE_GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.POE_GOOGLE_CLIENT_SECRET?.trim() ?? "";
  if (!clientId) return { missing: "POE_GOOGLE_CLIENT_ID" };
  if (!clientSecret) return { missing: "POE_GOOGLE_CLIENT_SECRET" };
  return { client_id: clientId, client_secret: clientSecret, redirect_uris: [GMAIL_OAUTH_REDIRECT] };
}

const client = clientFromEnv(process.env);
if ("missing" in client) {
  console.error(`Set ${client.missing} in this terminal, then run this again. Do not put the value in a file in the repo.`);
  process.exitCode = 1;
} else {
  const path = authPath(process.env);
  let existing = {};
  try {
    existing = JSON.parse(await readFile(path, "utf8"));
  } catch {
    existing = {};
  }
  const current = existing.gmail;
  const keepTokens = current?.resourceUrl === GMAIL_MCP_URL ? current.tokens : undefined;
  existing.gmail = { resourceUrl: GMAIL_MCP_URL, clientInfo: client, ...(keepTokens !== undefined ? { tokens: keepTokens } : {}) };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(existing, null, 2)}\n`, { mode: 0o600 });
  await chmod(path, 0o600).catch(() => undefined);
  console.log("Saved the Gmail OAuth client for Poe. Next, from the poe folder: npx @grok/agent-sdk mcp oauth gmail");
  console.log(path);
}
