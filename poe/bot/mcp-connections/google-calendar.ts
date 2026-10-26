import { defineConnection } from "@grok/agent-sdk/connections";

import { mcpBridgeUrl } from "../lib/mcp-bridge.js";
import { perUserAuth } from "../lib/per-user-connection.js";

export default defineConnection({
  description: "The signed-in person's Google Calendar. Call this MCP server by the name google-calendar.",
  url: mcpBridgeUrl("google-calendar"),
  auth: perUserAuth("google-calendar"),
});
