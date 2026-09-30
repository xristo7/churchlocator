import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(".");

test("Church Profile: creator-configured mixed-media hero carousel", async () => {
  const html = await fs.readFile(path.join(projectRoot, "public", "church-profile.html"), "utf8");

  // The hero is a single layered carousel rather than a video popup or split-column card.
  assert.match(html, /class="church-hero-showcase"/, "should have church-hero-showcase section");
  assert.match(html, /id="church-hero-track"/, "should have a slide track");
  assert.match(html, /class="church-hero-overlay"/, "should have church-hero-overlay");
  assert.match(html, /id="church-hero-dots"/, "should have slide indicators");
  assert.match(html, /onclick="MWE\.stepChurchHero\(-1\)"/, "should navigate to the previous slide");
  assert.match(html, /onclick="MWE\.stepChurchHero\(1\)"/, "should navigate to the next slide");
  assert.match(html, /id="church-hero-mobile-toggle"[^>]*aria-expanded="false"/, "should expose the mobile title/description toggle");
  assert.doesNotMatch(html, /id="church-hero-play-trigger"/, "hero video must not use the old popup trigger");
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
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");

  // Creator-provided cards are rendered dynamically, with the time pill inside the thumbnail.
  assert.match(appJs, /class="gathering-thumb-wrap"[\s\S]*?class="gathering-time-pill"/, "gathering-time-pill must be inside gathering-thumb-wrap");

  // Time pill must NOT be in gathering-title-row
  assert.doesNotMatch(appJs, /class="gathering-title-row"(?:(?!<\/div>)[\s\S])*class="gathering-time-pill"/, "gathering-time-pill must not be inside gathering-title-row");

  // CSS positioning and theming
  assert.match(html, /\.gathering-time-pill\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*12px;[\s\S]*?right:\s*12px;/, "gathering-time-pill must be positioned absolute top-right");
  assert.match(html, /color:\s*#15803d/, "light mode should use green text");
  assert.match(html, /color:\s*#f8fafc/, "dark mode should use bright text");
});

test("Church Profile: inline hero video and responsive slide behaviors", async () => {
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");
  const html = await fs.readFile(path.join(projectRoot, "public", "church-profile.html"), "utf8");

  assert.match(appJs, /MWE\.renderChurchHero\s*=\s*function/, "app.js must render the creator-configured hero");
  assert.match(appJs, /church-hero-slide--video/, "hero should include an inline video slide");
  assert.match(appJs, /data-hero-video/, "inline video should be activated inside the slide");
  assert.match(appJs, /MWE\.toggleChurchHeroDetails\s*=\s*function/, "mobile copy toggle should be interactive");
  assert.match(html, /\.church-hero-video-visual[\s\S]*?mask-image:/, "desktop video should blend into the hero surface");
  assert.match(html, /\.church-hero-slide--video \.church-hero-content-bottom-left[\s\S]*?text-align:\s*right/, "desktop video copy should sit on the right");
  assert.match(html, /@media \(max-width: 720px\)[\s\S]*?\.church-hero-slide--video \.church-hero-content-bottom-left \{ display: none;/, "mobile video slides should hide copy");
  assert.match(html, /\.church-hero-slide\.details-open \.church-hero-desc/, "mobile image slides should reveal descriptions on demand");
});

test("Church Profile: section rhythm uses 50px gaps and keeps gallery scrolling without a visible scrollbar", async () => {
  const html = await fs.readFile(path.join(projectRoot, "public", "church-profile.html"), "utf8");

  assert.match(html, /\.church-profile-grid\s*\{[\s\S]*?margin-top:\s*50px;/, "content should begin 50px below the hero");
  assert.match(html, /body\[data-page="profile"\] \.leadership-grid\s*\{[\s\S]*?margin-bottom:\s*50px\s*!important;/, "pastor section should have a 50px lower gap");
  assert.match(html, /body\[data-page="profile"\] \.stories-section\s*\{[^}]*margin-bottom:\s*50px\s*!important;/, "testimonies should have a 50px lower gap");
  assert.match(html, /\.church-gallery-section\s*\{[^}]*margin-bottom:\s*50px\s*!important;/, "gallery should have a 50px lower gap");
  assert.match(html, /\.church-gallery-track\s*\{[\s\S]*?overflow-x:\s*auto;[\s\S]*?scrollbar-width:\s*none;/, "gallery must remain horizontally scrollable while hiding Firefox's scrollbar");
  assert.match(html, /\.church-gallery-track::\-webkit-scrollbar\s*\{[^}]*display:\s*none;/, "gallery must hide the WebKit scrollbar");
});

test("Church Profile: pastor section does not render ministry badges", async () => {
  const html = await fs.readFile(path.join(projectRoot, "public", "church-profile.html"), "utf8");

  assert.doesNotMatch(html, /profile-ministry-chips|id="profile-ministries"/, "the public pastor section must not show ministry badges");
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

  // The runtime carousel binds its first slide description to the church tagline.
  assert.match(appJs, /class="church-hero-desc"[^`]*data-church-tagline/, "the primary runtime slide should bind the church description");
  assert.match(html, /id="church-hero-track"/, "the static shell should provide the runtime slide target");
});

test("Church creator can configure hero images and inline video", async () => {
  const portal = await fs.readFile(path.join(projectRoot, "public", "church-portal.html"), "utf8");
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");
  const platform = await fs.readFile(path.join(projectRoot, "src", "trusted-platform.js"), "utf8");

  assert.match(portal, /name="welcomeMedia"/, "creator editor should save a welcome video URL");
  assert.match(portal, /name="heroImages"/, "creator editor should save multiple hero images");
  assert.match(appJs, /data\.get\("heroImages"\)/, "creator form should parse hero image rows");
  assert.match(appJs, /heroImages:\s*normalized\.gallery/, "creator form should be populated when reopened");
  assert.match(platform, /'welcomeMedia'/, "trusted platform should persist the inline welcome video");
  assert.match(platform, /'gallery'/, "trusted platform should persist creator hero images");
});

test("Church Studio owns hero order and all church-specific page content", async () => {
  const studio = await fs.readFile(path.join(projectRoot, "public", "creator-studio.js"), "utf8");
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");
  const platformClient = await fs.readFile(path.join(projectRoot, "public", "platform-client.js"), "utf8");
  const trustedPlatform = await fs.readFile(path.join(projectRoot, "src", "trusted-platform.js"), "utf8");

  assert.match(studio, /\["heroSlides","Hero slides","hero"/, "Studio should expose the visual hero builder");
  assert.match(studio, /data-hero-first/, "Studio should let the creator choose the first slide");
  assert.match(studio, /data-hero-up/, "Studio should allow slide reordering");
  assert.match(studio, /value\.heroOrder=/, "Studio should persist the chosen order");
  assert.match(studio, /data-schedule-list/, "Studio should provide a gathering builder");
  assert.match(studio, /data-testimony-list/, "Studio should provide a testimony builder");
  assert.match(studio, /\["ministries","Ministries","list"/, "Studio should provide editable ministries");
  assert.match(appJs, /MWE\.getChurchHeroSlides/, "the public hero should consume the saved slide order");
  assert.match(appJs, /requestedOrder\.map/, "the saved first slide should be honored on the public page");
  assert.match(appJs, /MWE\.renderChurchSchedule/, "the public page should render creator gatherings");
  assert.match(appJs, /MWE\.renderChurchTestimonials/, "the public page should render creator testimonies");
  assert.match(platformClient, /preview'\)===\s*'studio'/, "Studio preview should load the creator's managed draft");
  assert.match(trustedPlatform, /'heroOrder'/, "the platform should persist hero ordering");
  assert.match(trustedPlatform, /'testimonies'/, "the platform should persist testimonies");
});

test("Church Studio covers the remaining public profile content", async () => {
  const studio = await fs.readFile(path.join(projectRoot, "public", "creator-studio.js"), "utf8");
  const html = await fs.readFile(path.join(projectRoot, "public", "church-profile.html"), "utf8");
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");
  const trustedPlatform = await fs.readFile(path.join(projectRoot, "src", "trusted-platform.js"), "utf8");

  assert.match(studio, /\["logo","Church logo","image"\]/, "Studio should provide a church logo uploader");
  assert.match(studio, /\["livestreamSettings","Livestream settings","livestream"/, "Studio should provide livestream settings");
  assert.match(studio, /value\.livestream=\{/, "Studio should persist livestream settings as one record field");
  assert.match(studio, /\["churchId","Church profile","church"/, "Event Studio should associate an event with a church");
  assert.match(trustedPlatform, /'postal','area','denomination'/, "the platform should persist the creator's neighborhood or area");
  assert.match(html, /data-church-logo/, "the public header logo should be data-bound");
  assert.match(html, /data-profile-pastor-title/, "the public profile should expose the creator's leadership title");
  assert.match(html, /data-profile-midweek/, "the public profile should expose the midweek summary");
  assert.match(html, /data-profile-website/, "the public profile should expose the church website");
  assert.match(appJs, /document\.querySelectorAll\("\[data-church-logo\]"\)/, "the public renderer should bind the creator's logo");
  assert.match(appJs, /MWE\.safeLinkUrl\(church\.website/, "the public renderer should bind a safe website link");
});

test("Church profile does not ship fake testimony, gallery, or schedule content", async () => {
  const html = await fs.readFile(path.join(projectRoot, "public", "church-profile.html"), "utf8");
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");

  assert.match(html, /id="profile-testimonials-grid"><\/div>/, "testimony grid should start empty");
  assert.match(html, /id="church-gallery-track"[^>]*><\/div>/, "gallery should start empty");
  assert.match(html, /id="profile-schedules-grid"><\/div>/, "schedule should start empty");
  assert.doesNotMatch(html, /Sarah M\.|Jason L\.|Sunday Worship &amp; Praise/, "profile HTML should not contain fake church stories");
  assert.doesNotMatch(html, /Sarah Johnson|CE82847|River City Church/, "profile HTML should not expose fabricated church or member content");
  assert.doesNotMatch(appJs, /church\.welcomeMedia \|\| "https:\/\/www\.youtube\.com\/embed\/jiSyB8QZzk8"/, "missing creator video must not fall back to a demo recording");
  assert.doesNotMatch(appJs, /Gathering details coming soon/, "missing creator schedules should not render substitute gathering copy");
  assert.match(appJs, /MWE\.getDefaultGalleryImages\s*=\s*function\([^)]*\)\s*\{\s*return \[\];/, "missing gallery content should stay empty");
});

