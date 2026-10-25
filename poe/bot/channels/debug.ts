import { defineChannel, GET } from "@grok/agent-sdk/channels";
import * as z from "zod/v4";

import { debugPage } from "../lib/debug-page.js";
import { buildDebugView } from "../lib/debug-view.js";

const sessionQuery = z.object({
  sessionId: z.string().min(1).max(200).optional(),
});

export default defineChannel({
  routes: [
    GET("/view", {
      description: "Open the local debug console for subagent and tool traces.",
      querySchema: sessionQuery,
      handler: async () =>
        new Response(debugPage(), {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    }),
    GET("/trace", {
      description: "JSON debug trace for one session, including subagent spans, tasks, and approvals.",
      querySchema: sessionQuery,
      handler: async (_request, { query, host }) =>
        Response.json(await buildDebugView(host.kv, query.sessionId ?? null)),
    }),
  ],
});
