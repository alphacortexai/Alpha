import { randomUUID } from "node:crypto";

import { isRecord, stringList, type Kv, updateStringList } from "./kv.js";
import { traceHasSuccess } from "./trace.js";

const TASKS_KEY = "poe:task:index";
const MEMORIES_KEY = "poe:mem:index";

export const TASK_STATES = [
  "RECEIVED",
  "UNDERSTANDING",
  "PLANNED",
  "WAITING_FOR_USER",
  "WAITING_FOR_APPROVAL",
  "EXECUTING",
  "VERIFYING",
  "COMPLETED",
  "ESCALATED",
  "FAILED",
] as const;

export type TaskState = (typeof TASK_STATES)[number];

/** Tools that record intent or read state. They never confirm an external effect. */
export const NOT_CONFIRMATION = new Set([
  "task",
  "list_plugins",
  "list_tasks",
  "remember",
  "recall",
  "forget",
  "request_approval",
  "resolve_approval",
  "open_task",
  "update_task",
  "inspect_trace",
]);

const OPEN_STATES = new Set<TaskState>([
  "RECEIVED",
  "UNDERSTANDING",
  "PLANNED",
  "WAITING_FOR_USER",
  "ESCALATED",
  "FAILED",
]);

const PENDING_ALLOWED = new Set<TaskState>([
  "WAITING_FOR_APPROVAL",
  "WAITING_FOR_USER",
  "ESCALATED",
  "FAILED",
]);

export type TaskRecord = {
  id: string;
  title: string;
  interfaceId: string;
  state: TaskState;
  detail: string;
  sessionId: string;
  approvalId: string | null;
  confirmedByTool: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ApprovalRecord = {
  id: string;
  taskId: string;
  interfaceId: string;
  action: string;
  summary: string;
  riskTier: "tier2";
  status: ApprovalStatus;
  idempotencyKey: string;
  sessionId: string;
  reason: string | null;
  createdAt: string;
  decidedAt: string | null;
  approvedBy: string | null;
};

export type MemoryType = "preference" | "fact" | "episode";

export type MemoryRecord = {
  id: string;
  type: MemoryType;
  content: string;
  source: string;
  purpose: string;
  createdAt: string;
  retentionUntil: string;
  deleted: boolean;
};

const SECRET = /api[ _-]?key|password|secret|bearer\s+|private key/i;

export function isTaskState(value: string): value is TaskState {
  return (TASK_STATES as readonly string[]).includes(value);
}

function taskKey(id: string) {
  return `poe:task:${id}`;
}
function approvalKey(id: string) {
  return `poe:approval:${id}`;
}
function memoryKey(id: string) {
  return `poe:mem:${id}`;
}
function idemKey(key: string) {
  return `poe:idem:${key}`;
}

function readTask(value: unknown): TaskRecord | undefined {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.state !== "string") return undefined;
  if (!isTaskState(value.state)) return undefined;
  if (typeof value.title !== "string" || typeof value.sessionId !== "string") return undefined;
  return {
    id: value.id,
    title: value.title,
    interfaceId: typeof value.interfaceId === "string" ? value.interfaceId : "unknown",
    state: value.state,
    detail: typeof value.detail === "string" ? value.detail : "",
    sessionId: value.sessionId,
    approvalId: typeof value.approvalId === "string" ? value.approvalId : null,
    confirmedByTool: typeof value.confirmedByTool === "string" ? value.confirmedByTool : null,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
  };
}

function readApproval(value: unknown): ApprovalRecord | undefined {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.status !== "string") return undefined;
  if (value.status !== "pending" && value.status !== "approved" && value.status !== "rejected") return undefined;
  if (typeof value.taskId !== "string" || typeof value.idempotencyKey !== "string") return undefined;
  return {
    id: value.id,
    taskId: value.taskId,
    interfaceId: typeof value.interfaceId === "string" ? value.interfaceId : "unknown",
    action: typeof value.action === "string" ? value.action : "",
    summary: typeof value.summary === "string" ? value.summary : "",
    riskTier: "tier2",
    status: value.status,
    idempotencyKey: value.idempotencyKey,
    sessionId: typeof value.sessionId === "string" ? value.sessionId : "",
    reason: typeof value.reason === "string" ? value.reason : null,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    decidedAt: typeof value.decidedAt === "string" ? value.decidedAt : null,
    approvedBy: typeof value.approvedBy === "string" ? value.approvedBy : null,
  };
}

