import { randomBytes } from "node:crypto";
import { chmod, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  auth,
  type OAuthClientProvider,
  type OAuthDiscoveryState,
} from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";

import { accountsDir } from "./accounts.js";
import { connectableService, type ConnectableService, type ServiceId } from "./services.js";

type PendingAuth = {
  state: string;
  userId: string;
  serviceId: ServiceId;
  redirectUrl: string;
  codeVerifier: string;
  createdAt: number;
};

type SavedTokens = OAuthTokens & {
  expires_at?: number;
};

const TEN_MINUTES = 10 * 60 * 1000;
const refreshes = new Map<string, Promise<Record<string, string> | null>>();

export async function userHasService(userId: string, serviceId: string): Promise<boolean> {
  if (!safeUserId(userId) || !connectableService(serviceId)) return false;
  const saved = await readJson<SavedTokens>(tokenFile(userId, serviceId as ServiceId));
  return typeof saved?.access_token === "string" && saved.access_token.length > 0;
}

export async function connectedServiceIds(userId: string): Promise<ServiceId[]> {
  if (!safeUserId(userId)) return [];
  const dir = path.join(accountsDir(), "tokens", userId);
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const connected: ServiceId[] = [];
  for (const name of names) {
    const id = name.replace(/\.json$/, "");
    if (await userHasService(userId, id)) connected.push(id as ServiceId);
  }
  return connected;
}

export async function disconnectService(userId: string, serviceId: string): Promise<boolean> {
  const service = connectableService(serviceId);
  if (!safeUserId(userId) || !service) return false;
  await rm(tokenFile(userId, service.id), { force: true });
  return true;
}

/**
 * Bearer header for this person's connection. Missing, expired, or another
 * person's token returns null so the optional connection is skipped.
 */
export function authorizationHeaders(
  userId: string,
  serviceId: string,
): Promise<Record<string, string> | null> {
  const key = `${userId}:${serviceId}`;
  const existing = refreshes.get(key);
  if (existing) return existing;
  const run = loadHeaders(userId, serviceId).finally(() => {
    refreshes.delete(key);
  });
  refreshes.set(key, run);
  return run;
}

export async function beginConnect(
  userId: string,
  serviceId: string,
  redirectUrl: string,
): Promise<{ ok: true; url?: string; already?: true } | { ok: false; error: string }> {
  const service = connectableService(serviceId);
  if (!safeUserId(userId) || !service) return { ok: false, error: "That connection is not available." };
  if ((await googleClientSource()) === "missing") {
    return { ok: false, error: "Save a Google client ID on this page first. Then use Connect." };
  }
  if (!redirectUrl.startsWith("http://") && !redirectUrl.startsWith("https://")) {
    return { ok: false, error: "Poe could not build a sign-in redirect." };
  }
  const current = await readJson<SavedTokens>(tokenFile(userId, service.id));
  if (current?.access_token && (current.expires_at ?? 0) > Date.now() + 60_000) {
    return { ok: true, already: true };
  }
  await sweepPending();
  const provider = new FileProvider(service, userId, redirectUrl);
  try {
    const result = await auth(provider, { serverUrl: service.url });
    if (result === "AUTHORIZED") return { ok: true, already: true };
    if (!provider.authorizationUrl) return { ok: false, error: connectFailure("Google did not open a sign-in page.", redirectUrl) };
    return { ok: true, url: provider.authorizationUrl };
  } catch (error) {
    return { ok: false, error: connectFailure(safeError(error), redirectUrl) };
  }
}

