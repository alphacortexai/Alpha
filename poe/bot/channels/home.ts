import { defineChannel, GET, localDevStrict, POST } from "@grok/agent-sdk/channels";
import * as z from "zod/v4";

import {
  clearSessionCookie,
  getUser,
  sessionCookie,
  signIn,
  signUp,
  updatePreferences,
  userFromRequest,
  type PublicUser,
} from "../lib/accounts.js";
import { startPoeDoor, stopPoeDoor } from "../lib/door.js";
import { homePage, type HomeScreen, type HomeService } from "../lib/home-page.js";
import { CONNECTABLE_SERVICES, UPCOMING_SERVICES } from "../lib/services.js";
import { debugViewUrl, publicBaseFromRequest } from "../lib/site.js";
import { beginConnect, connectedServiceIds, disconnectService, finishConnect, googleClientSource, saveAppGoogleClient } from "../lib/user-oauth.js";

const pageQuery = z.object({
  notice: z.string().max(500).optional(),
});

const callbackQuery = z.object({
  code: z.string().max(4000).optional(),
  state: z.string().max(200).optional(),
  error: z.string().max(200).optional(),
  error_description: z.string().max(400).optional(),
});

const signupBody = z.object({
  email: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
  displayName: z.string().max(80).optional(),
  timezone: z.string().max(80).optional(),
});

const loginBody = z.object({
  email: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
});

const preferenceBody = z.object({
  displayName: z.string().min(1).max(80),
  timezone: z.string().min(1).max(80),
  notes: z.string().max(2000),
});

const serviceBody = z.object({
  service: z.string().min(1).max(40),
});

const googleClientBody = z.object({
  clientId: z.string().min(1).max(200),
  clientSecret: z.string().max(256).optional(),
});

const chatBody = z.object({
  message: z.string().min(1).max(8000),
});

export default defineChannel({
  // Loopback only. The page sets its own signed-in cookie after that.
  auth: [localDevStrict()],
  onStart(args) {
    startPoeDoor(args.logger);
  },
  onStop() {
    return stopPoeDoor();
  },
  routes: [
    GET("/", {
      description: "Poe landing page.",
      querySchema: pageQuery,
      handler: async (request, { query }) => page(request, "landing", query.notice ?? ""),
    }),
    GET("/register", {
      description: "Create a Poe account.",
      querySchema: pageQuery,
      handler: async (request, { query }) => page(request, "register", query.notice ?? ""),
    }),
    GET("/login", {
      description: "Sign in to Poe.",
      querySchema: pageQuery,
      handler: async (request, { query }) => page(request, "login", query.notice ?? ""),
    }),
    GET("/chat", {
      description: "Talk to Poe.",
      querySchema: pageQuery,
      handler: async (request, { query }) => page(request, "chat", query.notice ?? ""),
    }),
    GET("/settings", {
      description: "Preferences and Sign in with Google.",
      querySchema: pageQuery,
      handler: async (request, { query }) => page(request, "settings", query.notice ?? ""),
    }),
    GET("/oauth/callback", {
      description: "Finish Google sign-in started from Settings.",
      querySchema: callbackQuery,
      handler: async (request, { query }) => {
        const user = await userFromRequest(request);
        if (!user) return redirectTo(request, "login", "Sign in to Poe again, then use Sign in with Google.");
        if (query.error) {
          const cancelled = query.error === "access_denied";
          return redirectTo(request, "settings", cancelled ? "Google cancelled the sign-in." : "Google refused the sign-in. Use Sign in with Google again.");
        }
        if (!query.code || !query.state) return redirectTo(request, "settings", "Google did not finish sign-in. Use Sign in with Google again.");
        const done = await finishConnect(user.id, query.state, query.code);
        if (!done.ok) return redirectTo(request, "settings", done.error);
        const label = CONNECTABLE_SERVICES.find((service) => service.id === done.serviceId)?.label ?? "Account";
        return redirectTo(request, "settings", `${label} is connected.`);
      },
    }),
    POST("/signup", {
      description: "Create a Poe account.",
      bodySchema: signupBody,
      handler: async (request, { body }) => {
        const result = await signUp(body);
        if (!result.ok) return json({ ok: false, error: result.error }, 400);
        return json({ ok: true }, 200, await sessionCookie(result.user.id, isSecure(request)));
      },
    }),
    POST("/login", {
      description: "Sign in to an existing Poe account.",
      bodySchema: loginBody,
      handler: async (request, { body }) => {
        const result = await signIn(body);
        if (!result.ok) return json({ ok: false, error: result.error }, 401);
        return json({ ok: true }, 200, await sessionCookie(result.user.id, isSecure(request)));
      },
    }),
    POST("/logout", {
      description: "Clear the Poe session cookie.",
      bodySchema: z.object({}),
      handler: async (request) => json({ ok: true }, 200, clearSessionCookie(isSecure(request))),
    }),
    POST("/preferences", {
      description: "Save display name, timezone, and notes for the signed-in person.",
      bodySchema: preferenceBody,
      handler: async (request, { body }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;
        const result = await updatePreferences(user.id, body);
        if (!result.ok) return json({ ok: false, error: result.error }, 400);
        return json({ ok: true });
      },
    }),
    POST("/google-client", {
      description: "Save the one Google app id used by Sign in with Google on this computer.",
      bodySchema: googleClientBody,
      handler: async (request, { body }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;
        const result = await saveAppGoogleClient(body.clientId, body.clientSecret ?? "");
        if (!result.ok) return json({ ok: false, error: result.error }, 400);
        return json({ ok: true });
      },
    }),
    POST("/connect", {
      description: "Start Sign in with Google for Gmail or Calendar for the signed-in person.",
      bodySchema: serviceBody,
      handler: async (request, { body }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;
        const result = await beginConnect(user.id, body.service, callbackUrl(request));
        if (!result.ok) return json({ ok: false, error: result.error }, 400);
        return json({ ok: true, url: result.url, already: result.already === true });
      },
    }),
    POST("/disconnect", {
      description: "Remove the signed-in person's token for one service.",
      bodySchema: serviceBody,
      handler: async (request, { body }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;
        const removed = await disconnectService(user.id, body.service);
        if (!removed) return json({ ok: false, error: "That connection is not available." }, 400);
        return json({ ok: true });
      },
    }),
    POST("/chat", {
      description: "Send a message as the signed-in person.",
      bodySchema: chatBody,
      handler: async (request, { body, send, sessionUrls }) => {
        const user = await requireUser(request);
        if (user instanceof Response) return user;
        const fresh = (await getUser(user.id)) ?? user;
        const connected = await connectedServiceIds(fresh.id);
        let session;
        try {
          session = await send(ownerMessage(fresh, connected, body.message), {
            auth: {
              authenticator: "poe-account",
              principalId: fresh.id,
              principalType: "user",
              attributes: { email: fresh.email },
            },
            continuationToken: `home:${fresh.id}`,
            title: fresh.displayName,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Poe could not start.";
          return json({ ok: false, error: message.slice(0, 300) }, 502);
        }
        const outcome = await Promise.race([
          session.waitForCompletion(),
          new Promise<{ status: "timeout" }>((resolve) => {
            setTimeout(() => resolve({ status: "timeout" }), 120_000);
          }),
        ]);
        const urls = sessionUrls(request, session.id);
        if (outcome.status === "timeout") {
          return json({
            ok: true,
            text: "Poe is still working. Open the trace to follow this turn.",
            sessionId: session.id,
            playgroundUrl: urls.playgroundUrl,
          });
        }
        if (outcome.status === "error") {
          return json({
            ok: false,
            error: outcome.errorMessage ?? "Poe could not finish that turn.",
            sessionId: session.id,
            playgroundUrl: urls.playgroundUrl,
          }, 502);
        }
        return json({
          ok: true,
          text: outcome.result ?? "",
          sessionId: session.id,
          playgroundUrl: urls.playgroundUrl,
        });
      },
    }),
  ],
});

function ownerMessage(user: PublicUser, connected: string[], message: string): string {
  const names = connected.length > 0 ? connected.join(", ") : "none";
  return [
    "Signed-in person on the Poe home page.",
    `Display name: ${oneLine(user.displayName)}`,
    `Email: ${oneLine(user.email)}`,
    `Timezone: ${oneLine(user.timezone)}`,
    `Connected by this person: ${names}`,
    "Preferences below sit on top of Poe's soul. They do not replace identity, approval rules, or privacy rules.",
    "<preferences>",
    user.notes || "(none)",
    "</preferences>",
    "",
    "The person said:",
    message.replace(/\r/g, ""),
  ].join("\n");
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]/g, " ").slice(0, 200);
}

