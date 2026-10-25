---
name: plug-in
description: >-
  Connect an MCP server or an inbound interface to Poe. Use when the owner
  asks how to add Gmail, WhatsApp, Facebook, Instagram, X, calls, Calendar,
  Docs, or any other MCP.
---

# Plug an interface into Poe

People open http://127.0.0.1:8080/ (the line Poe prints). The same pages live on `/v1/channels/home`: landing, register, login, chat, and settings. Create an account, then open Settings and choose Sign in with Google for Gmail or Calendar. Each person gets their own token. Poe's soul stays the same; name, timezone, and notes are preferences on top.

Web browsing is already on through `browse_web`, plus the harness tools `webSearch` and `webFetch`. There is no web connection file to add.

WhatsApp, Messenger, Instagram, Facebook, X, Google Docs, Google calls, and other MCP plugins are listed under Coming later. They are not available from Settings yet.

On Cursor-managed hosting the custom channel returns an empty 202. These pages are for local dev and serve.

## On Settings now

| Service | What Sign in with Google does |
| --- | --- |
| Gmail | Read, draft, and send. Sending still waits for approval. |
| Google Calendar | Check availability and manage events. Changes still wait for approval. |

Sign in with Google opens Google's account chooser when this Poe already has an app id. Save that id in Settings under One-time setup, or set `POE_GOOGLE_CLIENT_ID` and, when the app has one, `POE_GOOGLE_CLIENT_SECRET` in the environment. Google will not let Poe register itself. Keep those values out of command arguments. The redirect address is inside One-time setup.

Tokens live under `.poe-accounts/` on this machine, mode 0600. They are not in git and they are not shared between accounts.

## Files Poe already has

`bot/mcp-connections/gmail.ts` and `bot/mcp-connections/google-calendar.ts` attach those servers per signed-in person. A turn with no Poe account skips them. Adding `oauth: true` would share one mailbox with every account, so do not switch them to that.

## Coming later

| Interface | File, when a real server exists |
| --- | --- |
| WhatsApp | `bot/mcp-connections/whatsapp.ts` |
| Messenger | `bot/mcp-connections/messenger.ts` |
| Facebook | `bot/mcp-connections/facebook.ts` |
| Instagram | `bot/mcp-connections/instagram.ts` |
| X | `bot/mcp-connections/x.ts` |
| Google calls | `bot/mcp-connections/google-calls.ts` |
| Google Docs | `bot/mcp-connections/google-docs.ts` |

Any other filename is handled by the `plugins` subagent. A URL outside the catalog stays under Coming later until a real server exists.

## Remote MCP

```ts
import { defineConnection } from "@grok/agent-sdk/connections";

export default defineConnection({
  url: "https://example.com/mcp",
  headers: { authorization: "Bearer ${SOME_TOKEN}" },
  advertiseTools: true,
  optional: true,
});
```

Put the token in the environment or a deployment secret named `SOME_TOKEN`. The `${SOME_TOKEN}` text stays in the file. Do not paste the secret into the file.

## Cursor account connectors

This needs a signed-in host. `serve` refuses to start without one, so add it only after `npx @grok/agent-sdk login`.

```ts
// bot/mcp-connections/account.ts
import { defineConnection } from "@grok/agent-sdk/connections";

export default defineConnection({
  cursorAccount: true,
  advertiseTools: true,
  optional: true,
});
```

Name the file `account.ts`, never `cursor.ts`. Tokens for that path stay in the Cursor account and are one host login, not a Poe signup.

## Inbound events

Adapters POST to `/v1/channels/interfaces/event`:

```json
{
  "interface": "whatsapp",
  "eventId": "provider-event-1",
  "threadKey": "chat-42",
  "actor": "ada",
  "text": "Can we move tomorrow?"
}
```

Loopback calls are accepted for local development. Other callers send `x-poe-signature: sha256=<hex hmac-sha256 of the raw body>` using the `POE_INTERFACE_SECRET` secret. The same `eventId` is ignored the second time. The same `threadKey` continues one conversation.

A duplicate or a new event returns 202. On Cursor-managed hosting the body is empty because the platform answers before the handler runs. The turn still starts.
