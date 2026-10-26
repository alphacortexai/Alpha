import { defineTool } from "@grok/agent-sdk/tools";

import { userIdForSessionAuth } from "../lib/accounts.js";
import { IDENTITY } from "../lib/identity.js";
import { connectionMatches, INTERFACES, interfaceForConnection } from "../lib/interfaces.js";
import { listConnectedTools } from "../lib/mcp-bridge.js";
import { connectableService, type ServiceId } from "../lib/services.js";
import { authorizationHeaders, userHasService } from "../lib/user-oauth.js";

export default defineTool({
  description:
    "List Poe's interfaces, the specialist for each one, and the MCP servers connected right now. Call this before using an external system.",
  effect: "read",
  async execute(_input, ctx) {
    const names = ctx.host.mcp.names();
    const principal = await userIdForSessionAuth(ctx.session.auth);
    const personalTools = new Map<ServiceId, Array<{ name: string; description: string }>>();
    for (const serviceId of ["gmail", "google-calendar"] as const) {
      const headers = principal ? await authorizationHeaders(principal, serviceId) : null;
      if (!headers) continue;
      try {
        personalTools.set(serviceId, await listConnectedTools(serviceId, headers.Authorization));
      } catch (error) {
        const message = error instanceof Error ? error.message : "unavailable";
        personalTools.set(serviceId, [{ name: "unavailable", description: message.slice(0, 160) }]);
      }
    }
    const servers: Array<{ name: string; interfaceId: string | null; tools: Array<{ name: string; description: string }> }> = [];
    for (const name of names) {
      const matched = interfaceForConnection(name);
      const personal = matched ? personalTools.get(matched.id as ServiceId) : undefined;
      if (personal) {
        servers.push({ name, interfaceId: matched?.id ?? null, tools: personal });
        continue;
      }
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
      servers.push({ name, interfaceId: matched?.id ?? null, tools });
    }
    const interfaces = [];
    for (const spec of INTERFACES) {
      const personal = connectableService(spec.id);
      const live = names.some((name) => connectionMatches(name, spec.aliases));
      const connected = personal
        ? principal !== "" && live && (await userHasService(principal, spec.id))
        : live;
      interfaces.push({
        id: spec.id,
        label: spec.label,
        subagent: spec.subagent,
        externalEffect: spec.externalEffect,
        connectionFile: spec.connectionFile,
        connected,
        howToConnect: personal
          ? `On the left side of Chat, choose Sign in with Google. Call the MCP server named ${spec.id}. Each person has their own account.`
          : "Not available from the left side of Chat yet.",
      });
    }
    return {
      identity: { name: IDENTITY.displayName, version: IDENTITY.identityVersion },
      web: {
        connected: true,
        tools: ["browse_web", "webSearch", "webFetch"],
        howToConnect: "Already on",
      },
      interfaces,
      servers,
      unassignedServers: servers.filter((server) => server.interfaceId === null).map((server) => server.name),
    };
  },
});
