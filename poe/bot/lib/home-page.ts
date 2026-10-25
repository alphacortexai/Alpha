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
  user: {
    email: string;
    displayName: string;
    timezone: string;
    notes: string;
  } | null;
  services: HomeService[];
};

/** Local home page. Signing up, preferences, and Connect all happen here. */
export function homePage(view: HomeView): string {
  const signedIn = view.user !== null;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="no-referrer" />
  <title>Poe</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; font: 16px/1.45 ui-sans-serif, system-ui, sans-serif; background: #12141a; color: #e7e5e4; }
    header, main { padding: 20px 24px; }
    header { border-bottom: 1px solid #2a2e38; display: flex; justify-content: space-between; gap: 16px; align-items: flex-end; }
    h1 { font-size: 28px; margin: 0 0 4px; }
    h2 { font-size: 13px; letter-spacing: .04em; text-transform: uppercase; color: #a8a29e; margin: 0 0 10px; }
    p { margin: 0; color: #a8a29e; }
    a { color: #e7c27a; }
    main { display: grid; gap: 16px; max-width: 1080px; }
    .banner { background: #2a261c; color: #f3e6c4; border-radius: 10px; padding: 10px 12px; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    section, .card { background: #1c1f27; border: 1px solid #2a2e38; border-radius: 12px; padding: 14px; }
    label { display: block; margin: 10px 0 4px; color: #d6d3d1; }
    input, textarea, button { font: inherit; border-radius: 8px; border: 1px solid #3f4451; background: #12141a; color: inherit; padding: 8px 10px; width: 100%; }
    textarea { min-height: 88px; resize: vertical; }
    button { width: auto; cursor: pointer; background: #e7c27a; color: #1c1408; border-color: transparent; font-weight: 650; }
    button.quiet { background: transparent; color: #e7e5e4; border-color: #3f4451; }
    button:disabled { opacity: .6; cursor: wait; }
    .row { display: flex; gap: 8px; align-items: center; margin-top: 12px; flex-wrap: wrap; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
    .badge { display: inline-block; font-size: 12px; border-radius: 999px; padding: 2px 8px; margin-bottom: 8px; background: #2a2e38; color: #d6d3d1; }
    .badge.on { background: #1e3a2a; color: #b7d7b0; }
    .card h3 { margin: 0 0 6px; font-size: 17px; }
    .card p { min-height: 44px; }
    .transcript { min-height: 140px; max-height: 320px; overflow: auto; display: flex; flex-direction: column; gap: 8px; }
    .bubble { border-radius: 10px; padding: 8px 10px; white-space: pre-wrap; }
    .mine { background: #2a261c; align-self: flex-end; max-width: 85%; }
    .poe { background: #171a22; border: 1px solid #343846; align-self: flex-start; max-width: 85%; }
    .status { color: #f0a8a8; min-height: 1.2em; margin-top: 8px; }
    .hint { margin-top: 8px; font-size: 13px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    @media (max-width: 800px) {
      header, main { padding: 16px; }
      header, .split { display: block; }
      header a { display: inline-block; margin-top: 8px; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Poe</h1>
      <p>Sign up, keep Poe's soul, then add your preferences and connect your own accounts.</p>
    </div>
    <a href="${esc(view.debugUrl)}">Debug</a>
  </header>
  <main>
    ${view.notice ? `<div class="banner" id="notice">${esc(view.notice)}</div>` : `<div class="banner" id="notice" hidden></div>`}
    ${signedIn ? signedInHtml(view) : signedOutHtml()}
    <section>
      <h2>What Poe can use</h2>
      <div class="grid" id="services">
        ${view.services.map((service) => serviceCard(service, signedIn)).join("")}
      </div>
      <p class="status" id="connect-status"></p>
      ${signedIn ? `<p class="hint">Google redirect for Connect: <code>${esc(view.callbackUrl)}</code></p>` : ""}
      ${signedIn ? googleClientHtml(view) : ""}
    </section>
    ${signedIn ? chatHtml() : ""}
  </main>
  <noscript><p>This page needs JavaScript to sign up and connect accounts.</p></noscript>
  <script>
    const base = ${JSON.stringify(view.base)};

    function show(id, text, bad) {
      const node = document.querySelector(id);
      if (!node) return;
      node.textContent = text || "";
      if (node.id === "notice") node.hidden = !text;
      node.style.color = bad ? "#f0a8a8" : "";
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
          else location.href = base;
        } catch (error) {
          show(id + "-status", error instanceof Error ? error.message : "That did not work.", true);
        } finally {
          if (button) button.disabled = false;
        }
      });
    }

    bind("#signup", "signup", (form) => ({
      email: form.email.value,
      password: form.password.value,
      displayName: form.displayName.value,
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
          show("#preferences-status", error instanceof Error ? error.message : "Log out failed.", true);
          logout.disabled = false;
        }
      });
    }

    bind("#google-client", "google-client", (form) => ({
      clientId: form.clientId.value,
      clientSecret: form.clientSecret.value,
    }), () => {
      location.href = base + "?notice=" + encodeURIComponent("Google client saved.");
    });

    document.querySelectorAll("[data-connect]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const data = await post("connect", { service: button.getAttribute("data-connect") });
          if (data.url) location.href = data.url;
          else location.href = base + "?notice=" + encodeURIComponent("Already connected.");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Connect failed.";
          show("#notice", message, true);
          show("#connect-status", message, true);
          const banner = document.querySelector("#notice");
          if (banner) banner.scrollIntoView({ behavior: "smooth", block: "center" });
          button.disabled = false;
        }
      });
    });

    document.querySelectorAll("[data-disconnect]").forEach((button) => {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await post("disconnect", { service: button.getAttribute("data-disconnect") });
          location.href = base + "?notice=" + encodeURIComponent("Disconnected.");
        } catch (error) {
          show("#notice", error instanceof Error ? error.message : "Disconnect failed.", true);
          button.disabled = false;
        }
      });
    });

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

function signedOutHtml(): string {
  return `<div class="split">
    <section>
      <h2>Create an account</h2>
      <form id="signup">
        <label for="signup-name">Name</label>
        <input id="signup-name" name="displayName" autocomplete="name" maxlength="80" />
        <label for="signup-email">Email</label>
        <input id="signup-email" name="email" type="email" autocomplete="username" required maxlength="200" />
        <label for="signup-password">Password</label>
        <input id="signup-password" name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="200" />
        <div class="row"><button type="submit">Sign up</button></div>
        <p class="status" id="signup-status"></p>
      </form>
    </section>
    <section>
      <h2>Sign in</h2>
      <form id="login">
        <label for="login-email">Email</label>
        <input id="login-email" name="email" type="email" autocomplete="username" required maxlength="200" />
        <label for="login-password">Password</label>
        <input id="login-password" name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="200" />
        <div class="row"><button type="submit">Sign in</button></div>
        <p class="status" id="login-status"></p>
      </form>
    </section>
  </div>`;
}

function signedInHtml(view: HomeView): string {
  const user = view.user;
  if (!user) return "";
  return `<section>
    <h2>Your Poe</h2>
    <p>Signed in as ${esc(user.email)}. Poe's soul stays the same. Your name, timezone, and notes sit on top of it, and only your connected accounts are used.</p>
    <form id="preferences">
      <label for="pref-name">Name</label>
      <input id="pref-name" name="displayName" value="${esc(user.displayName)}" required maxlength="80" />
      <label for="pref-zone">Timezone</label>
      <input id="pref-zone" name="timezone" value="${esc(user.timezone)}" required maxlength="80" placeholder="Africa/Kampala" />
      <label for="pref-notes">Notes and preferences</label>
      <textarea id="pref-notes" name="notes" maxlength="2000">${esc(user.notes)}</textarea>
      <div class="row">
        <button type="submit">Save preferences</button>
        <button type="button" class="quiet" id="logout">Log out</button>
      </div>
      <p class="status" id="preferences-status"></p>
    </form>
  </section>`;
}

function serviceCard(service: HomeService, signedIn: boolean): string {
  const badge =
    service.state === "connected" ? `<span class="badge on">Connected</span>` : service.state === "soon" ? `<span class="badge">Not available yet</span>` : `<span class="badge">Not connected</span>`;
  let action = "";
  if (service.state === "connected") {
    action = `<div class="row"><button type="button" class="quiet" data-disconnect="${esc(service.id)}">Disconnect</button></div>`;
  } else if (service.state === "ready" && signedIn) {
    action = `<div class="row"><button type="button" data-connect="${esc(service.id)}">Connect</button></div>`;
  } else if (service.state === "ready") {
    action = `<p class="hint">Sign up to connect this.</p>`;
  }
  return `<article class="card">
    ${badge}
    <h3>${esc(service.label)}</h3>
    <p>${esc(service.summary)}</p>
    ${action}
  </article>`;
}

function googleClientHtml(view: HomeView): string {
  if (view.googleClient === "environment") {
    return `<div class="hint">A Google client ID is set in the environment. Each person still uses Connect for their own mailbox.</div>`;
  }
  const saved = view.googleClient === "page" ? `<p class="hint">A client ID is saved on this computer. Saving again replaces it. The secret is not shown back.</p>` : `<p class="hint">Google will not let Poe register itself. Create one OAuth client, paste its ID here, and add the redirect above. Do this once for everyone on this Poe.</p>`;
  return `<form id="google-client">
    ${saved}
    <label for="google-client-id">Google client ID</label>
    <input id="google-client-id" name="clientId" autocomplete="off" required maxlength="200" />
    <label for="google-client-secret">Client secret, if Google gave you one</label>
    <input id="google-client-secret" name="clientSecret" type="password" autocomplete="off" maxlength="256" />
    <div class="row"><button type="submit">Save Google client</button></div>
    <p class="status" id="google-client-status"></p>
  </form>`;
}

function chatHtml(): string {
  return `<section>
    <h2>Talk to Poe</h2>
    <div class="transcript" id="transcript"></div>
    <form id="chat">
      <label for="chat-message">Message</label>
      <textarea id="chat-message" name="message" maxlength="8000" placeholder="Check my calendar, or draft a reply."></textarea>
      <div class="row"><button type="submit">Send</button></div>
      <p class="status" id="chat-status"></p>
    </form>
  </section>`;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
