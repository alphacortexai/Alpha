import { defineHook } from "@grok/agent-sdk/hooks";

import { appendTrace, previewValue } from "../lib/trace.js";

export default defineHook({
  events: {
    async "*"(event, ctx) {
      try {
        const base = { at: event.at, turnId: event.turnId };
        if (event.type === "message.received") {
          await appendTrace(ctx.host.kv, ctx.session.id, {
            ...base,
            type: event.type,
            preview: event.data.text.slice(0, 400),
          });
          return;
        }
        if (event.type === "actions.requested") {
          for (const call of event.data.calls) {
            await appendTrace(ctx.host.kv, ctx.session.id, {
              ...base,
              type: event.type,
              callId: call.callId,
              parentCallId: call.parentCallId ?? event.data.parentCallId,
              name: call.toolName,
              preview: previewValue(call.args),
            });
          }
          return;
        }
        if (event.type === "action.result") {
          await appendTrace(ctx.host.kv, ctx.session.id, {
            ...base,
            type: event.type,
            callId: event.data.callId,
            parentCallId: event.data.parentCallId,
            name: event.data.toolName,
            isError: event.data.isError,
            stubbed: event.data.stubbed === true,
            preview: previewValue(event.data.output),
          });
          return;
        }
        if (event.type === "subagent.called" || event.type === "subagent.completed") {
          await appendTrace(ctx.host.kv, ctx.session.id, {
            ...base,
            type: event.type,
            callId: event.data.callId,
            name: event.data.name,
            isError: event.type === "subagent.completed" ? event.data.isError === true : undefined,
          });
          return;
        }
        if (event.type === "action.approval_requested" || event.type === "action.approval_resolved") {
          await appendTrace(ctx.host.kv, ctx.session.id, {
            ...base,
            type: event.type,
            callId: event.data.callId,
            parentCallId: event.data.parentCallId,
            name: event.data.toolName,
            preview: event.type === "action.approval_resolved" ? event.data.decision : previewValue(event.data.args),
          });
          return;
        }
        if (event.type === "turn.completed") {
          await appendTrace(ctx.host.kv, ctx.session.id, {
            ...base,
            type: event.type,
            preview: (event.data.result ?? "").slice(0, 400),
          });
          return;
        }
        if (event.type === "turn.failed") {
          await appendTrace(ctx.host.kv, ctx.session.id, {
            ...base,
            type: event.type,
            isError: true,
            preview: event.data.message.slice(0, 400),
          });
        }
      } catch {
        return;
      }
    },
  },
});
