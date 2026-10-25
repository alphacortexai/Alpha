import { defineConnection } from "@grok/agent-sdk/connections";

// Google's hosted Gmail MCP. Sign in once with:
// npx @grok/agent-sdk mcp oauth gmail --dir .
export default defineConnection({
  url: "https://gmailmcp.googleapis.com/mcp/v1",
  oauth: true,
  advertiseTools: true,
  optional: true,
});