export async function finishConnect(
  userId: string,
  state: string,
  code: string,
): Promise<{ ok: true; serviceId: ServiceId } | { ok: false; error: string }> {
  if (!safeUserId(userId) || !safeState(state) || !code) {
    return { ok: false, error: "This sign-in session expired. Use Connect again." };
  }
  const pending = await readJson<PendingAuth>(pendingFile(state));
  if (!pending || pending.userId !== userId || !connectableService(pending.serviceId)) {
    return { ok: false, error: "This sign-in session expired. Use Connect again." };
  }
  if (Date.now() - pending.createdAt > TEN_MINUTES) {
    await rm(pendingFile(state), { force: true });
    return { ok: false, error: "This sign-in session expired. Use Connect again." };
  }
  const service = connectableService(pending.serviceId);
  if (!service) return { ok: false, error: "That connection is not available." };
  const provider = new FileProvider(service, userId, pending.redirectUrl, pending);
  try {
    const result = await auth(provider, { serverUrl: service.url, authorizationCode: code });
    await rm(pendingFile(state), { force: true });
    if (result !== "AUTHORIZED") return { ok: false, error: connectFailure("Google did not finish sign-in.", pending.redirectUrl) };
    return { ok: true, serviceId: service.id };
  } catch (error) {
    return { ok: false, error: connectFailure(safeError(error), pending.redirectUrl) };
  }
}

class FileProvider implements OAuthClientProvider {
  authorizationUrl = "";
  private pendingState = "";

  constructor(
    private readonly service: ConnectableService,
    private readonly userId: string,
    private readonly redirect: string,
    private readonly pending?: PendingAuth,
    private readonly refreshOnly = false,
  ) {}

  get redirectUrl(): string {
    return this.redirect;
  }

  get clientMetadata(): OAuthClientMetadata {
    const secret = googleClientSecret();
    return {
      redirect_uris: [this.redirect],
      client_name: "Poe",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: secret ? "client_secret_post" : "none",
    };
  }

  state(): string {
    this.pendingState = this.pending?.state ?? randomBytes(24).toString("base64url");
    return this.pendingState;
  }

  async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
    const configured = await configuredClient();
    if (configured) return configured;
    return readJson<OAuthClientInformationMixed>(clientFile(this.service.id));
  }

  async saveClientInformation(info: OAuthClientInformationMixed): Promise<void> {
    if (await configuredClient()) return;
    await writePrivateJson(clientFile(this.service.id), info);
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const saved = await readJson<SavedTokens>(tokenFile(this.userId, this.service.id));
    if (!saved?.access_token) return undefined;
    return saved;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const expiresAt = typeof tokens.expires_in === "number" ? Date.now() + tokens.expires_in * 1000 : Date.now() + 45 * 60 * 1000;
    const saved: SavedTokens = { ...tokens, expires_at: expiresAt };
    await writePrivateJson(tokenFile(this.userId, this.service.id), saved);
  }

  async redirectToAuthorization(url: URL): Promise<void> {
    if (this.refreshOnly) throw new Error("Reconnect required");
    this.authorizationUrl = url.toString();
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    if (!safeState(this.pendingState)) throw new Error("Could not start sign-in.");
    const pending: PendingAuth = {
      state: this.pendingState,
      userId: this.userId,
      serviceId: this.service.id,
      redirectUrl: this.redirect,
      codeVerifier,
      createdAt: Date.now(),
    };
    await writePrivateJson(pendingFile(this.pendingState), pending);
  }

  async codeVerifier(): Promise<string> {
    if (!this.pending?.codeVerifier) throw new Error("This sign-in session expired. Use Connect again.");
    return this.pending.codeVerifier;
  }

  async saveDiscoveryState(state: OAuthDiscoveryState): Promise<void> {
    await writePrivateJson(discoveryFile(this.service.id), state);
  }

  async discoveryState(): Promise<OAuthDiscoveryState | undefined> {
    return readJson<OAuthDiscoveryState>(discoveryFile(this.service.id));
  }
}

async function loadHeaders(userId: string, serviceId: string): Promise<Record<string, string> | null> {
  const service = connectableService(serviceId);
  if (!safeUserId(userId) || !service) return null;
  const saved = await readJson<SavedTokens>(tokenFile(userId, service.id));
  if (!saved?.access_token) return null;
  if ((saved.expires_at ?? 0) > Date.now() + 60_000) return bearer(saved.access_token);
  if (!saved.refresh_token) return null;
  const provider = new FileProvider(service, userId, "http://127.0.0.1/oauth/callback", undefined, true);
  try {
    const result = await auth(provider, { serverUrl: service.url });
    if (result !== "AUTHORIZED") return null;
  } catch {
    await rm(tokenFile(userId, service.id), { force: true });
    return null;
  }
  const fresh = await readJson<SavedTokens>(tokenFile(userId, service.id));
  if (!fresh?.access_token) return null;
  return bearer(fresh.access_token);
}

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

