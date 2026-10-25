---
name: debug
description: >-
  Explain a Poe session from the debug trace. Use when the owner asks what a
  subagent did, why a tool failed, or where to look at the trace.
---

# Debug a Poe session

1. Call `inspect_trace`. Omit `sessionId` for the current session.
2. Explain `tree` first: each subagent, then the tools under it, then errors.
3. Mention pending approvals and the task state. Approval is not delivery.
4. For a live view, the owner opens the playground. Locally they can also open `GET /v1/channels/debug/view` and the JSON at `GET /v1/channels/debug/trace?sessionId=...`.

The audit hook writes the trace. It stores short previews and redacts fields whose names look like secrets. `subagent.called` and `action.result` in the playground are the same events.

Cursor-managed hosting answers custom channel routes with an empty 202, so the HTML console is for local `serve`. Hosted sessions use the playground and `inspect_trace`.
