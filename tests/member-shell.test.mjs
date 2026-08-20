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

test("member sidebar uses the requested module names and moves Giving to the header", async () => {
  const html = await readProjectFile("public/app.html");
  const rail = html.match(/<aside class="profile-left-rail member-shell-rail"[\s\S]*?<\/aside>/)?.[0] || "";

  assert.doesNotMatch(rail, />Church Profile</);
  assert.doesNotMatch(rail, />Giving</);
  assert.doesNotMatch(rail, />Groups</);
  assert.doesNotMatch(rail, />Messages</);
  assert.match(rail, />Churches</);
  assert.match(rail, />Channels</);
  assert.match(rail, />Live</);
  assert.match(rail, />Store</);
  assert.match(html, /class="member-header-giving"/);
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

test("Channels, Store, seller management, and Resources are independent modules", async () => {
  const shell = await readProjectFile("public/app-shell.js");
  const channels = await readProjectFile("public/channels.html");
  const store = await readProjectFile("public/store.html");
  const seller = await readProjectFile("public/seller-dashboard.html");
  const resources = await readProjectFile("public/resources.html");

  assert.match(shell, /channels:\s*\{ source: "channels\.html"/);
  assert.match(shell, /store:\s*\{ source: "store\.html"/);
  assert.match(shell, /"store-manager":\s*\{ source: "seller-dashboard\.html"/);
  assert.match(shell, /resources:\s*\{ source: "resources\.html"/);
  assert.match(channels, /Create a Channel/);
  assert.match(store, /Manage Your Store/);
  assert.match(seller, /Products and inventory/);
  assert.match(resources, /Christian Resource Library/);
  assert.match(resources, /<option>PDF<\/option>/);
  assert.match(resources, /<option>MP4<\/option>/);
  assert.match(resources, /<option>MP3<\/option>/);
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
