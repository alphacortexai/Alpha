import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  name: "Poe",
  description:
    "Personal assistant that routes work to specialists and uses whatever MCP interfaces are plugged in.",
  hosting: {
    egressDomains: [
      "gmailmcp.googleapis.com",
      "calendarmcp.googleapis.com",
      "accounts.google.com",
      "oauth2.googleapis.com",
      "www.googleapis.com",
    ],
  },
  model: {
    id: "grok-4.5",
    params: [
      { id: "effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
});
