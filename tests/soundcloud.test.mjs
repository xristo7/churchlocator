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
  const start = js.slice(js.indexOf("function startAudioHarmonics"), js.indexOf("function startToneHarmonics"));
  assert.ok(start.indexOf("roomSoundCloud(activeRoom)") < start.indexOf("roomMp3"), "SoundCloud takes priority over MP3");
  assert.doesNotMatch(start,/startToneHarmonics\(/,"no generated background-tone fallback");
  const stop = js.slice(js.indexOf('  function stopAudioHarmonics('), js.indexOf('  function stopToneHarmonics('));
  const calls = [], playback = { audioRunning:true, pauseSoundCloud:()=>calls.push('soundcloud'), pauseMp3:()=>calls.push('mp3'), stopToneHarmonics:()=>calls.push('tone') };
  (await import('node:vm')).runInNewContext(stop+'\nstopAudioHarmonics();',playback);
  assert.deepEqual(calls,['soundcloud','mp3','tone']);
  assert.equal(playback.audioRunning,false);
  assert.match(js, /setRoomAudioVolume\(val\)/);
  assert.match(js, /setAttribute\("aria-hidden", "true"\)/);
  assert.match(js, /credit\.append\("Audio: ", link\)/);
  assert.match(js, /credit\.append\("Audio: uploaded"\)/);
  const html = await fs.readFile(new URL("../public/meditation.html", import.meta.url), "utf8");
  assert.match(html, /\.mwe-sc-player\{[^}]*width:1px;height:1px;opacity:0/);
  assert.match(js, /onDomReady\(\(\) => \{\n    renderLobby\(\);/);
  const list = js.slice(js.indexOf("const allPlayButtons"), js.indexOf("];", js.indexOf("const allPlayButtons")));
  assert.doesNotMatch(list, /bottom-play-btn|btn-timer-primary-toggle/);
  const csp = (await import("../src/security.js"));
  assert.match(JSON.stringify(csp), /w\.soundcloud\.com/);
});

test("blocked SoundCloud never substitutes synthesized tones or another recording", async () => {
  const { readFile } = await import('node:fs/promises');
  const { runInNewContext } = await import('node:vm');
  const source = await readFile(new URL('../public/meditation.js', import.meta.url), 'utf8');
  const code = source.slice(source.indexOf('  function fallbackFromSoundCloud('), source.indexOf('  function playSoundCloud('));
  const calls = [];
  const room = { soundcloud: { url: 'https://soundcloud.com/creator/instrumental' } };
  const context = { activeRoom: room, scWantPlay: true, scStartTimer: 1, audioJoined:true, audioRunning:true, isPlaying:true, updatePlayState:()=>{},
    scWidget: { pause: () => calls.push('pause') }, clearTimeout: () => {},
    pauseMp3: () => calls.push('stop-mp3'), stopToneHarmonics: () => calls.push('stop-tone'),
    startToneHarmonics: () => { throw new Error('Music must not become a tone'); },
    setAudioCredit: () => {}, playbackNotice: message => calls.push(message) };
  runInNewContext(code + '\nfallbackFromSoundCloud();', context);
  assert.equal(context.scWantPlay, false);
  assert.equal(context.audioJoined,false);
  assert.equal(context.isPlaying,true, "provider failure must not stop the shared clock");
  assert.ok(calls.includes('stop-tone'));
  assert.ok(calls.some(message => /retry/.test(message)));
  assert.equal(room.soundcloud.url, 'https://soundcloud.com/creator/instrumental');
});

test("rebuilding meditation styles retains the structured SoundCloud selection", async () => {
  const { readFile } = await import('node:fs/promises');
  const { runInNewContext } = await import('node:vm');
  const source = await readFile(new URL('../public/creator-studio.js', import.meta.url), 'utf8');
  const start = source.indexOf('  function formData(form)');
  const code = source.slice(start, source.indexOf('\n  // ', start));
  const selection = { url: 'https://soundcloud.com/creator/instrumental', title: 'Instrumental' };
  const context = { activeKind: 'meditation', form: { querySelectorAll: () => [] },
    FormData: class extends Map { constructor() { super([['soundcloud', JSON.stringify(selection)]]); } } };
  const value = runInNewContext(code + '\nformData(form);', context);
  assert.deepEqual(JSON.parse(JSON.stringify(value.soundcloud)), selection);
});

test('rooms with no saved music stay silent instead of synthesizing a background tone',async()=>{
 const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm');
 const source=await readFile(new URL('../public/meditation.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('  function startAudioHarmonics('),source.indexOf('  function startToneHarmonics('));
 const calls=[],context={audioJoined:true,isPlaying:true,audioRunning:false,activeRoom:{selectedAudio:'instrumental'},roomMp3:null,roomSoundCloud:()=>null,stopToneHarmonics:()=>calls.push('stop-tone'),setAudioCredit:()=>{},startToneHarmonics:()=>{throw new Error('A missing track must stay silent');}};
 runInNewContext(code+'\nstartAudioHarmonics();',context);
 assert.deepEqual(calls,['stop-tone']);assert.equal(context.audioRunning,false);
});

test('a pasted SoundCloud URL survives a form rebuild before the Add button is pressed',async()=>{
 const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm');
 const source=await readFile(new URL('../public/creator-studio.js',import.meta.url),'utf8'),start=source.indexOf('  function formData(form)');
 const code=source.slice(start,source.indexOf('\n  // ',start));
 const url='https://soundcloud.com/relaxcafemusic/sets/morning-relaxing-jazz-bossa';
 const field={querySelector:()=>({value:url})};
 const context={activeKind:'meditation',FormData:class extends Map{constructor(){super([['soundcloud','']])}},form:{querySelectorAll:selector=>selector==='.cs-soundcloud-field'?[field]:[]}};
 const result=runInNewContext(code+'\nformData(form);',context);
 assert.equal(result.soundcloud.url,url);assert.equal(result.soundcloud.kind,'playlist');
});
