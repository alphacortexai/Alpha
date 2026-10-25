import { listApprovals, listTasks } from "./store.js";
import { isSessionId, recentSessions, sessionEvents, type TraceEvent } from "./trace.js";
import type { Kv } from "./kv.js";

export type DebugView = {
  sessionId: string | null;
  recentSessions: string[];
  events: TraceEvent[];
  tree: Array<{
    subagent: string;
    callId: string;
    isError: boolean;
    tools: Array<{ name: string; callId: string; isError: boolean; stubbed: boolean; preview: string }>;
  }>;
  tasks: Array<{ id: string; title: string; state: string; interfaceId: string; approvalId: string | null }>;
  approvals: Array<{ id: string; status: string; action: string; interfaceId: string; taskId: string }>;
  note: string | null;
};

export async function buildDebugView(kv: Kv, sessionId: string | null): Promise<DebugView> {
  const sessions = await recentSessions(kv);
  if (sessionId !== null && !isSessionId(sessionId)) {
    return {
      sessionId: null,
      recentSessions: sessions,
      events: [],
      tree: [],
      tasks: [],
      approvals: [],
      note: "That session id is not valid.",
    };
  }
  const events = sessionId ? await sessionEvents(kv, sessionId) : [];
  const tasks = await listTasks(kv);
  const scopedTasks = sessionId ? tasks.filter((task) => task.sessionId === sessionId) : tasks;
  const approvals = await listApprovals(kv, sessionId ?? undefined);
  const called = events.filter((event) => event.type === "subagent.called");
  const tree = called.map((event) => {
    const done = events.find(
      (item) => item.type === "subagent.completed" && item.callId === event.callId,
    );
    const tools = events
      .filter((item) => item.type === "action.result" && item.parentCallId === event.callId)
      .map((item) => ({
        name: item.name ?? "tool",
        callId: item.callId ?? "",
        isError: item.isError === true,
        stubbed: item.stubbed === true,
        preview: item.preview ?? "",
      }));
    return {
      subagent: event.name ?? "subagent",
      callId: event.callId ?? "",
      isError: done?.isError === true,
      tools,
    };
  });
  return {
    sessionId,
    recentSessions: sessions,
    events,
    tree,
    tasks: scopedTasks.map((task) => ({
      id: task.id,
      title: task.title,
      state: task.state,
      interfaceId: task.interfaceId,
      approvalId: task.approvalId,
    })),
    approvals: approvals.map((approval) => ({
      id: approval.id,
      status: approval.status,
      action: approval.action,
      interfaceId: approval.interfaceId,
      taskId: approval.taskId,
    })),
    note: sessionId && events.length === 0 ? "No trace recorded for this session yet." : null,
  };
}
