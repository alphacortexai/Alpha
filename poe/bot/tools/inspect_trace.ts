import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

import { buildDebugView } from "../lib/debug-view.js";

export default defineTool({
  description:
    "Read the debug trace: subagent spans, tool results, tasks, and approvals. Use this to explain what happened. Omit sessionId to read the current session.",
  effect: "read",
  inputSchema: z.object({
    sessionId: z.string().min(1).max(200).optional(),
  }),
  async execute({ sessionId }, ctx) {
    return buildDebugView(ctx.host.kv, sessionId ?? ctx.session.id);
  },
});
