import { defineTool } from "@grok/agent-sdk/tools";

import { getUser, userIdForSessionAuth } from "../lib/accounts.js";
import { CONNECTABLE_SERVICES } from "../lib/services.js";
import { userHasService } from "../lib/user-oauth.js";

export default defineTool({
  description:
    "Read the signed-in person's display name, timezone, notes, and connected services. Preferences sit on top of Poe's soul. Returns nothing private from another person.",
  effect: "read",
  async execute(_input, ctx) {
    const userId = await userIdForSessionAuth(ctx.session.auth);
    if (!userId) return { signedIn: false, connected: [] as string[] };
    const user = await getUser(userId);
    if (!user) return { signedIn: false, connected: [] as string[] };
    const connected: string[] = [];
    for (const service of CONNECTABLE_SERVICES) {
      if (await userHasService(user.id, service.id)) connected.push(service.id);
    }
    return {
      signedIn: true,
      email: user.email,
      displayName: user.displayName,
      timezone: user.timezone,
      notes: user.notes,
      connected,
    };
  },
});
