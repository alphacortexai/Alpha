import { defineArtifacts } from "@grok/agent-sdk/artifacts";
import * as z from "zod/v4";

export default defineArtifacts({
  agentTool: true,
  kinds: {
    deliverable: {
      description: "A file or result Poe produced for the person's task.",
      schema: z.object({
        path: z.string().min(1).max(300),
        summary: z.string().min(1).max(500),
      }),
    },
  },
});
