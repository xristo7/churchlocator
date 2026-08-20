import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readProjectFile = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("member app keeps its header and navigation outside the changing content frame", async () => {
  const html = await readProjectFile("public/app.html");

  assert.match(html, /<header class="profile-app-header member-shell-header"/);
  assert.match(html, /<aside class="profile-left-rail member-shell-rail"/);
  assert.match(html, /<iframe[\s\S]*id="member-shell-frame"/);
});

test("member sidebar removes Church Profile and includes Livestream", async () => {
  const html = await readProjectFile("public/app.html");
  const rail = html.match(/<aside class="profile-left-rail member-shell-rail"[\s\S]*?<\/aside>/)?.[0] || "";

  assert.doesNotMatch(rail, />Church Profile</);
  assert.match(rail, />Livestream</);
  assert.match(rail, /data-shell-view="directory"/);
  assert.match(rail, /data-shell-view="events"/);
});

test("directory, event, livestream, and detail views reuse the existing pages", async () => {
  const shell = await readProjectFile("public/app-shell.js");

  assert.match(shell, /directory:\s*\{ source: "churches\.html"/);
  assert.match(shell, /events:\s*\{ source: "events\.html"/);
  assert.match(shell, /livestream:\s*\{ source: "livestream\.html"/);
  assert.match(shell, /church:\s*\{ source: "church-profile\.html"/);
  assert.match(shell, /event:\s*\{ source: "event-profile\.html"/);
});

test("protected cards use the shared member login gate", async () => {
  const app = await readProjectFile("public/app.js");

  assert.match(app, /isProtectedDetail/);
  assert.match(app, /MWE\.openMemberLogin\(MWE\.buildMemberShellUrl\(route\)\)/);
  assert.match(app, /localStorage\.setItem\("mwe\.userLoggedIn", "true"\)/);
});

test("security headers allow only same-origin pages inside the member shell", async () => {
  const headers = await readProjectFile("public/_headers");

  assert.match(headers, /X-Frame-Options:\s*SAMEORIGIN/);
  assert.match(headers, /Content-Security-Policy:\s*frame-ancestors 'self'/);
  assert.doesNotMatch(headers, /X-Frame-Options:\s*DENY/);
});
