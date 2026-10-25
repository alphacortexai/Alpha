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
    .transcript { min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 12px; }
    .bubble { border-radius: 16px; padding: 12px 14px; white-space: pre-wrap; line-height: 1.45; }
    .mine { background: #3a3120; align-self: flex-end; max-width: min(70%, 640px); }
    .poe { background: #221e18; border: 1px solid #3a3428; align-self: flex-start; max-width: min(78%, 720px); }
    .poe a { display: inline-block; margin-top: 8px; font-size: 13px; }
    body[data-screen="chat"] { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    body[data-screen="chat"] header { flex: none; }
    body[data-screen="chat"] main.chat-shell { flex: 1; max-width: none; width: 100%; min-height: 0; display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 0; padding: 0; }
    .rail { padding: 22px 18px; background: #1c1914; border-right: 1px solid #2e2a22; overflow: auto; }
    .rail h2 { margin-top: 22px; }
    .who { font-size: 18px; margin: 4px 0; }
    .thread { display: flex; flex-direction: column; min-height: 0; min-width: 0; background: #100e0b; }
    .thread .transcript { flex: 1; padding: 28px 8vw 12px; }
    .empty { color: #a8a29e; margin: auto; max-width: 28rem; text-align: center; }
    .composer { display: flex; gap: 8px; align-items: flex-end; padding: 12px 8vw 18px; border-top: 1px solid #2e2a22; background: #14120e; }
    .composer textarea { min-height: 52px; max-height: 160px; margin: 0; }
    .chip { display: flex; justify-content: space-between; gap: 8px; padding: 8px 0; border-bottom: 1px solid #2e2a22; font-size: 14px; }
    .status { color: #f0a8a8; min-height: 1.2em; margin-top: 8px; }
    .hint { margin-top: 8px; color: #a8a29e; font-size: 14px; }
    details { background: #1c1914; border: 1px solid #2e2a22; border-radius: 14px; padding: 12px 16px; }
    summary { cursor: pointer; font-weight: 650; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; word-break: break-all; }
    footer { padding: 8px 24px 24px; color: #78716c; font-size: 13px; }
    :focus-visible { outline: 2px solid #e7c27a; outline-offset: 2px; }
    @media (max-width: 800px) {
      header, main, footer { padding-left: 16px; padding-right: 16px; }
      header { display: block; }
      nav { margin-top: 12px; }
      h1 { font-size: 28px; }
      .lede { font-size: 18px; }
      .grid { grid-template-columns: 1fr; }
      main button, main .button { width: 100%; }
      body[data-screen="chat"] { height: 100dvh; }
      body[data-screen="chat"] header, body[data-screen="chat"] main { padding-left: 0; padding-right: 0; }
      body[data-screen="chat"] header { padding: 12px 16px; }
      body[data-screen="chat"] main.chat-shell { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }
      .rail { border-right: 0; border-bottom: 1px solid #2e2a22; max-height: 34vh; }
      .thread .transcript, .composer { padding-left: 16px; padding-right: 16px; }
      .mine, .poe { max-width: 92%; }
    }
  </style>
</head>
<body data-screen="${esc(view.screen)}">
  <header>
    <h1><a href="${signedIn ? "chat" : "./"}">Poe</a></h1>
    ${signedIn ? navHtml(view.screen, view.user?.owner === true) : ""}
  </header>
  <main class="${view.screen === "chat" ? "chat-shell" : ""}">
    ${view.screen === "chat" ? "" : view.notice ? `<div class="banner" id="notice">${esc(view.notice)}</div>` : `<div class="banner" id="notice" hidden></div>`}
    ${screenHtml(view)}
  </main>
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

    ${view.screen === "settings" || view.screen === "admin" ? settingsScript(view.screen) : ""}

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
  if (view.screen === "admin") return adminHtml(view);
  return landingHtml();
}

function navHtml(screen: HomeScreen, owner: boolean): string {
  const chat = screen === "chat" ? ` aria-current="page"` : "";
  const settings = screen === "settings" ? ` aria-current="page"` : "";
  const admin = screen === "admin" ? ` aria-current="page"` : "";
  const adminLink = owner ? `<a class="button quiet" href="admin"${admin}>Admin</a>` : "";
  return `<nav>
    <a class="button quiet" href="chat"${chat}>Chat</a>
    <a class="button quiet" href="settings"${settings}>Settings</a>
    ${adminLink}
    <button type="button" class="quiet" id="logout">Log out</button>
  </nav>`;
}

function landingHtml(): string {
  return `<section>
    <p class="lede">Poe is your assistant for mail, calendar, and the web.</p>
    <p class="muted" style="margin-top:10px">Create an account, then open Chat. Connect your own Gmail from Settings. The person who runs Poe handles the Google app.</p>
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
  const name = view.user?.displayName ?? "there";
  const mail = view.services.find((service) => service.id === "gmail");
  const calendar = view.services.find((service) => service.id === "google-calendar");
  return `<aside class="rail">
      <p class="muted">Signed in</p>
      <p class="who">${esc(name)}</p>
      <p class="muted">${esc(view.user?.email ?? "")}</p>
      <h2>On this account</h2>
      ${chip("Web", "On")}
      ${chip("Gmail", mail?.state === "connected" ? "Signed in" : "Connect in Settings")}
      ${chip("Calendar", calendar?.state === "connected" ? "Signed in" : "Connect in Settings")}
      <div class="row"><a class="button" href="settings">Your accounts</a></div>
    </aside>
    <section class="thread">
      ${view.notice ? `<div class="banner" id="notice">${esc(view.notice)}</div>` : `<div class="banner" id="notice" hidden></div>`}
      <div class="transcript" id="transcript">
        <p class="empty">Ask Poe about your mail, your calendar, or a public page. Enter sends. Shift+Enter adds a line.</p>
      </div>
      <form id="chat" class="composer">
        <label class="muted" for="chat-message" style="position:absolute;left:-999px">Message</label>
        <textarea id="chat-message" name="message" maxlength="8000" placeholder="Message Poe"></textarea>
        <button type="submit">Send</button>
      </form>
    </section>`;
}

function chip(label: string, value: string): string {
  return `<div class="chip"><span>${esc(label)}</span><span>${esc(value)}</span></div>`;
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
    </section>`;
}

function adminHtml(view: HomeView): string {
  return `<section>
    <h2>Owner</h2>
    <p>People use this Poe from the address you gave them. They create an account, talk in Chat, and connect their own Gmail from Settings.</p>
    <p class="hint">You save the Google app here, once. While that app is in Testing, add each person's Gmail address as a test user.</p>
    ${googleSetupHtml(view)}
    <h2 style="margin-top:22px">Your trace</h2>
    <p class="hint">The playground is your view of turns. It uses your Gmail, because you are the owner. New people stay in Chat, which uses their own Gmail.</p>
    <div class="row">
      <a class="button" href="${esc(view.playgroundUrl)}">Open playground</a>
      <a class="button quiet" href="${esc(view.debugUrl)}">Open debug</a>
    </div>
  </section>`;
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
  const done = screen === "admin" ? "admin?notice=" : "settings?notice=";
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
