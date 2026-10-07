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
      ["admissionType", "paid"],
      ["priceDollars", "35"],
      ["capacity", "150"],
      ["coverImageUrl", "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80"],
      ["description", "Intensive masterclass on modern outreach methods and mentorship."],
      ["highlight1", "Strategic discipleship frameworks"],
      ["highlight2", "Interactive media workshop"],
      ["highlight3", "Official workshop certification"]
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
