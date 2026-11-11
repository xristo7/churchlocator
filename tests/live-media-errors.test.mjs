import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFile(path.join(root, file), "utf8");
async function load({ secure = true, getUserMedia } = {}) {
  const window = { isSecureContext: secure };
  const context = vm.createContext({ window, navigator: { mediaDevices: getUserMedia ? { getUserMedia } : undefined }, TypeError, Error, Object, String });
  vm.runInContext(await read("public/live-media-errors.js"), context);
  return window.MWELiveErrors;
}
const err = name => Object.assign(new Error("raw " + name), { name });

test("Brief 04.2/11: camera and microphone failures are explained in plain language", async () => {
  const { explain } = await load();
  assert.match(explain(err("NotAllowedError"), "audio"), /microphone is blocked.*lock icon/);
  assert.match(explain(err("NotAllowedError"), "video"), /camera is blocked/);
  assert.match(explain(err("NotFoundError"), "audio"), /No microphone was found/);
  assert.match(explain(err("NotReadableError"), "video"), /camera is being used by another app/);
  assert.match(explain(err("SecurityError"), "audio"), /secure \(https\)/);
  assert.match(explain(new TypeError("Failed to fetch")), /internet connection/);
});

test("Brief 04.2/11: the device check runs before going live and releases the device", async () => {
  let stopped = 0;
  const ok = await load({ getUserMedia: async () => ({ getTracks: () => [{ stop: () => stopped++ }] }) });
  await ok.preflight("audio");
  assert.equal(stopped, 1);
  const denied = await load({ getUserMedia: async () => { throw err("NotAllowedError"); } });
  await assert.rejects(denied.preflight("audio"), e => e.name === "NotAllowedError");
  const insecure = await load({ secure: false, getUserMedia: async () => ({ getTracks: () => [] }) });
  await assert.rejects(insecure.preflight("audio"), e => /secure/.test(insecure.explain(e)));
  const unsupported = await load({});
  await assert.rejects(unsupported.preflight("video"), /cannot use a camera/);
});

test("Brief 04.2/11: the meditation voice bar and live stage use the helper and real styles", async () => {
  const [voice, live, med, liveHtml, css] = await Promise.all([read("public/meditation-voice.js"), read("public/channel-live.js"), read("public/meditation.html"), read("public/channel-live.html"), read("public/meditation-session-panel.css")]);
  assert.doesNotMatch(voice, /style\.cssText/, "voice bar is styled by CSS, not an inline white strip");
  assert.match(voice, /className='mwe-voice'/);
  assert.match(voice, /preflight\('audio'\)[\s\S]*\/start/, "host microphone is checked before the broadcast starts");
  assert.match(voice, /errorUntil/, "errors are not wiped by the 5 second refresh");
  assert.match(css, /\.mwe-voice\{/);
  assert.match(css, /:root\[data-theme="dark"\] \.mwe-voice/);
  assert.match(live, /toggle\(btn,off,on_\);notice\(window\.MWELiveErrors/, "a failed mic/camera toggle is put back");
  assert.match(med, /live-media-errors\.js\?v=[^"]+"><\/script><script defer src="meditation-voice\.js/);
  assert.match(liveHtml, /live-media-errors\.js\?v=[^"]+"><\/script><script defer src="channel-live\.js/);
});
