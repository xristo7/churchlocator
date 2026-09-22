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

test("member header identifies the active section and mobile moves account actions into the drawer", async () => {
  const html = await readProjectFile("public/app.html");
  const shell = await readProjectFile("public/app-shell.js");
  const app = await readProjectFile("public/app.js");

  assert.match(html, /id="member-section-title">Churches/);
  assert.doesNotMatch(html, /River City Church/);
  assert.match(html, /id="member-mobile-actions"/);
  assert.match(shell, /sectionContexts/);
  assert.match(shell, /placeResponsiveActions/);
  assert.match(app, /module-page:not\(\[data-page="messages"\]\) > main\.module-shell/);
  assert.match(app, /padding-left: max\(22px/);
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
  const product = await readProjectFile("public/product-detail.html");
  const resourceDetail = await readProjectFile("public/resource-detail.html");

  assert.match(shell, /channels:\s*\{ source: "channels\.html"/);
  assert.match(shell, /store:\s*\{ source: "store\.html"/);
  assert.match(shell, /product:\s*\{ source: "product-detail\.html"/);
  assert.match(shell, /"store-manager":\s*\{ source: "seller-dashboard\.html"/);
  assert.match(shell, /resources:\s*\{ source: "resources\.html"/);
  assert.match(shell, /"resource-detail":\s*\{ source: "resource-detail\.html"/);
  assert.match(channels, /Create a Channel/);
  assert.match(store, /Manage Your Store/);
  assert.match(store, /id="store-cart-drawer"/);
  assert.match(product, /id="product-detail"/);
  assert.match(seller, /Products and inventory/);
  assert.match(resources, /Christian Resource Library/);
  assert.match(resources, /<option>PDF<\/option>/);
  assert.match(resources, /<option>MP4<\/option>/);
  assert.match(resources, /<option>MP3<\/option>/);
  assert.match(resources, /data-resource-view="grid"/);
  assert.match(resources, /data-resource-view="list"/);
  assert.match(resourceDetail, /id="resource-detail"/);
});

test("donation page shows beneficiary image and video evidence", async () => {
  const donate = await readProjectFile("public/donate.html");
  assert.match(donate, /class="donation-impact-gallery"/);
  assert.match(donate, /<video controls/);
  assert.match(donate, /Impact in action/);
});

test("Store has dedicated cart and Shopify-style checkout routes", async () => {
  const shell = await readProjectFile("public/app-shell.js");
  const cart = await readProjectFile("public/cart.html");
  const checkout = await readProjectFile("public/checkout.html");
  const checkoutScript = await readProjectFile("public/checkout.js");

  assert.match(shell, /cart:\s*\{ source: "cart\.html"/);
  assert.match(shell, /checkout:\s*\{ source: "checkout\.html"/);
  assert.match(cart, /Order summary/);
  assert.match(cart, /data-page="cart"/);
  assert.match(checkout, /Contact/);
  assert.match(checkout, /Shipping method/);
  assert.match(checkout, /Payment/);
  assert.match(checkoutScript, /faithlink\.store\.orders\.v1/);
});

test("active livestreams retain thumbnail cards and open dedicated broadcast pages", async () => {
  const directory = await readProjectFile("public/creator-public.js");
  const styles = await readProjectFile("public/creator-public.css");

  assert.match(directory, /className = "livestream-showcase-card"/);
  assert.match(directory, /broadcastLink\(stream\.type, stream\.id\)/);
  assert.match(directory, /i\.ytimg\.com\/vi/);
  assert.match(directory, /data-lucide="play"/);
  assert.doesNotMatch(directory, /Check Availability/);
  assert.match(styles, /\.livestream-showcase-card\s*\{[\s\S]*border:\s*3px solid/);
  assert.match(styles, /\.livestream-showcase-card\s*\{[\s\S]*background-size:\s*cover/);
  assert.match(styles, /\.livestream-showcase-play/);
});

test("dedicated livestream pages use a two-to-one player and chat layout", async () => {
  const broadcast = await readProjectFile("public/broadcast.html");
  const renderer = await readProjectFile("public/creator-public.js");
  const styles = await readProjectFile("public/creator-public.css");

  assert.match(broadcast, /data-page="broadcast"/);
  assert.match(renderer, /broadcast-watch-layout/);
  assert.match(renderer, /broadcast-main-column/);
  assert.match(renderer, /broadcast-chat/);
  assert.match(renderer, /id="broadcast-chat-form"/);
  assert.match(styles, /grid-template-columns:minmax\(0,2fr\) minmax\(300px,1fr\)/);
  assert.match(styles, /\.broadcast-main-column \.creator-live-player/);
  assert.match(styles, /@media \(max-width: 900px\)[\s\S]*\.broadcast-watch-layout \{ grid-template-columns:minmax\(0,1fr\)/);
});

test("checkout login and express payment controls have working destinations", async () => {
  const checkout = await readProjectFile("public/checkout.html");
  const checkoutJs = await readProjectFile("public/checkout.js");
  assert.match(checkout, /href="app\.html\?view=checkout" target="_top">Log in/);
  assert.match(checkoutJs, /\.accelerated-checkout \.accelerated/);
  assert.match(checkoutJs, /payment\.dispatchEvent\(new Event\("change"/);
});

test("Channels use creator profile cards and connect to member messaging", async () => {
  const app = await readProjectFile("public/app.html");
  const shell = await readProjectFile("public/app-shell.js");
  const channels = await readProjectFile("public/channels.js");
  const messages = await readProjectFile("public/messages.html");
  const messageScript = await readProjectFile("public/messages.js");

  assert.match(channels, /class="channel-profile-card"/);
  assert.match(channels, /channel-detail\.html\?id=/);
  assert.match(channels, /Get in touch/);
  assert.match(shell, /"channel-detail":\s*\{ source: "channel-detail\.html"/);
  assert.match(shell, /messages:\s*\{ source: "messages\.html"/);
  assert.match(app, /data-shell-view="messages"/);
  assert.match(messages, /Email forwarding/);
  assert.match(messageScript, /saveMessageSettings/);
});

test("channel profile separates cover metadata, identity, description, and stats", async () => {
  const detail = await readProjectFile("public/channel-detail.js");

  assert.match(detail, /channel-cover-type/);
  assert.match(detail, /channel-detail-identity/);
  assert.match(detail, /channel-detail-summary/);
  assert.match(detail, /channel-detail-stats/);
  assert.match(detail, /About the channel/);
});

test("light and dark themes persist across the public site and member shell", async () => {
  const app = await readProjectFile("public/app.js");
  const styles = await readProjectFile("public/styles.css");

  assert.match(app, /mwe\.platform\.theme\.v1/);
  assert.match(app, /data-theme-toggle/);
  assert.match(app, /prefers-color-scheme: dark/);
  assert.match(app, /postMessage\(\{ type: "mwe-theme"/);
  assert.match(styles, /html\[data-theme="dark"\]/);
  assert.match(styles, /body\[data-page="home"\] \.tiny-church-card/);
  assert.match(styles, /body\.member-app-shell \.member-shell-rail/);
});

test("language changes translate the shell and active embedded module", async () => {
  const shell = await readProjectFile("public/app-shell.js");
  const app = await readProjectFile("public/app.js");
  const home = await readProjectFile("public/index.html");
  assert.match(shell, /const shellTranslations = \{/);
  assert.match(shell, /applyShellLanguage\(lang\)/);
  assert.match(shell, /postMessage\(\{ type: "mwe-language", lang \}/);
  assert.match(shell, /frame\.addEventListener\("load",[\s\S]*postMessage\(\{ type: "mwe-language", lang: currentMemberLanguage \}/);
  assert.match(app, /event\.data\?\.type !== "mwe-language"/);
  assert.match(app, /document\.documentElement\.lang = lang/);
  assert.match(app, /translateModuleCopy\(document, lang\)/);
  assert.match(app, /new MutationObserver/);
  assert.match(home, /data-t="hero_title"/);
  assert.match(home, /data-t-option="all_interests"/);
  assert.doesNotMatch(app, /Evangélice/);
});

test("single pages share spacing and content uses media-specific readers", async () => {
  const styles = await readProjectFile("public/styles.css");
  const resourceDetail = await readProjectFile("public/resource-detail.js");
  const channelContent = await readProjectFile("public/channel-content.js");
  const churchProfile = await readProjectFile("public/church-profile.html");

  assert.match(styles, /main\.product-detail-page[\s\S]*main\.channel-detail-page[\s\S]*main\.channel-content-page/);
  assert.match(styles, /width: min\(var\(--max\), calc\(100% - 44px\)\)/);
  assert.match(churchProfile, /body\[data-page="profile"\] > section > \.container/);
  assert.match(resourceDetail, /resource-video-experience/);
  assert.match(resourceDetail, /resource-audio-experience/);
  assert.match(resourceDetail, /resource-article-experience/);
  assert.match(resourceDetail, /Read online/);
  assert.match(resourceDetail, /Download/);
  assert.match(channelContent, /channel-audio-view/);
  assert.match(channelContent, /channel-video-view/);
  assert.match(channelContent, /channel-article-view/);
});

test("cart removal, dedicated reader, and compact audio notes are wired", async () => {
  const cart = await readProjectFile("public/cart.js");
  const product = await readProjectFile("public/product-detail.js");
  const detail = await readProjectFile("public/resource-detail.js");
  const reader = await readProjectFile("public/resource-reader.js");
  const channelContent = await readProjectFile("public/channel-content.js");
  const shell = await readProjectFile("public/app-shell.js");

  assert.match(cart, /cart-page-delete/);
  assert.match(product, /data-remove-cart/);
  assert.match(detail, /resource-reader\.html\?id=/);
  assert.match(reader, /requestFullscreen/);
  assert.match(reader, /data-reader-page/);
  assert.match(shell, /"resource-reader":\s*\{ source: "resource-reader\.html"/);
  assert.match(channelContent, /channel-episode-about/);
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
  assert.match(headers, /Content-Security-Policy:[^\n]*frame-ancestors 'self'/);
  assert.doesNotMatch(headers, /X-Frame-Options:\s*DENY/);
});

test("two-pillar theme system supports rainbow primary palette, gold accents, and scroll reveal", async () => {
  const app = await readProjectFile("public/app.js");
  const styles = await readProjectFile("public/styles.css");
  const shell = await readProjectFile("public/app-shell.js");

  // Rainbow Palette & Theme Keys
  assert.match(app, /mwe\.platform\.primary\.v1/);
  assert.match(app, /RAINBOW_PALETTES/);
  assert.match(app, /Sapphire Blue/);
  assert.match(app, /Electric Indigo/);
  assert.match(app, /Royal Amethyst/);
  assert.match(app, /Radiant Rose/);
  assert.match(app, /Crimson Ruby/);
  assert.match(app, /Sunset Flame/);
  assert.match(app, /Emerald Forest/);
  assert.match(app, /Ocean Cyan/);
  assert.doesNotMatch(app, /Honey Amber/);

  // Standard Gold token constancy & elements
  assert.match(styles, /--gold:\s*#e5a93c/);
  assert.match(styles, /--gold-gradient:/);
  assert.match(styles, /\.member-header-giving[\s\S]*--gold-gradient/);

  // CSS Rainbow Presets
  assert.match(styles, /html\[data-primary="blue"\]/);
  assert.match(styles, /html\[data-primary="indigo"\]/);
  assert.match(styles, /html\[data-primary="purple"\]/);
  assert.match(styles, /html\[data-primary="pink"\]/);
  assert.match(styles, /html\[data-primary="red"\]/);
  assert.match(styles, /html\[data-primary="orange"\]/);
  assert.match(styles, /html\[data-primary="green"\]/);
  assert.match(styles, /html\[data-primary="teal"\]/);

  // Scroll reveal animation classes
  assert.match(styles, /\.reveal-on-scroll/);
  assert.match(styles, /\.reveal-on-scroll\.is-revealed/);
  assert.match(app, /initScrollReveal/);

  // Cross-frame sync for theme and primary color
  assert.match(app, /mwe-primary-color/);
  assert.match(shell, /mwe-primary-color/);
});

test("creation tools stay inside the member app and use full-page templates", async () => {
  const html = await readProjectFile("public/app.html");
  const shell = await readProjectFile("public/app-shell.js");
  const app = await readProjectFile("public/app.js");
  const studioHtml = await readProjectFile("public/creator-studio.html");
  const studioJs = await readProjectFile("public/creator-studio.js");
  const worker = await readProjectFile("src/worker.js");

  assert.match(html, /data-shell-view="create"/);
  assert.match(html, />Create</);
  assert.match(shell, /create:\s*\{\s*source:\s*"creator-studio\.html",\s*title:\s*"Create"\s*\}/);
  assert.doesNotMatch(shell, /creator-workspace\.html/);
  assert.doesNotMatch(shell, /hasMatchingCreatorIdentity/);
  assert.match(app, /"church-portal":\s*"create"/);
  assert.match(app, /currentRoute\.view === "create"/);
  assert.match(worker, /\["\/portal",\s*"\/creator-studio\.html"\]/);
  assert.match(worker, /\["\/creator-hub",\s*"\/creator-studio\.html"\]/);
  assert.match(studioHtml, /creator-studio\.js/);
  assert.match(studioJs, /churches:/);
  assert.match(studioJs, /events:/);
  assert.match(studioJs, /products:/);
  assert.match(studioJs, /publicationState/);
  assert.match(studioJs, /Submit for review/);
  assert.match(studioJs, /required details complete/);
});

test("dark mode adapts background surfaces and subtle borders to primary theme and homepage overlay adjusts dynamically", async () => {
  const styles = await readProjectFile("public/styles.css");
  const home = await readProjectFile("public/index.html");

  // Fainter, subtle borders and dynamic primary-tinted dark mode tokens
  assert.match(styles, /html\[data-theme="dark"\][\s\S]*--border:\s*hsla\(var\(--primary-h\)/);
  assert.match(styles, /html\[data-theme="dark"\][\s\S]*--border-subtle:\s*hsla\(var\(--primary-h\)/);
  assert.match(styles, /html\[data-theme="dark"\][\s\S]*--background:\s*hsl\(var\(--primary-h\)/);
  assert.match(styles, /html\[data-theme="dark"\][\s\S]*--surface:\s*hsl\(var\(--primary-h\)/);

  // Cart drawer dividers use subtle borders in dark mode
  assert.match(styles, /\.store-cart-drawer\s*\{[\s\S]*border-left:\s*1px solid var\(--border-subtle\)/);
  assert.match(styles, /\.store-cart-drawer \.store-cart-head\s*\{[\s\S]*border-bottom:\s*1px solid var\(--border-subtle\)/);
  assert.match(styles, /\.store-cart-drawer \.cart-summary\s*\{[\s\S]*border-top:\s*1px solid var\(--border-subtle\)/);

  // Transparent hero overlay with primary color gradient and transition
  assert.match(home, /class="hero-glow-overlay"/);
  assert.match(styles, /\.hero-glow-overlay\s*\{[\s\S]*hsla\(var\(--primary-h\)/);
  assert.match(styles, /\.hero-glow-overlay\s*\{[\s\S]*transition:\s*background/);
  assert.match(styles, /html\[data-theme="dark"\] \.hero-glow-overlay\s*\{[\s\S]*hsla\(var\(--primary-h\)/);
});

test("SPA shell supports member home dashboard and interactive meditation sanctuary module", async () => {
  const appHtml = await readProjectFile("public/app.html");
  const shellJs = await readProjectFile("public/app-shell.js");
  const memberHomeHtml = await readProjectFile("public/member-home.html");
  const memberHomeJs = await readProjectFile("public/member-home.js");
  const medHtml = await readProjectFile("public/meditation.html");
  const medJs = await readProjectFile("public/meditation.js");
  const styles = await readProjectFile("public/styles.css");

  // Navigation routes in app.html
  assert.match(appHtml, /data-shell-view="home"/);
  assert.match(appHtml, /data-shell-view="meditation"/);

  // Router definitions in app-shell.js
  assert.match(shellJs, /home:\s*\{\s*source:\s*"member-home\.html"/);
  assert.match(shellJs, /meditation:\s*\{\s*source:\s*"meditation\.html"/);

  // Member home sections
  assert.match(memberHomeHtml, /Welcome to Your Fellowship/);
  assert.match(memberHomeHtml, /Meditation Sanctuary/);
  assert.match(memberHomeHtml, /Virtual Sanctuary Streams/);
  assert.match(memberHomeHtml, /Inspiring Channels & Podcasts/);
  assert.match(memberHomeHtml, /Featured Ministry Essentials/);

  // Meditation Sanctuary features
  assert.match(medHtml, /Meditation Sanctuary/);
  assert.match(medHtml, /Christian Worship/);
  assert.match(medHtml, /Audio Bible/);
  assert.match(medHtml, /Soaking Instrumental/);
  assert.match(medHtml, /Sermons & Preaching/);
  assert.match(medHtml, /Prayer & Sleep Timer/);
  assert.match(medHtml, /id="meditation-search"/);
  assert.match(medJs, /meditation-search/);

  // Landing page topbar bright text exemption
  assert.match(styles, /body\.hero-only-page \.topbar \.nav-links a[\s\S]*#ffffff !important/);
});

test("directory modules share the standardized atmospheric hero and filter tray", async () => {
  const styles = await readProjectFile("public/styles.css");
  const appJs = await readProjectFile("public/app.js");
  for (const page of ["churches", "meditation", "events", "store", "livestream", "resources", "channels"]) {
    const html = await readProjectFile(`public/${page}.html`);
    assert.match(html, /module-directory-hero/, `${page} needs the shared hero`);
    assert.match(html, /site-search-bar/, `${page} needs the shared filter tray`);
  }
  assert.doesNotMatch(styles, /module-hero-blob\.png/);
  assert.match(styles, /\.module-directory-hero::before/);
  assert.match(styles, /@keyframes module-hero-atmosphere/);
  assert.match(styles, /\.module-directory-hero::before[\s\S]*hsla\(var\(--primary-h\), var\(--primary-s\), var\(--primary-l\)/);
  assert.match(styles, /--module-control-height:\s*56px/);
  assert.match(styles, /--module-control-radius:\s*14px/);
  assert.match(styles, /\.site-search-bar \{[\s\S]*flex-wrap:\s*nowrap !important/);
  assert.match(styles, /\.site-search-bar \.site-search[\s\S]*min-width:\s*360px !important/);
  assert.match(styles, /@media\(max-width:700px\)[\s\S]*\.site-search-bar > \.module-filter-group \{ display: none !important; \}/);
  assert.match(appJs, /function initModuleDirectoryToolbars\(\)/);
  assert.match(appJs, /module-filter-overflow/);
  assert.match(appJs, /module-mobile-filter-button/);
  assert.match(appJs, /filterItems\.slice\(capacity\)/);
  assert.match(appJs, /const visibleLimit = Math\.min\(3, filterItems\.length\)/);
  assert.match(appJs, /filterItems\.length <= 3 && available >= searchMinWidth/);
  const livestream = await readProjectFile("public/livestream.html");
  assert.match(livestream, /id="livestream-search"/);
});

test("landing page location dropdown has unified single element with single arrow and light mode cards have dark readable text", async () => {
  const styles = await readProjectFile("public/styles.css");
  const homeHtml = await readProjectFile("public/index.html");

  // Location group unification and single arrow
  assert.match(homeHtml, /class="location-combined-group"/);
  assert.match(styles, /\.location-combined-group \.country-dropdown[\s\S]*background-image:\s*none !important/);

  // Light mode card text contrast
  assert.match(styles, /html:not\(\[data-theme="dark"\]\)\s*\.tiny-card-name[\s\S]*#0f172a !important/);
  assert.match(styles, /html:not\(\[data-theme="dark"\]\)\s*\.church-card h3/);
});




