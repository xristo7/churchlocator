import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { randomUUID } from "node:crypto";

const read = name => readFile(new URL("../public/" + name, import.meta.url), "utf8");
async function setup(creator = false, storage = new Map()) {
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  };
  const window = {};
  const context = vm.createContext({
    window, localStorage, console, URL, Date, crypto: { randomUUID },
    document: { body: { hasAttribute: name => name === "data-admin-workspace" || (creator && name === "data-creator-workspace"), classList: { add() {} } } }
  });
  const app = await read("app.js");
  vm.runInContext(app.slice(app.indexOf("const MWE = (() => {"), app.indexOf("window.MWE = MWE;")) + "\nwindow.MWE = MWE;", context);
  for (const file of ["platform-modules.js", "meditation.js", "admin-model.js", "creator-data.js"]) vm.runInContext(await read(file), context);
  if (creator) window.MWECreator.setAccount("Test Creator", "creator@example.test");
  vm.runInContext(await read("creator-model.js"), context);
  return { ...window, storage, context };
}
function formValues(mod, record = {}) {
  const values = { ...mod.defaults(), ...(mod.flatten ? mod.flatten(record) : record) };
  return Object.fromEntries(mod.groups().flatMap(g => g.fields).map(f => [f.key, String(values[f.key] ?? (f.type === "select" ? (Array.isArray(f.options?.[0]) ? f.options[0][0] : f.options?.[0]) ?? "" : ""))]));
}

test("owner and creator share six modules, with products nested under stores", async () => {
  const { MWEAdmin } = await setup();
  assert.deepEqual(Object.keys(MWEAdmin.modules).filter(k => !MWEAdmin.modules[k].auxiliary).sort(), ["channels", "churches", "events", "meditation", "resources", "store"]);
  assert.equal(MWEAdmin.modules.products.auxiliary, true);
});

test("search and verification filters are applied together", async () => {
  const { MWEAdmin } = await setup();
  const rows = MWEAdmin.filterRows("churches", { query: "Edmonton", status: "Verified" });
  assert.ok(rows.length);
  assert.ok(rows.every(r => r.city === "Edmonton" && r.verified));
  assert.equal(MWEAdmin.filterRows("churches", { query: "no-such-church" }).length, 0);
});

test("legacy seed timestamps do not prevent editing, but real concurrent edits do", async () => {
  const { MWEAdmin } = await setup();
  const a = { id: "one", name: "Church", createdAt: "2026-01-01" };
  assert.equal(MWEAdmin.sameRecord(a, { ...a, createdAt: "2026-01-02" }), true);
  assert.equal(MWEAdmin.sameRecord(a, { ...a, name: "Other church" }), false);
  assert.equal(MWEAdmin.sameRecord(a, null), false);
});

test("church edits retain location, ownership, existing content and livestream settings", async () => {
  const { MWEAdmin, MWE } = await setup();
  const mod = MWEAdmin.modules.churches;
  const original = { ...mod.get()[0], createdBy: "local:owner@example.test", updatedAt: "2026-09-04T00:00:00Z" };
  const data = formValues(mod, original);
  data.name = "Updated Church";
  const saved = mod.save(original, MWEAdmin.valuesFromEntries("churches", data));
  const loaded = MWE.getChurch(saved.id);
  assert.equal(loaded.name, "Updated Church");
  assert.equal(loaded.createdBy, original.createdBy);
  assert.equal(loaded.location, original.location);
  assert.equal(loaded.updatedAt, original.updatedAt);
  assert.deepEqual(loaded.schedule, original.schedule);
});

