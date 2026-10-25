import { defineEval, includes } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description: "Poe lists its interfaces from the plugin catalog.",
  async test(t) {
    await t.send("Which interfaces can you route, and which are plugged in? Use your plugin tool.");
    t.succeeded();
    t.calledTool("list_plugins");
    t.notCalledTool("request_approval");
    t.check(t.reply, includes(/gmail/i));
  },
});