type AppGoogleClient = {
  client_id: string;
  client_secret?: string;
};

export type GoogleClientSource = "environment" | "page" | "missing";

export async function googleClientSource(): Promise<GoogleClientSource> {
  if (process.env.POE_GOOGLE_CLIENT_ID?.trim()) return "environment";
  const saved = await readJson<AppGoogleClient>(appClientFile());
  if (saved?.client_id) return "page";
  return "missing";
}

export async function saveAppGoogleClient(
  clientId: string,
  clientSecret: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (process.env.POE_GOOGLE_CLIENT_ID?.trim()) {
    return { ok: false, error: "POE_GOOGLE_CLIENT_ID is already set in the environment." };
  }
  const id = clientId.trim();
  const secret = clientSecret.trim();
  if (!/^[A-Za-z0-9._-]{8,200}$/.test(id)) return { ok: false, error: "Enter the Google client ID." };
  if (secret.length > 256 || /[\s]/.test(secret)) return { ok: false, error: "That client secret does not look valid." };
  const record: AppGoogleClient = secret ? { client_id: id, client_secret: secret } : { client_id: id };
  await writePrivateJson(appClientFile(), record);
  return { ok: true };
}

async function configuredClient(): Promise<OAuthClientInformationMixed | undefined> {
  const fromEnv = envClient();
  if (fromEnv) return fromEnv;
  const saved = await readJson<AppGoogleClient>(appClientFile());
  if (!saved?.client_id) return undefined;
  if (saved.client_secret) return { client_id: saved.client_id, client_secret: saved.client_secret };
  return { client_id: saved.client_id };
}

function envClient(): OAuthClientInformationMixed | undefined {
  const clientId = process.env.POE_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return undefined;
  const clientSecret = googleClientSecret();
  if (clientSecret) return { client_id: clientId, client_secret: clientSecret };
  return { client_id: clientId };
}

function googleClientSecret(): string | undefined {
  const secret = process.env.POE_GOOGLE_CLIENT_SECRET?.trim();
  return secret ? secret : undefined;
}

function connectFailure(message: string, redirectUrl: string): string {
  return `${message} Google will not let Poe register itself. Save a Google client ID on this page and register this redirect: ${redirectUrl}`;
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Google sign-in failed.";
  if (/bearer\s+|access_token|refresh_token|ya29\.|client_secret/i.test(message)) return "Google sign-in failed.";
  return message.replace(/\s+/g, " ").slice(0, 240);
}

function appClientFile(): string {
  return path.join(accountsDir(), "google-app-client.json");
}

function tokenFile(userId: string, serviceId: ServiceId): string {
  return path.join(accountsDir(), "tokens", userId, `${serviceId}.json`);
}

function clientFile(serviceId: ServiceId): string {
  return path.join(accountsDir(), "clients", `${serviceId}.json`);
}

function discoveryFile(serviceId: ServiceId): string {
  return path.join(accountsDir(), "clients", `${serviceId}.discovery.json`);
}

function pendingFile(state: string): string {
  return path.join(accountsDir(), "pending", `${state}.json`);
}

function safeUserId(userId: string): boolean {
  return /^usr_[a-f0-9]{32}$/.test(userId);
}

function safeState(state: string): boolean {
  return /^[A-Za-z0-9_-]{20,200}$/.test(state);
}

async function sweepPending(): Promise<void> {
  const dir = path.join(accountsDir(), "pending");
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    return;
  }
  const cutoff = Date.now() - TEN_MINUTES;
  for (const name of names) {
    const pending = await readJson<PendingAuth>(path.join(dir, name));
    if (!pending || pending.createdAt < cutoff) await rm(path.join(dir, name), { force: true });
  }
}

async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return undefined;
  }
}

async function writePrivateJson(file: string, value: unknown): Promise<void> {
  const dir = path.dirname(file);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value), { mode: 0o600 });
  await chmod(tmp, 0o600);
  await rename(tmp, file);
  await chmod(file, 0o600);
}
