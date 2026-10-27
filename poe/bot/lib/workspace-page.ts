/** The agent workspace. The short door and the channel path both render this. */
export function workspacePage(base: string): string {
  const root = base.endsWith("/") ? base : `${base}/`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="no-referrer" />
  <base href="${escapeHtml(root)}" />
  <title>Poe</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f3f4f6;
      --paper: #ffffff;
      --ink: #17181c;
      --muted: #6b7080;
      --line: #e4e6eb;
      --soft: #eceef2;
      --blue: #2563eb;
      --danger: #b42318;
      --shadow: 0 12px 40px rgba(23, 24, 28, .08);
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body { margin: 0; display: flex; background: var(--bg); color: var(--ink); font: 14px/1.5 "Segoe UI", ui-sans-serif, system-ui, sans-serif; }
    button, textarea { font: inherit; color: inherit; }
    button { cursor: pointer; }
    .side { width: 260px; flex: none; display: flex; flex-direction: column; background: var(--soft); border-right: 1px solid var(--line); min-height: 0; }
    .brand { display: flex; align-items: baseline; gap: 8px; padding: 18px 16px 8px; }
    .brand strong { font-size: 18px; letter-spacing: -0.03em; }
    .brand span { color: var(--muted); font-size: 12px; }
    .new-task { margin: 8px 12px 14px; border: 0; border-radius: 10px; background: #111318; color: white; padding: 10px 12px; font-weight: 650; }
    .side h2 { margin: 0; padding: 0 16px 8px; font-size: 12px; font-weight: 650; color: var(--muted); }
    .tasks { flex: 1; min-height: 0; overflow: auto; padding: 0 8px 8px; display: flex; flex-direction: column; gap: 2px; }
    .task { border: 0; background: transparent; text-align: left; border-radius: 8px; padding: 8px 10px; }
    .task strong { display: block; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .task em { display: block; font-style: normal; color: var(--muted); font-size: 12px; }
    .task.active, .task:hover { background: var(--paper); }
    .agents { max-height: 24vh; overflow: auto; padding: 0 8px 8px; display: flex; flex-direction: column; gap: 2px; }
    .agent { border: 0; background: transparent; text-align: left; border-radius: 8px; padding: 8px 10px; }
    .agent strong { display: block; font-weight: 650; }
    .agent span { display: block; color: var(--muted); font-size: 12px; }
    .agent-form { display: flex; flex-direction: column; gap: 6px; margin: 0 12px 16px; }
    .agent-form input, .agent-form textarea { border: 1px solid var(--line); border-radius: 8px; padding: 8px; background: white; }
    .agent-form textarea { min-height: 72px; resize: vertical; }
    .agent-note { margin: 0; color: var(--muted); font-size: 12px; }
    .sub, .doc-card { max-width: 680px; width: 100%; margin: 0 auto; border: 1px solid var(--line); background: white; border-radius: 12px; padding: 10px 12px; }
    .sub-head, .doc-head { display: flex; align-items: center; gap: 8px; }
    .sub-head strong, .doc-head strong { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sub p { margin: 6px 0 0; }
    .sub i, .doc-card i { font-style: normal; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
    .sub em { font-style: normal; color: var(--blue); font-size: 12px; }
    .sub.done em { color: #067647; }
    .sub.bad em { color: var(--danger); }
    .doc-inline { margin-top: 8px; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: white; }
    .doc-frame { width: 100%; min-height: 480px; height: 100%; border: 0; background: white; }
    .doc-inline .doc-frame { height: 320px; min-height: 0; }
    .doc-paper { margin: 0; padding: 22px; background: white; min-height: 100%; white-space: pre-wrap; }
    .doc-inline .doc-paper { max-height: 320px; overflow: auto; min-height: 0; }
    .stage { flex: 1; min-width: 0; display: flex; }
    .work { flex: 1; min-width: 0; display: flex; flex-direction: column; min-height: 0; }
    .home { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 32px 24px 12vh; }
    .home-inner { width: min(720px, 100%); margin: 0 auto; }
    h1 { margin: 0 0 18px; font-size: 40px; line-height: 1.1; letter-spacing: -0.045em; font-weight: 560; }
    .composer { background: var(--paper); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); padding: 8px; }
    textarea { width: 100%; border: 0; resize: none; min-height: 64px; max-height: 180px; padding: 10px 12px 4px; outline: none; background: transparent; }
    .composer-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 4px 6px 4px 12px; }
    .hint { margin: 0; color: var(--muted); font-size: 12px; }
    .run { border: 0; border-radius: 999px; background: #111318; color: white; padding: 8px 16px; font-weight: 650; }
    .run:disabled { opacity: .55; cursor: wait; }
    .ideas { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
    .ideas button { border: 1px solid var(--line); background: var(--paper); border-radius: 999px; padding: 8px 12px; color: #333742; }
    .ideas button:hover { border-color: #c5c8d0; }
    .thread-wrap { flex: 1; display: none; flex-direction: column; min-height: 0; }
    body.task-open .home { display: none; }
    body.task-open .thread-wrap { display: flex; }
    .thread-bar { display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-bottom: 1px solid transparent; }
    .thread-bar h2 { margin: 0; font-size: 15px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .quiet { border: 1px solid var(--line); background: var(--paper); border-radius: 8px; padding: 6px 10px; }
    .timeline { flex: 1; overflow: auto; padding: 8px 8% 12px; display: flex; flex-direction: column; gap: 12px; }
    .msg { max-width: 680px; width: 100%; margin: 0 auto; white-space: pre-wrap; word-break: break-word; }
    .msg.user { background: #e8eaef; border-radius: 14px; padding: 10px 12px; }
    .msg.assistant { padding: 2px 2px; }
    .think { max-width: 680px; width: 100%; margin: 0 auto; color: var(--muted); font-size: 13px; }
    .think summary { cursor: pointer; }
    .step { max-width: 680px; width: 100%; margin: 0 auto; display: flex; gap: 8px; align-items: baseline; color: #3c4150; font-size: 13px; }
    .step i { font-style: normal; color: var(--muted); flex: none; }
    .step.bad { color: var(--danger); }
    .dock { padding: 0 8% 18px; }
    .dock .composer { box-shadow: none; }
    .computer { width: min(46%, 640px); flex: none; display: none; flex-direction: column; background: var(--paper); border-left: 1px solid var(--line); min-width: 0; }
    body.task-open .computer { display: flex; }
    .computer-bar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--line); }
    .computer-bar strong { font-size: 13px; }
    .status { color: var(--muted); font-size: 12px; }
    .status.live { color: var(--blue); }
    .tabs { display: flex; gap: 4px; padding: 8px 12px 0; }
    .tabs button { border: 0; background: transparent; border-radius: 8px; padding: 6px 10px; color: var(--muted); }
    .tabs button.on { background: var(--soft); color: var(--ink); }
    .screen { flex: 1; min-height: 0; margin: 8px 12px 12px; border: 1px solid var(--line); border-radius: 12px; overflow: auto; background: #fbfbfc; }
    .urlbar { padding: 8px 12px; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 12px; background: white; position: sticky; top: 0; }
    .page, .term, .files { padding: 14px; }
    .page h3 { margin: 0 0 8px; font-size: 16px; }
    .page p, .term { margin: 0; white-space: pre-wrap; word-break: break-word; }
    .term { background: #17181c; color: #e8eaf0; min-height: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
    .term .cmd { color: #9ecbff; }
    .files button { display: block; width: 100%; text-align: left; border: 0; background: transparent; padding: 6px 0; border-bottom: 1px solid var(--line); }
    .files pre { white-space: pre-wrap; word-break: break-word; font-size: 12px; }
    .empty-screen { color: var(--muted); padding: 28px 16px; text-align: center; }
    .error { color: var(--danger); max-width: 680px; width: 100%; margin: 0 auto; }
    .menu { display: none; }
    @media (max-width: 900px) {
      body { display: block; height: 100dvh; }
      .side { position: fixed; z-index: 20; inset: 0 auto 0 0; width: min(100%, 300px); transform: translateX(-105%); transition: transform .16s ease; }
      body.nav-open .side { transform: none; }
      .menu { display: inline-block; }
      .stage { height: 100dvh; }
      .computer { position: fixed; z-index: 15; inset: 0; width: auto; }
      body.task-open .computer { display: none; }
      body.computer-open .computer { display: flex; }
      .timeline, .dock { padding-left: 14px; padding-right: 14px; }
      h1 { font-size: 32px; }
    }
  </style>
</head>
<body>
  <aside class="side">
    <div class="brand"><strong>Poe</strong><span>Agent</span></div>
    <button class="new-task" type="button" id="new-task">New task</button>
    <h2>Tasks</h2>
    <div class="tasks" id="tasks"></div>
    <h2>Agents</h2>
    <div class="agents" id="agents"></div>
    <form class="agent-form" id="agent-form">
      <input id="agent-name" name="name" maxlength="80" placeholder="Name, like Research" />
      <textarea id="agent-job" name="job" maxlength="4000" placeholder="What should this agent do?"></textarea>
      <button class="run" type="submit">Add agent</button>
      <p class="agent-note" id="agent-note"></p>
    </form>
  </aside>
  <div class="stage">
    <section class="work">
      <div class="home">
        <div class="home-inner">
          <h1>What should Poe do?</h1>
          <form class="composer" id="home-form">
            <label class="sr" for="home-message" style="position:absolute;left:-999px">Task</label>
            <textarea id="home-message" name="message" maxlength="8000" placeholder="Give Poe a task. It will use its computer."></textarea>
            <div class="composer-bar">
              <p class="hint">Enter to run. Shift+Enter for a new line.</p>
              <button class="run" type="submit">Run</button>
            </div>
          </form>
          <div class="ideas">
            <button type="button" data-idea="Research a public topic and write a one-page brief in the workspace.">Research a topic</button>
            <button type="button" data-idea="Build a single HTML page in the workspace that says hello and explains what it is.">Build a page</button>
            <button type="button" data-idea="Read https://example.com and list the facts on the page.">Read a page</button>
            <button type="button" data-idea="Write a Python script that prints the first 20 primes, run it, and save the script.">Write a script</button>
          </div>
          <p class="error" id="home-error"></p>
        </div>
      </div>
      <div class="thread-wrap">
        <div class="thread-bar">
          <button class="quiet menu" type="button" id="nav-toggle">Menu</button>
          <h2 id="task-title">Task</h2>
          <button class="quiet menu" type="button" id="computer-toggle">Computer</button>
        </div>
        <div class="timeline" id="timeline"></div>
        <form class="dock" id="follow-form">
          <div class="composer">
            <label class="sr" for="follow-message" style="position:absolute;left:-999px">Follow-up</label>
            <textarea id="follow-message" name="message" maxlength="8000" placeholder="Ask Poe to change something"></textarea>
            <div class="composer-bar">
              <p class="hint" id="follow-error"></p>
              <button class="run" type="submit">Send</button>
            </div>
          </div>
        </form>
      </div>
    </section>
    <section class="computer" id="computer">
      <div class="computer-bar">
        <strong>Poe's computer</strong>
        <span class="status" id="status">Idle</span>
        <button class="quiet menu" type="button" id="computer-close">Close</button>
      </div>
      <div class="tabs">
        <button type="button" class="on" data-tab="browser">Browser</button>
        <button type="button" data-tab="terminal">Terminal</button>
        <button type="button" data-tab="files">Files</button>
        <button type="button" data-tab="docs">Docs</button>
      </div>
      <div class="screen" id="screen-browser">
        <div class="empty-screen" id="browser-empty">The browser opens when Poe reads a page.</div>
        <div id="browser-view" hidden>
          <div class="urlbar" id="browser-url"></div>
          <div class="page"><h3 id="browser-title"></h3><p id="browser-text"></p></div>
        </div>
      </div>
      <div class="screen" id="screen-terminal" hidden>
        <div class="term" id="terminal"></div>
      </div>
      <div class="screen" id="screen-files" hidden>
        <div class="files" id="files"></div>
      </div>
      <div class="screen" id="screen-docs" hidden>
        <div class="empty-screen" id="docs-empty">Documents Poe creates open here.</div>
        <div id="docs-view" hidden></div>
      </div>
    </section>
  </div>
  <script>
    const base = ${JSON.stringify(root).replace(/</g, "\\u003c")};
    const state = { task: null, lastIndex: -1, stream: null, seen: new Set(), users: new Set(), calls: new Map(), files: new Map(), docs: new Map() };

    const tasksNode = document.querySelector("#tasks");
    const timeline = document.querySelector("#timeline");
    const titleNode = document.querySelector("#task-title");
    const statusNode = document.querySelector("#status");

    document.querySelector("#new-task").addEventListener("click", showHome);
    document.querySelector("#nav-toggle").addEventListener("click", () => document.body.classList.toggle("nav-open"));
    document.querySelector("#computer-toggle").addEventListener("click", () => document.body.classList.add("computer-open"));
    document.querySelector("#computer-close").addEventListener("click", () => document.body.classList.remove("computer-open"));
    document.querySelectorAll("[data-idea]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelector("#home-message").value = button.getAttribute("data-idea");
        document.querySelector("#home-form").requestSubmit();
      });
    });
    document.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => showTab(button.getAttribute("data-tab")));
    });
    bindForm("#home-form", "#home-message", "#home-error");
    bindForm("#follow-form", "#follow-message", "#follow-error");
    document.querySelector("#agent-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = document.querySelector("#agent-name").value.trim();
      const job = document.querySelector("#agent-job").value.trim();
      const note = document.querySelector("#agent-note");
      try {
        const data = await post("agents", { name, job });
        document.querySelector("#agent-name").value = "";
        document.querySelector("#agent-job").value = "";
        note.textContent = data.restart || "Agent added.";
        await loadAgents();
      } catch (error) {
        note.textContent = error instanceof Error ? error.message : "That agent was not added.";
      }
    });
    loadTasks();
    loadAgents().catch((error) => {
      document.querySelector("#agent-note").textContent = error instanceof Error ? error.message : "Agents could not be loaded.";
    });

    function bindForm(formId, fieldId, errorId) {
      const form = document.querySelector(formId);
      const field = document.querySelector(fieldId);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = field.value.trim();
        if (!message) return;
        field.value = "";
        const button = form.querySelector("button");
        button.disabled = true;
        try {
          if (state.task) await follow(message);
          else await run(message);
          text(errorId, "");
        } catch (error) {
          text(errorId, error instanceof Error ? error.message : "That did not work.");
        } finally {
          button.disabled = false;
        }
      });
      field.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          form.requestSubmit();
        }
      });
    }

    async function run(message) {
      const data = await post("run", { message });
      openTask({ id: data.sessionId, title: data.title, token: data.continuationToken, createdAt: new Date().toISOString() }, false);
      addUser(message);
      setWorking(true);
      await loadTasks();
      ensureStream();
    }

    async function follow(message) {
      const data = await post("follow", {
        sessionId: state.task.id,
        continuationToken: state.task.token,
        message,
      });
      state.task.token = data.continuationToken;
      state.task.id = data.sessionId;
      addUser(message);
      setWorking(true);
      ensureStream();
    }

    function showHome() {
      stopStream();
      state.task = null;
      document.body.classList.remove("task-open", "nav-open", "computer-open");
    }

    function openTask(task, replay) {
      stopStream();
      state.task = task;
      state.lastIndex = -1;
      state.seen = new Set();
      state.users = new Set();
      state.calls = new Map();
      state.files = new Map();
      state.docs = new Map();
      document.querySelector("#docs-empty").hidden = false;
      document.querySelector("#docs-view").hidden = true;
      document.querySelector("#docs-view").replaceChildren();
      timeline.replaceChildren();
      document.querySelector("#terminal").replaceChildren();
      document.querySelector("#files").replaceChildren();
      document.querySelector("#browser-empty").hidden = false;
      document.querySelector("#browser-view").hidden = true;
      titleNode.textContent = task.title;
      document.body.classList.add("task-open");
      document.body.classList.remove("nav-open");
      setWorking(false);
      showTab("browser");
      markActive(task.id);
      if (replay) ensureStream();
    }

    function ensureStream() {
      if (!state.task || state.stream) return;
      const taskId = state.task.id;
      const controller = new AbortController();
      state.stream = controller;
      readStream(taskId, state.lastIndex + 1, controller).catch((error) => {
        if (controller.signal.aborted) return;
        const node = document.createElement("p");
        node.className = "error";
        node.textContent = error instanceof Error ? error.message : "The computer stream stopped.";
        timeline.appendChild(node);
      }).finally(() => {
        if (state.stream === controller) state.stream = null;
      });
    }

    async function readStream(taskId, startIndex, controller) {
      const response = await fetch(base + "events?sessionId=" + encodeURIComponent(taskId) + "&startIndex=" + startIndex, { signal: controller.signal });
      if (!response.ok || !response.body) throw new Error("That task could not be opened.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        let breakAt = buffer.indexOf("\\n");
        while (breakAt >= 0) {
          const line = buffer.slice(0, breakAt).trim();
          buffer = buffer.slice(breakAt + 1);
          if (line) applyEvent(JSON.parse(line));
          breakAt = buffer.indexOf("\\n");
        }
      }
    }

    function stopStream() {
      if (state.stream) state.stream.abort();
      state.stream = null;
    }

    function applyEvent(event) {
      if (!event || typeof event.index !== "number" || state.seen.has(event.index)) return;
      state.seen.add(event.index);
      if (event.index > state.lastIndex) state.lastIndex = event.index;
      const data = event.data || {};
      if (event.type === "message.received") addUser(data.text || "");
      if (event.type === "message.appended" || event.type === "message.completed") setAssistant(event.turnId || "turn", data.text || "");
      if (event.type === "reasoning.appended") setThinking(event.turnId || "turn", data.text || "");
      if (event.type === "actions.requested") (data.calls || []).forEach(noteCall);
      if (event.type === "action.result") noteResult(data);
      if (event.type === "artifact.tagged") noteArtifact(data);
      if (event.type === "subagent.called") noteSubagent(data);
      if (event.type === "subagent.completed") finishSubagent(data);
      if (event.type === "turn.started") setWorking(true);
      if (event.type === "turn.completed" || event.type === "session.waiting") setWorking(false);
      if (event.type === "turn.completed" && data.result) setAssistant(event.turnId || "turn", data.result);
      if (event.type === "turn.failed") {
        setWorking(false);
        const node = document.createElement("p");
        node.className = "error";
        node.textContent = data.message || "Poe stopped.";
        timeline.appendChild(node);
      }
      timeline.scrollTop = timeline.scrollHeight;
    }

    function addUser(text) {
      const clean = String(text || "").trim();
      if (!clean || state.users.has(clean)) return;
      state.users.add(clean);
      const node = document.createElement("div");
      node.className = "msg user";
      node.textContent = clean;
      timeline.appendChild(node);
    }

    function byAttr(name, value) {
      return [...timeline.querySelectorAll("[" + name + "]")].find((node) => node.getAttribute(name) === value) || null;
    }

    function setAssistant(turnId, text) {
      let node = byAttr("data-assistant", turnId);
      if (!node) {
        node = document.createElement("div");
        node.className = "msg assistant";
        node.setAttribute("data-assistant", turnId);
        timeline.appendChild(node);
      }
      node.textContent = text;
    }

    function setThinking(turnId, text) {
      let node = byAttr("data-think", turnId);
      if (!node) {
        node = document.createElement("details");
        node.className = "think";
        node.setAttribute("data-think", turnId);
        const summary = document.createElement("summary");
        summary.textContent = "Thinking";
        const body = document.createElement("div");
        node.append(summary, body);
        timeline.appendChild(node);
      }
      node.querySelector("div").textContent = text;
    }

    function noteCall(call) {
      if (!call || !call.callId || state.calls.has(call.callId)) return;
      const kind = String(call.toolName || "").toLowerCase() === "task" ? "task" : kindOf(call.toolName);
      const label = argOf(call.args, ["command", "cmd", "url", "query", "q", "path", "file_path", "filePath"]) || call.toolName;
      const contents = fullArg(call.args, ["contents", "content", "text", "html", "markdown"]);
      state.calls.set(call.callId, { kind, label, contents });
      if (String(call.toolName || "").toLowerCase() === "task") return;
      const node = document.createElement("div");
      node.className = "step";
      node.setAttribute("data-call", call.callId);
      const icon = document.createElement("i");
      icon.textContent = kind === "browser" ? "Browser" : kind === "files" ? "File" : "Terminal";
      const name = document.createElement("span");
      name.textContent = call.toolName + "  " + label;
      node.append(icon, name);
      timeline.appendChild(node);
      if (kind === "browser") {
        showTab("browser");
        setBrowser(label, "Opening…", label);
      } else if (kind === "files") {
        showTab("files");
        setFile(label, "Working…");
      } else {
        showTab("terminal");
        pushTerminal(label, "");
      }
      if (contents) addDoc(label, contents);
      if (!contents && window.matchMedia("(max-width: 900px)").matches) document.body.classList.add("computer-open");
    }

    function noteResult(data) {
      const known = state.calls.get(data.callId);
      const step = byAttr("data-call", data.callId || "");
      if (step && data.isError) step.classList.add("bad");
      const body = preview(data.output);
      if (!known) return;
      if (known.kind === "browser") {
        const page = data.output && typeof data.output === "object" ? data.output : {};
        setBrowser(page.url || known.label, page.ok === false ? (page.error || body) : (page.text || body), page.title || page.url || "Browser");
      } else if (known.kind === "files") {
        setFile(known.label, body);
      } else if (known.kind !== "task") {
        const blocks = document.querySelectorAll("#terminal .block");
        const last = blocks[blocks.length - 1];
        if (last) last.querySelector("pre").textContent = body || (data.isError ? "The command failed." : "");
      }
    }

    function noteArtifact(data) {
      const path = data && data.data && data.data.path ? data.data.path : (data.title || "Deliverable");
      const summary = data && data.data && data.data.summary ? data.data.summary : "";
      setFile(path, summary);
      if (!state.docs.has(path) && summary) addDoc(path, summary);
      if (state.docs.has(path)) showDoc(path);
    }

    function noteSubagent(data) {
      const id = data.callId || data.name || "agent";
      let node = byAttr("data-sub", id);
      if (!node) {
        node = document.createElement("div");
        node.className = "sub";
        node.setAttribute("data-sub", id);
        const head = document.createElement("div");
        head.className = "sub-head";
        const kicker = document.createElement("i");
        kicker.textContent = "Subprocess";
        const title = document.createElement("strong");
        title.textContent = data.name || "Agent";
        const status = document.createElement("em");
        status.textContent = "Working";
        head.append(kicker, title, status);
        const detail = document.createElement("p");
        detail.textContent = data.description || "";
        node.append(head, detail);
        timeline.appendChild(node);
      }
    }

    function finishSubagent(data) {
      const id = data.callId || data.name || "agent";
      let node = byAttr("data-sub", id);
      if (!node) {
        noteSubagent(data);
        node = byAttr("data-sub", id);
      }
      if (!node) return;
      node.classList.toggle("bad", data.isError === true);
      node.classList.toggle("done", data.isError !== true);
      const status = node.querySelector("em");
      if (status) status.textContent = data.isError ? "Stopped" : "Done";
    }

    function addDoc(name, body) {
      const title = String(name || "Document").slice(0, 180);
      const text = String(body || "").slice(0, 80000);
      if (!text.trim()) return;
      state.docs.set(title, text);
      let card = byAttr("data-doc", title);
      if (!card) {
        card = document.createElement("div");
        card.className = "doc-card";
        card.setAttribute("data-doc", title);
        const head = document.createElement("div");
        head.className = "doc-head";
        const kicker = document.createElement("i");
        kicker.textContent = "Document";
        const label = document.createElement("strong");
        label.textContent = title;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "quiet";
        button.textContent = "Open larger";
        button.addEventListener("click", () => showDoc(title));
        head.append(kicker, label, button);
        const inline = document.createElement("div");
        inline.className = "doc-inline";
        card.append(head, inline);
        timeline.appendChild(card);
      }
      paintDoc(card.querySelector(".doc-inline"), title, text);
      const view = document.querySelector("#docs-view");
      paintDoc(view, title, text);
      document.querySelector("#docs-empty").hidden = true;
      view.hidden = false;
    }

    function showDoc(title) {
      const text = state.docs.get(title) || "";
      const view = document.querySelector("#docs-view");
      paintDoc(view, title, text);
      document.querySelector("#docs-empty").hidden = true;
      view.hidden = false;
      showTab("docs");
      if (window.matchMedia("(max-width: 900px)").matches) document.body.classList.add("computer-open");
    }

    function paintDoc(host, title, text) {
      if (!host) return;
      host.replaceChildren();
      if (isHtml(title, text)) {
        const frame = document.createElement("iframe");
        frame.className = "doc-frame";
        frame.setAttribute("sandbox", "");
        frame.setAttribute("title", title);
        frame.srcdoc = text;
        host.appendChild(frame);
      } else {
        const paper = document.createElement("pre");
        paper.className = "doc-paper";
        paper.textContent = text;
        host.appendChild(paper);
      }
    }

    function isHtml(name, text) {
      const lower = String(name || "").toLowerCase();
      const start = String(text || "").trim().slice(0, 40).toLowerCase();
      return lower.endsWith(".html") || lower.endsWith(".htm") || start.startsWith("<!doctype") || start.startsWith("<html");
    }

    function setBrowser(url, text, title) {
      document.querySelector("#browser-empty").hidden = true;
      document.querySelector("#browser-view").hidden = false;
      document.querySelector("#browser-url").textContent = url || "";
      document.querySelector("#browser-title").textContent = title || "";
      document.querySelector("#browser-text").textContent = text || "";
    }

    function pushTerminal(command, output) {
      const block = document.createElement("div");
      block.className = "block";
      const cmd = document.createElement("div");
      cmd.className = "cmd";
      cmd.textContent = "$ " + command;
      const pre = document.createElement("pre");
      pre.textContent = output;
      block.append(cmd, pre);
      document.querySelector("#terminal").appendChild(block);
    }

    function setFile(path, body) {
      state.files.set(path, body);
      const files = document.querySelector("#files");
      files.replaceChildren();
      if (state.files.size === 0) {
        files.textContent = "Files Poe writes show up here.";
        return;
      }
      state.files.forEach((contents, name) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = name;
        const pre = document.createElement("pre");
        pre.hidden = true;
        pre.textContent = contents;
        button.addEventListener("click", () => { pre.hidden = !pre.hidden; });
        files.append(button, pre);
      });
    }

    function showTab(name) {
      document.querySelectorAll("[data-tab]").forEach((button) => {
        button.classList.toggle("on", button.getAttribute("data-tab") === name);
      });
      document.querySelector("#screen-browser").hidden = name !== "browser";
      document.querySelector("#screen-terminal").hidden = name !== "terminal";
      document.querySelector("#screen-files").hidden = name !== "files";
      document.querySelector("#screen-docs").hidden = name !== "docs";
    }

    function fullArg(args, keys) {
      if (!args || typeof args !== "object") return "";
      for (const key of keys) {
        if (typeof args[key] === "string" && args[key].trim()) return args[key].slice(0, 80000);
      }
      return "";
    }

    async function loadAgents() {
      const data = await post("agents", null);
      const list = document.querySelector("#agents");
      list.replaceChildren();
      const agents = data.agents || [];
      if (agents.length === 0) {
        const empty = document.createElement("p");
        empty.className = "agent-note";
        empty.textContent = "None yet. Add one below, then press Enter in the dev window.";
        list.appendChild(empty);
        return;
      }
      agents.forEach((agent) => {
        const row = document.createElement("div");
        row.className = "agent";
        const name = document.createElement("strong");
        name.textContent = agentLabel(agent.id);
        const job = document.createElement("span");
        job.textContent = agent.description || "";
        row.append(name, job);
        list.appendChild(row);
      });
    }

    function agentLabel(id) {
      return String(id || "").split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
    }

    function setWorking(working) {
      statusNode.textContent = working ? "Working" : "Idle";
      statusNode.classList.toggle("live", working);
    }

    function kindOf(name) {
      const tool = String(name || "").toLowerCase();
      if (tool.includes("browse") || tool.includes("web")) return "browser";
      if (tool === "read" || tool === "write" || tool === "edit" || tool === "delete" || tool === "grep" || tool.includes("file") || tool === "tag_artifact") return "files";
      return "terminal";
    }

    function argOf(args, keys) {
      if (!args || typeof args !== "object") return "";
      for (const key of keys) {
        if (typeof args[key] === "string" && args[key].trim()) return args[key].trim().slice(0, 180);
      }
      return "";
    }

    function preview(value) {
      if (value == null) return "";
      const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
      return text.slice(0, 8000);
    }

    async function loadTasks() {
      const data = await post("tasks", null);
      tasksNode.replaceChildren();
      (data.tasks || []).forEach((task) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "task" + (state.task && state.task.id === task.id ? " active" : "");
        button.setAttribute("data-id", task.id);
        const name = document.createElement("strong");
        name.textContent = task.title;
        const when = document.createElement("em");
        const date = new Date(task.createdAt);
        when.textContent = Number.isNaN(date.getTime()) ? "" : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        button.append(name, when);
        button.addEventListener("click", () => openTask(task, true));
        tasksNode.appendChild(button);
      });
    }

    function markActive(id) {
      tasksNode.querySelectorAll(".task").forEach((button) => {
        button.classList.toggle("active", button.getAttribute("data-id") === id);
      });
    }

    async function post(path, body) {
      const response = await fetch(base + path, body === null ? undefined : {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || "That did not work.");
      return data;
    }

    function text(id, value) {
      document.querySelector(id).textContent = value;
    }

  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