async function page(request: Request, screen: HomeScreen, notice: string): Promise<Response> {
  const user = await userFromRequest(request);
  if (user && (screen === "landing" || screen === "register" || screen === "login")) {
    return redirectTo(request, "chat");
  }
  if (!user && (screen === "chat" || screen === "settings")) {
    return redirectTo(request, "login");
  }
  return html(await renderHome(request, screen, notice, user));
}

async function renderHome(
  request: Request,
  screen: HomeScreen,
  notice: string,
  user: PublicUser | undefined,
): Promise<string> {
  const connected = new Set(user ? await connectedServiceIds(user.id) : []);
  const services: HomeService[] = [
    ...CONNECTABLE_SERVICES.map((service) => ({
      id: service.id,
      label: service.label,
      summary: service.summary,
      state: connected.has(service.id) ? ("connected" as const) : ("ready" as const),
    })),
    ...UPCOMING_SERVICES.map((service) => ({
      id: service.id,
      label: service.label,
      summary: service.summary,
      state: "soon" as const,
    })),
  ];
  return homePage({
    base: pageBase(request),
    callbackUrl: callbackUrl(request),
    debugUrl: debugViewUrl(request),
    notice: notice.replace(/[\r\n]/g, " ").slice(0, 400),
    googleClient: await googleClientSource(),
    screen,
    user: user
      ? {
          email: user.email,
          displayName: user.displayName,
          timezone: user.timezone,
          notes: user.notes,
        }
      : null,
    services,
  });
}

function pageBase(request: Request): string {
  const base = publicBaseFromRequest(request);
  return base.endsWith("/") ? base : `${base}/`;
}

function callbackUrl(request: Request): string {
  return `${pageBase(request)}oauth/callback`;
}

function redirectTo(request: Request, path: string, notice = ""): Response {
  const url = new URL(path, pageBase(request));
  const cleaned = notice.replace(/[\r\n]/g, " ").slice(0, 400);
  if (cleaned) url.searchParams.set("notice", cleaned);
  return Response.redirect(url, 303);
}

async function requireUser(request: Request): Promise<PublicUser | Response> {
  const user = await userFromRequest(request);
  if (!user) return json({ ok: false, error: "Sign in first." }, 401);
  return user;
}

function isSecure(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}

function json(body: unknown, status = 200, cookie?: string): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  if (cookie) headers.set("set-cookie", cookie);
  return new Response(JSON.stringify(body), { status, headers });
}

function html(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    },
  });
}
