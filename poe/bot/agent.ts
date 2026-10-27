import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  name: "Poe",
  description: "An agent with its own computer. Give it a task and watch it work.",
  model: {
    id: "grok-4.5",
    params: [
      { id: "effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
});
