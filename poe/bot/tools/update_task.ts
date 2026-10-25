import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

import { isTaskState, updateTask } from "../lib/store.js";

export default defineTool({
  description:
    "Move a ledger task to a new state. COMPLETED is accepted only when a successful external tool result is already in the session trace.",
  effect: "idempotent",
  dryRunResult: { dryRun: true, updated: false },
  inputSchema: z.object({
    id: z.string().min(1),
    state: z.string(),
    detail: z.string().max(1000),
    confirmedByTool: z.string().min(1).max(120).optional(),
  }),
  async execute({ id, state, detail, confirmedByTool }, ctx) {
    if (!isTaskState(state)) return { ok: false, error: "Unknown task state." };
    const result = await updateTask(ctx.host.kv, {
      id,
      state,
      detail,
      at: ctx.now().toISOString(),
      confirmedByTool,
      sessions: [ctx.session.id],
    });
    if (!result.ok) return result;
    return {
      ok: true,
      taskId: result.task.id,
      state: result.task.state,
      confirmedByTool: result.task.confirmedByTool,
    };
  },
});
