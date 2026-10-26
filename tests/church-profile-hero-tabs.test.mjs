import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(".");

test("Church Profile: Studio hero preview contains only the hero slides", async () => {
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");
  const studioJs = await fs.readFile(path.join(projectRoot, "public", "creator-studio.js"), "utf8");

  assert.match(studioJs, /preview=studio/, "Studio should use the dedicated hero preview mode");
  assert.match(appJs, /embedParams\.get\("preview"\) === "studio"[\s\S]*?studio-hero-preview/);
  assert.match(appJs, /body\.studio-hero-preview \.church-profile-grid\s*\{\s*display:\s*none\s*!important;/);
  assert.match(appJs, /body\.studio-hero-preview #church-hero-showcase\s*\{[\s\S]*?margin-bottom:\s*0\s*!important;/);
});

test("Church Profile: YouTube hero uses a click-to-play preview and provider fallback", async () => {
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");

  assert.match(appJs, /provider:\s*"youtube"/, "YouTube hero videos should be identified as YouTube embeds");
  assert.match(appJs, /data-defer-until-play/, "YouTube iframe should not load until requested");
  assert.match(appJs, /MWE\.playChurchHeroEmbed\s*=\s*function/, "hero preview should have a click-to-play handler");
  assert.match(appJs, /watchUrl:\s*`https:\/\/www\.youtube\.com\/watch\?v=/, "preview should offer a direct YouTube fallback");
  assert.match(appJs, /searchParams\.set\("rel", "0"\)/, "related videos should be limited to the same channel where supported");
});

test("Church Profile: MWE.playChurchMainMedia handles video and audio", async () => {
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");

  assert.match(appJs, /MWE\.playChurchMainMedia\s*=\s*function/, "app.js must define MWE.playChurchMainMedia");
  assert.match(appJs, /MWE\.openAudioModal/, "MWE.playChurchMainMedia should delegate audio to openAudioModal");
  assert.match(appJs, /church-video-modal/, "MWE.playChurchMainMedia should open church-video-modal for video");
});

