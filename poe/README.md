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

These pages are for local `dev` or a supervised `serve`. On Cursor-managed hosting a custom channel returns an empty 202.
