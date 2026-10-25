# Poe

Poe is a personal assistant with one orchestrator and a specialist for each interface. Plug an MCP server in by adding a file. Inbound events from any adapter share one webhook. Every subagent call and tool result is recorded so you can see what happened.

Out of the box nothing is connected. Poe will say so, and it will not claim a message, event, or call succeeded.

## Run

```bash
cd poe
npx @grok/agent-sdk validate --dir .
npx @grok/agent-sdk dev
```

The playground is the live session view. The local debug console is [http://127.0.0.1:3000/v1/channels/debug/view](http://127.0.0.1:3000/v1/channels/debug/view). It lists sessions and shows each subagent with the tools underneath it.

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

Add `bot/mcp-connections/<name>.ts`, then restart. Known filenames (`gmail.ts`, `whatsapp.ts`, `google-calendar.ts`, and the others in `bot/skills/plug-in/SKILL.md`) light up that interface in `list_plugins`. Any other file is picked up by the `plugins` specialist.

Cursor account connectors (dashboard MCP, including whatever Google or chat products you have authorized) go in `bot/mcp-connections/account.ts`. That file needs `npx @grok/agent-sdk login` or the host will not start. The snippet is in the plug-in skill.

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
