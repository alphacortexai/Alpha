import { defineChannel, GET, localDevStrict, POST } from "@grok/agent-sdk/channels";
import * as z from "zod/v4";

import { startPoeDoor, stopPoeDoor } from "../lib/door.js";
import { publicBaseFromRequest } from "../lib/site.js";
import { normalizeTasks, taskTitle, withTask, withToken, type WorkspaceTask } from "../lib/tasks.js";
import { workspacePage } from "../lib/workspace-page.js";

const TASKS_KEY = "workspace:tasks";
const sessionId = z.string().regex(/^ses_[A-Za-z0-9_-]{8,80}$/);

export default defineChannel({
  auth: [localDevStrict()],
  onStart(args) {
    startPoeDoor(args.logger);
  },
  onStop() {
    return stopPoeDoor();
  },
  routes: [
    GET("/", {
      description: "Poe, the agent workspace.",
      querySchema: z.object({}),
      handler: (request) => html(workspacePage(pageBase(request))),
    }),
    GET("/tasks", {
      description: "Recent tasks on this Poe.",
      querySchema: z.object({}),
      handler: async (_request, { host }) => {
        const tasks = normalizeTasks(await host.kv.get(TASKS_KEY));
        return json({ ok: true, tasks });
      },
    }),
    POST("/run", {
      description: "Start a task on Poe's computer.",
      bodySchema: z.object({ message: z.string().min(1).max(8000) }),
      handler: async (_request, { body, send, host }) => {
        const message = body.message.trim();
        if (!message) return json({ ok: false, error: "Tell Poe what to do." }, 400);
        const title = taskTitle(message);
        let session;
        try {
          session = await send(message, { title });
        } catch (error) {
          return json({ ok: false, error: failureText(error) }, 502);
        }
        const token = session.continuationToken ?? "";
        if (!token) return json({ ok: false, error: "Poe could not start that task." }, 502);
        const task: WorkspaceTask = { id: session.id, title, token, createdAt: new Date().toISOString() };
        await host.kv.put(TASKS_KEY, withTask(await host.kv.get(TASKS_KEY), task));
        return json({ ok: true, sessionId: session.id, continuationToken: token, title });
      },
    }),
    POST("/follow", {
      description: "Continue a task on Poe's computer.",
      bodySchema: z.object({
        sessionId,
        continuationToken: z.string().min(1).max(2000),
        message: z.string().min(1).max(8000),
      }),
      handler: async (_request, { body, send, host }) => {
        const message = body.message.trim();
        if (!message) return json({ ok: false, error: "Tell Poe what to change." }, 400);
        let session;
        try {
          session = await send(message, { continuationToken: body.continuationToken });
        } catch (error) {
          return json({ ok: false, error: failureText(error) }, 502);
        }
        const token = session.continuationToken ?? body.continuationToken;
        await host.kv.put(TASKS_KEY, withToken(await host.kv.get(TASKS_KEY), session.id, token));
        return json({ ok: true, sessionId: session.id, continuationToken: token });
      },
    }),
    GET("/events", {
      description: "Live events from one task.",
      querySchema: z.object({
        sessionId,
        startIndex: z.string().regex(/^\d{1,7}$/).optional(),
      }),
      handler: async (_request, { query, getSession }) => {
        const session = await getSession(query.sessionId);
        if (!session) return json({ ok: false, error: "That task is gone." }, 404);
        const startIndex = query.startIndex ? Number(query.startIndex) : 0;
        const stream = await session.getEventStream({ startIndex });
        return new Response(stream, {
          headers: {
            "content-type": "application/x-ndjson; charset=utf-8",
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
          },
        });
      },
    }),
  ],
});

function pageBase(request: Request): string {
  const base = publicBaseFromRequest(request);
  return base.endsWith("/") ? base : `${base}/`;
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

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function failureText(error: unknown): string {
  const message = error instanceof Error ? error.message : "Poe could not start.";
  return message.slice(0, 300);
}
