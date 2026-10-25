# Poe

Poe is a personal assistant with one orchestrator and a specialist for each interface. Plug an MCP server in by adding a file. Inbound events from any adapter share one webhook. Every subagent call and tool result is recorded so you can see what happened.

Out of the box nothing is connected. Poe will say so, and it will not claim a message, event, or call succeeded.

## Run

```bash
cd poe
npx @grok/agent-sdk validate --dir .
npx @grok/agent-sdk dev
```

The playground is the live session view. The home page is where people sign up, set preferences, and connect Gmail or Calendar: [http://127.0.0.1:3000/poe/v1/channels/home](http://127.0.0.1:3000/poe/v1/channels/home). If `dev` prints a playground URL without `/poe`, drop that segment. Restart `dev` after pulling this change. The local debug console is [http://127.0.0.1:3000/poe/v1/channels/debug/view](http://127.0.0.1:3000/poe/v1/channels/debug/view).

## Accounts

Anyone can create an account on that page. Poe's soul stays the default. Display name, timezone, and notes are stored for that person and added on top. Passwords are hashed. The session cookie is `HttpOnly` and `SameSite=Lax`.

Connect opens Google in the browser for that signed-in person only. Google does not let Poe register an OAuth client by itself, so the page asks once for a Google client ID. Gmail can read, draft, and send. Calendar can check availability and manage events. Sends and calendar changes still wait for approval. WhatsApp, Messenger, Instagram, Facebook, X, Google Docs, Google calls, and other MCP plugins are listed and marked not available yet.

Account files stay in `poe/.poe-accounts/` and are not committed. On Cursor-managed hosting a custom page cannot return HTML to the browser, so this screen is for local `dev` or a supervised `serve`.

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

Gmail and Google Calendar are connected from the home page, one account per person. The other named interfaces in `bot/skills/plug-in/SKILL.md` are not connected yet. A new API gets a catalog entry and a Connect button. Do not mark it connected before sign-in succeeds.

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
npx @grok/agent-sdk tool call list_plugins --dir . --input '{}'
npx @grok/agent-sdk eval --dir . --list
```

Model turns need a Cursor credential (`CURSOR_API_KEY` or `npx @grok/agent-sdk login`).
