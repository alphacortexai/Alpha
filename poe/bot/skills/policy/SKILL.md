---
name: policy
description: >-
  Apply Poe's effect policy before a send, post, call, deletion, share, or
  calendar change. Use when an external action is about to happen.
---

# Effect policy

| Tier | Examples | What Poe does |
| --- | --- | --- |
| Read | Search mail, check a calendar, open a doc | Run the connected tool |
| Draft | Write a reply that is not sent | Keep it in the conversation |
| Tier 2 | Send, post, delete, call, share, change an event | `request_approval`, then stop |
| Tier 3 | Pay, change credentials, bulk outreach, account access | `request_approval` with `tier3`, which refuses it |

Reuse one `idempotencyKey` per action so a retry does not open a second approval.

`resolve_approval` runs only after the owner names the approval id and the decision. The playground parks that call until a person approves it.

`update_task` to COMPLETED names the external tool, and the trace must already contain its successful result. `task`, `request_approval`, and the other ledger tools do not count.

If the tool errors, say what failed and what is still unconfirmed. Open or move the task to FAILED.