test("meditation editor shares the sanctuary catalog and preserves all audio tracks", async () => {
  const { MWEAdmin, MWEMeditation } = await setup();
  const mod = MWEAdmin.modules.meditation;
  const original = mod.get()[0];
  const values = formValues(mod, original);
  values.title = "Updated meditation room";
  const saved = mod.save(original, MWEAdmin.valuesFromEntries("meditation", values));
  assert.equal(MWEMeditation.getRooms()[0].title, values.title);
  assert.deepEqual(saved.audioTracks, original.audioTracks);
  assert.throws(() => mod.save(saved, { ...MWEAdmin.valuesFromEntries("meditation", values), scriptures: "Missing separators" }), /Each scripture/);
});

test("invalid URLs and negative inventory fail validation", async () => {
  const { MWEAdmin } = await setup();
  const mod = MWEAdmin.modules.products;
  const values = formValues(mod, mod.get()[0]);
  assert.throws(() => MWEAdmin.valuesFromEntries("products", { ...values, image: "javascript:alert(1)" }), /http/);
  assert.throws(() => MWEAdmin.valuesFromEntries("products", { ...values, inventory: "-1" }), /zero or greater/);
  assert.throws(() => MWEAdmin.valuesFromEntries("products", { ...values, inventory: "1.5" }), /whole number/);
});

test("events reject reversed dates and permit an independent event", async () => {
  const { MWEAdmin } = await setup();
  const mod = MWEAdmin.modules.events;
  const original = mod.get()[0];
  const values = MWEAdmin.valuesFromEntries("events", formValues(mod, original));
  assert.throws(() => mod.save(original, { ...values, endsAt: values.startsAt }), /end must be after/);
  const saved = mod.save({ id: "personal-event", ownerName: "Creator" }, { ...values, churchId: "" });
  assert.equal(saved.churchId, "");
  assert.equal(mod.owner(saved), "Creator");
});

test("paid resources require a positive price and compatible file format", async () => {
  const { MWEAdmin } = await setup();
  const mod = MWEAdmin.modules.resources;
  const original = mod.get()[0];
  const values = MWEAdmin.valuesFromEntries("resources", formValues(mod, original));
  assert.throws(() => mod.save(original, { ...values, access: "Paid", price: 0 }), /above zero/);
  assert.throws(() => mod.save(original, { ...values, type: "Audio", format: "PDF" }), /matches the content/);
  assert.throws(() => mod.save({ id: "new-resource" }, { ...values, sourceUrl: "" }), /resource material/);
});

test("tenant cannot see sample records or edit another account's record", async () => {
  const { MWEAdmin, MWE } = await setup(true);
  assert.equal(MWEAdmin.modules.churches.get().length, 0);
  assert.equal(MWEAdmin.modules.channels.get().length, 0);
  const sample = MWE.getChurches()[0];
  assert.throws(() => MWEAdmin.modules.churches.save(sample, {}), /own records/);
});

test("tenant creation forces pending verification and does not grant owner access", async () => {
  const { MWEAdmin, MWECreator, storage } = await setup(true);
  const mod = MWEAdmin.modules.channels;
  const saved = mod.save({ id: "new-channel" }, { name: "My channel", handle: "@new-channel", live: "false", verified: true, owner: "Test" });
  assert.equal(saved.verified, false);
  assert.equal(saved.createdBy, MWECreator.account().id);
  assert.equal(mod.get().length, 1);
  assert.equal(storage.has("mwe.session.owner.v1"), false);
  assert.ok(!mod.groups().flatMap(g => g.fields).some(f => f.key === "verified"));
});

