import type { SessionInfo } from "@grok/agent-sdk";

import { connectableService, type ServiceId } from "./services.js";
import { authorizationHeaders } from "./user-oauth.js";

/** Per-person MCP auth. A missing sign-in skips the optional connection. */
export function perUserAuth(serviceId: ServiceId): (session: SessionInfo) => Promise<{ headers: Record<string, string> }> {
  const service = connectableService(serviceId);
  if (!service) throw new Error(`Unknown service ${serviceId}`);
  return async (session) => {
    const auth = session.auth;
    if (auth?.authenticator !== "poe-account" || !auth.principalId) {
      throw new Error("Sign in on the Poe home page before using this connection.");
    }
    const headers = await authorizationHeaders(auth.principalId, service.id);
    if (!headers) throw new Error(`${service.label} is not connected for this person.`);
    return { headers };
  };
}
