import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const projectRoot = path.resolve(".");

test("Task 8.1: events.html and styles.css define host triggers and workshop styling", async () => {
  const eventsHtml = await fs.readFile(path.join(projectRoot, "public", "events.html"), "utf8");
  const stylesCss = await fs.readFile(path.join(projectRoot, "public", "styles.css"), "utf8");
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");

  // Hero and topbar buttons in events.html
  assert.match(eventsHtml, /btn-host-event/, "events.html should include .btn-host-event");
  assert.match(eventsHtml, /topbar-host-btn/, "events.html should include .topbar-host-btn");
  assert.match(eventsHtml, /MWE\.openHostEventStudio\(\)/, "events.html buttons should call MWE.openHostEventStudio()");
  assert.match(eventsHtml, /id="host-auth-status"/, "events.html should include #host-auth-status container");
  assert.match(eventsHtml, /value="workshops"/, "events.html should include workshops category checkbox");

  // CSS classes exist
  assert.match(stylesCss, /\.btn-host-event/, "styles.css should style .btn-host-event");
  assert.match(stylesCss, /\.topbar-host-btn/, "styles.css should style .topbar-host-btn");
  assert.match(stylesCss, /\.host-auth-status-chip/, "styles.css should style .host-auth-status-chip");
  assert.match(stylesCss, /\.event-card-top-badge\.workshop-badge/, "styles.css should style .workshop-badge");
  assert.match(stylesCss, /\.host-preset-card/, "styles.css should style .host-preset-card");
  assert.match(stylesCss, /html\[data-theme="dark"\]\s+\.host-studio-panel/, "styles.css should support dark theme for host studio");

  // Core Events Platform methods in app.js
  assert.match(appJs, /MWE\.getEventHost\s*=\s*function/, "app.js must define MWE.getEventHost");
  assert.match(appJs, /MWE\.setEventHost\s*=\s*function/, "app.js must define MWE.setEventHost");
  assert.match(appJs, /MWE\.logoutEventHost\s*=\s*function/, "app.js must define MWE.logoutEventHost");
  assert.match(appJs, /MWE\.openHostAuthModal\s*=\s*function/, "app.js must define MWE.openHostAuthModal");
  assert.match(appJs, /MWE\.openHostEventStudio\s*=\s*function/, "app.js must define MWE.openHostEventStudio");
  assert.match(appJs, /MWE\.handleHostEventSubmit\s*=\s*function/, "app.js must define MWE.handleHostEventSubmit");
  assert.match(appJs, /MWE\.openHostDashboard\s*=\s*function/, "app.js must define MWE.openHostDashboard");
  assert.match(appJs, /MWE\.openEventAttendeeRoster\s*=\s*function/, "app.js must define MWE.openEventAttendeeRoster");
  assert.match(appJs, /MWE\.getEventPaymentState\s*=\s*function/, "app.js must classify free, external, and unavailable paid event payment states");
  assert.match(appJs, /Paid registration requires a verified payment provider|Payment unavailable|Payment Not Available/, "event registration UI should not imply unavailable paid checkout is functional");
});

test("single event profile tabs activate visible panels", async () => {
  const eventProfileHtml = await fs.readFile(path.join(projectRoot, "public", "event-profile.html"), "utf8");

  assert.match(eventProfileHtml, /function activateEventTab\(button\)/, "event profile should use a shared tab activator");
  assert.match(eventProfileHtml, /panel\.classList\.toggle\("active", isActive\)/, "tab activator should set the active class required by CSS");
  assert.match(eventProfileHtml, /panel\.classList\.toggle\("hidden", !isActive\)/, "tab activator should keep hidden state in sync");
  assert.match(eventProfileHtml, /if \(initiallyActive\) activateEventTab\(initiallyActive\)/, "first tab should be made visible on load");
});

