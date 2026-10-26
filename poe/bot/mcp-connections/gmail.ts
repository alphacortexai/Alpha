import { defineConnection } from "@grok/agent-sdk/connections";

import { mcpBridgeUrl } from "../lib/mcp-bridge.js";
import { perUserAuth } from "../lib/per-user-connection.js";

// The session sees a server named gmail. The bridge forwards to Google with
// this person's token. A shared host login would expose one inbox to every account.
export default defineConnection({
  description: "The signed-in person's Gmail. Call this MCP server by the name gmail.",
  url: mcpBridgeUrl("gmail"),
  auth: perUserAuth("gmail"),
});
