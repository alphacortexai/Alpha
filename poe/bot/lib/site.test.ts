import assert from "node:assert/strict";

import { upstreamFromHealth } from "./door.js";
import { doorSuffix, publicBaseFromRequest, rewriteDoorLocation } from "./site.js";

const channel = "http://127.0.0.1:3010/poe/v1/channels/home/register";

const evil = new Request(channel, {
  headers: { "x-poe-public-base": "https://evil.example/" },
});
assert.equal(publicBaseFromRequest(evil), "http://127.0.0.1:3010/poe/v1/channels/home/");

const userinfo = new Request(channel, {
  headers: { "x-poe-public-base": "http://user:pass@127.0.0.1:8080/" },
});
assert.equal(publicBaseFromRequest(userinfo), "http://127.0.0.1:3010/poe/v1/channels/home/");

const queried = new Request(channel, {
  headers: { "x-poe-public-base": "http://127.0.0.1:8080/?next=/" },
});
assert.equal(publicBaseFromRequest(queried), "http://127.0.0.1:3010/poe/v1/channels/home/");

const door = new Request(channel, {
  headers: { "x-poe-public-base": "http://127.0.0.1:8080/" },
});
assert.equal(publicBaseFromRequest(door), "http://127.0.0.1:8080/");

const registerPath = new Request("http://127.0.0.1:3010/poe/v1/channels/home/register");
assert.equal(publicBaseFromRequest(registerPath), "http://127.0.0.1:3010/poe/v1/channels/home/");

assert.equal(doorSuffix("/"), "");
assert.equal(doorSuffix("/run"), "run");
assert.equal(doorSuffix("/events"), "events");
assert.equal(doorSuffix("/tasks"), "tasks");
assert.equal(doorSuffix("/follow"), "follow");
assert.equal(doorSuffix("/../debug/view"), undefined);
assert.equal(doorSuffix("/run/../tasks"), undefined);
assert.equal(doorSuffix("/%2e%2e/secret"), undefined);
assert.equal(doorSuffix("/debug/view"), undefined);
assert.equal(doorSuffix("/sessions"), undefined);
assert.equal(doorSuffix("/favicon.ico"), undefined);

const upstream = "http://127.0.0.1:3010/poe/v1/channels/home";
const publicBase = "http://127.0.0.1:8080/";
assert.equal(
  rewriteDoorLocation(`${upstream}/settings?notice=Hi`, upstream, publicBase),
  "http://127.0.0.1:8080/settings?notice=Hi",
);
assert.equal(rewriteDoorLocation(`${upstream}/`, upstream, publicBase), "http://127.0.0.1:8080/");
assert.equal(rewriteDoorLocation(upstream, upstream, publicBase), "http://127.0.0.1:8080/");
assert.equal(
  rewriteDoorLocation("https://accounts.google.com/o/oauth2/v2/auth", upstream, publicBase),
  "https://accounts.google.com/o/oauth2/v2/auth",
);

assert.equal(
  upstreamFromHealth(3010, { agents: [{ slug: "poe", name: "Poe" }] }),
  "http://127.0.0.1:3010/poe/v1/channels/home",
);
assert.equal(upstreamFromHealth(3010, { ok: true, name: "Poe" }), "http://127.0.0.1:3010/v1/channels/home");
assert.equal(upstreamFromHealth(3010, { agents: [{ slug: "../x", name: "Poe" }] }), undefined);
assert.equal(upstreamFromHealth(0, { ok: true, name: "Poe" }), undefined);
assert.equal(upstreamFromHealth(3010, { ok: true, name: "Other" }), undefined);

console.log("site.test.ts ok");
