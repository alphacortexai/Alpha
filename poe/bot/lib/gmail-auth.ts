import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const GMAIL_MCP_URL = "https://gmailmcp.googleapis.com/mcp/v1";
export const GMAIL_OAUTH_REDIRECT = "http://localhost:8787/callback";

export type GmailClient = {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
};

type AuthFile = Record<string, { resourceUrl?: string; clientInfo?: GmailClient; tokens?: unknown }>;

export function gmailAuthPath(env: NodeJS.ProcessEnv = process.env, home = homedir()): string {
  const root = env.AGENT_SERVE_CONFIG_DIR ?? join(env.XDG_CONFIG_HOME ?? join(home, ".config"), "agent-serve");
  return join(root, "mcp-auth.json");
}

export function gmailClientFromEnv(env: NodeJS.ProcessEnv): GmailClient | { missing: string } {
  const clientId = env.POE_GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.POE_GOOGLE_CLIENT_SECRET?.trim() ?? "";
  if (!clientId) return { missing: "POE_GOOGLE_CLIENT_ID" };
  if (!clientSecret) return { missing: "POE_GOOGLE_CLIENT_SECRET" };
  return { client_id: clientId, client_secret: clientSecret, redirect_uris: [GMAIL_OAUTH_REDIRECT] };
}

export function withGmailClient(existing: unknown, client: GmailClient): AuthFile {
  const file: AuthFile = existing && typeof existing === "object" && !Array.isArray(existing) ? { ...(existing as AuthFile) } : {};
  const current = file.gmail;
  const keepTokens = current?.resourceUrl === GMAIL_MCP_URL ? current.tokens : undefined;
  file.gmail = { resourceUrl: GMAIL_MCP_URL, clientInfo: client, ...(keepTokens !== undefined ? { tokens: keepTokens } : {}) };
  return file;
}

export async function saveGmailClient(client: GmailClient, env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const path = gmailAuthPath(env);
  let existing: unknown = {};
  try {
    existing = JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch {
    existing = {};
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(withGmailClient(existing, client), null, 2)}\n`, { mode: 0o600 });
  await chmod(path, 0o600).catch(() => undefined);
  return path;
}