test("all six creation adapters save to their shared collections and survive reload", async () => {
  const env = await setup(true);
  const { modules } = env.MWEAdmin;
  modules.churches.save({ id: "my-church" }, { name: "My Church", city: "London", country: "UK", location: "Test address", ministries: "", streamEnabled: false, streamPaid: false, streamUrl: "", verified: true });
  modules.channels.save({ id: "my-channel" }, { name: "My channel", handle: "@my-channel", live: "false" });
  modules.meditation.save({ id: "my-room" }, { title: "My room", category: "featured", theme: "chapel", toneFreq: 432, scriptures: "Peace | Test scripture | Reference" });
  modules.events.save({ id: "my-event" }, { title: "My event", churchId: "", startsAt: "2027-01-01T10:00", endsAt: "2027-01-01T11:00" });
  modules.store.save({ id: "my-store" }, { name: "My store", live: "false" });
  modules.resources.save({ id: "my-resource" }, { title: "My resource", type: "Text", format: "PDF", access: "Free", price: 0, sourceUrl: "https://example.test/study.pdf" });
  for (const key of ["churches", "channels", "meditation", "events", "store", "resources"]) assert.equal(modules[key].get().length, 1, key);
  const reloaded = await setup(true, env.storage);
  for (const key of ["churches", "channels", "meditation", "events", "store", "resources"]) assert.equal(reloaded.MWEAdmin.modules[key].get().length, 1, key);
  assert.equal(reloaded.MWEAdmin.modules.churches.get()[0].verified, false);

  // Owner moderation and public readers must observe the same records without
  // changing the original creator's ownership.
  const owner = await setup(false, env.storage);
  const publicReaders = {
    churches: () => owner.MWE.getChurches(),
    channels: () => owner.FaithLinkModules.getChannels(),
    meditation: () => owner.MWEMeditation.getRooms(),
    events: () => owner.MWE.getEvents(),
    store: () => owner.MWECreator.getStores(),
    resources: () => owner.FaithLinkModules.getResources()
  };
  for (const key of Object.keys(publicReaders)) {
    const created = modules[key].get()[0];
    const ownerModule = owner.MWEAdmin.modules[key];
    const record = ownerModule.get().find(r => r.id === created.id);
    assert.ok(record, key + " visible to owner");
    assert.ok(publicReaders[key]().some(r => r.id === created.id), key + " visible to public reader");
    const entries = formValues(ownerModule, record);
    for (const field of ownerModule.groups().flatMap(g => g.fields)) {
      if (field.required && !entries[field.key]) {
        entries[field.key] = field.type === "email" ? "creator@example.test" : field.type === "url" ? "https://example.test/cover.jpg" : "Test " + field.label;
      }
    }
    const values = owner.MWEAdmin.valuesFromEntries(key, entries);
    const titleField = ["churches", "channels", "store"].includes(key) ? "name" : "title";
    values[titleField] = "Owner reviewed " + key;
    ownerModule.save(record, values);
    const creatorRecord = reloaded.MWEAdmin.modules[key].get().find(r => r.id === created.id);
    assert.equal(creatorRecord[titleField], values[titleField], key + " owner edit returns to creator");
    assert.equal(creatorRecord.createdBy, created.createdBy);
    assert.equal(publicReaders[key]().find(r => r.id === created.id)[titleField], values[titleField]);
  }
  owner.MWECreator.setAccount("Other Creator", "other@example.test");
  for (const key of Object.keys(publicReaders)) assert.equal(reloaded.MWEAdmin.modules[key].get().length, 0, key + " hidden from another creator");
  const differentBrowser = await setup(false);
  for (const key of Object.keys(publicReaders)) {
    assert.ok(!differentBrowser.MWEAdmin.modules[key].get().some(r => r.createdBy === "local:creator@example.test"), key + " is not server-published");
  }
});

test("store and channel live toggles require HTTPS broadcast links", async () => {
  const { MWEAdmin, MWECreator } = await setup(true);
  const stores = MWEAdmin.modules.store;
  assert.throws(() => stores.save({ id: "shop" }, { name: "Shop", live: "true", liveUrl: "" }), /HTTPS/);
  stores.save({ id: "shop" }, { name: "Shop", live: "true", liveUrl: "https://www.youtube.com/watch?v=abcdefghijk" });
  assert.equal(MWECreator.broadcasts().filter(s => s.type === "store").length, 1);
  stores.save(stores.get()[0], { name: "Shop", live: "false", liveUrl: "https://www.youtube.com/watch?v=abcdefghijk" });
  assert.equal(MWECreator.broadcasts().filter(s => s.type === "store").length, 0);
  assert.throws(() => MWEAdmin.modules.channels.save({ id: "channel" }, { name: "Channel", handle: "@test", live: "true", liveUrl: "javascript:alert(1)" }), /HTTPS/);
});

