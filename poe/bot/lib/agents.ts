import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type SavedAgent = {
  id: string;
  description: string;
};

const reserved = new Set(["agent", "poe", "task", "computer"]);

export function agentsRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "subagents");
}

export function agentSlug(name: string): string | undefined {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(slug)) return undefined;
  if (reserved.has(slug)) return undefined;
  return slug;
}

export function agentSource(description: string): string {
  return `import { defineAgent } from "@grok/agent-sdk";\n\nexport default defineAgent({\n  description: ${JSON.stringify(description)},\n});\n`;
}

export function descriptionFromSource(source: string, fallback: string): string {
  const match = source.match(/description:\s*("(?:\\.|[^"\\])*")/);
  if (!match?.[1]) return fallback;
  try {
    const value = JSON.parse(match[1]) as unknown;
    return typeof value === "string" && value.trim() ? value : fallback;
  } catch {
    return fallback;
  }
}

export async function listAgents(root = agentsRoot()): Promise<SavedAgent[]> {
  let names: string[] = [];
  try {
    names = await readdir(root);
  } catch {
    return [];
  }
  const agents: SavedAgent[] = [];
  for (const name of names.sort()) {
    const id = agentSlug(name);
    if (id !== name) continue;
    try {
      const source = await readFile(join(root, name, "agent.ts"), "utf8");
      agents.push({ id, description: descriptionFromSource(source, id) });
    } catch {
      // A folder without agent.ts is not an agent.
    }
  }
  return agents;
}

export async function saveAgent(name: string, job: string, root = agentsRoot()): Promise<SavedAgent | { error: string }> {
  const id = agentSlug(name);
  const instructions = job.trim();
  if (!id) return { error: "Use a short name, like Research or Mail." };
  if (instructions.length < 8) return { error: "Say what this agent should do." };
  if (instructions.length > 4000) return { error: "Keep the job under 4000 characters." };
  const description = instructions.split("\n").map((line) => line.trim()).find((line) => line.length > 0)?.slice(0, 240) ?? id;
  const folder = join(root, id);
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, "agent.ts"), agentSource(description), "utf8");
  await writeFile(join(folder, "instructions.md"), `${instructions}\n`, "utf8");
  return { id, description };
}
