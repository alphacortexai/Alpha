# Poe

Poe is a personal assistant with one orchestrator and a specialist for each interface. Plug an MCP server in by adding a file. Inbound events from any adapter share one webhook. Every subagent call and tool result is recorded so you can see what happened.

Out of the box nothing is connected. Poe will say so, and it will not claim a message, event, or call succeeded.

## Run

```bash
cd poe
npx @grok/agent-sdk validate --dir .
npx @grok/agent-sdk dev
```

Restart `dev` after pulling this change. Poe prints a short address, [http://127.0.0.1:8080/](http://127.0.0.1:8080/). New people go there, create an account, and use Chat. The same pages are on [http://127.0.0.1:3000/poe/v1/channels/home](http://127.0.0.1:3000/poe/v1/channels/home).

The first account is the owner, unless `POE_OWNER_EMAIL` names someone else. Admin is where that person saves the Google app. The playground, [http://127.0.0.1:3000/poe/playground](http://127.0.0.1:3000/poe/playground), is the owner's trace and uses the owner's Gmail. People stay in Chat, which uses their own Gmail. If `dev` prints a playground URL without `/poe`, drop that segment. Debug is [http://127.0.0.1:3000/poe/v1/channels/debug/view](http://127.0.0.1:3000/poe/v1/channels/debug/view).

## Accounts

Anyone can create an account from that address. Poe's soul stays the default. Display name, timezone, and notes are stored for that person and added on top. Passwords are hashed. The session cookie is `HttpOnly` and `SameSite=Lax`.

Web browsing is already on through `browse_web`, and the harness also has `webSearch` and `webFetch`. There is no web connection file to add.

Sign in with Google, from Settings, opens Google's account chooser for that person. The owner saves the app id on Admin, or sets `POE_GOOGLE_CLIENT_ID` and `POE_GOOGLE_CLIENT_SECRET`. Google will not let Poe register itself. While the app is in Testing, each Gmail address is added as a test user. Gmail can read, draft, and send. Calendar can check availability and manage events. Sends and calendar changes still wait for approval. WhatsApp, Messenger, Instagram, Facebook, X, Google Docs, Google calls, and other MCP plugins are listed under Coming later.

Account files stay in `poe/.poe-accounts/` and are not committed. On Cursor-managed hosting a custom channel returns an empty 202, so these pages are for local `dev` or a supervised `serve`. Hosted egress stays on the listed domains. Local browsing uses `browse_web`.

## Specialists

| Work | Subagent |
| --- | --- |
| Gmail | `inbox` |
| WhatsApp, Messenger, Instagram DMs | `messages` |
| Facebook, Instagram, and X posts | `social` |
| Google Calendar | `calendar` |
| Google Docs | `documents` |
| Google calls and voice notes | `calls` |
| Any other MCP server | `plugins` |

## Plug in an MCP server

Gmail and Google Calendar use Sign in with Google from Settings, one account per person. The other named interfaces in `bot/skills/plug-in/SKILL.md` are listed under Coming later. A new API gets a catalog entry and a Sign in with Google button when a real server exists. Mark it connected after sign-in succeeds.

## Inbound events

`POST /v1/channels/interfaces/event` with `interface`, `eventId`, `threadKey`, and `text`. Loopback is open for local development. Other callers sign the raw body in `x-poe-signature` with `POE_INTERFACE_SECRET`. The same event id is stored once.

## Approval

Reads and drafts run immediately. A send, post, call, deletion, share, or calendar change calls `request_approval` and waits. You name the approval id to approve or reject it. `resolve_approval` then waits in the playground until you confirm. Payments, credential changes, and bulk outreach are refused.

A task becomes COMPLETED only when the trace contains a successful result from the external tool.

## Daily summary

`bot/schedules/daily-summary.md` runs at 03:00 UTC (06:00 Africa/Kampala). Schedules do not auto-fire under `--dev`. Trigger it with `POST /v1/dev/schedules/daily-summary`.

## Checks

```bash
npx tsc --noEmit -p .
npx tsx bot/lib/store.test.ts
npx tsx bot/lib/accounts.test.ts
npx tsx bot/lib/site.test.ts
npx tsx bot/lib/web.test.ts
npx tsx bot/lib/mcp-bridge.test.ts
npx @grok/agent-sdk tool call list_plugins --dir . --input '{}'
npx @grok/agent-sdk eval --dir . --list
```

Model turns need a Cursor credential (`CURSOR_API_KEY` or `npx @grok/agent-sdk login`).
