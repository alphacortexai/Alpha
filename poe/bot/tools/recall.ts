import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

import { recall } from "../lib/store.js";

export default defineTool({
  description: "Read approved memories by type or by a short query. Skips deleted and expired records.",
  effect: "read",
  inputSchema: z.object({
    query: z.string().max(200).optional(),
    type: z.enum(["preference", "fact", "episode"]).optional(),
    limit: z.number().int().min(1).max(20).optional(),
  }),
  async execute({ query, type, limit }, ctx) {
    const memories = await recall(ctx.host.kv, {
      query,
      type,
      now: ctx.now().toISOString(),
      limit: limit ?? 20,
    });
    return {
      memories: memories.map((memory) => ({
        id: memory.id,
        type: memory.type,
        content: memory.content,
        source: memory.source,
        purpose: memory.purpose,
        createdAt: memory.createdAt,
        retentionUntil: memory.retentionUntil,
      })),
    };
  },
});
