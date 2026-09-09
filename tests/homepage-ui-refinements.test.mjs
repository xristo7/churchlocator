import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(".");

test("Homepage Refinements: Video hidden, image background active, equal buttons, 2:1 header ratio, auth dropdown, and footer", async () => {
  const indexHtml = await fs.readFile(path.join(projectRoot, "public", "index.html"), "utf8");
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");
  const stylesCss = await fs.readFile(path.join(projectRoot, "public", "styles.css"), "utf8");

  // 1. Hero background video is hidden ready for MP4 upload, and background image is active
  assert.match(indexHtml, /id="hero-bg-image"/, "index.html must have hero-bg-image element");
  assert.match(indexHtml, /id="hero-bg-video"[^>]*display:\s*none/, "hero-bg-video must be hidden with display: none");
  assert.match(stylesCss, /\.hero-bg-image/, "styles.css must style hero-bg-image");

  // 2. Church card button labels & equal sizing
  assert.match(appJs, /Explore\s*<i data-lucide="arrow-right"/, "church card must have Explore label");
  assert.doesNotMatch(appJs, /Explore Church\s*<i data-lucide="arrow-right"/, "church card must not have old Explore Church label");
  assert.match(appJs, /<i data-lucide="map-pin"><\/i>\s*View Location/, "church card must have View Location label");
  assert.match(stylesCss, /\.immersive-pill-btn,\s*\.immersive-map-btn/, "styles.css must size both buttons equally");
  assert.match(stylesCss, /flex:\s*1\s*1\s*0\s*!important/, "buttons must have equal flex: 1 1 0");

  // 3. Upcoming events header has 2:1 ratio
  assert.match(indexHtml, /id="home-events"[^>]*>[\s\S]*?class="section-head section-head-grid-2-1"/, "events section must use section-head-grid-2-1");
  assert.match(stylesCss, /\.section-head-grid-2-1\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*2fr\s*1fr;/, "styles.css must define 2fr 1fr grid for section heads");

  // 4. Active and Scheduled Livestreams header has 2:1 ratio and updated title
  assert.match(indexHtml, /Active and Scheduled Livestreams/, "livestreams section title must be Active and Scheduled Livestreams");
  assert.match(indexHtml, /id="home-livestreams"[^>]*>[\s\S]*?class="section-head section-head-grid-2-1"/, "livestreams section must use section-head-grid-2-1");

  // 5. Humanitarian and Orphanage section is removed
  assert.doesNotMatch(indexHtml, /id="home-donation"/, "Humanitarian & Orphanage section must be removed from homepage");
  assert.doesNotMatch(indexHtml, /Humanitarian & Orphanage Support Outreach/, "Humanitarian text must be removed from homepage");

  // 6. About Us section is present on homepage
  assert.match(indexHtml, /id="home-about"/, "About Us section must be present on homepage");
  assert.match(indexHtml, /About My Way of Evangelism/, "About Us heading must be present");

  // 7. Homepage header navigation links: Churches, Events, Channels, Watch Live (About Us & Donation removed)
  const navSection = indexHtml.match(/<nav class="nav-links">[\s\S]*?<\/nav>/)?.[0] || "";
  assert.match(navSection, /href="churches\.html">Churches<\/a>/, "Nav must have Churches");
  assert.match(navSection, /href="events\.html">Events<\/a>/, "Nav must have Events");
  assert.match(navSection, /href="channels\.html">Channels<\/a>/, "Nav must have Channels");
  assert.match(navSection, /Watch Live<\/a>/, "Nav must have Watch Live");
  assert.doesNotMatch(navSection, /About Us<\/a>/, "Nav must NOT have About Us link");
  assert.doesNotMatch(navSection, /href="donate\.html"/, "Homepage nav must not have Donation link");

  // 8. Sign In dropdown with switch buttons and Google auth
  assert.match(indexHtml, /id="nav-signin-dropdown-container"/, "index.html must have nav-signin-dropdown-container");
  assert.match(indexHtml, /class="auth-mode-toggle-group"/, "Dropdown must have auth-mode-toggle-group");
  assert.match(indexHtml, /google-auth-fast-btn/, "Dropdown must have Google fast auth button");
  assert.match(appJs, /MWE\.toggleNavSigninDropdown/, "app.js must define toggleNavSigninDropdown");
  assert.match(appJs, /MWE\.switchAuthDropdownTab/, "app.js must define switchAuthDropdownTab");
  assert.match(appJs, /MWE\.handleGoogleAuthFast/, "app.js must define handleGoogleAuthFast");

  // 9. Header 100px fade out and border removal
  assert.match(stylesCss, /body\.hero-only-page \.topbar\s*\{[^}]*border-bottom:\s*none\s*!important;/, "topbar on hero page must have no bottom border");
  assert.match(stylesCss, /body\.hero-only-page \.topbar::before\s*\{[^}]*height:\s*calc\(100%\s*\+\s*100px\);/, "topbar must have 100px extended fade pseudo-element");
  assert.match(stylesCss, /mask-image:\s*linear-gradient\(to bottom,\s*black\s*calc\(100%\s*-\s*100px\),\s*transparent\s*100%\);/, "topbar fade must use mask gradient");

  // 10. Platform footer is present and not removed on homepage
  assert.match(indexHtml, /class="platform-footer"/, "platform-footer must be present in index.html");
  assert.match(appJs, /const isHomePage = document\.body\.classList\.contains\("hero-only-page"\)/, "app.js must identify isHomePage");
  assert.doesNotMatch(appJs, /if \(document\.body\.classList\.contains\("hero-only-page"\)[^}]*footerElem\.remove\(\)/, "app.js must not remove footer on hero-only-page");

  // 11. Dark header color reinstated (never white in light mode)
  assert.doesNotMatch(stylesCss, /html\[data-theme="light"\]\s*body\.hero-only-page\s*\.topbar::before\s*\{[^}]*255,\s*255,\s*255/, "hero topbar must not have bright white gradient in light mode");
  assert.match(stylesCss, /body\.hero-only-page \.topbar::before\s*\{[^}]*rgba\(10,\s*15,\s*26/, "hero topbar must use dark translucent gradient");

  // 12. Reinstated Language button in header
  assert.match(indexHtml, /class="lang-selector-container"/, "index.html must have reinstated lang-selector-container");
  assert.match(indexHtml, /class="lang-selector-btn"/, "index.html must have lang-selector-btn");

  // 13. Church Portal button removed from homepage nav-actions and Faith Hub CTA card
  const navAuthGroup = indexHtml.match(/<div class="nav-actions" id="homepage-nav-auth">[\s\S]*?<\/header>/)?.[0] || "";
  assert.doesNotMatch(navAuthGroup, /nav-portal-btn/, "homepage nav-actions must not have church portal button");
  const authActionsRow = indexHtml.match(/id="home-auth-actions-row">[\s\S]*?<\/div>/)?.[0] || "";
  assert.doesNotMatch(authActionsRow, /href="church-portal\.html"/, "faith hub callout must not have church portal button");

  // 14. No Profile link, Member Hub, or Logout button in homepage header
  assert.doesNotMatch(navAuthGroup, /Member Hub/, "homepage header must not have Member Hub button");
  assert.doesNotMatch(navAuthGroup, /title="Sign Out"/, "homepage header must not have logout button");
  assert.doesNotMatch(appJs, /authSlot\.innerHTML\s*=\s*`[^`]*Member Hub/, "app.js must not render Member Hub into authSlot");

  // 15. Eyebrow removed from hero section
  assert.doesNotMatch(indexHtml, /Love in Action • Verified Fellowships/, "Hero eyebrow must be removed from landing page");

  // 16. Dynamic hero carousel container & slides configuration in app.js
  assert.match(indexHtml, /id="hero-dynamic-content"/, "index.html must have hero-dynamic-content container");
  assert.match(indexHtml, /class="hero-slide-indicators"/, "index.html must have hero-slide-indicators");
  assert.match(appJs, /MWE\.heroCarouselSlides\s*=/, "app.js must define MWE.heroCarouselSlides");
  assert.match(appJs, /id:\s*"churches"/, "heroCarouselSlides must include churches");
  assert.match(appJs, /id:\s*"events"/, "heroCarouselSlides must include events");
  assert.match(appJs, /id:\s*"channels"/, "heroCarouselSlides must include channels");
  assert.match(appJs, /id:\s*"meditation"/, "heroCarouselSlides must include meditation");
  assert.match(appJs, /id:\s*"store"/, "heroCarouselSlides must include store");

  // Verified updated slide titles
  assert.match(appJs, /title:\s*"Discover Inspiring Meetings & Events\."/, "Events slide title must be Discover Inspiring Meetings & Events.");
  assert.match(appJs, /title:\s*"Inspiring Teachings & Podcasts\."/, "Channels slide title must be Inspiring Teachings & Podcasts.");
  assert.match(appJs, /title:\s*"Meditation & Scriptural Reflection\."/, "Meditation slide title must be Meditation & Scriptural Reflection.");
  assert.match(appJs, /title:\s*"Faith Resources & Products\."/, "Store slide title must be Faith Resources & Products.");
  assert.doesNotMatch(appJs, /Faith Resources & Kingdom Merchandise\./, "Old Store title must not exist");
  assert.doesNotMatch(appJs, /Discover Inspiring Gatherings & Workshops\./, "Old Events title must not exist");
  assert.doesNotMatch(appJs, /Inspiring Gospel Teachings & Podcasts\./, "Old Channels title must not exist");
  assert.doesNotMatch(appJs, /Peaceful Meditation & Scriptural Reflection\./, "Old Meditation title must not exist");

  // 17. Dual personas per slide (Seeker vs Creator)
  assert.match(appJs, /Find a Church Family/, "Slide 1 must have Seeker button Find a Church Family");
  assert.match(appJs, /Register a Church/, "Slide 1 must have Creator button Register a Church");
  assert.match(appJs, /Explore Events/, "Slide 2 must have Seeker button Explore Events");
  assert.match(appJs, /Host an Event/, "Slide 2 must have Creator button Host an Event");
  assert.match(appJs, /Explore Channels/, "Slide 3 must have Seeker button Explore Channels");
  assert.match(appJs, /Launch a Channel/, "Slide 3 must have Creator button Launch a Channel");
  assert.match(appJs, /Enter Sanctuary/, "Slide 4 must have Seeker button Enter Sanctuary");
  assert.match(appJs, /Create a Sanctuary/, "Slide 4 must have Creator button Create a Sanctuary");
  assert.match(appJs, /Browse Products/, "Slide 5 must have Seeker button Browse Products");
  assert.match(appJs, /Open a Store/, "Slide 5 must have Creator button Open a Store");

  // 18. Synchronized slider overlay & card layout consistency
  assert.match(appJs, /function tinyHeroCard\(/, "app.js must define tinyHeroCard");
  assert.match(appJs, /MWE\.setHeroSlide\s*=/, "app.js must define MWE.setHeroSlide");
  assert.match(stylesCss, /\.hero-slide-animating-out/, "styles.css must define hero-slide-animating-out");
  assert.match(stylesCss, /\.hero-slide-animating-in/, "styles.css must define hero-slide-animating-in");
  assert.match(stylesCss, /\.slider-animating-out/, "styles.css must define slider-animating-out");
  assert.match(stylesCss, /\.slider-animating-in/, "styles.css must define slider-animating-in");

  // 19. Footer reactive primary palette (light & dark mode backgrounds)
  assert.match(stylesCss, /html\[data-theme="dark"\]\s*\.platform-footer[\s\S]*?hsl\(var\(--primary-h\),\s*45%,\s*6%\)/, "Footer must have deep dark primary-tinted background in dark mode");
  assert.match(stylesCss, /html:not\(\[data-theme="dark"\]\)\s*\.platform-footer[\s\S]*?hsl\(var\(--primary-h\),\s*35%,\s*96%\)/, "Footer must have soft lighter primary-tinted background in light mode");

  // 20. Footer primary buttons, primary icons, and primary titles
  assert.match(stylesCss, /\.footer-button\.primary\s*\{[^}]*background:\s*var\(--primary\)/, "Footer primary button must have primary background");
  assert.match(stylesCss, /\.footer-column h2,\s*\.footer-column h3\s*\{[^}]*text-transform:\s*uppercase;/, "Footer column titles must be styled");
  assert.match(stylesCss, /html\[data-theme="dark"\]\s*\.footer-column h2[\s\S]*?color:\s*hsl\(var\(--primary-h\)/, "Footer column titles must use primary color in dark mode");
  // 21. Header dynamic primary-tinted reactive background (dark and light modes)
  assert.match(stylesCss, /body\.hero-only-page \.topbar::before[\s\S]*?hsla\(var\(--primary-h\)/, "hero topbar must use primary-reactive hsla background");
  assert.match(stylesCss, /html\[data-theme="light"\]\s*body\.hero-only-page\s*\.topbar::before[\s\S]*?hsla\(var\(--primary-h\),\s*35%,\s*96%/, "hero topbar must have light primary tint in light mode");

  // 22. Reinstated sections sequence below hero
  assert.match(indexHtml, /id="home-livestreams"[\s\S]*?id="home-churches"[\s\S]*?id="home-meditation"[\s\S]*?id="home-channels"[\s\S]*?id="home-store"[\s\S]*?id="home-banners"[\s\S]*?id="home-events"[\s\S]*?id="home-about"[\s\S]*?id="home-auth-section"/, "sections below hero must follow the required showcase sequence");

  // 23. Side-by-side impact banners
  assert.match(indexHtml, /class="home-banners-side-by-side"/, "index.html must have side-by-side banners container");
  assert.match(indexHtml, /Bi-Monthly Humanitarian Relief/, "Humanitarian Relief banner must be present in side-by-side grid");
  assert.match(indexHtml, /Study Guides &amp; E-Books|Study Guides & E-Books/, "Study Guides banner must be present in side-by-side grid");

  // 24. Member SPA quick launch cards
  assert.match(stylesCss, /\.launch-card\s*\{[^}]*background:\s*var\(--primary\)\s*!important;/, "launch cards must have solid primary background");
  assert.match(stylesCss, /\.launch-card\s*\{[^}]*color:\s*#ffffff/, "launch cards must have white text");
  assert.match(stylesCss, /\.launch-icon\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.22\)\s*!important;/, "launch icon badge must be brighter translucent white");

  // 25. Homepage cards rendering & renderSlider defined
  assert.match(appJs, /function renderSlider\(/, "app.js must define function renderSlider");
  assert.match(appJs, /MWE\.renderHomepageSections\s*=/, "app.js must export MWE.renderHomepageSections");
  assert.match(indexHtml, /data-home-streams-grid>[\s\S]*?stream-card-v2/, "streams grid must contain stream cards");
  assert.match(indexHtml, /data-home-church-grid>[\s\S]*?church-card-immersive/, "church grid must contain church cards");
  assert.match(indexHtml, /data-home-channels-grid>[\s\S]*?channel-profile-card/, "channels grid must contain channel cards");
  assert.match(indexHtml, /data-home-store-grid>[\s\S]*?store-product-card/, "store grid must contain store cards");
  assert.match(indexHtml, /data-home-events-grid>[\s\S]*?event-card-modern/, "events grid must contain event cards");
});

