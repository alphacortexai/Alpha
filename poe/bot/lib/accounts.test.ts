import assert from "node:assert/strict";
import { mkdtemp, rm, stat, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { homePage } from "./home-page.js";
import {
  clearSessionCookie,
  getUser,
  sessionCookie,
  setAccountsDirForTests,
  signIn,
  signUp,
  updatePreferences,
  userFromRequest,
} from "./accounts.js";
import { authorizationHeaders, userHasService } from "./user-oauth.js";

const dir = await mkdtemp(path.join(tmpdir(), "poe-accounts-"));
setAccountsDirForTests(dir);

try {
  const created = await signUp({
    email: "Ada@Example.com",
    password: "long-password",
    displayName: "Ada",
  });
  assert.equal(created.ok, true);
  if (!created.ok) throw new Error("signup");
  assert.equal(created.user.email, "ada@example.com");
  assert.equal(created.user.displayName, "Ada");
  assert.equal(created.user.timezone, "UTC");

  const duplicate = await signUp({ email: "ada@example.com", password: "another-password" });
  assert.equal(duplicate.ok, false);

  const wrong = await signIn({ email: "ada@example.com", password: "not-the-password" });
  assert.equal(wrong.ok, false);

  const signedIn = await signIn({ email: "ada@example.com", password: "long-password" });
  assert.equal(signedIn.ok, true);
  if (!signedIn.ok) throw new Error("signin");

  const short = await signUp({ email: "bea@example.com", password: "short" });
  assert.equal(short.ok, false);

  const prefs = await updatePreferences(created.user.id, {
    displayName: "Ada Lovelace",
    timezone: "Africa/Kampala",
    notes: "Prefer morning summaries.",
  });
  assert.equal(prefs.ok, true);
  if (!prefs.ok) throw new Error("prefs");
  assert.equal(prefs.user.timezone, "Africa/Kampala");

  const secret = await updatePreferences(created.user.id, {
    displayName: "Ada",
    timezone: "UTC",
    notes: "api key sk-live",
  });
  assert.equal(secret.ok, false);
  const still = await getUser(created.user.id);
  assert.equal(still?.notes, "Prefer morning summaries.");

  const badZone = await updatePreferences(created.user.id, {
    displayName: "Ada",
    timezone: "Not/AZone",
    notes: "",
  });
  assert.equal(badZone.ok, false);

  const setCookie = await sessionCookie(created.user.id, false);
  assert.match(setCookie, /HttpOnly/);
  assert.doesNotMatch(setCookie, /Secure/);
  const pair = setCookie.split(";")[0] ?? "";
  const request = new Request("http://127.0.0.1/v1/channels/home/", { headers: { cookie: pair } });
  const fromCookie = await userFromRequest(request);
  assert.equal(fromCookie?.id, created.user.id);

  const tampered = pair.slice(0, -4) + "xxxx";
  const forged = new Request("http://127.0.0.1/", { headers: { cookie: tampered } });
  assert.equal(await userFromRequest(forged), undefined);

  const other = await signUp({ email: "bea@example.com", password: "bea-password" });
  assert.equal(other.ok, true);
  if (!other.ok) throw new Error("other");

  const tokenDir = path.join(dir, "tokens", created.user.id);
  await mkdir(tokenDir, { recursive: true });
  const tokenFile = path.join(tokenDir, "gmail.json");
  await writeFile(
    tokenFile,
    JSON.stringify({ access_token: "ada-token", token_type: "Bearer", expires_at: Date.now() + 60 * 60 * 1000 }),
    { mode: 0o600 },
  );
  const mode = (await stat(tokenFile)).mode & 0o777;
  assert.equal(mode, 0o600);

  assert.equal(await userHasService(created.user.id, "gmail"), true);
  assert.equal(await userHasService(other.user.id, "gmail"), false);
  assert.equal(await userHasService(created.user.id, "google-calendar"), false);
  assert.equal(await userHasService("../ada", "gmail"), false);

  const adaHeaders = await authorizationHeaders(created.user.id, "gmail");
  const beaHeaders = await authorizationHeaders(other.user.id, "gmail");
  assert.deepEqual(adaHeaders, { Authorization: "Bearer ada-token" });
  assert.equal(beaHeaders, null);

  const page = homePage({
    base: "http://127.0.0.1:3000/poe/v1/channels/home/",
    callbackUrl: "http://127.0.0.1:3000/poe/v1/channels/home/oauth/callback",
    debugUrl: "../debug/view",
    notice: "",
    googleClient: "missing",
    user: {
      email: created.user.email,
      displayName: "Ada",
      timezone: "UTC",
      notes: `<script>alert(1)</script>`,
    },
    services: [
      { id: "gmail", label: "Gmail", summary: "Read mail", state: "ready" },
      { id: "whatsapp", label: "WhatsApp", summary: "Messages", state: "soon" },
    ],
  });
  assert.equal(page.includes("<script>alert(1)</script>"), false);
  assert.equal(page.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), true);
  assert.match(page, /data-connect="gmail"/);
  assert.doesNotMatch(page, /data-connect="whatsapp"/);

  assert.match(clearSessionCookie(false), /Max-Age=0/);
  console.log("accounts.test.ts ok");
} finally {
  setAccountsDirForTests(undefined);
  await rm(dir, { recursive: true, force: true });
}
