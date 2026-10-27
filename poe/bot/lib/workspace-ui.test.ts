import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { workspacePage } from "./workspace-page.js";

const html = workspacePage("http://127.0.0.1:9/").replace(
  "</script>",
  "window.__poe = { applyEvent };\n  </script>",
);

const pageServer = createServer((_req, response) => {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(html);
});
await listen(pageServer);
const pagePort = portOf(pageServer);
const debugPort = await freePort();
const profile = await mkdtemp(join(tmpdir(), "poe-ui-"));

const chrome = spawn("/usr/bin/google-chrome", [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${debugPort}`,
  `http://127.0.0.1:${pagePort}/`,
], { stdio: "ignore" });

try {
  const target = await waitForPage(debugPort);
  const socket = new WebSocket(target);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve());
    socket.addEventListener("error", () => reject(new Error("Chrome devtools did not connect.")));
  });
  let nextId = 0;
  function evaluate(expression: string): Promise<unknown> {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        const message = JSON.parse(String(event.data)) as { id?: number; result?: { result?: { value?: unknown }; exceptionDetails?: unknown } };
        if (message.id !== id) return;
        socket.removeEventListener("message", onMessage);
        if (message.result?.exceptionDetails) reject(new Error("Page script failed."));
        else resolve(message.result?.result?.value);
      };
      socket.addEventListener("message", onMessage);
      socket.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, returnByValue: true, awaitPromise: true } }));
    });
  }
  await evaluate("document.querySelector('#agent-form') ? true : false").then((ready) => {
    assert.equal(ready, true);
  });

  const shown = await evaluate(`(() => {
    const html = "<!doctype html><html><body><script>document.body.dataset.pwned='yes'<\\/script><h1 id=\\"ok\\">Brief</h1></body></html>";
    window.__poe.applyEvent({ index: 1, type: "subagent.called", data: { callId: "c1", name: "research", description: "Find public sources." } });
    window.__poe.applyEvent({ index: 2, type: "actions.requested", data: { calls: [
      { callId: "t1", toolName: "task", args: { description: "Research the topic." } },
      { callId: "w1", toolName: "write", args: { path: "brief.html", contents: html } },
      { callId: "w2", toolName: "write", args: { path: "notes.md", contents: "A plain note." } }
    ] } });
    window.__poe.applyEvent({ index: 3, type: "subagent.completed", data: { callId: "c1", name: "research", isError: false } });
    const frame = document.querySelector(".doc-inline iframe");
    const doc = frame && frame.contentDocument;
    const pwned = doc && doc.body ? doc.body.dataset.pwned || "" : "";
    const heading = doc && doc.querySelector("#ok") ? doc.querySelector("#ok").textContent : "";
    return {
      subprocess: document.querySelector(".sub") ? document.querySelector(".sub").innerText : "",
      done: document.querySelector(".sub") ? document.querySelector(".sub").className : "",
      steps: document.querySelectorAll(".step").length,
      terminal: document.querySelector("#terminal").childElementCount,
      docs: [...document.querySelectorAll(".doc-card strong")].map((node) => node.textContent),
      sandbox: frame ? frame.getAttribute("sandbox") : null,
      srcdoc: frame ? frame.srcdoc : "",
      isolated: !doc || pwned === "",
      heading,
      note: document.querySelector(".doc-paper") ? document.querySelector(".doc-paper").textContent : "",
      docsTab: document.querySelector("#screen-docs").hidden
    };
  })()`) as {
    subprocess: string;
    done: string;
    steps: number;
    terminal: number;
    docs: string[];
    sandbox: string | null;
    srcdoc: string;
    isolated: boolean;
    heading: string;
    note: string;
    docsTab: boolean;
  };

  assert.match(shown.subprocess, /Subprocess/);
  assert.match(shown.subprocess, /research/);
  assert.match(shown.subprocess, /Find public sources/);
  assert.match(shown.subprocess, /Done/);
  assert.match(shown.done, /\bdone\b/);
  assert.equal(shown.steps, 2);
  assert.equal(shown.terminal, 0);
  assert.deepEqual(shown.docs, ["brief.html", "notes.md"]);
  assert.equal(shown.sandbox, "");
  assert.match(shown.srcdoc, /Brief/);
  assert.match(shown.srcdoc, /pwned/);
  assert.equal(shown.isolated, true);
  if (shown.heading) assert.equal(shown.heading, "Brief");
  assert.equal(shown.note, "A plain note.");
  assert.equal(shown.docsTab, true);

  const stopped = await evaluate(`(() => {
    window.__poe.applyEvent({ index: 4, type: "subagent.called", data: { callId: "c2", name: "mail", description: "Read the latest note." } });
    window.__poe.applyEvent({ index: 5, type: "subagent.completed", data: { callId: "c2", isError: true } });
    const node = document.querySelector("[data-sub='c2']");
    return { text: node ? node.innerText : "", className: node ? node.className : "" };
  })()`) as { text: string; className: string };
  assert.match(stopped.text, /Stopped/);
  assert.match(stopped.className, /\bbad\b/);

  console.log("workspace-ui.test.ts ok");
} finally {
  chrome.kill("SIGKILL");
  await new Promise<void>((resolve) => {
    if (chrome.exitCode !== null || chrome.signalCode !== null) resolve();
    else chrome.once("exit", () => resolve());
  });
  pageServer.close();
  await rm(profile, { recursive: true, force: true });
}

function listen(server: Server): Promise<void> {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
}

function portOf(server: Server): number {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("The page server has no port.");
  return address.port;
}

function freePort(): Promise<number> {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = portOf(server);
      server.close(() => resolve(port));
    });
  });
}

async function waitForPage(debugPort: number): Promise<string> {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (response.ok) {
        const pages = (await response.json()) as Array<{ type?: string; url?: string; webSocketDebuggerUrl?: string }>;
        const page = pages.find((item) => item.type === "page" && item.webSocketDebuggerUrl && item.url?.includes("127.0.0.1"));
        if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Chrome did not open the workspace page.");
}
