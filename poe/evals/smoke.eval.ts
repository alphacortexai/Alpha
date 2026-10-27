import { defineEval, includes } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description: "Poe describes itself as an agent that works on a computer.",
  async test(t) {
    await t.send("In one sentence, what do you do when I give you a task? Do not use tools.");
    t.succeeded();
    t.check(t.reply, includes(/computer|task|file|web/i));
  },
});
