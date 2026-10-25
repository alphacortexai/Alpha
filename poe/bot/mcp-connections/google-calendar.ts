import { defineConnection } from "@grok/agent-sdk/connections";

import { perUserAuth } from "../lib/per-user-connection.js";
import { connectableService } from "../lib/services.js";

const service = connectableService("google-calendar");
if (!service) throw new Error("Google Calendar is missing from the service catalog.");

export default defineConnection({
  description: "The signed-in person's Google Calendar.",
  url: service.url,
  advertiseTools: true,
  optional: true,
  auth: perUserAuth("google-calendar"),
});
