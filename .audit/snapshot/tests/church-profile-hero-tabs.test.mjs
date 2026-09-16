import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(".");

test("Church Profile: Top hero media showcase banner", async () => {
  const html = await fs.readFile(path.join(projectRoot, "public", "church-profile.html"), "utf8");

  // Hero showcase section exists with open layout, overlay, play trigger, and lower-left content
  assert.match(html, /class="church-hero-showcase"/, "should have church-hero-showcase section");
  assert.match(html, /class="church-hero-overlay"/, "should have church-hero-overlay");
  assert.match(html, /class="church-hero-content-bottom-left"/, "should have church-hero-content-bottom-left container");
  assert.match(html, /id="church-hero-play-trigger"/, "should have play trigger button");
  assert.match(html, /class="church-hero-play-pulse"/, "should have pulse ring on play button");
  assert.match(html, /class="church-hero-play-circle"/, "should have play icon circle");
  assert.match(html, /onclick="MWE\.playChurchMainMedia\(\)"/, "play button should trigger MWE.playChurchMainMedia()");
  assert.match(html, /class="church-hero-name" data-church-name/, "should display church name in hero");
  assert.match(html, /class="church-hero-desc" data-church-tagline/, "should display church tagline/short description");
});

test("Church Profile: Sticky tab navigation bar in left column with reinstated Location tab", async () => {
  const html = await fs.readFile(path.join(projectRoot, "public", "church-profile.html"), "utf8");

  // Tabs bar is situated inside church-profile-tabs-wrapper at the top of left column
  const tabsWrapperIndex = html.indexOf('class="church-profile-tabs-wrapper"');
  const tabsNavIndex = html.indexOf('class="church-tabs-nav"');
  const overviewPaneIndex = html.indexOf('id="tab-pane-overview"');
  assert.ok(tabsWrapperIndex !== -1 && tabsNavIndex !== -1 && tabsWrapperIndex < tabsNavIndex && tabsNavIndex < overviewPaneIndex, "tabs bar must sit at top of left column");

  // Tabs must include Overview, Schedule, Upcoming Events, Location & Map
  assert.match(html, /data-tab="overview"/, "should have Overview tab");
  assert.match(html, /data-tab="services"[^>]*>[\s\S]*?<span>Schedule<\/span>/, "services tab must be labeled 'Schedule'");
  assert.doesNotMatch(html, /<span>Services &amp; Schedule<\/span>/, "should not have 'Services & Schedule' label");
  assert.match(html, /data-tab="events"/, "should have Upcoming Events tab");
  assert.match(html, /data-tab="location"[^>]*>[\s\S]*?<span>Location &amp; Map<\/span>/, "should have Location & Map tab");

  // Location & Map tab pane must be reinstated
  assert.match(html, /id="tab-pane-location"/, "Location & Map tab pane should be present");

  // CSS must declare sticky behavior on .church-tabs-nav with 10px distance from header
  assert.match(html, /body\[data-page="profile"\] \.church-tabs-nav\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*10px;/, "church-tabs-nav must be sticky at top: 10px");
  assert.match(html, /body\[data-page="profile"\]\.member-shell-embed \.church-tabs-nav\s*\{[\s\S]*?top:\s*10px\s*!important;/, "member shell embed must enforce top: 10px !important");
});

test("Church Profile: Schedule weekly gathering time pills hover over thumbnails", async () => {
  const html = await fs.readFile(path.join(projectRoot, "public", "church-profile.html"), "utf8");

  // Time pill must be inside .gathering-thumb-wrap
  assert.match(html, /<div class="gathering-thumb-wrap">[\s\S]*?<div class="gathering-time-pill">/, "gathering-time-pill must be inside gathering-thumb-wrap");

  // Time pill must NOT be in gathering-title-row
  assert.doesNotMatch(html, /<div class="gathering-title-row">(?:(?!<\/div>)[\s\S])*<div class="gathering-time-pill">/, "gathering-time-pill must not be inside gathering-title-row");

  // CSS positioning and theming
  assert.match(html, /\.gathering-time-pill\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*12px;[\s\S]*?right:\s*12px;/, "gathering-time-pill must be positioned absolute top-right");
  assert.match(html, /color:\s*#15803d/, "light mode should use green text");
  assert.match(html, /color:\s*#f8fafc/, "dark mode should use bright text");
});

test("Church Profile: MWE.playChurchMainMedia handles video and audio", async () => {
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");

  assert.match(appJs, /MWE\.playChurchMainMedia\s*=\s*function/, "app.js must define MWE.playChurchMainMedia");
  assert.match(appJs, /MWE\.openAudioModal/, "MWE.playChurchMainMedia should delegate audio to openAudioModal");
  assert.match(appJs, /church-video-modal/, "MWE.playChurchMainMedia should open church-video-modal for video");
});

test("Church Profile: Hero description is longer, about 30 words", async () => {
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");
  const html = await fs.readFile(path.join(projectRoot, "public", "church-profile.html"), "utf8");

  // Check that MWE.formatHeroDescription is defined in app.js
  assert.match(appJs, /MWE\.formatHeroDescription\s*=\s*function/, "app.js must define MWE.formatHeroDescription");

  // Check Beulah Alliance Church tagline in seedChurches
  const beulahMatch = appJs.match(/id:\s*"beulah-alliance-west"[\s\S]*?tagline:\s*"([^"]+)"/);
  assert.ok(beulahMatch, "Beulah Alliance Church must have a tagline in seedChurches");
  const beulahWords = beulahMatch[1].split(/\s+/).filter(Boolean);
  assert.ok(beulahWords.length >= 26 && beulahWords.length <= 36, `Beulah tagline should be about 30 words, got ${beulahWords.length}`);

  // Check default HTML placeholder tagline word count
  const htmlMatch = html.match(/class="church-hero-desc" data-church-tagline>([^<]+)<\/p>/);
  assert.ok(htmlMatch, "HTML must have placeholder description");
  const htmlWords = htmlMatch[1].trim().split(/\s+/).filter(Boolean);
  assert.ok(htmlWords.length >= 26 && htmlWords.length <= 36, `HTML placeholder description should be about 30 words, got ${htmlWords.length}`);
});

