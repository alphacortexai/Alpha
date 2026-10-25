/** Local debug console. It reads the trace API on the same channel. */
export function debugPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Poe debug</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font: 15px/1.45 ui-sans-serif, system-ui, sans-serif; background: #12141a; color: #e7e5e4; }
    header, main { padding: 20px 24px; }
    header { border-bottom: 1px solid #2a2e38; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    p { margin: 0; color: #a8a29e; }
    form { display: flex; gap: 8px; margin: 16px 0; }
    input, button { font: inherit; border-radius: 8px; border: 1px solid #3f4451; background: #1c1f27; color: inherit; padding: 8px 10px; }
    button { cursor: pointer; }
    .layout { display: grid; grid-template-columns: 280px 1fr; gap: 16px; }
    @media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }
    section { background: #1c1f27; border-radius: 12px; padding: 12px; }
    h2 { font-size: 13px; letter-spacing: .04em; text-transform: uppercase; color: #a8a29e; margin: 0 0 8px; }
    ul { list-style: none; padding: 0; margin: 0; }
    li { margin: 6px 0; }
    a, button.link { color: #e7c27a; background: none; border: 0; padding: 0; cursor: pointer; text-align: left; }
    .card { border: 1px solid #343846; border-radius: 10px; padding: 10px; margin: 8px 0; }
    .bad { color: #f0a8a8; }
    .ok { color: #b7d7b0; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    pre { white-space: pre-wrap; word-break: break-word; margin: 6px 0 0; color: #d6d3d1; }
  </style>
</head>
<body>
  <header>
    <h1>Poe debug</h1>
    <p>Subagent spans, tool results, tasks, and approvals for one session. The playground shows the same stream live.</p>
  </header>
  <main>
    <form id="pick">
      <input id="session" name="sessionId" placeholder="Session id" aria-label="Session id" />
      <button type="submit">Open</button>
    </form>
    <div class="layout">
      <section>
        <h2>Recent sessions</h2>
        <ul id="sessions"></ul>
      </section>
      <section>
        <h2>Trace</h2>
        <div id="trace"></div>
      </section>
    </div>
  </main>
  <script>
    const sessionInput = document.querySelector("#session");
    const sessionsEl = document.querySelector("#sessions");
    const traceEl = document.querySelector("#trace");
    const params = new URLSearchParams(location.search);
    if (params.get("sessionId")) sessionInput.value = params.get("sessionId");

    document.querySelector("#pick").addEventListener("submit", (event) => {
      event.preventDefault();
      const id = sessionInput.value.trim();
      const url = new URL(location.href);
      if (id) url.searchParams.set("sessionId", id);
      else url.searchParams.delete("sessionId");
      history.replaceState(null, "", url);
      load();
    });

    function el(tag, text, className) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    }

    async function load() {
      const id = sessionInput.value.trim();
      const query = id ? "?sessionId=" + encodeURIComponent(id) : "";
      const response = await fetch("trace" + query);
      const view = await response.json();
      sessionsEl.replaceChildren();
      for (const sessionId of view.recentSessions || []) {
        const item = el("li");
        const button = el("button", sessionId, "link");
        button.type = "button";
        button.addEventListener("click", () => {
          sessionInput.value = sessionId;
          document.querySelector("#pick").requestSubmit();
        });
        item.append(button);
        sessionsEl.append(item);
      }
      if ((view.recentSessions || []).length === 0) {
        sessionsEl.append(el("li", "No sessions recorded yet."));
      }
      traceEl.replaceChildren();
      if (view.note) traceEl.append(el("p", view.note));
      const timeline = el("div", null, "card");
      timeline.append(el("strong", "Events"));
      const events = view.events || [];
      if (events.length === 0) timeline.append(el("p", "No events for this session."));
      for (const event of events) {
        const label = [event.type, event.name].filter(Boolean).join(" · ");
        timeline.append(el("div", label, event.isError ? "bad" : "ok"));
        if (event.preview) timeline.append(el("pre", event.preview));
      }
      traceEl.append(timeline);
      for (const span of view.tree || []) {
        const card = el("div", null, "card");
        const title = span.isError ? span.subagent + " failed" : span.subagent;
        card.append(el("strong", title, span.isError ? "bad" : "ok"));
        card.append(el("pre", span.callId));
        for (const tool of span.tools || []) {
          const line = (tool.isError ? "error " : tool.stubbed ? "stubbed " : "ok ") + tool.name;
          card.append(el("div", line, tool.isError ? "bad" : "ok"));
          if (tool.preview) card.append(el("pre", tool.preview));
        }
        if ((span.tools || []).length === 0) card.append(el("p", "No tool results under this subagent."));
        traceEl.append(card);
      }
      const loose = (view.events || []).filter((event) => event.type === "action.result" && !event.parentCallId);
      if (loose.length) {
        const card = el("div", null, "card");
        card.append(el("strong", "Parent tools"));
        for (const event of loose) {
          card.append(el("div", (event.isError ? "error " : "ok ") + (event.name || "tool"), event.isError ? "bad" : "ok"));
          if (event.preview) card.append(el("pre", event.preview));
        }
        traceEl.append(card);
      }
      for (const approval of view.approvals || []) {
        const card = el("div", null, "card");
        card.append(el("strong", "Approval " + approval.status));
        card.append(el("pre", approval.interfaceId + " · " + approval.action + "\\n" + approval.id));
        traceEl.append(card);
      }
      for (const task of view.tasks || []) {
        const card = el("div", null, "card");
        card.append(el("strong", task.state + " · " + task.interfaceId));
        card.append(el("pre", task.title + "\\n" + task.id));
        traceEl.append(card);
      }
    }
    load();
  </script>
</body>
</html>`;
}
