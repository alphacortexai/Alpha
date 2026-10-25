import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const COOKIE = "poe_session";
const SESSION_DAYS = 30;
const SECRET_TEXT = /api[ _-]?key|password|secret|bearer\s+|private key/i;

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  notes: string;
  createdAt: string;
};

type StoredUser = PublicUser & {
  passwordHash: string;
  passwordSalt: string;
};

type SessionPayload = {
  u: string;
  e: number;
};

let rootOverride: string | undefined;
let writeChain: Promise<unknown> = Promise.resolve();

export function setAccountsDirForTests(dir: string | undefined): void {
  rootOverride = dir;
}

export function accountsDir(): string {
  if (rootOverride) return rootOverride;
  if (process.env.POE_ACCOUNTS_DIR) return process.env.POE_ACCOUNTS_DIR;
  const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
  return path.join(projectRoot, ".poe-accounts");
}

function usersFile(): string {
  return path.join(accountsDir(), "users.json");
}

export function containsSecret(value: string): boolean {
  return SECRET_TEXT.test(value);
}

export async function signUp(input: {
  email: string;
  password: string;
  displayName?: string;
  timezone?: string;
}): Promise<{ ok: true; user: PublicUser } | { ok: false; error: string }> {
  const email = normalizeEmail(input.email);
  const passwordError = passwordProblem(input.password);
  if (!email) return { ok: false, error: "Enter a valid email address." };
  if (passwordError) return { ok: false, error: passwordError };
  const timezone = (input.timezone ?? "").trim() || "UTC";
  if (!validTimezone(timezone)) return { ok: false, error: "Enter a timezone such as Africa/Kampala or UTC." };
  const displayName = cleanName(input.displayName, email);
  return locked(async () => {
    const users = await readUsers();
    if (users.some((user) => user.email === email)) {
      return { ok: false as const, error: "An account with that email already exists." };
    }
    const user = await storeUser(users, {
      id: `usr_${randomBytes(16).toString("hex")}`,
      email,
      displayName,
      timezone,
      notes: "",
      createdAt: new Date().toISOString(),
      ...(await hashPassword(input.password)),
    });
    return { ok: true as const, user: publicUser(user) };
  });
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<{ ok: true; user: PublicUser } | { ok: false; error: string }> {
  const email = normalizeEmail(input.email);
  const users = await readUsers();
  const user = email ? users.find((item) => item.email === email) : undefined;
  const salt = user ? Buffer.from(user.passwordSalt, "hex") : Buffer.alloc(16, 1);
  const hash = user ? Buffer.from(user.passwordHash, "hex") : Buffer.alloc(32);
  let derived: Buffer;
  try {
    derived = (await scryptAsync(input.password, salt, 32)) as Buffer;
  } catch {
    return { ok: false, error: "Email or password is wrong." };
  }
  const matches = user !== undefined && derived.length === hash.length && timingSafeEqual(derived, hash);
  if (!matches || !user) return { ok: false, error: "Email or password is wrong." };
  return { ok: true, user: publicUser(user) };
}

export async function getUser(id: string): Promise<PublicUser | undefined> {
  const users = await readUsers();
  const user = users.find((item) => item.id === id);
  return user ? publicUser(user) : undefined;
}

export async function updatePreferences(
  userId: string,
  input: { displayName: string; timezone: string; notes: string },
): Promise<{ ok: true; user: PublicUser } | { ok: false; error: string }> {
  const displayName = cleanName(input.displayName, "");
  if (!displayName) return { ok: false, error: "Enter a display name." };
  if (!validTimezone(input.timezone)) return { ok: false, error: "Enter a timezone such as Africa/Kampala or UTC." };
  if (input.notes.length > 2000) return { ok: false, error: "Notes must be 2000 characters or fewer." };
  if (containsSecret(input.notes)) return { ok: false, error: "Notes cannot hold passwords or API keys." };
  return locked(async () => {
    const users = await readUsers();
    const index = users.findIndex((item) => item.id === userId);
    const current = users[index];
    if (!current) return { ok: false as const, error: "Sign in again." };
    current.displayName = displayName;
    current.timezone = input.timezone.trim();
    current.notes = input.notes;
    users[index] = current;
    await writeUsers(users);
    return { ok: true as const, user: publicUser(current) };
  });
}

export async function sessionCookie(userId: string, secure: boolean): Promise<string> {
  const payload: SessionPayload = {
    u: userId,
    e: Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60,
  };
  const body = base64url(Buffer.from(JSON.stringify(payload)));
  const sig = base64url(createHmac("sha256", await sessionKey()).update(body).digest());
  return cookieHeader(`${body}.${sig}`, secure, SESSION_DAYS * 24 * 60 * 60);
}

export function clearSessionCookie(secure: boolean): string {
  return cookieHeader("", secure, 0);
}

export async function userFromRequest(request: Request): Promise<PublicUser | undefined> {
  const raw = readCookie(request, COOKIE);
  if (!raw) return undefined;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return undefined;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = base64url(createHmac("sha256", await sessionKey()).update(body).digest());
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return undefined;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return undefined;
  }
  if (typeof payload.u !== "string" || typeof payload.e !== "number") return undefined;
  if (payload.e < Math.floor(Date.now() / 1000)) return undefined;
  return getUser(payload.u);
}

function publicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    timezone: user.timezone,
    notes: user.notes,
    createdAt: user.createdAt,
  };
}

async function storeUser(users: StoredUser[], user: StoredUser): Promise<StoredUser> {
  users.push(user);
  await writeUsers(users);
  return user;
}

async function hashPassword(password: string): Promise<{ passwordHash: string; passwordSalt: string }> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(password, salt, 32)) as Buffer;
  return { passwordSalt: salt.toString("hex"), passwordHash: hash.toString("hex") };
}

function normalizeEmail(email: string): string | undefined {
  const value = email.trim().toLowerCase();
  if (value.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return undefined;
  return value;
}

function passwordProblem(password: string): string | undefined {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 200) return "Use a shorter password.";
  return undefined;
}

function cleanName(name: string | undefined, email: string): string {
  const trimmed = (name ?? "").replace(/[\r\n\t]/g, " ").trim();
  if (trimmed) return trimmed.slice(0, 80);
  const local = email.split("@")[0] ?? "Poe";
  return local.slice(0, 80) || "Poe";
}

function validTimezone(zone: string): boolean {
  const value = zone.trim();
  if (!value || value.length > 80) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

async function readUsers(): Promise<StoredUser[]> {
  try {
    const parsed = JSON.parse(await readFile(usersFile(), "utf8")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredUser);
  } catch {
    return [];
  }
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  await writePrivate(usersFile(), JSON.stringify(users));
}

function isStoredUser(value: unknown): value is StoredUser {
  if (typeof value !== "object" || value === null) return false;
  const user = value as StoredUser;
  return (
    typeof user.id === "string" &&
    typeof user.email === "string" &&
    typeof user.passwordHash === "string" &&
    typeof user.passwordSalt === "string" &&
    typeof user.displayName === "string" &&
    typeof user.timezone === "string" &&
    typeof user.notes === "string"
  );
}

async function sessionKey(): Promise<Buffer> {
  const fromEnv = process.env.POE_SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) return Buffer.from(fromEnv);
  return locked(async () => {
    const file = path.join(accountsDir(), "session.key");
    try {
      const existing = await readFile(file);
      if (existing.length >= 16) return existing;
    } catch {
      // Create one below.
    }
    const key = randomBytes(32);
    await writePrivate(file, key);
    return key;
  });
}

async function writePrivate(file: string, data: string | Buffer): Promise<void> {
  const dir = path.dirname(file);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, data, { mode: 0o600 });
  await chmod(tmp, 0o600);
  await rename(tmp, file);
  await chmod(file, 0o600);
}

function cookieHeader(value: string, secure: boolean, maxAge: number): string {
  const parts = [
    `${COOKIE}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function base64url(value: Buffer): string {
  return value.toString("base64url");
}

function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
