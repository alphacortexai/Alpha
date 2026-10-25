import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

import { isTaskState, listApprovals, listTasks } from "../lib/store.js";

export default defineTool({
  description: "List the work ledger and approvals. Filter by task state when the owner asks about one kind of work.",
  effect: "read",
  inputSchema: z.object({
    state: z.string().optional(),
  }),
  async execute({ state }, ctx) {
    if (state !== undefined && !isTaskState(state)) {
      return { ok: false, error: "Unknown task state." };
    }
    const tasks = await listTasks(ctx.host.kv, state);
    const approvals = await listApprovals(ctx.host.kv);
    return {
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        interfaceId: task.interfaceId,
        state: task.state,
        detail: task.detail,
        approvalId: task.approvalId,
        confirmedByTool: task.confirmedByTool,
        updatedAt: task.updatedAt,
      })),
      approvals: approvals.map((approval) => ({
        id: approval.id,
        taskId: approval.taskId,
        interfaceId: approval.interfaceId,
        action: approval.action,
        status: approval.status,
        summary: approval.summary,
      })),
    };
  },
});
