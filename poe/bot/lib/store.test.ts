import assert from "node:assert/strict";

import { connectionMatches } from "./interfaces.js";
import { type Kv } from "./kv.js";
import {
  forget,
  listTasks,
  openTask,
  recall,
  remember,
  requestApproval,
  resolveApproval,
  updateTask,
} from "./store.js";
import { appendTrace, claimInboundEvent } from "./trace.js";

function memoryKv(): Kv {
  const values = new Map<string, unknown>();
  return {
    async get(key) {
      return values.get(key);
    },
    async put(key, value) {
      values.set(key, value);
    },
    async delete(key) {
      values.delete(key);
    },
  };
}

const at = "2026-10-25T12:00:00.000Z";

async function main() {
  assert.equal(connectionMatches("gmail", ["gmail"]), true);
  assert.equal(connectionMatches("gmail-mcp", ["gmail"]), true);
  assert.equal(connectionMatches("x", ["twitter", "x"]), true);
  assert.equal(connectionMatches("extra", ["x"]), false);
  assert.equal(connectionMatches("google-calendar", ["googlecalendar"]), true);

  const kv = memoryKv();
  const secret = await remember(kv, {
    type: "fact",
    content: "api key sk-live",
    source: "owner",
    purpose: "test",
    at,
    retentionDays: 10,
  });
  assert.equal(secret.ok, false);

  const saved = await remember(kv, {
    type: "preference",
    content: "Prefers afternoon meetings",
    source: "owner",
    purpose: "scheduling",
    at,
    retentionDays: 30,
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const found = await recall(kv, { query: "afternoon", now: at, limit: 10 });
  assert.equal(found.length, 1);
  assert.equal((await forget(kv, saved.memory.id, at)).ok, true);
  assert.equal((await recall(kv, { now: at, limit: 10 })).length, 0);

  const tier3 = await requestApproval(kv, {
    interfaceId: "whatsapp",
    action: "Message every contact",
    summary: "Bulk sale",
    riskTier: "tier3",
    idempotencyKey: "bulk-sale-1",
    sessionId: "ses_test",
    at,
  });
  assert.equal(tier3.ok && tier3.refused, true);
  const again = await requestApproval(kv, {
    interfaceId: "whatsapp",
    action: "Message every contact",
    summary: "Bulk sale",
    riskTier: "tier3",
    idempotencyKey: "bulk-sale-1",
    sessionId: "ses_test",
    at,
  });
  assert.equal(again.ok && again.refused && again.duplicate, true);

  const send = await requestApproval(kv, {
    interfaceId: "gmail",
    action: "Email Ada",
    summary: "Confirm the visit",
    riskTier: "tier2",
    idempotencyKey: "email-ada-1",
    sessionId: "ses_test",
    at,
  });
  assert.equal(send.ok && send.refused, false);
  if (!send.ok || send.refused) return;
  const blocked = await updateTask(kv, {
    id: send.task.id,
    state: "COMPLETED",
    detail: "sent",
    at,
    confirmedByTool: "gmail_send",
    sessions: ["ses_test"],
  });
  assert.equal(blocked.ok, false);

  const resolved = await resolveApproval(kv, {
    approvalId: send.approval.id,
    decision: "approve",
    reason: "Owner approved",
    at,
    approvedBy: "owner",
  });
  assert.equal(resolved.ok && resolved.task.state, "PLANNED");
  const stillBlocked = await updateTask(kv, {
    id: send.task.id,
    state: "COMPLETED",
    detail: "sent",
    at,
    confirmedByTool: "request_approval",
    sessions: ["ses_test"],
  });
  assert.equal(stillBlocked.ok, false);

  await appendTrace(kv, "ses_test", {
    at,
    type: "action.result",
    name: "gmail_send",
    isError: false,
  });
  const completed = await updateTask(kv, {
    id: send.task.id,
    state: "COMPLETED",
    detail: "provider accepted the message",
    at,
    confirmedByTool: "gmail_send",
    sessions: ["ses_other"],
  });
  assert.equal(completed.ok && completed.task.state, "COMPLETED");

  const opened = await openTask(kv, {
    title: "Read calendar",
    interfaceId: "google-calendar",
    state: "PLANNED",
    detail: "Tomorrow afternoon",
    sessionId: "ses_test",
    at,
  });
  assert.equal(opened.ok, true);
  assert.equal((await listTasks(kv, "COMPLETED")).length, 1);

  assert.equal(await claimInboundEvent(kv, "whatsapp", "evt-1", at), true);
  assert.equal(await claimInboundEvent(kv, "whatsapp", "evt-1", at), false);

  console.log("store.test.ts ok");
}

main();
