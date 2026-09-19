import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import worker from "../src/worker.js";

const projectRoot = path.resolve(".");

test("Database Migration: 0012_church_testimonies.sql defines table and indexes", async () => {
  const sql = await fs.readFile(path.join(projectRoot, "migrations", "0012_church_testimonies.sql"), "utf8");

  assert.match(sql, /create table if not exists church_testimonies/i, "must create church_testimonies table");
  assert.match(sql, /church_id text not null references churches\(id\)/i, "must reference churches table");
  assert.match(sql, /author_name text not null/i, "must have author_name");
  assert.match(sql, /quote text not null/i, "must have quote");
  assert.match(sql, /rating integer not null default 5/i, "must have rating 1-5");
  assert.match(sql, /status text not null default 'approved'/i, "must have status constraint");
  assert.match(sql, /is_featured integer not null default 0/i, "must have is_featured column");
  assert.match(sql, /create index if not exists idx_church_testimonies_lookup/i, "must create lookup index");
});

test("Church Profile HTML: Dynamic testimonials container replaces hardcoded mock cards", async () => {
  const html = await fs.readFile(path.join(projectRoot, "public", "church-profile.html"), "utf8");

  assert.match(html, /id="church-testimonials-container"/, "testimonials container with dynamic ID must exist");
  assert.match(html, /class="btn-share-story"/, "share story button must exist");
  assert.match(html, /MWE\.openSubmitTestimonyModal\(\)/, "share story button must trigger openSubmitTestimonyModal");
  assert.match(html, /id="btn-view-all-stories"/, "view all stories button must exist");
  assert.match(html, /MWE\.openStoriesModal\(\)/, "view all stories must trigger openStoriesModal");

  // Verify hardcoded Sarah M. and Jason L. cards were removed from church-profile.html
  assert.doesNotMatch(html, /Sarah M\./, "hardcoded Sarah M. card must be removed from HTML template");
  assert.doesNotMatch(html, /Jason L\./, "hardcoded Jason L. card must be removed from HTML template");
});

test("App.js: Testimonies methods and dynamic rendering functions defined", async () => {
  const appJs = await fs.readFile(path.join(projectRoot, "public", "app.js"), "utf8");

  assert.match(appJs, /MWE\.renderChurchProfileTestimonies\s*=\s*async\s*function/, "renderChurchProfileTestimonies function must be defined");
  assert.match(appJs, /MWE\.openStoriesModal\s*=\s*async\s*function/, "openStoriesModal function must be defined");
  assert.match(appJs, /MWE\.openSubmitTestimonyModal\s*=\s*function/, "openSubmitTestimonyModal function must be defined");
  assert.match(appJs, /MWE\.getTestimonies\s*=\s*function/, "getTestimonies helper must be defined");
  assert.match(appJs, /MWE\.upsertTestimony\s*=\s*async\s*function/, "upsertTestimony helper must be defined");
  assert.match(appJs, /MWE\.refreshTestimonies\s*=\s*async\s*function/, "refreshTestimonies helper must be defined");
  assert.match(appJs, /MWE\.renderChurchProfileTestimonies\(church\.id\)/, "renderProfile must call renderChurchProfileTestimonies");
});

test("Admin Workspace: Church Testimonies module configured for moderation", async () => {
  const adminModel = await fs.readFile(path.join(projectRoot, "public", "admin-model.js"), "utf8");

  assert.match(adminModel, /testimonies:\s*\{/, "testimonies module must be defined in admin-model.js");
  assert.match(adminModel, /label:\s*"Church Testimonies"/, "module must have Church Testimonies label");
  assert.match(adminModel, /statuses:\s*\["Approved",\s*"Pending",\s*"Rejected"\]/, "module must support moderation statuses");
});

test("Backend API: GET /api/churches/:id/testimonies fails gracefully without DB", async () => {
  const env = { ENVIRONMENT: "test" };
  const res = await worker.fetch(
    new Request("https://example.test/api/churches/demo-church-river-city/testimonies"),
    env
  );
  assert.equal(res.status, 503);
  const data = await res.json();
  assert.equal(data.error, "storage unavailable");
});

test("Backend API: POST /api/churches/:id/testimonies rejects invalid submissions", async () => {
  const mockDb = {
    prepare(query) {
      return {
        bind(...args) {
          return {
            async first() {
              if (query.includes("from churches where id = ?")) {
                return { id: "test-church" };
              }
              return null;
            },
            async all() { return { results: [] }; },
            async run() { return { success: true }; }
          };
        }
      };
    }
  };

  const env = { ENVIRONMENT: "test", DB: mockDb };

  // Short quote (< 10 chars)
  const resShort = await worker.fetch(
    new Request("https://example.test/api/churches/test-church/testimonies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ authorName: "Jane Doe", quote: "Too short" })
    }),
    env
  );
  assert.equal(resShort.status, 400);
  const dataShort = await resShort.json();
  assert.match(dataShort.error, /at least 10 characters/i);

  // Missing author name
  const resNoName = await worker.fetch(
    new Request("https://example.test/api/churches/test-church/testimonies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ authorName: " ", quote: "This is a wonderful church family that loves God." })
    }),
    env
  );
  assert.equal(resNoName.status, 400);
  const dataNoName = await resNoName.json();
  assert.match(dataNoName.error, /provide your name/i);
});

test("Backend API: Creator testimonies endpoints require authentication", async () => {
  const env = { ENVIRONMENT: "test", DB: {} };

  const getRes = await worker.fetch(
    new Request("https://example.test/api/creator/testimonies"),
    env
  );
  assert.equal(getRes.status, 401);

  const putRes = await worker.fetch(
    new Request("https://example.test/api/creator/testimonies/test-1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved" })
    }),
    env
  );
  assert.equal(putRes.status, 401);

  const delRes = await worker.fetch(
    new Request("https://example.test/api/creator/testimonies/test-1", {
      method: "DELETE"
    }),
    env
  );
  assert.equal(delRes.status, 401);
});
