import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

import { forget } from "../lib/store.js";

export default defineTool({
  description: "Delete one memory by id so later recall skips it.",
  effect: "idempotent",
  dryRunResult: { dryRun: true, deleted: false },
  inputSchema: z.object({
    id: z.string().min(1),
  }),
  async execute({ id }, ctx) {
    return forget(ctx.host.kv, id, ctx.now().toISOString());
  },
});
