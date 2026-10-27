import { defineConnection } from "@grok/agent-sdk/connections";

export default defineConnection({
  description: "Search, read, label, and draft mail in the signed-in Gmail account. Drafts stay in Gmail until a person sends them.",
  url: "https://gmailmcp.googleapis.com/mcp/v1",
  oauth: true,
  advertiseTools: true,
  optional: true,
  disallowedTools: [
    "trash_thread",
    "untrash_thread",
    "mark_thread_spam",
    "unmark_thread_spam",
    "trash_message",
    "untrash_message",
    "mark_message_spam",
    "unmark_message_spam",
  ],
});