function readMemory(value: unknown): MemoryRecord | undefined {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.content !== "string") return undefined;
  if (value.type !== "preference" && value.type !== "fact" && value.type !== "episode") return undefined;
  return {
    id: value.id,
    type: value.type,
    content: value.content,
    source: typeof value.source === "string" ? value.source : "",
    purpose: typeof value.purpose === "string" ? value.purpose : "",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    retentionUntil: typeof value.retentionUntil === "string" ? value.retentionUntil : "",
    deleted: value.deleted === true,
  };
}

async function putId(kv: Kv, indexKey: string, id: string): Promise<void> {
  await updateStringList(kv, indexKey, (ids) => (ids.includes(id) ? ids : [...ids, id].slice(-100)));
}

export async function getTask(kv: Kv, id: string): Promise<TaskRecord | undefined> {
  return readTask(await kv.get(taskKey(id)));
}

export async function getApproval(kv: Kv, id: string): Promise<ApprovalRecord | undefined> {
  return readApproval(await kv.get(approvalKey(id)));
}

export async function listTasks(kv: Kv, state?: TaskState): Promise<TaskRecord[]> {
  const ids = stringList(await kv.get(TASKS_KEY));
  const tasks: TaskRecord[] = [];
  for (const id of ids) {
    const task = await getTask(kv, id);
    if (!task) continue;
    if (state && task.state !== state) continue;
    tasks.push(task);
  }
  return tasks;
}

export async function openTask(
  kv: Kv,
  input: {
    title: string;
    interfaceId: string;
    state: TaskState;
    detail: string;
    sessionId: string;
    at: string;
    approvalId?: string | null;
  },
): Promise<{ ok: true; task: TaskRecord } | { ok: false; error: string }> {
  if (!OPEN_STATES.has(input.state) && input.approvalId == null) {
    return { ok: false, error: "Open a task with request_approval when the work needs approval." };
  }
  const task: TaskRecord = {
    id: randomUUID(),
    title: input.title.slice(0, 200),
    interfaceId: input.interfaceId,
    state: input.state,
    detail: input.detail.slice(0, 1000),
    sessionId: input.sessionId,
    approvalId: input.approvalId ?? null,
    confirmedByTool: null,
    createdAt: input.at,
    updatedAt: input.at,
  };
  await kv.put(taskKey(task.id), task);
  await putId(kv, TASKS_KEY, task.id);
  return { ok: true, task };
}

export async function updateTask(
  kv: Kv,
  input: {
    id: string;
    state: TaskState;
    detail: string;
    at: string;
    confirmedByTool?: string;
    sessions: string[];
  },
): Promise<{ ok: true; task: TaskRecord } | { ok: false; error: string }> {
  const task = await getTask(kv, input.id);
  if (!task) return { ok: false, error: "No task with that id." };

  if (task.approvalId) {
    const approval = await getApproval(kv, task.approvalId);
    if (approval?.status !== "approved" && !PENDING_ALLOWED.has(input.state)) {
      return {
        ok: false,
        error: "This task is waiting for approval. It cannot be executed or completed yet.",
      };
    }
  }

  let confirmedByTool = task.confirmedByTool;
  if (input.state === "COMPLETED") {
    const toolName = input.confirmedByTool?.trim() ?? "";
    if (toolName.length === 0) {
      return { ok: false, error: "Completion needs confirmedByTool, the external tool that succeeded." };
    }
    if (NOT_CONFIRMATION.has(toolName)) {
      return { ok: false, error: `${toolName} records intent. It does not confirm an external effect.` };
    }
    const sessions = [...new Set([...input.sessions, task.sessionId])];
    const confirmed = await Promise.all(sessions.map((sessionId) => traceHasSuccess(kv, sessionId, toolName)));
    if (!confirmed.some(Boolean)) {
      return {
        ok: false,
        error: `No successful ${toolName} result is in the session trace, so this cannot be marked complete.`,
      };
    }
    confirmedByTool = toolName;
  }

  const next: TaskRecord = {
    ...task,
    state: input.state,
    detail: input.detail.slice(0, 1000),
    confirmedByTool,
    updatedAt: input.at,
  };
  await kv.put(taskKey(task.id), next);
  return { ok: true, task: next };
}

