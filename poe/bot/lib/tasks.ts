export type WorkspaceTask = {
  id: string;
  title: string;
  token: string;
  createdAt: string;
};

const MAX_TASKS = 40;

export function taskTitle(message: string): string {
  const line = message.split("\n").map((part) => part.trim()).find((part) => part.length > 0) ?? "Task";
  return line.slice(0, 80);
}

export function normalizeTasks(value: unknown): WorkspaceTask[] {
  if (!Array.isArray(value)) return [];
  const tasks: WorkspaceTask[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.title !== "string") continue;
    if (typeof record.token !== "string" || typeof record.createdAt !== "string") continue;
    tasks.push({
      id: record.id.slice(0, 80),
      title: record.title.slice(0, 80),
      token: record.token.slice(0, 500),
      createdAt: record.createdAt.slice(0, 40),
    });
    if (tasks.length >= MAX_TASKS) break;
  }
  return tasks;
}

export function withTask(existing: unknown, task: WorkspaceTask): WorkspaceTask[] {
  return [task, ...normalizeTasks(existing).filter((item) => item.id !== task.id)].slice(0, MAX_TASKS);
}

export function withToken(existing: unknown, id: string, token: string): WorkspaceTask[] {
  return normalizeTasks(existing).map((task) => (task.id === id ? { ...task, token: token.slice(0, 500) } : task));
}
