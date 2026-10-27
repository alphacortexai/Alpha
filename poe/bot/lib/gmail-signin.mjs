import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const GMAIL_MCP_URL = "https://gmailmcp.googleapis.com/mcp/v1";
const REDIRECT = "http://localhost:8787/callback";
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
];

export function authPath(env = process.env, home = homedir()) {
  const root = env.AGENT_SERVE_CONFIG_DIR ?? join(env.XDG_CONFIG_HOME ?? join(home, ".config"), "agent-serve");
  return join(root, "mcp-auth.json");
}

export function authorizationUrl(clientId, challenge, state) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", REDIRECT);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  return url;
}

export function codeChallenge(verifier) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function withGmailTokens(existing, client, tokens) {
  const file = existing && typeof existing === "object" && !Array.isArray(existing) ? { ...existing } : {};
  file.gmail = {
    resourceUrl: GMAIL_MCP_URL,
    clientInfo: {
      client_id: client.client_id,
      client_secret: client.client_secret,
      redirect_uris: [REDIRECT],
    },
    tokens,
  };
  return file;
}

function clientFromFile(file, env) {
  const saved = file?.gmail?.clientInfo;
  const clientId = saved?.client_id?.trim() || env.POE_GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = saved?.client_secret?.trim() || env.POE_GOOGLE_CLIENT_SECRET?.trim() || "";
  if (!clientId || !clientSecret) return undefined;
  return { client_id: clientId, client_secret: clientSecret };
}

function openBrowser(url) {
  const href = url.href;
  if (process.platform === "win32") {
    execFile("rundll32", ["url.dll,FileProtocolHandler", href], () => undefined);
    return;
  }
  if (process.platform === "darwin") {
    execFile("open", [href], () => undefined);
    return;
  }
  execFile("xdg-open", [href], () => undefined);
}

export function waitForCode(state, port = 8787) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      server.close();
      fn(value);
    };
    const server = createServer((request, response) => {
      const url = new URL(request.url ?? "/", REDIRECT);
      if (url.pathname !== "/callback" || url.searchParams.get("state") !== state) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
        return;
      }
      const error = url.searchParams.get("error");
      const code = url.searchParams.get("code");
      if (!code) {
        response.writeHead(400, { "content-type": "text/html; charset=utf-8" }).end("<h1>Gmail was not connected</h1><p>You can close this tab.</p>");
        finish(reject, new Error(error ? `Google refused the sign-in (${error}).` : "Google did not return a code."));
        return;
      }
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end("<h1>Gmail is connected</h1><p>You can close this tab and return to the terminal.</p>");
      finish(resolve, code);
    });
    const timer = setTimeout(() => {
      finish(reject, new Error("Timed out waiting for the Google sign-in. Run this command again."));
    }, 5 * 60 * 1000);
    server.on("error", (error) => {
      const message = error.code === "EADDRINUSE"
        ? "Port 8787 is already in use. Close the other sign-in window and run this again."
        : error.message;
      finish(reject, new Error(message));
    });
    server.listen(port);
  });
}

async function exchange(client, code, verifier) {
  const body = new URLSearchParams({
    code,
    client_id: client.client_id,
    client_secret: client.client_secret,
    redirect_uri: REDIRECT,
    grant_type: "authorization_code",
    code_verifier: verifier,
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json();
  if (!response.ok || typeof payload.access_token !== "string") {
    const reason = typeof payload.error === "string" ? payload.error : "token exchange failed";
    throw new Error(`Google did not return a token (${reason}).`);
  }
  return {
    access_token: payload.access_token,
    token_type: typeof payload.token_type === "string" ? payload.token_type : "Bearer",
    ...(typeof payload.refresh_token === "string" ? { refresh_token: payload.refresh_token } : {}),
    ...(typeof payload.expires_in === "number" ? { expires_in: payload.expires_in } : {}),
    ...(typeof payload.scope === "string" ? { scope: payload.scope } : {}),
  };
}

async function main() {
  const path = authPath();
  let existing = {};
  try {
    existing = JSON.parse(await readFile(path, "utf8"));
  } catch {
    existing = {};
  }
  const client = clientFromFile(existing, process.env);
  if (!client) {
    console.error("Run node bot/lib/prepare-gmail-oauth.mjs in this folder first.");
    process.exitCode = 1;
    return;
  }
  const verifier = randomBytes(32).toString("base64url");
  const state = randomBytes(16).toString("hex");
  const url = authorizationUrl(client.client_id, codeChallenge(verifier), state);
  console.log("Sign in with the Gmail account in the browser.");
  console.log(url.href);
  openBrowser(url);
  const code = await waitForCode(state);
  const tokens = await exchange(client, code, verifier);
  await writeFile(path, `${JSON.stringify(withGmailTokens(existing, client, tokens), null, 2)}\n`, { mode: 0o600 });
  await chmod(path, 0o600).catch(() => undefined);
  console.log("Gmail is signed in. Restart dev, then ask Poe about your mail.");
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invoked) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Gmail sign-in failed.");
    process.exitCode = 1;
  });
}
