import { gmailClientFromEnv, saveGmailClient } from "./gmail-auth.js";

const client = gmailClientFromEnv(process.env);
if ("missing" in client) {
  console.error(`Set ${client.missing} in this terminal, then run this again. Do not put the value in a file in the repo.`);
  process.exitCode = 1;
} else {
  const path = await saveGmailClient(client);
  console.log(`Saved the Gmail OAuth client for Poe. Next, from the poe folder: npx @grok/agent-sdk mcp oauth gmail`);
  console.log(path);
}
