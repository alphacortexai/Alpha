import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

import { resolveApproval } from "../lib/store.js";

export default defineTool({
  description:
    "Record the owner's decision on a pending approval. Call this only after the owner explicitly approves or rejects a specific approval id. The call waits for a human in the debug console before it runs.",
  needsApproval: true,
  effect: "idempotent",
  dryRunResult: { dryRun: true, resolved: false },
  inputSchema: z.object({
    approvalId: z.string().min(1),
    decision: z.enum(["approve", "reject"]),
    reason: z.string().min(1).max(500),
  }),
  async execute({ approvalId, decision, reason }, ctx) {
    const result = await resolveApproval(ctx.host.kv, {
      approvalId,
      decision,
      reason,
      at: ctx.now().toISOString(),
      approvedBy: ctx.approvedBy?.principalId ?? null,
    });
    if (!result.ok) return result;
    return {
      ok: true,
      approvalId: result.approval.id,
      status: result.approval.status,
      taskId: result.task.id,
      taskState: result.task.state,
    };
  },
});