type IdemHit =
  | { kind: "approval"; approvalId: string }
  | { kind: "refusal"; taskId: string };

function readIdem(value: unknown): IdemHit | undefined {
  if (!isRecord(value) || typeof value.kind !== "string") return undefined;
  if (value.kind === "approval" && typeof value.approvalId === "string") {
    return { kind: "approval", approvalId: value.approvalId };
  }
  if (value.kind === "refusal" && typeof value.taskId === "string") {
    return { kind: "refusal", taskId: value.taskId };
  }
  return undefined;
}

export async function requestApproval(
  kv: Kv,
  input: {
    interfaceId: string;
    action: string;
    summary: string;
    riskTier: "tier2" | "tier3";
    idempotencyKey: string;
    sessionId: string;
    at: string;
  },
): Promise<
  | { ok: true; refused: false; approval: ApprovalRecord; task: TaskRecord; duplicate: boolean }
  | { ok: true; refused: true; reason: string; task: TaskRecord; duplicate: boolean }
  | { ok: false; error: string }
> {
  const existing = readIdem(await kv.get(idemKey(input.idempotencyKey)));
  if (existing?.kind === "approval") {
    const approval = await getApproval(kv, existing.approvalId);
    const task = approval ? await getTask(kv, approval.taskId) : undefined;
    if (approval && task) return { ok: true, refused: false, approval, task, duplicate: true };
  }
  if (existing?.kind === "refusal") {
    const task = await getTask(kv, existing.taskId);
    if (task) {
      return {
        ok: true,
        refused: true,
        reason: "Tier 3 actions are outside Poe's authority.",
        task,
        duplicate: true,
      };
    }
  }

  if (input.riskTier === "tier3") {
    const opened = await openTask(kv, {
      title: input.action,
      interfaceId: input.interfaceId,
      state: "ESCALATED",
      detail: input.summary,
      sessionId: input.sessionId,
      at: input.at,
    });
    if (!opened.ok) return opened;
    await kv.put(idemKey(input.idempotencyKey), { kind: "refusal", taskId: opened.task.id });
    return {
      ok: true,
      refused: true,
      reason:
        "Tier 3 actions (payments, credential changes, bulk outreach, account access) are outside Poe's authority. The task is escalated.",
      task: opened.task,
      duplicate: false,
    };
  }

  const approvalId = randomUUID();
  const opened = await openTask(kv, {
    title: input.action,
    interfaceId: input.interfaceId,
    state: "WAITING_FOR_APPROVAL",
    detail: input.summary,
    sessionId: input.sessionId,
    at: input.at,
    approvalId,
  });
  if (!opened.ok) return opened;
  const approval: ApprovalRecord = {
    id: approvalId,
    taskId: opened.task.id,
    interfaceId: input.interfaceId,
    action: input.action.slice(0, 300),
    summary: input.summary.slice(0, 500),
    riskTier: "tier2",
    status: "pending",
    idempotencyKey: input.idempotencyKey,
    sessionId: input.sessionId,
    reason: null,
    createdAt: input.at,
    decidedAt: null,
    approvedBy: null,
  };
  await kv.put(approvalKey(approval.id), approval);
  await kv.put(idemKey(input.idempotencyKey), { kind: "approval", approvalId: approval.id });
  return { ok: true, refused: false, approval, task: opened.task, duplicate: false };
}

