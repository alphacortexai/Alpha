import { defineTool } from "@grok/agent-sdk/tools";

import { IDENTITY } from "../lib/identity.js";
import { connectionMatches, INTERFACES, interfaceForConnection } from "../lib/interfaces.js";

export default defineTool({
  description:
    "List Poe's interfaces, the specialist for each one, and the MCP servers connected right now. Call this before using an external system.",
  effect: "read",
  async execute(_input, ctx) {
    const names = ctx.host.mcp.names();
    const servers: Array<{ name: string; interfaceId: string | null; tools: Array<{ name: string; description: string }> }> = [];
    for (const name of names) {
      let tools: Array<{ name: string; description: string }> = [];
      try {
        const listed = await ctx.host.mcp.listTools(name);
        tools = listed.slice(0, 40).map((tool) => ({
          name: tool.name,
          description: (tool.description ?? "").slice(0, 160),
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "unavailable";
        tools = [{ name: "unavailable", description: message.slice(0, 160) }];
      }
      const matched = interfaceForConnection(name);
      servers.push({ name, interfaceId: matched?.id ?? null, tools });
    }
    const interfaces = INTERFACES.map((spec) => ({
      id: spec.id,
      label: spec.label,
      subagent: spec.subagent,
      externalEffect: spec.externalEffect,
      connectionFile: spec.connectionFile,
      connected: names.some((name) => connectionMatches(name, spec.aliases)),
    }));
    return {
      identity: { name: IDENTITY.displayName, version: IDENTITY.identityVersion },
      interfaces,
      servers,
      unassignedServers: servers.filter((server) => server.interfaceId === null).map((server) => server.name),
    };
  },
});
