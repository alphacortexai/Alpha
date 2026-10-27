# Poe

Poe is an agent with its own computer. You give it a task. It plans, browses, runs commands, writes files, and shows that work while it happens.

## Run

```bash
cd poe
npx @grok/agent-sdk validate --dir .
npx @grok/agent-sdk dev
```

Restart `dev` after pulling. Poe prints a short address, usually [http://127.0.0.1:8080/](http://127.0.0.1:8080/). The same workspace is on the channel path the server prints.

Type a task and choose Run. The left side is your tasks. The main column is the conversation. Poe's computer, on the right, shows the browser, the terminal, and the files. On a narrow window, Tasks and Computer open those panels.

The computer can read public pages and work in its session workspace. It does not send email, post, or pay. A task that asks for that stops and says what is missing.

## Market data

Alpha Vantage is connected at `https://mcp.alphavantage.co/mcp`. Get a free key at [alphavantage.co/support](https://www.alphavantage.co/support/#api-key), then authorize it once from `poe`:

```bash
npx @grok/agent-sdk mcp oauth alphavantage
```

The page asks for that key. After it finishes, restart `dev` and ask for a price, such as the latest quote for IBM. Tasks still run before this step; they just have no market-data tools yet.

## Gmail

Gmail is connected at `https://gmailmcp.googleapis.com/mcp/v1`. It can search, read, label, and draft. It does not send. You send the draft from Gmail.

In the Google Cloud project, enable the Gmail API and the Gmail MCP API. The Google account has to be in the Workspace Developer Preview program. On the OAuth client, choose Web application, turn on "Use this client for an AI-powered agent", and add this authorized redirect URI:

```text
http://localhost:8787/callback
```

Then, from `poe`, put the client id and secret in the terminal environment and save them for Poe. In Command Prompt:

```bat
set POE_GOOGLE_CLIENT_ID=your-client-id
set POE_GOOGLE_CLIENT_SECRET=your-client-secret
node bot/lib/prepare-gmail-oauth.mjs
node bot/lib/gmail-signin.mjs
```

`npx @grok/agent-sdk mcp oauth gmail` can say "already authorized" without opening Google, because the server answers the first handshake with no login. Use `gmail-signin.mjs`. Sign in with the Gmail account in the page that opens. If Google says the app is not verified, choose Advanced and continue. The Gmail address has to be a test user while the consent screen is in Testing. Restart `dev`. Ask Poe what your latest email says. Until that sign-in finishes, Poe cannot read mail.

These pages are for local `dev` or a supervised `serve`. On Cursor-managed hosting a custom channel returns an empty 202.
