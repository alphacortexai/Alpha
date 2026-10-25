import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

import { remember } from "../lib/store.js";

export default defineTool({
  description:
    "Save one useful fact, preference, or episode the owner wants kept. Do not save secrets, guesses, or everything that was said.",
  effect: "write",
  dryRunResult: { dryRun: true, saved: false },
  inputSchema: z.object({
    type: z.enum(["preference", "fact", "episode"]),
    content: z.string().min(1).max(500),
    source: z.string().min(1).max(200),
    purpose: z.string().min(1).max(200),
    retentionDays: z.number().int().min(1).max(365).optional(),
  }),
  async execute(input, ctx) {
    const result = await remember(ctx.host.kv, {
      type: input.type,
      content: input.content,
      source: input.source,
      purpose: input.purpose,
      at: ctx.now().toISOString(),
      retentionDays: input.retentionDays ?? 90,
    });
    if (!result.ok) return result;
    return { ok: true, id: result.memory.id, retentionUntil: result.memory.retentionUntil };
  },
});
