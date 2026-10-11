import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSoundCloudUrl, sanitizeSoundCloudSelection, resolveSoundCloud, searchSoundCloud } from "../src/soundcloud.js";
import { validateEntity } from "../src/trusted-platform.js";

test("only https SoundCloud track/playlist links are accepted", () => {
  assert.equal(normalizeSoundCloudUrl("https://m.soundcloud.com/forss/flickermood?si=1#x"), "https://soundcloud.com/forss/flickermood");
  assert.equal(normalizeSoundCloudUrl("https://on.soundcloud.com/abc123"), "https://on.soundcloud.com/abc123");
  for (const bad of ["http://soundcloud.com/a/b", "https://evil.com/soundcloud.com/a", "https://soundcloud.com/", "javascript:alert(1)", ""]) assert.equal(normalizeSoundCloudUrl(bad), null, bad);
});

test("oEmbed resolve returns title, author, artwork and kind", async () => {
  const fake = async url => { assert.match(url, /^https:\/\/soundcloud\.com\/oembed\?format=json&url=/); return new Response(JSON.stringify({ title: "Soulhack by Forss", author_name: "Forss", thumbnail_url: "https://i1.sndcdn.com/a.jpg", html: '<iframe src="https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Fplaylists%2F1"></iframe>' })); };
  const r = await resolveSoundCloud("https://soundcloud.com/forss/sets/soulhack", fake);
  assert.deepEqual(r.selection, { url: "https://soundcloud.com/forss/sets/soulhack", kind: "playlist", title: "Soulhack", author: "Forss", artworkUrl: "https://i1.sndcdn.com/a.jpg" });
  const missing = await resolveSoundCloud("https://soundcloud.com/a/b", async () => new Response("", { status: 404 }));
  assert.equal(missing.ok, false); assert.equal(missing.status, 404);
});

test("search degrades to paste-only mode without SOUNDCLOUD_CLIENT_ID", async () => {
  const r = await searchSoundCloud({}, "worship", () => { throw new Error("must not call SoundCloud"); });
  assert.deepEqual(r, { ok: true, available: false, results: [] });
  const ok = await searchSoundCloud({ SOUNDCLOUD_CLIENT_ID: "id" }, "worship", async url => { assert.match(url, /client_id=id/); return new Response(JSON.stringify([{ permalink_url: "https://soundcloud.com/a/b", title: "Song", user: { username: "A" } }])); });
  assert.equal(ok.results[0].url, "https://soundcloud.com/a/b");
});

test("room stores a sanitized SoundCloud selection and strips unsafe ones", () => {
  const room = validateEntity("meditation", { title: "Room", soundcloud: JSON.stringify({ url: "https://soundcloud.com/a/b", title: "<b>Song</b>", artworkUrl: "http://x/y.jpg" }) });
  assert.deepEqual(room.soundcloud, { url: "https://soundcloud.com/a/b", kind: "track", title: "Song", author: "", artworkUrl: "" });
  assert.equal(validateEntity("meditation", { title: "Room", soundcloud: "" }).soundcloud, null);
  assert.equal(sanitizeSoundCloudSelection({ url: "https://evil.com/a/b" }), null);
});

test("meditation page wires the SoundCloud widget into the room player and fixes double-toggle", async () => {
  const fs = await import("node:fs/promises");
  const js = await fs.readFile(new URL("../public/meditation.js", import.meta.url), "utf8");
  assert.match(js, /if \(activeRoom\?\.soundcloud\?\.url\) \{ playSoundCloud\(\); return; \}/);
  assert.match(js, /if \(scWantPlay\) pauseSoundCloud\(\);/);
  assert.match(js, /scWidget\?\.setVolume\(val\)/);
  assert.match(js, /onDomReady\(\(\) => \{\n    renderLobby\(\);/);
  const list = js.slice(js.indexOf("const allPlayButtons"), js.indexOf("];", js.indexOf("const allPlayButtons")));
  assert.doesNotMatch(list, /bottom-play-btn|btn-timer-primary-toggle/);
  const csp = (await import("../src/security.js"));
  assert.match(JSON.stringify(csp), /w\.soundcloud\.com/);
});
