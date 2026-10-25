import assert from "node:assert/strict";

import { browseWeb, htmlToText, isBlockedIp } from "./web.js";

assert.equal(isBlockedIp("127.0.0.1"), true);
assert.equal(isBlockedIp("10.1.2.3"), true);
assert.equal(isBlockedIp("169.254.169.254"), true);
assert.equal(isBlockedIp("192.168.1.20"), true);
assert.equal(isBlockedIp("172.16.0.5"), true);
assert.equal(isBlockedIp("100.64.0.1"), true);
assert.equal(isBlockedIp("192.0.2.1"), true);
assert.equal(isBlockedIp("198.51.100.1"), true);
assert.equal(isBlockedIp("203.0.113.1"), true);
assert.equal(isBlockedIp("224.0.0.1"), true);
assert.equal(isBlockedIp("0.0.0.0"), true);
assert.equal(isBlockedIp("::1"), true);
assert.equal(isBlockedIp("fe80::1"), true);
assert.equal(isBlockedIp("fc00::1"), true);
assert.equal(isBlockedIp("::ffff:127.0.0.1"), true);
assert.equal(isBlockedIp("::ffff:169.254.169.254"), true);
assert.equal(isBlockedIp("1.1.1.1"), false);
assert.equal(isBlockedIp("8.8.8.8"), false);
assert.equal(isBlockedIp("not-an-ip"), true);

const extracted = htmlToText(`<html><head><title>Hello</title>
<script type="text/javascript">alert("secret-script")</script>
<style>.x{color:red}</style></head><body><p>Visible words</p></body></html>`);
assert.equal(extracted.title, "Hello");
assert.match(extracted.text, /Visible words/);
assert.equal(extracted.text.includes("secret-script"), false);
assert.equal(extracted.text.includes("color:red"), false);
assert.equal(extracted.text.includes("<script"), false);

for (const url of ["http://127.0.0.1/", "http://169.254.169.254/", "file:///etc/passwd", "http://user:pass@example.com/"]) {
  const refused = await browseWeb(url);
  assert.equal(refused.ok, false, url);
  if (!refused.ok) assert.equal(refused.error.length > 0, true);
}

const live = await browseWeb("https://example.com/");
if (live.ok) {
  const haystack = `${live.title}\n${live.text}`.toLowerCase();
  assert.equal(haystack.includes("example"), true);
  assert.equal(live.text.includes("<script"), false);
} else {
  console.log("browseWeb example.com skipped:", live.error);
}

console.log("web.test.ts ok");
