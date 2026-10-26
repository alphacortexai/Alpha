export type HomeScreen = "landing" | "register" | "login" | "chat" | "settings" | "admin";

export type HomeService = {
  id: string;
  label: string;
  summary: string;
  state: "connected" | "ready" | "soon";
};

export type HomeView = {
  base: string;
  callbackUrl: string;
  debugUrl: string;
  playgroundUrl: string;
  notice: string;
  googleClient: "environment" | "page" | "missing";
  screen: HomeScreen;
  user: {
    email: string;
    displayName: string;
    timezone: string;
    notes: string;
    owner: boolean;
  } | null;
  services: HomeService[];
};

/** Local product pages. The short door and the channel path both render these. */
export function homePage(view: HomeView): string {
  const base = view.base.endsWith("/") ? view.base : `${view.base}/`;
  const workspace = isWorkspace(view);
  const openSetup = workspace && view.screen !== "chat";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="no-referrer" />
  <base href="${esc(base)}" />
  <title>Poe</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #181818;
      --raised: #1c1c1c;
      --input: #141414;
      --border: #2a2a2a;
      --border-strong: #3a3a3a;
      --text: #f0f0f0;
      --dim: #b8b8b8;
      --faint: #9a9a9a;
      --ghost: #666;
      --accent: #599ce7;
      --green: #3fa266;
      --red: #fc6b83;
      --amber: #f1b467;
      --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 13px/1.45 var(--sans); -webkit-font-smoothing: antialiased; }
    a { color: var(--accent); }
    button, .button { font: inherit; border-radius: 8px; border: 1px solid transparent; background: var(--accent); color: #0c1928; padding: 6px 10px; font-weight: 650; cursor: pointer; text-decoration: none; display: inline-block; text-align: center; }
    button.quiet, .button.quiet { background: transparent; color: var(--text); border-color: var(--border-strong); }
    button:disabled { opacity: .6; cursor: wait; }
    input, textarea { font: inherit; width: 100%; color: var(--text); background: var(--input); border: 1px solid var(--border-strong); border-radius: 8px; padding: 8px 10px; }
    textarea { min-height: 72px; resize: vertical; }
    label { display: block; margin: 10px 0 4px; color: var(--dim); }
    h1 { font-size: 22px; margin: 0 0 8px; letter-spacing: -0.03em; }
    h1 a { color: inherit; text-decoration: none; }
    h2 { font-size: 12px; font-weight: 650; color: var(--faint); margin: 18px 0 8px; }
    p { margin: 0; }
    .muted { color: var(--faint); }
    .hint { margin-top: 6px; color: var(--faint); font-size: 12px; }
    .lede { font-size: 15px; color: var(--dim); max-width: 36rem; }
    .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
    .banner { background: #2a2418; color: var(--amber); border-radius: 8px; padding: 8px 10px; margin-bottom: 12px; }
    .banner.bad { background: #3a2428; color: var(--red); }
    .status { color: var(--faint); min-height: 1.1em; margin-top: 6px; font-size: 12px; }
    .status.bad { color: var(--red); }
    code { font-family: var(--mono); font-size: 12px; word-break: break-all; }
    :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .guest-main { max-width: 440px; margin: 0 auto; padding: 56px 20px 40px; }
    .guest-main .row { margin-top: 16px; }
    body.workspace { height: 100dvh; overflow: hidden; }
    .app-shell { height: 100%; display: flex; min-height: 0; }
    .rail { width: 320px; flex: none; display: flex; flex-direction: column; min-height: 0; background: var(--raised); border-right: 1px solid var(--border); }
    .rail-brand { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 12px 14px 0; }
    .rail-brand a { color: inherit; text-decoration: none; font-weight: 650; font-size: 14px; }
    .rail-scroll { flex: 1; overflow: auto; padding: 8px 14px 28px; }
    .who { font-size: 14px; font-weight: 650; margin-top: 8px; }
    .card { border: 1px solid var(--border); border-radius: 8px; padding: 10px; margin: 0 0 8px; }
    .card h3 { margin: 0 0 4px; font-size: 13px; }
    .card p { color: var(--dim); font-size: 12px; }
    .badge { display: inline-block; font-size: 11px; border-radius: 999px; padding: 1px 7px; margin-bottom: 6px; background: #292929; color: var(--dim); }
    .badge.on { background: #1e3a2a; color: #b7d7b0; }
    details.later { margin-top: 8px; }
    details.later summary { cursor: pointer; color: var(--faint); font-size: 12px; font-weight: 650; }
    details.later .card { margin-top: 8px; }
    .thread { flex: 1; min-width: 0; display: flex; flex-direction: column; background: var(--bg); }
    .thread-bar { display: none; align-items: center; gap: 8px; min-height: 42px; padding: 6px 12px; border-bottom: 1px solid var(--border); }
    .thread-bar strong { font-size: 13px; }
    .thread-notice { margin: 12px 22px 0; }
    .transcript { flex: 1; overflow: auto; padding: 18px 22px 8px; display: flex; flex-direction: column; }
    .empty { margin: auto; max-width: 320px; text-align: center; color: var(--faint); }
    .empty strong { display: block; color: var(--text); font-size: 16px; margin-bottom: 6px; }
    .msg { width: min(760px, 100%); margin: 0 auto 16px; font-size: 14px; line-height: 1.5; }
    .msg.user .bubble { background: var(--raised); border: 1px solid var(--border-strong); border-radius: 8px; padding: 8px 10px; white-space: pre-wrap; word-break: break-word; }
    .msg.assistant { margin-bottom: 20px; }
    .msg.assistant .bubble { padding: 0 2px; white-space: pre-wrap; word-break: break-word; }
    .msg.assistant a { display: inline-block; margin-top: 8px; font-size: 12px; }
    .composer { padding: 8px 22px 14px; }
    .prompt { max-width: 760px; margin: 0 auto; background: var(--raised); border: 1px solid var(--border-strong); border-radius: 12px; display: flex; flex-direction: column; }
    .prompt:focus-within { border-color: #5c5c5c; }
    .prompt textarea { border: 0; background: transparent; resize: none; min-height: 44px; max-height: 200px; padding: 10px 12px 2px; border-radius: 12px 12px 0 0; field-sizing: content; }
    .prompt textarea:focus { outline: none; }
    .prompt-bar { display: flex; align-items: center; gap: 8px; padding: 6px 8px 8px 12px; }
    .prompt-bar .hint { margin: 0; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #setup-close { display: none; }
    .setup-backdrop { display: none; }
    .sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; }
    @media (max-width: 800px) {
      .guest-main { padding-top: 28px; }
      .rail { position: fixed; z-index: 30; top: 0; bottom: 0; left: 0; width: min(100vw, 380px); max-width: 100%; transform: translateX(-105%); transition: transform .18s ease; box-shadow: none; }
      body.setup-open .rail { transform: none; box-shadow: 8px 0 24px rgba(0, 0, 0, .45); }
      body.setup-open .setup-backdrop { display: block; position: fixed; inset: 0; background: rgba(0, 0, 0, .5); z-index: 25; }
      .thread-bar { display: flex; }
      #setup-close { display: inline-block; }
      .transcript, .composer, .thread-notice { padding-left: 12px; padding-right: 12px; }
      .thread-notice { margin-left: 12px; margin-right: 12px; }
    }
  </style>
</head>
<body class="${workspace ? `workspace${openSetup ? " setup-open" : ""}` : "guest"}" data-screen="${esc(view.screen)}">
  ${workspace ? screenHtml(view) : `<main class="guest-main"><h1><a href="./">Poe</a></h1>${noticeHtml(view)}${screenHtml(view)}</main>`}
  <noscript><p>This page needs JavaScript to create an account and sign in.</p></noscript>
  <script>
    const base = ${JSON.stringify(base).replace(/</g, "\\u003c")};

    function show(id, text, bad) {
      const node = document.querySelector(id);
      if (!node) return;
      node.textContent = text || "";
      node.hidden = !text;
      node.classList.toggle("bad", Boolean(bad) && Boolean(text));
    }

    async function post(path, body) {
      const response = await fetch(base + path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || "That did not work.");
      return data;
    }

    function bind(id, path, body, done) {
      const form = document.querySelector(id);
      if (!form) return;
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = form.querySelector("button");
        if (button) button.disabled = true;
        try {
          const data = await post(path, body(form));
          if (done) done(data);
          else location.href = base + "chat";
        } catch (error) {
          show(id + "-status", error instanceof Error ? error.message : "That did not work.", true);
          show("#notice", error instanceof Error ? error.message : "That did not work.", true);
        } finally {
          if (button) button.disabled = false;
        }
      });
    }

    bind("#signup", "signup", (form) => ({
      email: form.email.value,
      password: form.password.value,
      displayName: form.displayName.value,
      timezone: form.timezone.value,
    }));
    bind("#login", "login", (form) => ({
      email: form.email.value,
      password: form.password.value,
    }));
    bind("#preferences", "preferences", (form) => ({
      displayName: form.displayName.value,
      timezone: form.timezone.value,
      notes: form.notes.value,
    }), () => show("#preferences-status", "Saved.", false));

    const logout = document.querySelector("#logout");
    if (logout) {
      logout.addEventListener("click", async () => {
        logout.disabled = true;
        try {
          await post("logout", {});
          location.href = base;
        } catch (error) {
          show("#notice", error instanceof Error ? error.message : "Log out failed.", true);
          logout.disabled = false;
        }
      });
    }

    const setupToggle = document.querySelector("#setup-toggle");
    const setupClose = document.querySelector("#setup-close");
    const setupBackdrop = document.querySelector("#setup-backdrop");
    function setSetup(open) { document.body.classList.toggle("setup-open", open); }
    if (setupToggle) setupToggle.addEventListener("click", () => setSetup(true));
    if (setupClose) setupClose.addEventListener("click", () => setSetup(false));
    if (setupBackdrop) setupBackdrop.addEventListener("click", () => setSetup(false));

    ${workspace ? settingsScript(view.screen) : ""}

    const chat = document.querySelector("#chat");
    const transcript = document.querySelector("#transcript");
    if (chat && transcript) {
      chat.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = chat.message.value.trim();
        if (!message) return;
        chat.message.value = "";
        const placeholder = transcript.querySelector(".empty");
        if (placeholder) placeholder.remove();
        addBubble(message, "user");
        const pending = addBubble("Poe is working…", "assistant");
        const button = chat.querySelector("button");
        if (button) button.disabled = true;
        try {
          const data = await post("chat", { message });
          pending.textContent = data.text || "Poe did not return a reply.";
          if (data.playgroundUrl) {
            const link = document.createElement("a");
            link.href = data.playgroundUrl;
            link.textContent = "Open the trace";
            link.target = "_blank";
            link.rel = "noreferrer";
            pending.appendChild(document.createElement("br"));
            pending.appendChild(link);
          }
        } catch (error) {
          pending.textContent = error instanceof Error ? error.message : "Poe did not finish.";
        } finally {
          if (button) button.disabled = false;
          transcript.scrollTop = transcript.scrollHeight;
        }
      });
      const field = chat.querySelector("textarea");
      if (field) {
        field.addEventListener("keydown", (event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            chat.requestSubmit();
          }
        });
      }
    }

    function addBubble(text, className) {
      const row = document.createElement("div");
      row.className = "msg " + className;
      const node = document.createElement("div");
      node.className = "bubble";
      node.textContent = text;
      row.appendChild(node);
      transcript.appendChild(row);
      transcript.scrollTop = transcript.scrollHeight;
      return node;
    }
  </script>
</body>
</html>`;
}

function isWorkspace(view: HomeView): boolean {
  return view.user !== null && (view.screen === "chat" || view.screen === "settings" || view.screen === "admin");
}

function screenHtml(view: HomeView): string {
  if (view.screen === "register") return registerHtml();
  if (view.screen === "login") return loginHtml();
  if (isWorkspace(view)) return workspaceHtml(view);
  return landingHtml();
}

function noticeHtml(view: HomeView): string {
  return view.notice
    ? `<div class="banner" id="notice">${esc(view.notice)}</div>`
    : `<div class="banner" id="notice" hidden></div>`;
}

function landingHtml(): string {
  return `<p class="lede">Poe is your assistant for mail, calendar, and the web.</p>
    <p class="hint">Create an account. Gmail, Calendar, and your preferences sit on the left of the chat. The person who runs Poe saves the Google app there too.</p>
    <div class="row">
      <a class="button" href="register">Create account</a>
      <a class="button quiet" href="login">Sign in</a>
    </div>`;
}

function registerHtml(): string {
  return `<form id="signup">
      <h2>Create an account</h2>
      <label for="signup-name">Name</label>
      <input id="signup-name" name="displayName" autocomplete="name" maxlength="80" />
      <label for="signup-email">Email</label>
      <input id="signup-email" name="email" type="email" autocomplete="username" required maxlength="200" />
      <label for="signup-password">Password</label>
      <input id="signup-password" name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="200" />
      <p class="hint">At least 8 characters. Poe stores a hash on this computer.</p>
      <label for="signup-zone">Timezone</label>
      <input id="signup-zone" name="timezone" maxlength="80" placeholder="Africa/Kampala" />
      <div class="row"><button type="submit">Create account</button></div>
      <p class="status" id="signup-status"></p>
    </form>
    <p class="hint">Already have an account? <a href="login">Sign in</a></p>`;
}

function loginHtml(): string {
  return `<form id="login">
      <h2>Sign in</h2>
      <label for="login-email">Email</label>
      <input id="login-email" name="email" type="email" autocomplete="username" required maxlength="200" />
      <label for="login-password">Password</label>
      <input id="login-password" name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="200" />
      <div class="row"><button type="submit">Sign in</button></div>
      <p class="status" id="login-status"></p>
    </form>
    <p class="hint"><a href="register">Create account</a></p>`;
}

function workspaceHtml(view: HomeView): string {
  const ready = view.services.filter((service) => service.state !== "soon");
  const later = view.services.filter((service) => service.state === "soon");
  const owner = view.user?.owner === true;
  return `<div class="app-shell">
    <aside class="rail" id="setup">
      <div class="rail-brand">
        <a href="chat">Poe</a>
        <button type="button" class="quiet" id="setup-close">Close</button>
      </div>
      <div class="rail-scroll">
        ${noticeHtml(view)}
        <p class="who">${esc(view.user?.displayName || "You")}</p>
        <p class="muted">${esc(view.user?.email ?? "")}</p>
        <div class="row"><button type="button" class="quiet" id="logout">Log out</button></div>
        ${preferencesHtml(view)}
        <section id="services">
          <h2>Accounts</h2>
          ${webCard()}
          ${ready.map((service) => serviceCard(service)).join("")}
          <p class="status" id="connect-status"></p>
        </section>
        ${later.length > 0 ? `<details class="later">
          <summary>Coming later</summary>
          ${later.map((service) => soonCard(service)).join("")}
        </details>` : ""}
        ${owner ? ownerHtml(view) : ""}
      </div>
    </aside>
    <div class="setup-backdrop" id="setup-backdrop"></div>
    <section class="thread">
      <div class="thread-bar">
        <button type="button" class="quiet" id="setup-toggle" aria-controls="setup">Setup</button>
        <strong>Poe</strong>
      </div>
      ${view.notice ? `<div class="banner thread-notice">${esc(view.notice)}</div>` : ""}
      <div class="transcript" id="transcript">
        <p class="empty"><strong>Poe</strong>Ask about your mail, your calendar, or a public page.</p>
      </div>
      <form id="chat" class="composer">
        <div class="prompt">
          <label class="sr" for="chat-message">Message</label>
          <textarea id="chat-message" name="message" maxlength="8000" placeholder="Message Poe"></textarea>
          <div class="prompt-bar">
            <p class="hint">Enter to send. Shift+Enter for a new line.</p>
            <button type="submit">Send</button>
          </div>
        </div>
      </form>
    </section>
  </div>`;
}

function preferencesHtml(view: HomeView): string {
  const user = view.user;
  if (!user) return "";
  return `<section>
    <h2>Preferences</h2>
    <form id="preferences">
      <label for="pref-name">Name</label>
      <input id="pref-name" name="displayName" value="${esc(user.displayName)}" required maxlength="80" />
      <label for="pref-zone">Timezone</label>
      <input id="pref-zone" name="timezone" value="${esc(user.timezone)}" required maxlength="80" placeholder="Africa/Kampala" />
      <label for="pref-notes">Notes</label>
      <textarea id="pref-notes" name="notes" maxlength="2000">${esc(user.notes)}</textarea>
      <div class="row"><button type="submit">Save preferences</button></div>
      <p class="status" id="preferences-status"></p>
    </form>
  </section>`;
}

function webCard(): string {
  return `<article class="card" data-service="web">
    <span class="badge on">On</span>
    <h3>Web</h3>
    <p>Web browsing is on. Poe can read public pages.</p>
  </article>`;
}

function serviceCard(service: HomeService): string {
  if (service.state === "connected") {
    return `<article class="card">
      <span class="badge on">Signed in</span>
      <h3>${esc(service.label)}</h3>
      <p>${esc(service.summary)}</p>
      <div class="row"><button type="button" class="quiet" data-disconnect="${esc(service.id)}">Disconnect</button></div>
    </article>`;
  }
  return `<article class="card">
    <span class="badge">Ready</span>
    <h3>${esc(service.label)}</h3>
    <p>${esc(service.summary)}</p>
    <div class="row"><button type="button" data-connect="${esc(service.id)}">Sign in with Google</button></div>
  </article>`;
}

function soonCard(service: HomeService): string {
  return `<article class="card">
    <span class="badge">Later</span>
    <h3>${esc(service.label)}</h3>
    <p>${esc(service.summary)}</p>
  </article>`;
}

function ownerHtml(view: HomeView): string {
  return `<section id="owner">
    <h2>Admin</h2>
    <p class="hint">Save the Google app once for this Poe. While that app is in Testing, add each person's Gmail as a test user. People connect their own account with Sign in with Google.</p>
    ${googleSetupHtml(view)}
    <p class="hint">The playground is your trace. It uses your Gmail. Other people stay in this chat, which uses theirs.</p>
    <div class="row">
      <a class="button quiet" href="${esc(view.playgroundUrl)}">Open playground</a>
      <a class="button quiet" href="${esc(view.debugUrl)}">Open debug</a>
    </div>
  </section>`;
}

function googleSetupHtml(view: HomeView): string {
  if (view.googleClient === "environment") {
    return `<p class="hint">A Google app id is already set for this Poe. Each person still chooses Sign in with Google for their own account.</p>`;
  }
  const saved = view.googleClient === "page"
    ? `<p class="hint">An app id is saved on this computer. Saving again replaces it. The secret stays on this computer.</p>`
    : `<p class="hint">Google will not let Poe register itself. Paste the app id here once for this Poe.</p>`;
  return `<form id="google-client">
      ${saved}
      <p class="hint">Redirect <code>${esc(view.callbackUrl)}</code></p>
      <label for="google-client-id">Google app id</label>
      <input id="google-client-id" name="clientId" autocomplete="off" required maxlength="200" />
      <label for="google-client-secret">App secret, when Google gave you one</label>
      <input id="google-client-secret" name="clientSecret" type="password" autocomplete="off" maxlength="256" />
      <div class="row"><button type="submit">Save app id</button></div>
      <p class="status" id="google-client-status"></p>
    </form>`;
}

function settingsScript(screen: HomeScreen): string {
  const done = `${screen}?notice=`;
  return `bind("#google-client", "google-client", (form) => ({
      clientId: form.clientId.value,
      clientSecret: form.clientSecret.value,
    }), () => {
      location.href = base + ${JSON.stringify(done)} + encodeURIComponent("App id saved.");
    });

    document.querySelectorAll("[data-connect]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const data = await post("connect", { service: button.getAttribute("data-connect") });
          if (data.url) location.href = data.url;
          else location.href = base + ${JSON.stringify(done)} + encodeURIComponent("Already signed in.");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Sign in with Google did not start.";
          setSetup(true);
          show("#notice", message, true);
          show("#connect-status", message, true);
          const banner = document.querySelector("#notice");
          if (banner) banner.scrollIntoView({ block: "nearest" });
          button.disabled = false;
        }
      });
    });

    document.querySelectorAll("[data-disconnect]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await post("disconnect", { service: button.getAttribute("data-disconnect") });
          location.href = base + ${JSON.stringify(done)} + encodeURIComponent("Disconnected.");
        } catch (error) {
          setSetup(true);
          show("#notice", error instanceof Error ? error.message : "Disconnect failed.", true);
          button.disabled = false;
        }
      });
    });`;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
