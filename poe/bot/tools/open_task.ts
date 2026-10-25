import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

import { isTaskState, openTask } from "../lib/store.js";

export default defineTool({
  description:
    "Open a ledger task for work that does not need approval yet. Use request_approval instead of this for sends, posts, calls, deletions, and calendar changes.",
  effect: "write",
  dryRunResult: { dryRun: true, opened: false },
  inputSchema: z.object({
    title: z.string().min(1).max(200),
    interfaceId: z.string().min(1).max(40),
    state: z.string(),
    detail: z.string().max(1000),
  }),
  async execute({ title, interfaceId, state, detail }, ctx) {
    if (!isTaskState(state)) return { ok: false, error: "Unknown task state." };
    const result = await openTask(ctx.host.kv, {
      title,
      interfaceId,
      state,
      detail,
      sessionId: ctx.session.id,
      at: ctx.now().toISOString(),
    });
    if (!result.ok) return result;
    return { ok: true, taskId: result.task.id, state: result.task.state };
  },
});
