import { claimKey, isRecord, stringList, type Kv, updateStringList } from "./kv.js";

const MAX_EVENTS = 200;
const SESSIONS_KEY = "poe:trace:sessions";

export type TraceEvent = {
  index: number;
  at: string;
  type: string;
  turnId?: string;
  callId?: string;
  parentCallId?: string;
  name?: string;
  isError?: boolean;
  stubbed?: boolean;
  preview?: string;
};

export function isSessionId(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 200 &&
    /^[\x21-\x7e]+$/.test(value) &&
    !value.includes("/") &&
    !value.includes("\\")
  );
}

const traceKey = (sessionId: string) => `poe:trace:${sessionId}`;

function readEvents(value: unknown): TraceEvent[] {
  if (!isRecord(value) || !Array.isArray(value.events)) return [];
  const events: TraceEvent[] = [];
  for (const item of value.events) {
    if (!isRecord(item) || typeof item.type !== "string" || typeof item.at !== "string") continue;
    const event: TraceEvent = {
      index: typeof item.index === "number" ? item.index : events.length,
      at: item.at,
      type: item.type,
    };
    if (typeof item.turnId === "string") event.turnId = item.turnId;
    if (typeof item.callId === "string") event.callId = item.callId;
    if (typeof item.parentCallId === "string") event.parentCallId = item.parentCallId;
    if (typeof item.name === "string") event.name = item.name;
    if (typeof item.isError === "boolean") event.isError = item.isError;
    if (item.stubbed === true) event.stubbed = true;
    if (typeof item.preview === "string") event.preview = item.preview;
    events.push(event);
  }
  return events;
}

export async function appendTrace(kv: Kv, sessionId: string, event: Omit<TraceEvent, "index">): Promise<void> {
  if (!isSessionId(sessionId)) return;
  const key = traceKey(sessionId);
  const prior = readEvents(await kv.get(key));
  const next: TraceEvent = { ...event, index: prior.length };
  const events = [...prior, next].slice(-MAX_EVENTS);
  await kv.put(key, { events });
  await updateStringList(kv, SESSIONS_KEY, (ids) => {
    const without = ids.filter((id) => id !== sessionId);
    without.push(sessionId);
    return without.slice(-30);
  });
}

export async function recentSessions(kv: Kv): Promise<string[]> {
  return stringList(await kv.get(SESSIONS_KEY));
}

export async function sessionEvents(kv: Kv, sessionId: string): Promise<TraceEvent[]> {
  if (!isSessionId(sessionId)) return [];
  return readEvents(await kv.get(traceKey(sessionId)));
}

export async function traceHasSuccess(kv: Kv, sessionId: string, toolName: string): Promise<boolean> {
  const events = await sessionEvents(kv, sessionId);
  return events.some(
    (event) =>
      event.type === "action.result" &&
      event.name === toolName &&
      event.isError !== true &&
      event.stubbed !== true,
  );
}

export async function claimInboundEvent(kv: Kv, interfaceId: string, eventId: string, at: string): Promise<boolean> {
  return claimKey(kv, `poe:event:${interfaceId}:${eventId}`, { at });
}

const SECRET_KEY = /token|secret|password|authorization|api[_-]?key|cookie|credential/i;

export function previewValue(value: unknown, max = 240): string {
  const text = JSON.stringify(redact(value));
  if (text === undefined) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      out[key] = SECRET_KEY.test(key) ? "[redacted]" : redact(inner, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
}
