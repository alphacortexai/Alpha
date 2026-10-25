export type SubagentId =
  | "inbox"
  | "messages"
  | "social"
  | "calendar"
  | "documents"
  | "calls"
  | "plugins";

export type InterfaceSpec = {
  id: string;
  label: string;
  subagent: Exclude<SubagentId, "plugins">;
  /** Filenames under bot/mcp-connections, compared loosely to the live server name. */
  aliases: readonly string[];
  /** What the owner adds to plug this interface in. */
  connectionFile: string;
  externalEffect: string;
};

export const INTERFACES: readonly InterfaceSpec[] = [
  {
    id: "gmail",
    label: "Gmail",
    subagent: "inbox",
    aliases: ["gmail", "googlemail"],
    connectionFile: "bot/mcp-connections/gmail.ts",
    externalEffect: "Sending or deleting mail",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    subagent: "messages",
    aliases: ["whatsapp"],
    connectionFile: "bot/mcp-connections/whatsapp.ts",
    externalEffect: "Sending a WhatsApp message",
  },
  {
    id: "messenger",
    label: "Facebook Messenger",
    subagent: "messages",
    aliases: ["messenger"],
    connectionFile: "bot/mcp-connections/messenger.ts",
    externalEffect: "Sending a Messenger message",
  },
  {
    id: "facebook",
    label: "Facebook",
    subagent: "social",
    aliases: ["facebook"],
    connectionFile: "bot/mcp-connections/facebook.ts",
    externalEffect: "Posting or commenting on Facebook",
  },
  {
    id: "instagram",
    label: "Instagram",
    subagent: "social",
    aliases: ["instagram"],
    connectionFile: "bot/mcp-connections/instagram.ts",
    externalEffect: "Posting, commenting, or sending an Instagram message",
  },
  {
    id: "x",
    label: "X",
    subagent: "social",
    aliases: ["twitter", "x"],
    connectionFile: "bot/mcp-connections/x.ts",
    externalEffect: "Posting or messaging on X",
  },
  {
    id: "google-calls",
    label: "Google calls",
    subagent: "calls",
    aliases: ["googlecalls", "googlemeet", "googlevoice"],
    connectionFile: "bot/mcp-connections/google-calls.ts",
    externalEffect: "Placing or starting a call",
  },
  {
    id: "google-calendar",
    label: "Google Calendar",
    subagent: "calendar",
    aliases: ["googlecalendar", "gcalendar"],
    connectionFile: "bot/mcp-connections/google-calendar.ts",
    externalEffect: "Creating, changing, or deleting a calendar event",
  },
  {
    id: "google-docs",
    label: "Google Docs",
    subagent: "documents",
    aliases: ["googledocs", "gdocs"],
    connectionFile: "bot/mcp-connections/google-docs.ts",
    externalEffect: "Sharing a document or sending it to someone",
  },
];

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export function connectionMatches(connectionName: string, aliases: readonly string[]): boolean {
  const name = norm(connectionName);
  return aliases.some((alias) => {
    const needle = norm(alias);
    if (needle.length <= 2) return name === needle;
    return name === needle || name.startsWith(needle) || name.endsWith(needle);
  });
}

export function interfaceForConnection(connectionName: string): InterfaceSpec | undefined {
  return INTERFACES.find((spec) => connectionMatches(connectionName, spec.aliases));
}
