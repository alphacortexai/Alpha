import { defineConnection } from "@grok/agent-sdk/connections";

export default defineConnection({
  description: "Stock, forex, crypto, and economic data from Alpha Vantage.",
  url: "https://mcp.alphavantage.co/mcp",
  oauth: true,
  advertiseTools: true,
  optional: true,
});
