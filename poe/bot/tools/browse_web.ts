import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

import { browseWeb } from "../lib/web.js";

export default defineTool({
  description:
    "Read one public web page and return its title and visible text. Use this to browse. Private networks, metadata hosts, and non-http links are refused. Do not invent text this tool did not return.",
  effect: "read",
  inputSchema: z.object({
    url: z.string().min(1).max(2000),
  }),
  async execute(input) {
    return browseWeb(input.url);
  },
});
