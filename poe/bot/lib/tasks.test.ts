import assert from "node:assert/strict";

import { normalizeTasks, taskTitle, withTask, withToken } from "./tasks.js";

assert.equal(taskTitle("  Build a page\nwith notes"), "Build a page");
assert.equal(taskTitle("   "), "Task");
assert.equal(taskTitle("x".repeat(200)).length, 80);

const first = { id: "ses_a", title: "One", token: "tok-a", createdAt: "2026-10-27T00:00:00.000Z" };
const second = { id: "ses_b", title: "Two", token: "tok-b", createdAt: "2026-10-27T01:00:00.000Z" };
const stored = withTask(withTask(null, first), second);
assert.deepEqual(stored.map((task) => task.id), ["ses_b", "ses_a"]);
assert.equal(withTask([{ id: 1 }], second)[0]?.id, "ses_b");
assert.equal(withToken(stored, "ses_a", "tok-next").find((task) => task.id === "ses_a")?.token, "tok-next");
assert.equal(normalizeTasks("nope").length, 0);

console.log("tasks.test.ts ok");
