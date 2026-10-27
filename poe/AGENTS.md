# poe

Agent SDK project (`@grok/agent-sdk`). This file is for coding agents editing the project. The served agent's prompt is `bot/instructions.md`.

Poe is a task agent. The workspace is `bot/channels/home.ts` and `bot/lib/workspace-page.ts`. The short local address is the door in `bot/lib/door.ts`. `browse_web` is the computer's browser. Deliverables are tagged in `bot/artifacts.ts`.

Do not claim a page, a command, or a file without a tool result. Do not set `agent.tools`: an allowlist would drop the computer's shell and file tools.

## Loop

```bash
agent-sdk validate --dir .
agent-sdk info --dir . --json
npm run check
```

Run the CLI under Node, never Bun.

## Layout

- `bot/instructions.md` is the always-on prompt. Keep it short.
- `bot/tools/<name>.ts` is one tool per file. The filename is the tool name.
- `bot/lib/` is shared code. Never discovered.
- `evals/` is filesystem evals (`evals/evals.config.ts` required).

## Do not

- Add npm deps on a first cut. Stick to what `@grok/agent-sdk` already ships.
- Point `serve` at a parent folder during bring-up. It mounts every sibling.
- Name the product after another company's agent.
