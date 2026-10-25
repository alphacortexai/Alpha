import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

import { requestApproval } from "../lib/store.js";

export default defineTool({
  description:
    "Ask the owner to approve one external action, or refuse a tier 3 action. Stop after calling this. Do not perform the action, and do not call resolve_approval, until the owner explicitly decides.",
  effect: "idempotent",
  dryRunResult: { dryRun: true, requested: false },
  inputSchema: z.object({
    interfaceId: z.string().min(1).max(40),
    action: z.string().min(1).max(300),
    summary: z.string().min(1).max(500),
    riskTier: z.enum(["tier2", "tier3"]),
    idempotencyKey: z.string().min(8).max(120).regex(/^[A-Za-z0-9._:-]+$/),
  }),
  async execute(input, ctx) {
    const result = await requestApproval(ctx.host.kv, {
      ...input,
      sessionId: ctx.session.id,
      at: ctx.now().toISOString(),
    });
    if (!result.ok) return result;
    if (result.refused) {
      return {
        ok: true,
        refused: true,
        reason: result.reason,
        taskId: result.task.id,
        duplicate: result.duplicate,
      };
    }
    return {
      ok: true,
      refused: false,
      approvalId: result.approval.id,
      taskId: result.task.id,
      status: result.approval.status,
      duplicate: result.duplicate,
    };
  },
});
