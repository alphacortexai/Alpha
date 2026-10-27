import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { agentSlug, agentSource, descriptionFromSource, listAgents, saveAgent } from "./agents.js";

assert.equal(agentSlug("Research"), "research");
assert.equal(agentSlug(" Mail notes "), "mail-notes");
assert.equal(agentSlug("../secret"), "secret");
assert.equal(agentSlug(".."), undefined);
assert.equal(agentSlug("poe"), undefined);
assert.equal(agentSlug("a"), "a");

const source = agentSource('Say "hello" and keep going.');
assert.equal(source.includes("../"), false);
assert.equal(descriptionFromSource(source, "fallback"), 'Say "hello" and keep going.');

const root = await mkdtemp(join(tmpdir(), "poe-agents-"));
const saved = await saveAgent("Brief writer", "Write a one-page brief from public sources.", root);
assert.equal("id" in saved && saved.id, "brief-writer");
const file = await readFile(join(root, "brief-writer", "agent.ts"), "utf8");
assert.match(file, /defineAgent/);
assert.deepEqual((await listAgents(root)).map((agent) => agent.id), ["brief-writer"]);
const rejected = await saveAgent("..", "This should not be written anywhere.", root);
assert.equal("error" in rejected, true);

console.log("agents.test.ts ok");