test("products belong to the creator's store and preserve independent product fields", async () => {
  const { MWEAdmin } = await setup(true);
  MWEAdmin.modules.store.save({ id: "shop" }, { name: "My Shop", live: "false" });
  const product = MWEAdmin.modules.products.save({ id: "product" }, { title: "Book", storeId: "shop", price: 10, inventory: 5 });
  assert.equal(product.seller, "My Shop");
  assert.equal(product.storeId, "shop");
  assert.throws(() => MWEAdmin.modules.products.save({ id: "other" }, { title: "Book", storeId: "" }), /own store/);
});

test("storage errors surface rather than silently reporting saved content", async () => {
  const { MWEAdmin, context } = await setup();
  context.localStorage.setItem = () => { throw new Error("Quota exceeded"); };
  assert.throws(() => MWEAdmin.modules.store.save({ id: "x" }, { name: "Store", live: false }), /Quota/);
});

test("account-first page never persists passwords and supports a personal account", async () => {
  const { MWECreator, storage } = await setup();
  MWECreator.setAccount("Person", " PERSON@example.test ");
  assert.equal(MWECreator.account().id, "local:person@example.test");
  assert.ok(![...storage.keys()].some(k => /password/i.test(k)));
  const html = await read("creator-workspace.html");
  assert.match(html, /No church or organization is required/);
  assert.match(html, /data-creator-account-form/);
  assert.doesNotMatch(html, /data-auth-app="owner"/);
});

test("creator workspace accepts only the matching public account session", async () => {
  const source = await read("creator-account.js");
  assert.match(source, /publicEmail === accountEmail/);
  assert.match(source, /document\.body\.classList\.toggle\("is-authenticated", hasMatchingSession\)/);
  assert.match(source, /localStorage\.removeItem\("mwe\.session\.church\.v1"\)/);
  assert.doesNotMatch(source, /password[^\n]*localStorage\.setItem/);
});

test("dropdowns and live popup modals have elevated stacking context to prevent obstruction", async () => {
  const adminCss = await read("admin-workspace.css");
  const stylesCss = await read("styles.css");
  const responsiveCss = await read("responsive.css");
  const appJs = await read("app.js");

  // Verify headers elevate to 100000 when active popover is present
  assert.match(adminCss, /\.admin-workspace \.aw-topbar\.has-active-popover[\s\S]*z-index:\s*100000!important/);
  assert.match(adminCss, /\.admin-workspace \.theme-palette-popover[\s\S]*z-index:\s*100000!important/);
  assert.match(stylesCss, /\.topbar\.has-active-popover[\s\S]*z-index:\s*100000 !important/);
  assert.match(stylesCss, /\.theme-palette-popover[\s\S]*z-index:\s*100000 !important/);
  assert.match(stylesCss, /\.lang-selector-panel[\s\S]*z-index:\s*100000 !important/);
  assert.match(responsiveCss, /\.theme-palette-popover[\s\S]*z-index:\s*100000 !important/);

  // Verify site-search-bar and filter trays do not obstruct popovers
  assert.match(stylesCss, /\.site-search-bar\.has-open-dropdown[\s\S]*z-index:\s*500 !important/);
  assert.match(stylesCss, /\.site-search-bar \.custom-options-panel[\s\S]*z-index:\s*10001 !important/);
  assert.match(stylesCss, /\.custom-select-container\.open[\s\S]*z-index:\s*10000 !important/);

  // Verify app.js toggles has-active-popover and has-open-dropdown classes
  assert.match(appJs, /classList\.toggle\("has-active-popover"/);
  assert.match(appJs, /classList\.add\("has-open-dropdown"\)/);
});

