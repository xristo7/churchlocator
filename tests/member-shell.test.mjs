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
  assert.match(headers, /Content-Security-Policy:\s*frame-ancestors 'self'/);
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

test("Creator & Ministry Hub loads inside SPA shell with 3-step registration and launchpad", async () => {
  const html = await readProjectFile("public/app.html");
  const shell = await readProjectFile("public/app-shell.js");
  const app = await readProjectFile("public/app.js");
  const portalHtml = await readProjectFile("public/church-portal.html");
  const worker = await readProjectFile("src/worker.js");

  // SPA navigation rail in app.html
  assert.match(html, /data-shell-view="portal"/);
  assert.match(html, /Creator Hub/);
  assert.match(html, /data-lucide="rocket"/);

  // Router in app-shell.js
  assert.match(shell, /portal:\s*\{\s*source:\s*"church-portal\.html",\s*title:\s*"Creator & Ministry Hub"\s*\}/);

  // Route map and top-level redirection to SPA shell in app.js
  assert.match(app, /"church-portal":\s*"portal"/);
  assert.match(app, /portal:\s*"portal"/);
  assert.match(app, /currentRoute\.view === "portal"/);
  assert.match(app, /body\[data-page="portal"\]\.member-shell-embed/);
  assert.match(shell, /isProtectedView\(safeRoute\.view\)/);

  // Worker routes
  assert.match(worker, /\["\/portal",\s*"\/church-portal\.html"\]/);
  assert.match(worker, /\["\/creator-hub",\s*"\/church-portal\.html"\]/);

  // 3-step creator registration form in church-portal.html
  assert.match(portalHtml, /Create Creator Account/);
  assert.match(portalHtml, /data-step="1"/);
  assert.match(portalHtml, /data-step="2"/);
  assert.match(portalHtml, /data-step="3"/);
  assert.match(portalHtml, /name="launchGoal"/);

  // Launchpad overview and workspace cards in church-portal.html
  assert.match(portalHtml, /id="launchpad-grid-container"/);
  assert.match(portalHtml, /data-launch-target="church"/);
  assert.match(portalHtml, /data-launch-target="channels"/);
  assert.match(portalHtml, /data-launch-target="events"/);
  assert.match(portalHtml, /data-launch-target="store"/);
  assert.match(portalHtml, /data-launch-target="resources"/);
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



