---
name: plug-in
description: >-
  Connect an MCP server or an inbound interface to Poe. Use when the owner
  asks how to add Gmail, WhatsApp, Facebook, Instagram, X, calls, Calendar,
  Docs, or any other MCP.
---

# Plug an interface into Poe

Poe discovers MCP servers from `bot/mcp-connections/*.ts`. The filename is the server name. After a restart, `list_plugins` shows the server and marks a known interface connected when the filename matches it.

## Named interfaces

| Interface | File |
| --- | --- |
| Gmail | `bot/mcp-connections/gmail.ts` |
| WhatsApp | `bot/mcp-connections/whatsapp.ts` |
| Messenger | `bot/mcp-connections/messenger.ts` |
| Facebook | `bot/mcp-connections/facebook.ts` |
| Instagram | `bot/mcp-connections/instagram.ts` |
| X | `bot/mcp-connections/x.ts` |
| Google calls | `bot/mcp-connections/google-calls.ts` |
| Google Calendar | `bot/mcp-connections/google-calendar.ts` |
| Google Docs | `bot/mcp-connections/google-docs.ts` |

Any other filename stays unassigned and is handled by the `plugins` subagent.

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

Connect Gmail, Calendar, Docs, and the other products in the Cursor MCP dashboard. Poe routes those tools by the specialist table. Tokens stay in the Cursor account.

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
