/** Services a person can connect from the Poe home page, plus the ones still listed only. */

export type ServiceId = "gmail" | "google-calendar";

export type ConnectableService = {
  id: ServiceId;
  label: string;
  summary: string;
  url: string;
};

export type UpcomingService = {
  id: string;
  label: string;
  summary: string;
};

export const CONNECTABLE_SERVICES: readonly ConnectableService[] = [
  {
    id: "gmail",
    label: "Gmail",
    summary: "Read, draft, and send email. Sending waits for your approval.",
    url: "https://gmailmcp.googleapis.com/mcp/v1",
  },
  {
    id: "google-calendar",
    label: "Google Calendar",
    summary: "Check availability and manage events. Changes wait for your approval.",
    url: "https://calendarmcp.googleapis.com/mcp/v1",
  },
];

/** Shown on Settings under Coming later. No sign-in button until a real server exists. */
export const UPCOMING_SERVICES: readonly UpcomingService[] = [
  {
    id: "google-docs",
    label: "Google Docs",
    summary: "Look up, read, and draft documents.",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    summary: "Read and send messages.",
  },
  {
    id: "messenger",
    label: "Messenger",
    summary: "Read and send messages.",
  },
  {
    id: "instagram",
    label: "Instagram",
    summary: "Read and send direct messages. Posts and comments too.",
  },
  {
    id: "facebook",
    label: "Facebook",
    summary: "Posts and comments.",
  },
  {
    id: "x",
    label: "X",
    summary: "Posts and comments.",
  },
  {
    id: "google-calls",
    label: "Google calls",
    summary: "Place a call or follow up on one.",
  },
  {
    id: "other-mcp",
    label: "Other MCP plugins",
    summary: "New APIs show up here when they can be signed in.",
  },
];

const byId = new Map(CONNECTABLE_SERVICES.map((service) => [service.id, service]));

export function connectableService(id: string): ConnectableService | undefined {
  return byId.get(id as ServiceId);
}

export function isServiceId(id: string): id is ServiceId {
  return byId.has(id as ServiceId);
}