test("single event speaker modal renders centered above sticky chrome", async () => {
  const eventProfileHtml = await fs.readFile(path.join(projectRoot, "public", "event-profile.html"), "utf8");
  const stylesCss = await fs.readFile(path.join(projectRoot, "public", "styles.css"), "utf8");

  assert.match(eventProfileHtml, /id="speaker-modal"\s+class="event-speaker-modal hidden"/, "speaker modal should use the dedicated top-layer overlay class");
  assert.doesNotMatch(eventProfileHtml, /id="speaker-modal"\s+class="[^"]*z-50/, "speaker modal should not rely on a low Tailwind z-index utility");
  assert.match(eventProfileHtml, /document\.body\.classList\.add\('speaker-modal-open'\)/, "opening the speaker modal should lock the page behind it");
  assert.match(stylesCss, /\.event-speaker-modal\s*\{[\s\S]*position:\s*fixed[\s\S]*z-index:\s*120000\s*!important[\s\S]*place-items:\s*center/, "speaker modal should be fixed, centered, and above app chrome");
  assert.match(stylesCss, /\.event-speaker-modal-card\s*\{[\s\S]*width:\s*min\(100%,\s*720px\)[\s\S]*max-height:\s*min\(86vh,\s*760px\)/, "speaker modal card should stay centered and fit within the viewport");
});

test("event speaker cards use theme tokens instead of fixed colors", async () => {
  const stylesCss = await fs.readFile(path.join(projectRoot, "public", "styles.css"), "utf8");
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");
  const platformModulesJs = await fs.readFile(path.join(projectRoot, "public", "platform-modules.js"), "utf8");
  const channelsJs = await fs.readFile(path.join(projectRoot, "public", "channels.js"), "utf8");
  const channelDetailJs = await fs.readFile(path.join(projectRoot, "public", "channel-detail.js"), "utf8");

  const speakerBlock = stylesCss.slice(stylesCss.indexOf(".spk-card {"), stylesCss.indexOf(".events-empty-state"));
  assert.match(speakerBlock, /background:\s*var\(--surface-card\)/, "speaker cards should use themed surfaces");
  assert.match(speakerBlock, /color:\s*var\(--text-primary\)/, "speaker card text should use themed text");
  assert.match(speakerBlock, /background:\s*var\(--primary-surface\)/, "follow button should use primary surface token");
  assert.match(speakerBlock, /color:\s*var\(--primary\)/, "follow button should use selected theme color");
  assert.doesNotMatch(speakerBlock, /background:\s*#fff\b/, "speaker cards should not force white backgrounds");
  assert.doesNotMatch(speakerBlock, /#1a5c3a|#006241|#f0f4f1/, "speaker cards should not force legacy green palette");
  assert.match(stylesCss, /html\[data-theme="dark"\]\s+body\[data-page="event-profile"\]\s+\.spk-card/, "dark event profile should include speaker card override");
  assert.match(appJs, /event-session-badge \$\{badgeTrackClass\}/, "agenda badges should render semantic theme-aware classes");
  assert.match(appJs, /MWE\.findSpeakerChannel\s*=\s*function/, "speaker cards should resolve linked platform channel accounts");
  assert.match(appJs, /MWE\.toggleSpeakerFollow\s*=\s*function/, "speaker follow buttons should toggle real follow state");
  assert.match(appJs, /mwe\.followed\.channels\.v1/, "speaker follow state should persist in the shared channel follow store");
  assert.match(appJs, /data-speaker-follow-slot/, "speaker cards should render refreshable follow button slots");
  assert.match(platformModulesJs, /channelFollows:\s*"mwe\.followed\.channels\.v1"/, "channel module should read the shared follow store");
  assert.match(platformModulesJs, /toggleChannelFollow\(id\)/, "channel module should expose a platform follow toggle");
  assert.match(channelsJs, /data-channel-follow/, "channels directory should render platform follow buttons");
  assert.match(channelDetailJs, /data-channel-follow/, "channel detail page should render platform follow buttons");
  assert.doesNotMatch(appJs, /badgeColorClass[\s\S]{0,220}bg-clay-100/, "agenda badges should not use fixed Tailwind color classes");
  assert.match(stylesCss, /\.event-session-badge\s*\{[\s\S]*background:\s*var\(--primary-surface\)/, "agenda badges should use primary surface token");
  assert.match(stylesCss, /html\[data-theme="dark"\]\s+body\[data-page="event-profile"\]\s+\.event-session-badge/, "agenda badges should include dark-mode styling");
});

test("embedded event profile keeps tabs flush and schedule canvas transparent", async () => {
  const stylesCss = await fs.readFile(path.join(projectRoot, "public", "styles.css"), "utf8");
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");
  const embeddedTabRule = stylesCss.slice(
    stylesCss.indexOf('body[data-page="event-profile"].member-shell-embed .sticky.top-\\[70px\\]'),
    stylesCss.indexOf('body[data-page="event-profile"].member-shell-embed #event-tabs-container')
  );
  const darkOuterCardRule = stylesCss.slice(
    stylesCss.indexOf('html[data-theme="dark"] body[data-page="event-profile"] .schedule-item-row > div:last-child'),
    stylesCss.indexOf('html[data-theme="dark"] body[data-page="event-profile"] .spk-card')
  );

  assert.match(embeddedTabRule, /position:\s*sticky\s*!important[\s\S]*top:\s*0\s*!important/, "embedded event tab bar should stay in normal flow and stick only while scrolling");
  assert.doesNotMatch(embeddedTabRule, /position:\s*fixed\s*!important/, "embedded event tab bar should not be permanently fixed under the header");
  assert.match(stylesCss, /body\[data-page="event-profile"\]\s+section#schedule[\s\S]*background:\s*transparent\s*!important/, "schedule section should not paint a solid background behind cards");
  assert.match(stylesCss, /body\[data-page="event-profile"\]\s+#schedule-timeline[\s\S]*background:\s*transparent\s*!important/, "schedule timeline canvas should stay transparent");
  assert.match(appJs, /event-highlight-row flex gap-3\.5 items-start/, "hero highlight rows should use the native flat row class");
  assert.doesNotMatch(darkOuterCardRule, /#event-highlights-list\s*>\s*div/, "hero highlight rows should not inherit outer-card background or shadow styling");
  assert.match(stylesCss, /#event-highlights-list\s+\.event-highlight-row\s*\{[\s\S]*background:\s*transparent\s*!important[\s\S]*box-shadow:\s*none\s*!important/, "hero highlight rows should stay flat on the main card");
});

test("Task 8.2: External host account lifecycle, workshop studio creation, and attendee roster management", async () => {
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");

  // Setup DOM & Storage mock in VM
  const mockStorage = new Map();
  const localStorageMock = {
    getItem: (k) => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
    clear: () => mockStorage.clear()
  };

  const createdElements = [];
  function createMockElement(tag) {
    const el = {
      tagName: tag.toUpperCase(),
      id: "",
      className: "",
      innerHTML: "",
      value: "",
      style: {},
      children: [],
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); el.className = Array.from(this.classes).join(" "); },
        remove(c) { this.classes.delete(c); el.className = Array.from(this.classes).join(" "); },
        contains(c) { return this.classes.has(c); },
        toggle(c, f) { if (f !== undefined) { if (f) this.add(c); else this.remove(c); } else { if (this.contains(c)) this.remove(c); else this.add(c); } }
      },
      scrollIntoView: () => {},
      focus: () => {},
      remove: () => {
        const idx = createdElements.indexOf(el);
        if (idx !== -1) createdElements.splice(idx, 1);
        if (el.id) delete documentMock._byId[el.id];
      },
      querySelectorAll: () => [],
      querySelector: () => null,
      dispatchEvent: () => true,
      addEventListener: () => {}
    };
    createdElements.push(el);
    return el;
  }

  const documentMock = {
    _byId: {},
    documentElement: { dataset: {}, style: {}, setAttribute: () => {}, classList: { add: () => {}, remove: () => {} } },
    body: {
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        toggle(c, f) { if (f) this.add(c); else this.remove(c); }
      },
      appendChild: (el) => {
        if (el.id) documentMock._byId[el.id] = el;
      }
    },
    getElementById: (id) => documentMock._byId[id] || null,
    createElement: (tag) => createMockElement(tag),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  let clipboardText = "";
  const windowMock = {
    location: { hash: "", search: "", href: "https://mywayofevangelism.com/events.html" },
    localStorage: localStorageMock,
    setTimeout: (fn, delay) => { if (!delay) fn(); return 1; },
    clearTimeout: () => {},
    prompt: (msg, def) => def,
    confirm: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    navigator: {
      clipboard: {
        writeText: async (t) => { clipboardText = t; }
      }
    }
  };

  const context = {
    window: windowMock,
    document: documentMock,
    localStorage: localStorageMock,
    navigator: windowMock.navigator,
    console,
    URLSearchParams,
    createIcons: () => {},
    showToast: () => {},
    setTimeout: (fn, delay) => { if (!delay) fn(); return 1; },
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    Event: class { constructor(type) { this.type = type; } },
    FormData: class {
      constructor(form) { this._entries = form._mockEntries || []; }
      *entries() {
        for (const entry of this._entries) yield entry;
      }
      [Symbol.iterator]() {
        return this.entries();
      }
    },
    MWE: {}
  };

  vm.createContext(context);
  vm.runInContext(appJs, context);
  const mwe = context.window.MWE || context.MWE;

  // 1. External Host Account Lifecycle
  assert.equal(mwe.getEventHost(), null, "Host should initially be unauthenticated");

  const testHost = {
    id: "host-test-999",
    name: "Dr. David Sterling",
    email: "david@kingdomleadership.org",
    organization: "Kingdom Leadership Network",
    role: "Workshop Leader",
    phone: "(555) 987-6543",
    bio: "Equipping pastors and leaders in practical evangelism.",
    createdAt: new Date().toISOString()
  };

  mwe.setEventHost(testHost);
  const retrievedHost = mwe.getEventHost();
  assert.ok(retrievedHost, "Host account should be persisted");
  assert.equal(retrievedHost.name, "Dr. David Sterling");
  assert.equal(retrievedHost.organization, "Kingdom Leadership Network");

  // 2. Workshop Creation Studio
  mwe.openHostEventStudio();
  const studioModal = documentMock.getElementById("host-studio-modal");
  assert.ok(studioModal, "Host studio modal should be opened in DOM");
  assert.match(studioModal.innerHTML, /Workshop &amp; Event Creation Studio|Workshop & Event Creation Studio/, "Studio title should be displayed");
  assert.match(studioModal.innerHTML, /Dr\. David Sterling/, "Host name should be shown in studio header");

  // 3. Submit a new Workshop via handleHostEventSubmit
  const testStarts = new Date(Date.now() + 86400000 * 5).toISOString();
  const testEnds = new Date(Date.now() + 86400000 * 5 + 7200000).toISOString();
  const studioSpeakers = [
    { name: "Dr. David Sterling", role: "Workshop Leader", image: "https://example.com/david.jpg", specialty: "Evangelism", bio: "Equipping leaders." },
    { name: "Rebecca Johnson", role: "Breakout Coach", image: "https://example.com/rebecca.jpg", specialty: "Discipleship", bio: "Training small group leaders." }
  ];
  const studioSchedule = [
    { day: 1, time: "09:00 AM", endTime: "10:00 AM", title: "Opening Framework", track: "keynote", host: "Dr. David Sterling", desc: "Foundation teaching." },
    { day: 1, time: "10:15 AM", endTime: "11:30 AM", title: "Media Lab", track: "workshop", host: "Rebecca Johnson", desc: "Hands-on practice." }
  ];
  const studioExpectations = [
    { title: "Practical Labs", desc: "Hands-on ministry planning.", icon: "fa-screwdriver-wrench", color: "brand" }
  ];
  const studioHighlights = [
    { title: "Strategy Lab", desc: "Build an outreach plan.", icon: "fa-lightbulb", color: "brand" },
    { title: "Live Coaching", desc: "Get feedback from hosts.", icon: "fa-comments", color: "clay" }
  ];
  const studioFaqs = [
    { question: "Is lunch included?", answer: "Yes, lunch is included with registration." }
  ];
  const mockForm = {
    _mockEntries: [
      ["title", "Advanced Evangelism & Discipleship Workshop"],
      ["category", "workshop"],
      ["format", "hybrid"],
      ["startsAt", testStarts],
      ["endsAt", testEnds],
      ["venue", "King's Sanctuary & Zoom Hub"],
      ["city", "Calgary, AB"],
      ["streamUrl", "https://zoom.us/j/123456789"],
      ["speakerName", "Dr. David Sterling"],
      ["organization", "Kingdom Leadership Network"],
      ["organizerName", "Kingdom Leadership Network"],
      ["organizerUrl", "https://example.com/kingdom-leadership"],
      ["churchId", ""],
      ["directionsUrl", "https://maps.example.com/kings-sanctuary"],
      ["admissionType", "paid"],
      ["priceDollars", "35"],
      ["capacity", "150"],
      ["coverImageUrl", "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80"],
      ["description", "Intensive masterclass on modern outreach methods and mentorship."],
      ["heroBadgeText", "AUG 2026 • CALGARY • HYBRID"],
      ["aboutTitle", "What leaders will practice"],
      ["aboutIntro", "A focused training day with labs, coaching, and practical next steps."],
      ["highlight1", "Strategic discipleship frameworks"],
      ["highlight2", "Interactive media workshop"],
      ["highlight3", "Official workshop certification"],
      ["speakersJson", JSON.stringify(studioSpeakers)],
      ["highlightsJson", JSON.stringify(studioHighlights)],
      ["scheduleJson", JSON.stringify(studioSchedule)],
      ["expectationsJson", JSON.stringify(studioExpectations)],
      ["faqsJson", JSON.stringify(studioFaqs)]
    ]
  };

  mwe.handleHostEventSubmit({
    preventDefault: () => {},
    target: mockForm
  });

  // Verify event was added to platform events
  const allEvents = mwe.getEvents();
  const createdWorkshop = allEvents.find(e => e.title === "Advanced Evangelism & Discipleship Workshop");
  assert.ok(createdWorkshop, "Created workshop should be present in platform events");
  assert.equal(createdWorkshop.isHosted, true, "Workshop should be marked isHosted: true");
  assert.equal(createdWorkshop.isWorkshop, true, "Workshop should be marked isWorkshop: true");
  assert.equal(createdWorkshop.hostId, testHost.id, "Workshop hostId should match logged in host");
  assert.equal(createdWorkshop.ticketPriceCents, 3500, "Price should be 3500 cents ($35)");
  assert.equal(createdWorkshop.admissionType, "paid", "Admission type should be persisted");
  assert.equal(createdWorkshop.priceDollars, 35, "Original price dollars should be persisted");
  assert.equal(createdWorkshop.capacity, 150, "Capacity should be persisted");
  assert.equal(createdWorkshop.totalTickets, 150, "Capacity should also populate public ticket total");
  assert.equal(createdWorkshop.venueName, "King's Sanctuary & Zoom Hub", "Venue name should be persisted for event profile views");
  assert.equal(createdWorkshop.livestreamUrl, "https://zoom.us/j/123456789", "Livestream URL should be available to event profile views");
  assert.equal(createdWorkshop.organizerName, "Kingdom Leadership Network", "Organizer display name should be persisted");
  assert.equal(createdWorkshop.organizerUrl, "https://example.com/kingdom-leadership", "Organizer URL should be persisted");
  assert.equal(createdWorkshop.directionsUrl, "https://maps.example.com/kings-sanctuary", "Directions URL should be persisted");
  assert.equal(createdWorkshop.heroBadgeText, "AUG 2026 • CALGARY • HYBRID", "Hero badge text should be persisted");
  assert.equal(createdWorkshop.aboutTitle, "What leaders will practice", "About section title should be persisted");
  assert.equal(createdWorkshop.aboutIntro, "A focused training day with labs, coaching, and practical next steps.", "About section intro should be persisted");
  assert.equal(JSON.stringify(createdWorkshop.speakers), JSON.stringify(studioSpeakers), "Studio speakers should be persisted for Host & Speakers tab");
  assert.equal(JSON.stringify(createdWorkshop.highlights), JSON.stringify(studioHighlights), "Studio highlight cards should be persisted for hero/detail cards");
  assert.equal(JSON.stringify(createdWorkshop.schedule), JSON.stringify(studioSchedule), "Studio schedule should be persisted for Agenda tab");
  assert.equal(JSON.stringify(createdWorkshop.expectations), JSON.stringify(studioExpectations), "Studio expectations should be persisted for About tab");
  assert.equal(JSON.stringify(createdWorkshop.faqs), JSON.stringify(studioFaqs), "Studio FAQs should be persisted for FAQ tab");

  const expectedStudioFields = Object.fromEntries(mockForm._mockEntries);
  for (const [key, value] of Object.entries(expectedStudioFields)) {
    assert.equal(createdWorkshop.creatorStudioFields?.[key], value, `Creator studio field '${key}' should be retained`);
  }

  // 4. Verify Event Card rendering displays Workshop Badge
  const cardHtml = mwe.createEventCardHtml(createdWorkshop);
  assert.match(cardHtml, /workshop-badge/, "Event card must contain .workshop-badge");
  assert.match(cardHtml, /Kingdom Leadership Network/, "Event card should display host organization name");

  // 5. Host Dashboard inspection
  mwe.openHostDashboard();
  const dashboardModal = documentMock.getElementById("host-dashboard-modal");
  assert.ok(dashboardModal, "Host dashboard modal should be in DOM");
  assert.match(dashboardModal.innerHTML, /Organizer &amp; Workshop Dashboard|Organizer & Workshop Dashboard/, "Dashboard header should be shown");
  assert.match(dashboardModal.innerHTML, /Advanced Evangelism &amp; Discipleship Workshop|Advanced Evangelism & Discipleship Workshop/, "Dashboard should list hosted workshop");

  // 6. Attendee Registration & Roster
  const testRegs = [
    {
      id: "reg-101",
      eventId: createdWorkshop.id,
      fullName: "Michael Chang",
      email: "michael@example.com",
      ticketQuantity: "2",
      amountPaidCents: 7000,
      registrationCode: "REG-777111",
      checkedIn: false,
      createdAt: new Date().toISOString()
    },
    {
      id: "reg-102",
      eventId: createdWorkshop.id,
      fullName: "Rebecca Johnson",
      email: "rebecca@example.com",
      ticketQuantity: "1",
      amountPaidCents: 3500,
      registrationCode: "REG-777222",
      checkedIn: true,
      createdAt: new Date().toISOString()
    }
  ];
  localStorageMock.setItem("mwe.event_registrations", JSON.stringify(testRegs));

  // Open Attendee Roster
  mwe.openEventAttendeeRoster(createdWorkshop.id);
  const rosterModal = documentMock.getElementById("attendee-roster-modal");
  assert.ok(rosterModal, "Attendee roster modal should be in DOM");
  assert.match(rosterModal.innerHTML, /Michael Chang/, "Roster must list attendee Michael Chang");
  assert.match(rosterModal.innerHTML, /Rebecca Johnson/, "Roster must list attendee Rebecca Johnson");
  assert.match(rosterModal.innerHTML, /REG-777111/, "Roster must display registration code");

  // Toggle Check-In status
  mwe.toggleAttendeeCheckIn("reg-101", createdWorkshop.id);
  const updatedRegs = JSON.parse(localStorageMock.getItem("mwe.event_registrations"));
  const reg101 = updatedRegs.find(r => r.id === "reg-101");
  assert.equal(reg101.checkedIn, true, "Attendee reg-101 should now be checked in");

  // Export CSV
  mwe.exportEventAttendeesCSV(createdWorkshop.id);
  assert.match(clipboardText, /Michael Chang/, "CSV export should contain attendee name");
  assert.match(clipboardText, /REG-777111/, "CSV export should contain registration code");

  // 7. Logout Host
  mwe.logoutEventHost();
  assert.equal(mwe.getEventHost(), null, "Host account should be removed upon logout");
});

test("single event seed links survive stale saved event storage", async () => {
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");

  const mockStorage = new Map([
    ["mwe.platform.events.v4", JSON.stringify([
      {
        id: "custom-local-event",
        title: "Custom Local Event",
        startsAt: new Date(Date.now() + 86400000).toISOString()
      }
    ])]
  ]);
  const localStorageMock = {
    getItem: (k) => mockStorage.get(k) || null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
    clear: () => mockStorage.clear()
  };

  const documentMock = {
    documentElement: { dataset: {}, style: {}, setAttribute: () => {}, classList: { add: () => {}, remove: () => {} } },
    body: { dataset: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} }, appendChild: () => {} },
    getElementById: () => null,
    createElement: () => ({ setAttribute: () => {}, addEventListener: () => {}, querySelector: () => null, classList: { add: () => {} } }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  const context = {
    window: {
      location: { hash: "", search: "?id=calgary-awakening-2026", href: "https://mywayofevangelism.com/event-profile.html?id=calgary-awakening-2026" },
      localStorage: localStorageMock,
      setTimeout: () => 1,
      clearTimeout: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    },
    document: documentMock,
    localStorage: localStorageMock,
    navigator: {},
    console,
    URL,
    URLSearchParams,
    createIcons: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    MutationObserver: class { observe() {} },
    MWE: {}
  };

  vm.createContext(context);
  vm.runInContext(appJs, context);
  const mwe = context.window.MWE || context.MWE;

  assert.ok(mwe.getEvent("custom-local-event"), "Saved custom event should still be available");
  assert.ok(mwe.getEvent("calgary-awakening-2026"), "Seeded event links should remain available with stale storage");
});
