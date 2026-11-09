import { ApiError, readJson } from './security.js';

// Original meditation rooms API recovered from the deployed Worker (live and preview, Nov 2026).
// Custom rooms, shared session state, presence, chat and private reflections.
var SEED_ROOM_IDS = new Set(["room-peace", "room-healing", "room-secret-place", "room-bedtime", "room-psalms", "room-proverbs", "room-gospels", "room-epistles", "room-faith", "room-love", "room-salvation", "room-victory"]);
var SC_URL = /^https:\/\/soundcloud\.com\/[\w.-]+\/[\w.-]+$/;
var ID = /^[a-z0-9][a-z0-9-]{2,100}$/;
var SESSION = /^[A-Za-z0-9_-]{1,40}$/;
var clean = (v, max) => String(v ?? "").replace(/<[^>]*>/g, "").trim().slice(0, max);
async function requireUser(request, env, ctx) {
  const u = await ctx.getSessionUser(request, env);
  if (!u) throw new ApiError(401, "Sign in required.");
  return u;
}
async function roomExists(env, id) {
  if (!ID.test(id)) return false;
  if (SEED_ROOM_IDS.has(id)) return true;
  if (id.startsWith("room-custom-")) return !!await env.DB.prepare("select id from meditation_rooms where id=?").bind(id).first();
  return !!await env.DB.prepare("select id from platform_entities where id=? and kind='meditation' and state='published'").bind(id).first();
}
var HOST_IDLE_MS = 6 * 60 * 60 * 1e3;
async function playbackHost(env, roomId, sessionId, user, nowMs) {
  if (roomId.startsWith("room-custom-")) {
    const room = await env.DB.prepare("select created_by from meditation_rooms where id=?").bind(roomId).first();
    return !!room && room.created_by === user.id;
  }
  if (!SEED_ROOM_IDS.has(roomId)) {
    const entity = await env.DB.prepare("select e.tenant_id,t.owner_user_id from platform_entities e join tenants t on t.id=e.tenant_id where e.id=? and e.kind='meditation'").bind(roomId).first();
    if (!entity) return false;
    if (entity.owner_user_id === user.id) return true;
    return !!await env.DB.prepare("select role from tenant_memberships where tenant_id=? and user_id=?").bind(entity.tenant_id, user.id).first();
  }
  await env.DB.prepare("insert or ignore into meditation_session_hosts (room_id,session_id,user_id,claimed_at_ms) values (?,?,?,?)").bind(roomId, sessionId, user.id, nowMs).run();
  const host = await env.DB.prepare("select h.user_id,h.claimed_at_ms,s.updated_at_ms from meditation_session_hosts h left join meditation_session_state s on s.room_id=h.room_id and s.session_id=h.session_id where h.room_id=? and h.session_id=?").bind(roomId, sessionId).first();
  if (!host) return false;
  if (host.user_id === user.id) return true;
  const lastActive = Math.max(Number(host.claimed_at_ms || 0), Number(host.updated_at_ms || 0));
  if (nowMs - lastActive < HOST_IDLE_MS) return false;
  const taken = await env.DB.prepare("update meditation_session_hosts set user_id=?,claimed_at_ms=? where room_id=? and session_id=? and user_id=? and claimed_at_ms=?").bind(user.id, nowMs, roomId, sessionId, host.user_id, host.claimed_at_ms).run();
  return Number(taken?.meta?.changes || 0) > 0;
}
function stateRow(row) {
  if (!row) return { trackUrl: "", playing: false, positionSec: 0, updatedAtMs: 0, startedAt: null };
  return { trackUrl: row.track_url, playing: !!row.playing, positionSec: row.position_sec, updatedAtMs: row.updated_at_ms, startedAt: row.started_at };
}
function sanitizeRoom(input) {
  const title = clean(input.title, 120), subtitle = clean(input.subtitle, 240);
  if (!title || !subtitle) throw new ApiError(400, "Add a title and a short description.");
  const pick = (v, list, d) => list.includes(v) ? v : d;
  const verses = (Array.isArray(input.verses) ? input.verses : []).slice(0, 12).map((v) => ({ topic: clean(v?.topic, 80), text: clean(v?.text, 600), ref: clean(v?.ref, 80) })).filter((v) => v.text);
  if (!verses.length) throw new ApiError(400, "Add at least one scripture passage.");
  const amb = input.ambience || {};
  const n = (v, lo, hi, d) => {
    const x = Number(v);
    return Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : d;
  };
  const sc = input.soundcloud && SC_URL.test(String(input.soundcloud.url || "")) ? { url: input.soundcloud.url, kind: "track", title: clean(input.soundcloud.title, 200), author: clean(input.soundcloud.author, 120), artworkUrl: /^https:\/\/i\d\.sndcdn\.com\//.test(String(input.soundcloud.artworkUrl || "")) ? input.soundcloud.artworkUrl : "" } : null;
  return {
    title,
    subtitle,
    category: pick(input.category, ["featured", "bible-books", "themes", "community"], "community"),
    theme: pick(input.theme, ["chapel", "mountains", "stars", "stream", "deepdark"], "chapel"),
    template: pick(input.template, ["timer", "ripple", "journey", "nature", "sunburst", "scripture"], "timer"),
    purpose: clean(input.purpose, 40) || "prayer",
    mode: pick(input.mode, ["light", "dark"], "light"),
    timeMode: pick(input.timeMode, ["timed", "loop"], "timed"),
    durationMinutes: n(input.durationMinutes, 1, 240, 20),
    themeColor: /^#[0-9a-f]{6}$/i.test(String(input.themeColor || "")) ? input.themeColor : "",
    themeHue: n(input.themeHue, 0, 360, 100),
    autoPlayInterval: n(input.autoPlayInterval, 0, 3600, 0),
    allowUserNavigation: input.allowUserNavigation !== false,
    ambience: { rain: n(amb.rain, 0, 100, 0), stream: n(amb.stream, 0, 100, 0), fire: n(amb.fire, 0, 100, 0), breeze: n(amb.breeze, 0, 100, 0) },
    commentsEnabled: true,
    verses,
    soundcloud: sc
  };
}
export async function handleMeditationRoomsApi(request, env, ctx) {
  const url = new URL(request.url), path = url.pathname.replace(/\/+$/, "");
  if (!path.startsWith("/api/meditation/rooms")) return null;
  const json = ctx.json, parts = path.split("/").slice(4);
  if (!parts.length) {
    if (request.method === "GET") {
      const { results } = await env.DB.prepare("select r.id,r.data_json,r.created_at,u.name from meditation_rooms r join users u on u.id=r.created_by order by r.created_at desc limit 200").all();
      return json({ ok: true, rooms: (results || []).map((r) => ({ ...JSON.parse(r.data_json), id: r.id, ownerName: r.name, createdAt: r.created_at, serverRoom: true })) });
    }
    if (request.method === "POST") {
      const user = await requireUser(request, env, ctx), data = sanitizeRoom(await readJson(request));
      const id = "room-custom-" + crypto.randomUUID(), now = (new Date()).toISOString();
      await env.DB.prepare("insert into meditation_rooms (id,created_by,data_json,created_at) values (?,?,?,?)").bind(id, user.id, JSON.stringify(data), now).run();
      return json({ ok: true, room: { ...data, id, ownerName: user.name, createdAt: now, serverRoom: true, isMine: true } }, 201);
    }
    throw new ApiError(405, "Method not allowed.");
  }
  const roomId = parts[0];
  if (!await roomExists(env, roomId)) throw new ApiError(404, "Meditation room not found.");
  if (parts[1] === "reflections" && parts.length === 2) {
    const viewer = await ctx.getSessionUser(request, env);
    if (request.method === "GET") {
      if (!viewer) return json({ ok: true, signedIn: false, reflections: [] });
      const { results } = await env.DB.prepare("select id,body,bookmarked,session_id,created_at from meditation_reflections where user_id=? and room_id=? order by created_at desc limit 50").bind(viewer.id, roomId).all();
      return json({ ok: true, signedIn: true, reflections: (results || []).map((r) => ({ id: r.id, body: r.body, bookmarked: !!r.bookmarked, sessionId: r.session_id, createdAt: r.created_at })) });
    }
    if (request.method === "POST") {
      const user = viewer || await requireUser(request, env, ctx), input = await readJson(request), body = clean(input.body, 2e3);
      if (!body) throw new ApiError(400, "Write a reflection before saving.");
      const sid = SESSION.test(String(input.sessionId || "")) ? input.sessionId : null, id = crypto.randomUUID(), now = (new Date()).toISOString();
      await env.DB.prepare("insert into meditation_reflections (id,room_id,session_id,user_id,body,bookmarked,created_at) values (?,?,?,?,?,?,?)").bind(id, roomId, sid, user.id, body, input.bookmarked === false ? 0 : 1, now).run();
      return json({ ok: true, reflection: { id, body, bookmarked: input.bookmarked !== false, sessionId: sid, createdAt: now } }, 201);
    }
    throw new ApiError(405, "Method not allowed.");
  }
  if (parts[1] !== "sessions" || !SESSION.test(parts[2] || "")) throw new ApiError(404, "Not found.");
  const sid = parts[2], sub = parts[3] || "";
  if (sub === "") {
    if (request.method === "GET") {
      const nowMs = Date.now(), client = String(url.searchParams.get("client") || "");
      if (/^[A-Za-z0-9_-]{6,40}$/.test(client)) {
        await env.DB.batch([
          env.DB.prepare("insert into meditation_session_presence (room_id,session_id,client_id,seen_at_ms) values (?,?,?,?) on conflict(room_id,session_id,client_id) do update set seen_at_ms=excluded.seen_at_ms").bind(roomId, sid, client, nowMs),
          env.DB.prepare("delete from meditation_session_presence where room_id=? and session_id=? and seen_at_ms<?").bind(roomId, sid, nowMs - 6e4)
        ]);
      }
      const row = await env.DB.prepare("select * from meditation_session_state where room_id=? and session_id=?").bind(roomId, sid).first();
      const p = await env.DB.prepare("select count(*) as n from meditation_session_presence where room_id=? and session_id=? and seen_at_ms>=?").bind(roomId, sid, nowMs - 15e3).first();
      return json({ ok: true, serverNowMs: nowMs, state: stateRow(row), participants: Math.max(1, Number(p?.n || 0)) });
    }
    if (request.method === "POST") {
      const user = await requireUser(request, env, ctx), input = await readJson(request), nowMs = Date.now();
      if (!await playbackHost(env, roomId, sid, user, nowMs)) throw new ApiError(403, "Only the room host can control playback for everyone.");
      const trackUrl = SC_URL.test(String(input.trackUrl || "")) ? input.trackUrl : "";
      const position = Math.max(0, Math.min(36e3, Number(input.positionSec) || 0)), playing = input.playing === true;
      const prev = await env.DB.prepare("select started_at from meditation_session_state where room_id=? and session_id=?").bind(roomId, sid).first();
      const startedAt = input.restart ? playing ? (new Date()).toISOString() : null : prev?.started_at || (playing ? (new Date()).toISOString() : null);
      await env.DB.prepare(`insert into meditation_session_state (room_id,session_id,track_url,playing,position_sec,started_at,updated_at_ms,updated_by) values (?,?,?,?,?,?,?,?)
        on conflict(room_id,session_id) do update set track_url=excluded.track_url,playing=excluded.playing,position_sec=excluded.position_sec,started_at=excluded.started_at,updated_at_ms=excluded.updated_at_ms,updated_by=excluded.updated_by`).bind(roomId, sid, trackUrl, Number(playing), position, startedAt, nowMs, user.id).run();
      return json({ ok: true, serverNowMs: nowMs, state: { trackUrl, playing, positionSec: position, updatedAtMs: nowMs, startedAt } });
    }
    throw new ApiError(405, "Method not allowed.");
  }
  if (sub === "chat" && parts.length === 4) {
    const viewer = await ctx.getSessionUser(request, env);
    if (request.method === "GET") {
      const { results } = await env.DB.prepare(`select c.id,c.user_id,c.body,c.created_at,u.name from meditation_session_chat c join users u on u.id=c.user_id
        where c.room_id=? and c.session_id=? order by c.created_at desc limit 100`).bind(roomId, sid).all();
      return json({ ok: true, signedIn: !!viewer, messages: (results || []).reverse().map((r) => ({ id: r.id, name: r.name, body: r.body, createdAt: r.created_at, own: r.user_id === viewer?.id })) });
    }
    if (request.method === "POST") {
      const user = viewer || await requireUser(request, env, ctx), body = clean((await readJson(request)).body, 300);
      if (!body) throw new ApiError(400, "Messages must be between 1 and 300 characters.");
      const id = crypto.randomUUID(), now = (new Date()).toISOString();
      await env.DB.prepare("insert into meditation_session_chat (id,room_id,session_id,user_id,body,created_at) values (?,?,?,?,?,?)").bind(id, roomId, sid, user.id, body, now).run();
      return json({ ok: true, message: { id, name: user.name, body, createdAt: now, own: true } }, 201);
    }
    throw new ApiError(405, "Method not allowed.");
  }
  throw new ApiError(404, "Not found.");
}
