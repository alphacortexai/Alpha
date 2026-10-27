import assert from "node:assert/strict";

import { workspacePage } from "./workspace-page.js";

const page = workspacePage("http://127.0.0.1:8080/");
assert.match(page, /<title>Poe<\/title>/);
assert.match(page, /What should Poe do\?/);
assert.match(page, /Poe's computer/);
assert.match(page, /New task/);
assert.match(page, /id="home-form"/);
assert.match(page, /id="timeline"/);
assert.doesNotMatch(page, /Sign in with Google/);
assert.doesNotMatch(page, /Google app id/);
assert.equal(page.includes("indexOf(\"\\n\")") || page.includes("indexOf(\"\n\")"), true);

console.log("workspace-page.test.ts ok");
