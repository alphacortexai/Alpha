import type { SessionInfo } from "@grok/agent-sdk";

import { userIdForSessionAuth } from "./accounts.js";
import { UNCONNECTED_BEARER } from "./mcp-bridge.js";
import { connectableService, type ServiceId } from "./services.js";
import { authorizationHeaders } from "./user-oauth.js";

/**
 * Per-person MCP auth. A missing sign-in still mounts the server, with an
 * empty tool list, so chat can continue. A real token is this person's only.
 */
export function perUserAuth(serviceId: ServiceId): (session: SessionInfo) => Promise<{ headers: Record<string, string> }> {
  const service = connectableService(serviceId);
  if (!service) throw new Error(`Unknown service ${serviceId}`);
  return async (session) => {
    const userId = await userIdForSessionAuth(session.auth);
    const headers = userId ? await authorizationHeaders(userId, service.id) : null;
    if (!headers) return { headers: { Authorization: `Bearer ${UNCONNECTED_BEARER}` } };
    return { headers };
  };
}
