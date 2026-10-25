import { defineConnection } from "@grok/agent-sdk/connections";

import { perUserAuth } from "../lib/per-user-connection.js";
import { connectableService } from "../lib/services.js";

const service = connectableService("gmail");
if (!service) throw new Error("Gmail is missing from the service catalog.");

// One mailbox per signed-up person. The home page starts Google sign-in.
// A shared host login would expose one inbox to every account.
export default defineConnection({
  description: "The signed-in person's Gmail.",
  url: service.url,
  advertiseTools: true,
  optional: true,
  auth: perUserAuth("gmail"),
});
