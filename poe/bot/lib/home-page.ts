export type HomeScreen = "landing" | "register" | "login" | "chat" | "settings";

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
  notice: string;
  googleClient: "environment" | "page" | "missing";
  screen: HomeScreen;
  user: {
    email: string;
    displayName: string;
    timezone: string;
    notes: string;
  } | null;
  services: HomeService[];
};

/** Local product pages. The short door and the channel path both render these. */
export function homePage(view: HomeView): string {
  const base = view.base.endsWith("/") ? view.base : `${view.base}/`;
  const signedIn = view.user !== null;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="no-referrer" />
  <base href="${esc(base)}" />
  <title>Poe</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; font: 17px/1.5 ui-sans-serif, system-ui, sans-serif; background: #14120e; color: #f5f0e8; }
    a { color: #e7c27a; }
    header, main { padding: 20px 24px; }
    header { border-bottom: 1px solid #2e2a22; display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    h1 { font-size: 32px; margin: 0; letter-spacing: -0.03em; }
    h1 a { color: inherit; text-decoration: none; }
    h2 { font-size: 13px; letter-spacing: .06em; text-transform: uppercase; color: #a8a29e; margin: 0 0 12px; }
    p { margin: 0; }
    nav { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    nav a, nav button { text-decoration: none; }
    main { display: grid; gap: 16px; max-width: 880px; }
    .lede { font-size: 20px; max-width: 38rem; color: #e7e5e4; }
    .muted { color: #a8a29e; }
    .banner { background: #2a261c; color: #f3e6c4; border-radius: 12px; padding: 12px 14px; }
    .banner.bad { background: #3a2424; color: #f6c9c9; }
    section, .card { background: #1c1914; border: 1px solid #2e2a22; border-radius: 14px; padding: 16px; }
    label { display: block; margin: 12px 0 4px; color: #e7e5e4; }
    input, textarea, button, .button { font: inherit; border-radius: 10px; border: 1px solid #4a4338; background: #12100c; color: inherit; padding: 10px 12px; }
    textarea { min-height: 96px; resize: vertical; width: 100%; }
    input { width: 100%; }
    button, .button { display: inline-block; width: auto; cursor: pointer; background: #e7c27a; color: #1c1408; border-color: transparent; font-weight: 650; text-align: center; }
    button.quiet, .button.quiet { background: transparent; color: #f5f0e8; border-color: #4a4338; }
    button:disabled { opacity: .6; cursor: wait; }
    .row { display: flex; gap: 8px; align-items: center; margin-top: 14px; flex-wrap: wrap; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
    .badge { display: inline-block; font-size: 12px; border-radius: 999px; padding: 2px 8px; margin-bottom: 8px; background: #2e2a22; color: #d6d3d1; }
    .badge.on { background: #1e3a2a; color: #b7d7b0; }
    .card h3 { margin: 0 0 6px; font-size: 18px; }
    .card p { color: #d6d3d1; min-height: 48px; }
    .transcript { min-height: 180px; max-height: 420px; overflow: auto; display: flex; flex-direction: column; gap: 8px; }
    .bubble { border-radius: 12px; padding: 10px 12px; white-space: pre-wrap; }
    .mine { background: #2a261c; align-self: flex-end; max-width: 85%; }
    .poe { background: #17140f; border: 1px solid #3a3428; align-self: flex-start; max-width: 85%; }
    .status { color: #f0a8a8; min-height: 1.2em; margin-top: 8px; }
    .hint { margin-top: 8px; color: #a8a29e; font-size: 14px; }
    details { background: #1c1914; border: 1px solid #2e2a22; border-radius: 14px; padding: 12px 16px; }
    summary { cursor: pointer; font-weight: 650; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; word-break: break-all; }
    footer { padding: 8px 24px 24px; color: #78716c; font-size: 13px; }
    :focus-visible { outline: 2px solid #e7c27a; outline-offset: 2px; }
    @media (max-width: 640px) {
      header, main, footer { padding-left: 16px; padding-right: 16px; }
      header { display: block; }
      nav { margin-top: 12px; }
      h1 { font-size: 28px; }
      .lede { font-size: 18px; }
      .grid { grid-template-columns: 1fr; }
      main button, main .button { width: 100%; }
    }
  </style>
</head>
<body data-screen="${esc(view.screen)}">
  <header>
    <h1><a href="${signedIn ? "chat" : "./"}">Poe</a></h1>
    ${signedIn ? navHtml(view.screen) : ""}
  </header>
  <main>
    ${view.notice ? `<div class="banner" id="notice">${esc(view.notice)}</div>` : `<div class="banner" id="notice" hidden></div>`}
    ${screenHtml(view)}
  </main>
  <footer><a href="${esc(view.debugUrl)}">Debug</a></footer>
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

    ${view.screen === "settings" ? settingsScript() : ""}

    const chat = document.querySelector("#chat");
    const transcript = document.querySelector("#transcript");
    if (chat && transcript) {
      chat.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = chat.message.value.trim();
        if (!message) return;
        chat.message.value = "";
        addBubble(message, "mine");
        const pending = addBubble("Poe is working…", "poe");
        const button = chat.querySelector("button");
        if (button) button.disabled = true;
        try {
          const data = await post("chat", { message });
          pending.textContent = data.text || "Poe did not return a reply.";
          if (data.playgroundUrl) {
            const link = document.createElement("a");
            link.href = data.playgroundUrl;
            link.textContent = " Open the trace";
            pending.appendChild(link);
          }
        } catch (error) {
          pending.textContent = error instanceof Error ? error.message : "Poe did not finish.";
        } finally {
          if (button) button.disabled = false;
          transcript.scrollTop = transcript.scrollHeight;
        }
      });
    }

    function addBubble(text, className) {
      const node = document.createElement("div");
      node.className = "bubble " + className;
      node.textContent = text;
      transcript.appendChild(node);
      transcript.scrollTop = transcript.scrollHeight;
      return node;
    }
  </script>
</body>
</html>`;
}

function screenHtml(view: HomeView): string {
  if (view.screen === "register") return registerHtml();
  if (view.screen === "login") return loginHtml();
  if (view.screen === "chat") return chatHtml(view);
  if (view.screen === "settings") return settingsHtml(view);
  return landingHtml();
}

function navHtml(screen: HomeScreen): string {
  const chat = screen === "chat" ? ` aria-current="page"` : "";
  const settings = screen === "settings" ? ` aria-current="page"` : "";
  return `<nav>
    <a class="button quiet" href="chat"${chat}>Chat</a>
    <a class="button quiet" href="settings"${settings}>Settings</a>
    <button type="button" class="quiet" id="logout">Log out</button>
  </nav>`;
}

function landingHtml(): string {
  return `<section>
    <p class="lede">Poe is your assistant for mail, calendar, and the web.</p>
    <p class="muted" style="margin-top:10px">Create an account, then talk to Poe in chat. Web browsing is already on. Gmail and Calendar use Sign in with Google from Settings.</p>
    <div class="row">
      <a class="button" href="register">Create account</a>
      <a class="button quiet" href="login">Sign in</a>
    </div>
  </section>`;
}

function registerHtml(): string {
  return `<section>
    <h2>Create an account</h2>
    <form id="signup">
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
    <p class="hint">Already have an account? <a href="login">Sign in</a></p>
  </section>`;
}

function loginHtml(): string {
  return `<section>
    <h2>Sign in</h2>
    <form id="login">
      <label for="login-email">Email</label>
      <input id="login-email" name="email" type="email" autocomplete="username" required maxlength="200" />
      <label for="login-password">Password</label>
      <input id="login-password" name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="200" />
      <div class="row"><button type="submit">Sign in</button></div>
      <p class="status" id="login-status"></p>
    </form>
    <p class="hint"><a href="register">Create account</a></p>
  </section>`;
}

function chatHtml(view: HomeView): string {
  const name = view.user?.displayName ? ` ${esc(view.user.displayName)}` : "";
  return `<section>
    <h2>Chat</h2>
    <p class="muted">Hello${name}. Ask about mail, your calendar, or a public web page.</p>
    <div class="transcript" id="transcript"></div>
    <form id="chat">
      <label for="chat-message">Message</label>
      <textarea id="chat-message" name="message" maxlength="8000" placeholder="What is on my calendar today?"></textarea>
      <div class="row"><button type="submit">Send</button></div>
      <p class="status" id="chat-status"></p>
    </form>
  </section>`;
}

function settingsHtml(view: HomeView): string {
  const ready = view.services.filter((service) => service.state !== "soon");
  const later = view.services.filter((service) => service.state === "soon");
  const signedIn = view.user !== null;
  return `${preferencesHtml(view)}
    <section>
      <h2>Services</h2>
      <div class="grid">
        ${webCard()}
        ${ready.map((service) => serviceCard(service, signedIn)).join("")}
      </div>
      <p class="status" id="connect-status"></p>
    </section>
    <section>
      <h2>Coming later</h2>
      <div class="grid">
        ${later.map((service) => soonCard(service)).join("")}
      </div>
    </section>
    ${googleSetupHtml(view)}`;
}

function preferencesHtml(view: HomeView): string {
  const user = view.user;
  if (!user) return "";
  return `<section>
    <h2>Preferences</h2>
    <p class="muted">Signed in as ${esc(user.email)}. Your name, timezone, and notes sit on top of Poe's soul.</p>
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

function serviceCard(service: HomeService, signedIn: boolean): string {
  if (service.state === "connected") {
    return `<article class="card">
      <span class="badge on">Signed in</span>
      <h3>${esc(service.label)}</h3>
      <p>${esc(service.summary)}</p>
      <div class="row"><button type="button" class="quiet" data-disconnect="${esc(service.id)}">Disconnect</button></div>
    </article>`;
  }
  const action = signedIn
    ? `<div class="row"><button type="button" data-connect="${esc(service.id)}">Sign in with Google</button></div>`
    : `<p class="hint">Create an account, then come back to Settings.</p>`;
  return `<article class="card">
    <span class="badge">Ready</span>
    <h3>${esc(service.label)}</h3>
    <p>${esc(service.summary)}</p>
    ${action}
  </article>`;
}

function soonCard(service: HomeService): string {
  return `<article class="card">
    <span class="badge">Later</span>
    <h3>${esc(service.label)}</h3>
    <p>${esc(service.summary)}</p>
  </article>`;
}

function googleSetupHtml(view: HomeView): string {
  if (view.googleClient === "environment") {
    return `<p class="hint">A Google app id is already set for this Poe. Each person still chooses Sign in with Google for their own account.</p>`;
  }
  const saved = view.googleClient === "page"
    ? `<p class="hint">An app id is saved on this computer. Saving again replaces it. The secret stays on this computer.</p>`
    : `<p class="hint">Google will not let Poe register itself. Paste the app id here once for this Poe.</p>`;
  return `<details>
    <summary>One-time setup</summary>
    <form id="google-client">
      ${saved}
      <p class="hint">Redirect <code>${esc(view.callbackUrl)}</code></p>
      <label for="google-client-id">Google app id</label>
      <input id="google-client-id" name="clientId" autocomplete="off" required maxlength="200" />
      <label for="google-client-secret">App secret, when Google gave you one</label>
      <input id="google-client-secret" name="clientSecret" type="password" autocomplete="off" maxlength="256" />
      <div class="row"><button type="submit">Save app id</button></div>
      <p class="status" id="google-client-status"></p>
    </form>
  </details>`;
}

function settingsScript(): string {
  return `bind("#google-client", "google-client", (form) => ({
      clientId: form.clientId.value,
      clientSecret: form.clientSecret.value,
    }), () => {
      location.href = base + "settings?notice=" + encodeURIComponent("App id saved.");
    });

    document.querySelectorAll("[data-connect]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const data = await post("connect", { service: button.getAttribute("data-connect") });
          if (data.url) location.href = data.url;
          else location.href = base + "settings?notice=" + encodeURIComponent("Already signed in.");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Sign in with Google did not start.";
          show("#notice", message, true);
          show("#connect-status", message, true);
          const banner = document.querySelector("#notice");
          if (banner) banner.scrollIntoView({ block: "center" });
          button.disabled = false;
        }
      });
    });

    document.querySelectorAll("[data-disconnect]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await post("disconnect", { service: button.getAttribute("data-disconnect") });
          location.href = base + "settings?notice=" + encodeURIComponent("Disconnected.");
        } catch (error) {
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