export async function resolveApproval(
  kv: Kv,
  input: {
    approvalId: string;
    decision: "approve" | "reject";
    reason: string;
    at: string;
    approvedBy: string | null;
  },
): Promise<{ ok: true; approval: ApprovalRecord; task: TaskRecord } | { ok: false; error: string }> {
  const approval = await getApproval(kv, input.approvalId);
  if (!approval) return { ok: false, error: "No approval with that id." };
  const task = await getTask(kv, approval.taskId);
  if (!task) return { ok: false, error: "The task for this approval is missing." };

  if (approval.status !== "pending") {
    return { ok: true, approval, task };
  }

  const status: ApprovalStatus = input.decision === "approve" ? "approved" : "rejected";
  const nextApproval: ApprovalRecord = {
    ...approval,
    status,
    reason: input.reason.slice(0, 500),
    decidedAt: input.at,
    approvedBy: input.approvedBy,
  };
  const nextTask: TaskRecord = {
    ...task,
    state: status === "approved" ? "PLANNED" : "ESCALATED",
    detail: input.reason.slice(0, 1000),
    updatedAt: input.at,
  };
  await kv.put(approvalKey(approval.id), nextApproval);
  await kv.put(taskKey(task.id), nextTask);
  return { ok: true, approval: nextApproval, task: nextTask };
}

export async function remember(
  kv: Kv,
  input: {
    type: MemoryType;
    content: string;
    source: string;
    purpose: string;
    at: string;
    retentionDays: number;
  },
): Promise<{ ok: true; memory: MemoryRecord } | { ok: false; error: string }> {
  const content = input.content.trim();
  if (content.length === 0 || content.length > 500) {
    return { ok: false, error: "Memory content must be 1 to 500 characters." };
  }
  if (SECRET.test(content) || SECRET.test(input.source)) {
    return { ok: false, error: "Refusing to store credentials or secrets." };
  }
  const days = Math.min(365, Math.max(1, input.retentionDays));
  const until = new Date(Date.parse(input.at) + days * 24 * 60 * 60 * 1000);
  const memory: MemoryRecord = {
    id: randomUUID(),
    type: input.type,
    content,
    source: input.source.slice(0, 200),
    purpose: input.purpose.slice(0, 200),
    createdAt: input.at,
    retentionUntil: Number.isNaN(until.getTime()) ? input.at : until.toISOString(),
    deleted: false,
  };
  await kv.put(memoryKey(memory.id), memory);
  await putId(kv, MEMORIES_KEY, memory.id);
  return { ok: true, memory };
}

export async function recall(
  kv: Kv,
  input: { query?: string; type?: MemoryType; now: string; limit: number },
): Promise<MemoryRecord[]> {
  const ids = stringList(await kv.get(MEMORIES_KEY));
  const now = Date.parse(input.now);
  const query = input.query?.trim().toLowerCase();
  const found: MemoryRecord[] = [];
  for (const id of ids) {
    const memory = readMemory(await kv.get(memoryKey(id)));
    if (!memory || memory.deleted) continue;
    if (memory.retentionUntil && Date.parse(memory.retentionUntil) < now) continue;
    if (input.type && memory.type !== input.type) continue;
    if (query && !`${memory.content} ${memory.purpose} ${memory.source}`.toLowerCase().includes(query)) continue;
    found.push(memory);
  }
  return found.slice(-input.limit);
}

export async function forget(kv: Kv, id: string, at: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const memory = readMemory(await kv.get(memoryKey(id)));
  if (!memory) return { ok: false, error: "No memory with that id." };
  await kv.put(memoryKey(id), { ...memory, deleted: true, updatedAt: at });
  return { ok: true, id };
}

export async function listApprovals(kv: Kv, sessionId?: string): Promise<ApprovalRecord[]> {
  const tasks = await listTasks(kv);
  const approvals: ApprovalRecord[] = [];
  for (const task of tasks) {
    if (!task.approvalId) continue;
    if (sessionId && task.sessionId !== sessionId) continue;
    const approval = await getApproval(kv, task.approvalId);
    if (approval) approvals.push(approval);
  }
  return approvals;
}
