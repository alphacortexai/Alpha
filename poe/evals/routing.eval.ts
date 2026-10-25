import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["routing"],
  description: "A calendar read is delegated and does not ask for send approval.",
  async test(t) {
    await t.send("What is on my Google Calendar tomorrow afternoon?");
    t.succeeded();
    t.calledSubagent("calendar");
    t.notCalledTool("request_approval");
  },
});
