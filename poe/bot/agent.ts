import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  name: "Poe",
  description:
    "Personal assistant that routes work to specialists and uses whatever MCP interfaces are plugged in.",
  model: {
    id: "grok-4.5",
    params: [
      { id: "effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
  // Inbound interface text is untrusted. The sandbox keeps shell off the host secrets.
  local: { sandbox: true },
});
