// Scheduled "play as live" church livestreams (simulated live).
// Owner routes live under /api/churches/:churchId/simulated-live, public state under
// /api/churches/:churchId/now-playing and /api/simulated-live/now-playing, platform
// moderation under /api/admin/simulated-live.
import { ApiError, readJson } from './security.js';
import { isOwner } from './trusted-platform.js';

const MINUTE = 60000, DAY = 86400000, WEEK = 7 * DAY;
export const OVERLAP_HORIZON_MS = 12 * WEEK;
export const UPCOMING_HORIZON_MS = 7 * DAY;
export const ENDED_GRACE_MS = 30 * MINUTE;
export const MAX_DURATION_SECONDS = 12 * 3600;
export const MAX_LOOP_WINDOW_MINUTES = 24 * 60;
const MAX_SLOTS = 50;
const MAX_BATCH_CHURCHES = 50;
export const MAX_VIDEO_BYTES = 95 * 1024 * 1024;
export const MAX_MULTIPART_BYTES = 2 * 1024 * 1024 * 1024;
const DEFAULT_PART_BYTES = 50 * 1024 * 1024;
const MAX_CONFLICTS = 100;
const DEFAULT_TIMEZONE = 'Africa/Kampala';
const OWN_VIDEO = /^\/media\/church-video\/[0-9a-f-]{36}\.mp4$/;
const OWN_POSTER = /^\/media\/(creator-media|church-video)\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif)$/;
const VIDEO_KEY = /^church-video\/[0-9a-f-]{36}\.mp4$/;
const LOCAL_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const VIDEO_CACHE = 'public, max-age=31536000, immutable';

export class SimulatedLiveError extends Error {
  constructor(code, message, extra = {}) { super(message); this.name = 'SimulatedLiveError'; this.code = code; this.extra = extra; }
}
const fail = (code, message, extra) => { throw new SimulatedLiveError(code, message, extra); };

// --- Time zones (Intl only, DST-safe) -------------------------------------
const formatters = new Map();
function formatter(timeZone) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    formatters.set(timeZone, f);
  }
  return f;
}
export function isValidTimezone(timeZone) {
  if (typeof timeZone !== 'string' || !timeZone || timeZone.length > 64) return false;
  try { formatter(timeZone); return true; } catch { return false; }
}
export function zonedParts(ms, timeZone) {
  const p = {};
  for (const { type, value } of formatter(timeZone).formatToParts(new Date(ms))) p[type] = value;
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour % 24, minute: +p.minute, second: +p.second };
}
function tzOffset(ms, timeZone) {
  const p = zonedParts(ms, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}
// Wall-clock time in `timeZone` -> UTC epoch ms. Ambiguous (fall-back) times resolve to the
// first occurrence; non-existent (spring-forward) times shift forward by the gap.
export function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = tzOffset(guess, timeZone);
  let result = guess - first;
  const second = tzOffset(result, timeZone);
  if (second !== first) {
    const alternative = guess - second;
    if (tzOffset(alternative, timeZone) === second) result = alternative;
  }
  return result;
}

// --- Schedule expansion ----------------------------------------------------
export function playWindowMs(stream) {
  return stream.playMode === 'loop' ? Number(stream.loopWindowMinutes) * MINUTE : Number(stream.durationSeconds) * 1000;
}
const pad = n => String(n).padStart(2, '0');
const iso = ms => new Date(ms).toISOString();
// Plays [{startsAt, endsAt}] (epoch ms) of one slot whose window intersects (fromMs, toMs).
export function expandSlot(slot, stream, fromMs, toMs) {
  const windowMs = playWindowMs(stream), plays = [];
  if (slot.kind === 'once') {
    const start = Date.parse(slot.startsAt);
    if (Number.isFinite(start) && start < toMs && start + windowMs > fromMs) plays.push({ startsAt: start, endsAt: start + windowMs });
    return plays;
  }
  if (slot.kind !== 'weekly' || !Number.isFinite(toMs)) return plays;
  const [hour, minute] = String(slot.localTime).split(':').map(Number);
  const a = zonedParts(fromMs - windowMs - DAY, stream.timezone), b = zonedParts(toMs + DAY, stream.timezone);
  for (let day = Date.UTC(a.year, a.month - 1, a.day), last = Date.UTC(b.year, b.month - 1, b.day); day <= last; day += DAY) {
    const date = new Date(day);
    if (date.getUTCDay() !== Number(slot.weekday)) continue;
    const y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, d = date.getUTCDate(), localDate = `${y}-${pad(m)}-${pad(d)}`;
    if (slot.activeFrom && localDate < slot.activeFrom) continue;
    if (slot.activeUntil && localDate > slot.activeUntil) continue;
    const start = zonedTimeToUtc(y, m, d, hour, minute, stream.timezone);
    if (start < toMs && start + windowMs > fromMs) plays.push({ startsAt: start, endsAt: start + windowMs });
  }
  return plays;
}
// All plays of a stream; each play carries slotId (saved slot) or slotIndex (request slot).
export function streamPlays(stream, slots, fromMs, toMs) {
  const plays = [];
  slots.forEach((slot, index) => {
    for (const play of expandSlot(slot, stream, fromMs, toMs)) {
      plays.push({ ...play, stream, slotId: slot.id ?? null, ...(slot.id ? {} : { slotIndex: slot.slotIndex ?? index }) });
    }
  });
  return plays.sort((x, y) => x.startsAt - y.startsAt);
}
// Next `count` plays whose window has not ended yet (a currently running play is included).
export function upcomingPlays(stream, slots, nowMs, count) {
  for (const horizon of [OVERLAP_HORIZON_MS, 53 * WEEK]) {
    const plays = streamPlays(stream, slots, nowMs, nowMs + horizon).filter(p => p.endsAt > nowMs);
    if (plays.length >= count || horizon > OVERLAP_HORIZON_MS) {
      const once = slots.some(s => s.kind === 'once') ? streamPlays(stream, slots.filter(s => s.kind === 'once'), nowMs + horizon, Infinity) : [];
      const seen = new Set(plays.map(p => p.startsAt + ':' + (p.slotId ?? p.slotIndex)));
      return [...plays, ...once.filter(p => !seen.has(p.startsAt + ':' + (p.slotId ?? p.slotIndex)))]
        .sort((x, y) => x.startsAt - y.startsAt).slice(0, count)
        .map(p => ({ startsAt: iso(p.startsAt), endsAt: iso(p.endsAt), slotId: p.slotId }));
    }
  }
  return [];
}

// Conflicts between candidate plays and existing plays, and among candidates themselves.
export function findConflicts(candidates, existing) {
  const conflicts = [];
  const describe = (play, other) => ({
    startsAt: iso(play.startsAt), endsAt: iso(play.endsAt),
    ...(play.slotId ? { slotId: play.slotId } : { slotIndex: play.slotIndex }),
    conflictsWith: { streamId: other.stream.id ?? null, streamTitle: other.stream.title, slotId: other.slotId ?? null, ...(other.slotId ? {} : { slotIndex: other.slotIndex }), startsAt: iso(other.startsAt) }
  });
  const overlaps = (a, b) => a.startsAt < b.endsAt && b.startsAt < a.endsAt;
  for (let i = 0; i < candidates.length && conflicts.length < MAX_CONFLICTS; i += 1) {
    const play = candidates[i];
    for (const other of existing) if (overlaps(play, other)) { conflicts.push(describe(play, other)); if (conflicts.length >= MAX_CONFLICTS) break; }
    for (let j = i + 1; j < candidates.length && conflicts.length < MAX_CONFLICTS; j += 1) if (overlaps(play, candidates[j])) conflicts.push(describe(play, candidates[j]));
  }
  return conflicts;
}

// --- Now playing -------------------------------------------------------------
// Priority: live > ended within 30 min > upcoming within 7 days > none.
export function computeNowPlaying(streams, nowMs) {
  const plays = [];
  for (const stream of streams) {
    if (stream.status !== 'active') continue;
    plays.push(...streamPlays(stream, stream.slots || [], nowMs - ENDED_GRACE_MS, nowMs + UPCOMING_HORIZON_MS));
  }
  plays.sort((x, y) => x.startsAt - y.startsAt);
  let live = null, ended = null, next = null;
  for (const play of plays) {
    if (play.startsAt <= nowMs && nowMs < play.endsAt) { if (!live || play.startsAt > live.startsAt) live = play; }
    else if (play.endsAt <= nowMs) { if (!ended || play.endsAt > ended.endsAt) ended = play; }
    else if (!next) next = play;
  }
  const current = live || ended || next;
  const state = live ? 'live' : ended ? 'ended' : next ? 'upcoming' : 'none';
  let offsetSeconds = 0, loopIteration = 0;
  if (live) {
    const elapsed = (nowMs - live.startsAt) / 1000, duration = Number(live.stream.durationSeconds);
    if (live.stream.playMode === 'loop') { loopIteration = Math.floor(elapsed / duration); offsetSeconds = elapsed - loopIteration * duration; }
    else offsetSeconds = elapsed;
  }
  const s = current?.stream;
  return {
    state,
    stream: s ? { id: s.id, title: s.title, videoUrl: s.videoUrl, durationSeconds: s.durationSeconds, playMode: s.playMode, timezone: s.timezone } : null,
    timezone: s?.timezone || null,
    poster: s?.posterUrl || null,
    slotId: (live || ended) ? current.slotId : null,
    play: current ? { startsAt: iso(current.startsAt), endsAt: iso(current.endsAt), slotId: current.slotId } : null,
    offsetSeconds,
    loopIteration,
    nextPlay: next ? { startsAt: iso(next.startsAt), slotId: next.slotId, title: next.stream.title } : null
  };
}

// --- Validation --------------------------------------------------------------
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number), date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}
export function classifyVideoUrl(value) {
  const url = String(value || '').trim();
  if (OWN_VIDEO.test(url)) return { url, source: 'upload' };
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && !parsed.username && !parsed.password && /\.mp4$/i.test(parsed.pathname)) return { url: parsed.href, source: 'mp4_url' };
  } catch { /* invalid */ }
  return null;
}
function classifyPoster(value) {
  const url = String(value).trim();
  if (OWN_POSTER.test(url)) return url;
  try { const parsed = new URL(url); if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) return parsed.href; } catch { /* invalid */ }
  return null;
}
// Returns {fields, errors}; errors are [{code, error}].
export function parseStreamFields(input) {
  const errors = [], fields = {};
  const push = (code, error) => errors.push({ code, error });
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title || title.length > 200) push('invalid_request', 'Title is required and must be at most 200 characters.');
  fields.title = title;
  const description = input.description == null ? null : String(input.description).trim();
  if (description && description.length > 5000) push('invalid_request', 'Description must be at most 5000 characters.');
  fields.description = description || null;
  const video = classifyVideoUrl(input.videoUrl);
  if (!video) push('invalid_video', 'Use an uploaded MP4 or an https:// link that ends in .mp4.');
  fields.videoUrl = video?.url || null; fields.videoSource = video?.source || null;
  if (input.posterUrl == null || input.posterUrl === '') fields.posterUrl = null;
  else { fields.posterUrl = classifyPoster(input.posterUrl); if (!fields.posterUrl) push('invalid_poster', 'Use an uploaded image or an https:// image link for the poster.'); }
  const duration = Number(input.durationSeconds);
  if (input.durationSeconds === null || input.durationSeconds === '' || !Number.isInteger(duration) || duration < 1 || duration > MAX_DURATION_SECONDS) push('invalid_duration', 'Video length must be a whole number of seconds between 1 second and 12 hours.');
  fields.durationSeconds = duration;
  if (!['once', 'loop'].includes(input.playMode)) push('invalid_request', "Play mode must be 'once' or 'loop'.");
  fields.playMode = input.playMode;
  fields.loopWindowMinutes = null;
  if (input.playMode === 'loop') {
    const minutes = Number(input.loopWindowMinutes), minimum = Number.isInteger(duration) && duration > 0 ? Math.ceil(duration / 60) : 1;
    if (input.loopWindowMinutes == null || !Number.isInteger(minutes) || minutes < minimum || minutes > MAX_LOOP_WINDOW_MINUTES) push('invalid_slot', `Loop window must be a whole number of minutes from ${minimum} (the video length) to ${MAX_LOOP_WINDOW_MINUTES}.`);
    fields.loopWindowMinutes = minutes;
  }
  const timezone = input.timezone == null || input.timezone === '' ? DEFAULT_TIMEZONE : input.timezone;
  if (!isValidTimezone(timezone)) push('invalid_timezone', 'Choose a valid time zone such as Africa/Kampala.');
  fields.timezone = timezone;
  return { fields, errors };
}
// Returns {slot} or {error:{code,error,slotIndex}}.
export function parseSlot(raw, index, nowMs, allowedPastStarts = new Set()) {
  const bad = (code, error) => ({ error: { code, error, slotIndex: index } });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad('invalid_slot', 'Each time slot must be an object.');
  if (raw.kind === 'once') {
    const start = typeof raw.startsAt === 'string' ? Date.parse(raw.startsAt) : NaN;
    if (!Number.isFinite(start)) return bad('invalid_slot', 'One-time slots need a valid startsAt date and time.');
    const startsAt = iso(start);
    if (start <= nowMs && !allowedPastStarts.has(startsAt)) return bad('past_start', 'One-time slots must start in the future.');
    return { slot: { kind: 'once', startsAt, weekday: null, localTime: null, activeFrom: null, activeUntil: null, slotIndex: index } };
  }
  if (raw.kind === 'weekly') {
    const weekday = Number(raw.weekday);
    if (raw.weekday == null || raw.weekday === '' || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) return bad('invalid_slot', 'Weekday must be 0 (Sunday) to 6 (Saturday).');
    if (typeof raw.localTime !== 'string' || !LOCAL_TIME.test(raw.localTime)) return bad('invalid_slot', 'Local time must use 24-hour HH:MM format.');
    const activeFrom = raw.activeFrom || null, activeUntil = raw.activeUntil || null;
    if ((activeFrom && !validDate(activeFrom)) || (activeUntil && !validDate(activeUntil))) return bad('invalid_slot', 'Active dates must use YYYY-MM-DD.');
    if (activeFrom && activeUntil && activeUntil < activeFrom) return bad('invalid_slot', 'The active-until date must be on or after the active-from date.');
    return { slot: { kind: 'weekly', startsAt: null, weekday, localTime: raw.localTime, activeFrom, activeUntil, slotIndex: index } };
  }
  return bad('invalid_slot', "Slot kind must be 'once' or 'weekly'.");
}
function firstError(errors) { if (errors.length) fail(errors[0].code, errors[0].error, errors[0].slotIndex !== undefined ? { slotIndex: errors[0].slotIndex } : {}); }
function parseSlots(list, nowMs, allowedPast) {
  if (list == null) return [];
  if (!Array.isArray(list)) fail('invalid_slot', 'Slots must be a list.');
  if (list.length > MAX_SLOTS) fail('invalid_slot', `A stream can have at most ${MAX_SLOTS} time slots.`);
  const results = list.map((raw, index) => parseSlot(raw, index, nowMs, allowedPast));
  firstError(results.filter(r => r.error).map(r => r.error));
  return results.map(r => r.slot);
}

// --- Data access ---------------------------------------------------------------
const STREAM_COLUMNS = 's.id,s.church_id,s.title,s.description,s.video_url,s.poster_url,s.video_source,s.duration_seconds,s.play_mode,s.loop_window_minutes,s.timezone,s.status,s.created_by,s.paused_by,s.paused_at,s.moderation_locked,s.moderation_note,s.created_at,s.updated_at';
const SLOT_COLUMNS = 'l.id as slot_id,l.kind as slot_kind,l.starts_at as slot_starts_at,l.weekday as slot_weekday,l.local_time as slot_local_time,l.active_from as slot_active_from,l.active_until as slot_active_until,l.created_at as slot_created_at';
function streamFromRow(row) {
  return {
    id: row.id, churchId: row.church_id, title: row.title, description: row.description, videoUrl: row.video_url, videoSource: row.video_source,
    posterUrl: row.poster_url, durationSeconds: row.duration_seconds, playMode: row.play_mode, loopWindowMinutes: row.loop_window_minutes,
    timezone: row.timezone, status: row.status, createdBy: row.created_by, pausedBy: row.paused_by, pausedAt: row.paused_at, moderationLocked: !!row.moderation_locked,
    moderationNote: row.moderation_note, createdAt: row.created_at, updatedAt: row.updated_at, slots: []
  };
}
function slotFromRow(row, streamId, prefix) {
  const get = key => row[prefix + key];
  return { id: get('id'), streamId, kind: get('kind'), startsAt: get('starts_at'), weekday: get('weekday'), localTime: get('local_time'), activeFrom: get('active_from'), activeUntil: get('active_until'), createdAt: get('created_at') };
}
// One query for streams + slots. filter: {churchIds?, streamId?, statuses?}
async function loadStreams(env, { churchIds, streamId, statuses }) {
  const where = [], binds = [];
  if (churchIds) { where.push(`s.church_id in (${churchIds.map(() => '?').join(',')})`); binds.push(...churchIds); }
  if (streamId) { where.push('s.id = ?'); binds.push(streamId); }
  if (statuses) { where.push(`s.status in (${statuses.map(() => '?').join(',')})`); binds.push(...statuses); }
  const { results } = await env.DB.prepare(`select ${STREAM_COLUMNS},${SLOT_COLUMNS} from simulated_live_streams s left join simulated_live_slots l on l.stream_id = s.id ${where.length ? 'where ' + where.join(' and ') : ''} order by s.created_at, s.id, l.created_at, l.id`).bind(...binds).all();
  const streams = new Map();
  for (const row of results || []) {
    if (!streams.has(row.id)) streams.set(row.id, streamFromRow(row));
    if (row.slot_id) streams.get(row.id).slots.push(slotFromRow(row, row.id, 'slot_'));
  }
  return [...streams.values()];
}
function publicSlot(slot) {
  return { id: slot.id, streamId: slot.streamId, kind: slot.kind, startsAt: slot.startsAt, weekday: slot.weekday, localTime: slot.localTime, activeFrom: slot.activeFrom, activeUntil: slot.activeUntil, createdAt: slot.createdAt };
}
function publicStream(stream, nowMs) {
  const { slots, ...rest } = stream;
  return { ...rest, slots: slots.map(publicSlot), nextPlays: upcomingPlays(stream, slots, nowMs, 5) };
}
// Church management rule = trusted-platform canManageEntity: platform owner (isOwner), or an
// owner/editor tenant_membership on the tenant owning the church's platform_entities row.
async function requireChurchManager(request, env, ctx, churchId) {
  const user = await ctx.getSessionUser(request, env);
  if (!user) throw new ApiError(401, 'Sign in required.');
  const platformOwner = await isOwner(env, user);
  if (!platformOwner) {
    const row = await env.DB.prepare("select 1 as ok from platform_entities e join tenant_memberships m on m.tenant_id = e.tenant_id where e.id = ? and e.kind = 'churches' and m.user_id = ? and m.role in ('owner','editor')").bind(churchId, user.id).first();
    if (!row) throw new ApiError(403, 'Only this church’s managers can schedule simulated live streams.');
  }
  const church = await env.DB.prepare('select id, name from churches where id = ?').bind(churchId).first();
  if (!church) throw new ApiError(404, 'Church not found.');
  return { user, church, platformOwner };
}
async function overlapConflicts(env, churchId, stream, candidateSlots, { excludeStreamId, nowMs }) {
  const to = nowMs + OVERLAP_HORIZON_MS;
  const others = await loadStreams(env, { churchIds: [churchId], statuses: ['active'] });
  const existing = [];
  for (const other of others) {
    if (other.id === excludeStreamId) continue;
    existing.push(...streamPlays(other, other.slots, nowMs, to));
  }
  return findConflicts(streamPlays(stream, candidateSlots, nowMs, to), existing);
}
function assertNoConflicts(conflicts) {
  if (conflicts.length) fail('overlap', 'This schedule overlaps another simulated live play for this church.', { conflicts });
}
function slotInsert(env, slot, streamId, churchId, now) {
  return env.DB.prepare('insert into simulated_live_slots (id, stream_id, church_id, kind, starts_at, weekday, local_time, active_from, active_until, created_at) values (?,?,?,?,?,?,?,?,?,?)')
    .bind(slot.id, streamId, churchId, slot.kind, slot.startsAt, slot.weekday, slot.localTime, slot.activeFrom, slot.activeUntil, now);
}
async function readStream(env, churchId, streamId) {
  const [stream] = await loadStreams(env, { streamId });
  if (!stream || stream.churchId !== churchId) throw new ApiError(404, 'Simulated live stream not found.');
  return stream;
}

// --- Media ---------------------------------------------------------------------
export function isMp4(bytes) {
  return bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
}
function requireMedia(env) { if (!env.MEDIA) throw new ApiError(503, 'Media uploads are not configured for this environment.'); }
async function handleVideoUpload(request, env, ctx, church, user) {
  requireMedia(env);
  const contentType = request.headers.get('content-type') || '';
  const declared = Number(request.headers.get('content-length') || 0);
  if (!contentType.startsWith('multipart/form-data')) throw new ApiError(415, 'Choose an MP4 video from your device.');
  if (Number.isFinite(declared) && declared > MAX_VIDEO_BYTES + 256 * 1024) throw new ApiError(413, 'Choose an MP4 smaller than 95 MB, or use the large-upload flow.');
  const form = await request.formData();
  const video = form.get('video');
  if (!video || typeof video !== 'object' || typeof video.arrayBuffer !== 'function') fail('invalid_video', 'Choose an MP4 video from your device.');
  if (video.size < 12) fail('invalid_video', 'Use an MP4 video file.');
  if (video.size > MAX_VIDEO_BYTES) throw new ApiError(413, 'Choose an MP4 smaller than 95 MB, or use the large-upload flow.');
  if (!isMp4(new Uint8Array(await video.slice(0, 12).arrayBuffer()))) fail('invalid_video', 'Use an MP4 video file.');
  const key = `church-video/${crypto.randomUUID()}.mp4`;
  await env.MEDIA.put(key, video, { httpMetadata: { contentType: 'video/mp4', cacheControl: VIDEO_CACHE }, customMetadata: { churchId: church.id, uploadedBy: String(user.id) } });
  return ctx.json({ ok: true, url: `/media/${key}` }, 201);
}
function partBytes(env) {
  const override = Number(env.SIMULATED_LIVE_PART_BYTES);
  return Number.isInteger(override) && override > 0 ? override : DEFAULT_PART_BYTES;
}
async function uploadRecord(env, church, uploadId, key) {
  if (!VIDEO_KEY.test(String(key || ''))) fail('invalid_video', 'Unknown upload key.');
  const row = await env.DB.prepare('select * from simulated_live_uploads where upload_id = ? and object_key = ? and church_id = ?').bind(uploadId, key, church.id).first();
  if (!row) throw new ApiError(404, 'Upload not found.');
  return row;
}
const partCountOf = row => Math.ceil(row.size / row.part_size);
async function handleMultipart(request, env, ctx, church, user, rest, url, nowMs) {
  requireMedia(env);
  const now = iso(nowMs);
  if (rest.length === 0) {
    if (request.method !== 'POST') throw new ApiError(405, 'Method not allowed.');
    const input = await readJson(request);
    if (input.contentType !== 'video/mp4') fail('invalid_video', 'Only MP4 video (video/mp4) can be uploaded.');
    if (input.filename != null && !/\.mp4$/i.test(String(input.filename))) fail('invalid_video', 'Only .mp4 files can be uploaded.');
    const size = Number(input.size);
    if (!Number.isInteger(size) || size < 12) fail('invalid_video', 'Provide the video size in bytes.');
    if (size > MAX_MULTIPART_BYTES) throw new ApiError(413, 'Videos must be 2 GB or smaller.');
    const partSize = partBytes(env), partCount = Math.ceil(size / partSize);
    if (partCount > 10000) fail('invalid_video', 'Video is too large for the configured part size.');
    const key = `church-video/${crypto.randomUUID()}.mp4`;
    const upload = await env.MEDIA.createMultipartUpload(key, { httpMetadata: { contentType: 'video/mp4', cacheControl: VIDEO_CACHE }, customMetadata: { churchId: church.id, uploadedBy: String(user.id) } });
    await env.DB.prepare("insert into simulated_live_uploads (upload_id, object_key, church_id, created_by, size, part_size, status, first_part_ok, created_at, updated_at) values (?,?,?,?,?,?,'pending',0,?,?)")
      .bind(upload.uploadId, key, church.id, user.email || user.id, size, partSize, now, now).run();
    return ctx.json({ ok: true, uploadId: upload.uploadId, key, partSize, partCount }, 201);
  }
  const uploadId = decodeURIComponent(rest[0] || '');
  if (!uploadId || uploadId.length > 1024) throw new ApiError(404, 'Upload not found.');
  if (rest.length === 3 && rest[1] === 'parts' && request.method === 'PUT') {
    const row = await uploadRecord(env, church, uploadId, url.searchParams.get('key'));
    if (row.status !== 'pending') throw new ApiError(409, 'This upload is already finished.');
    const partNumber = Number(rest[2]), partCount = partCountOf(row);
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > partCount) fail('invalid_video', `Part number must be between 1 and ${partCount}.`);
    const expected = partNumber < partCount ? row.part_size : row.size - (partCount - 1) * row.part_size;
    const declared = request.headers.get('content-length');
    if (declared != null && Number(declared) !== expected) fail('invalid_video', `Part ${partNumber} must be exactly ${expected} bytes.`);
    let body;
    if (partNumber === 1 || declared == null) {
      const bytes = new Uint8Array(await request.arrayBuffer());
      if (bytes.length !== expected) fail('invalid_video', `Part ${partNumber} must be exactly ${expected} bytes.`);
      if (partNumber === 1 && !isMp4(bytes)) fail('invalid_video', 'Use an MP4 video file.');
      body = bytes;
    } else body = request.body;
    const part = await env.MEDIA.resumeMultipartUpload(row.object_key, uploadId).uploadPart(partNumber, body);
    if (partNumber === 1) await env.DB.prepare('update simulated_live_uploads set first_part_ok = 1, updated_at = ? where upload_id = ?').bind(now, uploadId).run();
    return ctx.json({ ok: true, partNumber: part.partNumber, etag: part.etag });
  }
  if (rest.length === 2 && rest[1] === 'complete' && request.method === 'POST') {
    const input = await readJson(request);
    const row = await uploadRecord(env, church, uploadId, input.key);
    if (row.status !== 'pending') throw new ApiError(409, 'This upload is already finished.');
    if (!row.first_part_ok) fail('invalid_video', 'Upload part 1 before completing.');
    const partCount = partCountOf(row);
    const parts = Array.isArray(input.parts) ? input.parts.map(p => ({ partNumber: Number(p?.partNumber), etag: String(p?.etag || '') })).sort((a, b) => a.partNumber - b.partNumber) : [];
    if (parts.length !== partCount || parts.some((p, i) => p.partNumber !== i + 1 || !p.etag)) fail('invalid_video', `Provide all ${partCount} uploaded parts with their etags.`);
    const object = await env.MEDIA.resumeMultipartUpload(row.object_key, uploadId).complete(parts);
    if (object?.size !== undefined && object.size !== row.size) {
      await env.MEDIA.delete(row.object_key);
      await env.DB.prepare("update simulated_live_uploads set status = 'aborted', updated_at = ? where upload_id = ?").bind(now, uploadId).run();
      fail('invalid_video', 'The uploaded video size did not match the declared size.');
    }
    await env.DB.prepare("update simulated_live_uploads set status = 'completed', updated_at = ? where upload_id = ?").bind(now, uploadId).run();
    return ctx.json({ ok: true, url: `/media/${row.object_key}` });
  }
  if (rest.length === 1 && request.method === 'DELETE') {
    const row = await uploadRecord(env, church, uploadId, url.searchParams.get('key'));
    if (row.status === 'completed') throw new ApiError(409, 'This upload is already finished.');
    if (row.status === 'pending') await env.MEDIA.resumeMultipartUpload(row.object_key, uploadId).abort();
    await env.DB.prepare("update simulated_live_uploads set status = 'aborted', updated_at = ? where upload_id = ?").bind(now, uploadId).run();
    return ctx.json({ ok: true });
  }
  throw new ApiError(405, 'Method not allowed.');
}

// --- Handlers ----------------------------------------------------------------------
// readJson rejects non-http(s) values in *Url fields with a generic 400; map those to contract codes.
async function readBody(request) {
  const copy = request.clone();
  try { return await readJson(request); }
  catch (error) {
    if (!(error instanceof ApiError) || error.status !== 400 || !/URL/.test(error.message)) throw error;
    let raw = {};
    try { raw = await copy.json(); } catch { /* ignore */ }
    const safe = value => { try { return ['https:', 'http:'].includes(new URL(String(value), 'https://asset.invalid/').protocol); } catch { return false; } };
    if (raw && raw.videoUrl != null && !safe(raw.videoUrl)) fail('invalid_video', 'Use an uploaded MP4 or an https:// link that ends in .mp4.');
    if (raw && raw.posterUrl != null && !safe(raw.posterUrl)) fail('invalid_poster', 'Use an uploaded image or an https:// image link for the poster.');
    fail('invalid_request', 'A link in this request is not a safe web address.');
  }
}
function noStore(response) { response.headers.set('cache-control', 'no-store'); return response; }
function streamInputFrom(stream) {
  return { title: stream.title, description: stream.description, videoUrl: stream.videoUrl, posterUrl: stream.posterUrl, durationSeconds: stream.durationSeconds, playMode: stream.playMode, loopWindowMinutes: stream.loopWindowMinutes, timezone: stream.timezone };
}
const EDITABLE = ['title', 'description', 'videoUrl', 'posterUrl', 'durationSeconds', 'playMode', 'loopWindowMinutes', 'timezone'];

async function handleOwnerRoutes(request, env, ctx, churchId, rest, url, nowMs) {
  const { user, church, platformOwner } = await requireChurchManager(request, env, ctx, churchId);
  const now = iso(nowMs), method = request.method;
  if (rest.length === 0) {
    if (method === 'GET') {
      const streams = await loadStreams(env, { churchIds: [churchId], statuses: ['active', 'paused'] });
      return ctx.json({ ok: true, streams: streams.map(s => publicStream(s, nowMs)) });
    }
    if (method === 'POST') {
      const input = await readBody(request);
      const { fields, errors } = parseStreamFields(input);
      firstError(errors);
      const slots = parseSlots(input.slots, nowMs);
      const stream = { id: crypto.randomUUID(), churchId, ...fields, status: 'active' };
      assertNoConflicts(await overlapConflicts(env, churchId, stream, slots, { nowMs }));
      slots.forEach(slot => { slot.id = crypto.randomUUID(); });
      await env.DB.batch([
        env.DB.prepare("insert into simulated_live_streams (id, church_id, title, description, video_url, poster_url, video_source, duration_seconds, play_mode, loop_window_minutes, timezone, status, created_by, created_at, updated_at) values (?,?,?,?,?,?,?,?,?,?,?,'active',?,?,?)")
          .bind(stream.id, churchId, fields.title, fields.description, fields.videoUrl, fields.posterUrl, fields.videoSource, fields.durationSeconds, fields.playMode, fields.loopWindowMinutes, fields.timezone, user.email || user.id, now, now),
        ...slots.map(slot => slotInsert(env, slot, stream.id, churchId, now))
      ]);
      return ctx.json({ ok: true, stream: publicStream(await readStream(env, churchId, stream.id), nowMs) }, 201);
    }
    throw new ApiError(405, 'Method not allowed.');
  }
  if (rest[0] === 'preview' && rest.length === 1) {
    if (method !== 'POST') throw new ApiError(405, 'Method not allowed.');
    const input = await readBody(request);
    let allowedPast = new Set(), excludeStreamId = null;
    if (input.streamId != null) {
      const existing = await readStream(env, churchId, String(input.streamId));
      excludeStreamId = existing.id;
      allowedPast = new Set(existing.slots.filter(s => s.kind === 'once').map(s => s.startsAt));
    }
    const { fields, errors } = parseStreamFields(input);
    const slots = [];
    if (input.slots != null && !Array.isArray(input.slots)) errors.push({ code: 'invalid_slot', error: 'Slots must be a list.' });
    else if ((input.slots || []).length > MAX_SLOTS) errors.push({ code: 'invalid_slot', error: `A stream can have at most ${MAX_SLOTS} time slots.` });
    else for (const [index, raw] of (input.slots || []).entries()) {
      const result = parseSlot(raw, index, nowMs, allowedPast);
      if (result.error) errors.push(result.error); else slots.push(result.slot);
    }
    const timingBroken = errors.some(e => ['invalid_duration', 'invalid_timezone'].includes(e.code) || (e.code === 'invalid_slot' && e.slotIndex === undefined) || (e.code === 'invalid_request' && /Play mode/.test(e.error)));
    let nextPlays = [], conflicts = [];
    if (!timingBroken) {
      const stream = { id: excludeStreamId, churchId, ...fields, status: 'active' };
      nextPlays = upcomingPlays(stream, slots, nowMs, 5);
      conflicts = await overlapConflicts(env, churchId, stream, slots, { excludeStreamId, nowMs });
    }
    return ctx.json({ ok: true, valid: !errors.length && !conflicts.length, nextPlays, errors, conflicts });
  }
  if (rest[0] === 'video') {
    if (rest.length === 1) { if (method !== 'POST') throw new ApiError(405, 'Method not allowed.'); return handleVideoUpload(request, env, ctx, church, user); }
    if (rest[1] === 'uploads') return handleMultipart(request, env, ctx, church, user, rest.slice(2), url, nowMs);
    throw new ApiError(404, 'Not found.');
  }
  const streamId = decodeURIComponent(rest[0]);
  const stream = await readStream(env, churchId, streamId);
  if (rest.length === 1) {
    if (method === 'GET') return ctx.json({ ok: true, stream: publicStream(stream, nowMs) });
    if (method === 'DELETE') {
      await env.DB.prepare("update simulated_live_streams set status = 'archived', updated_at = ? where id = ?").bind(now, streamId).run();
      return ctx.json({ ok: true });
    }
    if (method === 'PATCH') {
      const input = await readBody(request);
      const merged = streamInputFrom(stream);
      for (const key of EDITABLE) if (has(input, key)) merged[key] = input[key];
      const { fields, errors } = parseStreamFields(merged);
      firstError(errors);
      const status = has(input, 'status') ? input.status : stream.status;
      if (!['active', 'paused', 'archived'].includes(status)) fail('invalid_request', "Status must be 'active', 'paused' or 'archived'.");
      if (stream.moderationLocked && !platformOwner && status === 'active' && stream.status !== 'active') {
        fail('moderation_locked', 'A platform owner paused this stream for review. Contact support to put it back on air.', { httpStatus: 403 });
      }
      let moderationNote = stream.moderationNote;
      if (has(input, 'moderationNote')) {
        moderationNote = input.moderationNote == null ? null : String(input.moderationNote).trim() || null;
        if (moderationNote && moderationNote.length > 1000) fail('invalid_request', 'Moderation note must be at most 1000 characters.');
      }
      const replaceSlots = has(input, 'slots');
      const allowedPast = new Set(stream.slots.filter(s => s.kind === 'once').map(s => s.startsAt));
      const slots = replaceSlots ? parseSlots(input.slots, nowMs, allowedPast) : stream.slots;
      const next = { ...stream, ...fields, status };
      if (status === 'active') assertNoConflicts(await overlapConflicts(env, churchId, next, slots, { excludeStreamId: streamId, nowMs }));
      // Pause history (pausedBy/pausedAt/moderationNote) is kept after a resume; status says whether it is live.
      const newlyPaused = status === 'paused' && stream.status !== 'paused';
      const pausedBy = newlyPaused ? (user.email || user.id) : stream.pausedBy;
      const pausedAt = newlyPaused ? now : stream.pausedAt;
      const moderationLocked = status === 'active' ? 0 : (status === 'paused' && platformOwner && (newlyPaused || has(input, 'moderationNote'))) ? 1 : (stream.moderationLocked ? 1 : 0);
      const statements = [env.DB.prepare('update simulated_live_streams set title = ?, description = ?, video_url = ?, poster_url = ?, video_source = ?, duration_seconds = ?, play_mode = ?, loop_window_minutes = ?, timezone = ?, status = ?, paused_by = ?, paused_at = ?, moderation_locked = ?, moderation_note = ?, updated_at = ? where id = ?')
        .bind(fields.title, fields.description, fields.videoUrl, fields.posterUrl, fields.videoSource, fields.durationSeconds, fields.playMode, fields.loopWindowMinutes, fields.timezone, status, pausedBy, pausedAt, moderationLocked, moderationNote, now, streamId)];
      if (replaceSlots) {
        slots.forEach(slot => { slot.id = crypto.randomUUID(); });
        statements.push(env.DB.prepare('delete from simulated_live_slots where stream_id = ?').bind(streamId), ...slots.map(slot => slotInsert(env, slot, streamId, churchId, now)));
      }
      await env.DB.batch(statements);
      return ctx.json({ ok: true, stream: publicStream(await readStream(env, churchId, streamId), nowMs) });
    }
    throw new ApiError(405, 'Method not allowed.');
  }
  if (rest[1] === 'preview' && rest.length === 2) {
    if (method !== 'GET') throw new ApiError(405, 'Method not allowed.');
    const requested = Number(url.searchParams.get('count') || 5);
    const count = Number.isFinite(requested) ? Math.min(20, Math.max(1, Math.floor(requested))) : 5;
    return ctx.json({ ok: true, plays: upcomingPlays(stream, stream.slots, nowMs, count) });
  }
  if (rest[1] === 'slots') {
    if (rest.length === 2 && method === 'POST') {
      const input = await readBody(request);
      const raw = input.slot && typeof input.slot === 'object' ? input.slot : input;
      if (stream.slots.length >= MAX_SLOTS) fail('invalid_slot', `A stream can have at most ${MAX_SLOTS} time slots.`);
      const result = parseSlot(raw, 0, nowMs);
      if (result.error) fail(result.error.code, result.error.error);
      const slot = result.slot;
      if (stream.status === 'active') assertNoConflicts(await overlapConflicts(env, churchId, stream, [slot], { nowMs }));
      slot.id = crypto.randomUUID();
      await slotInsert(env, slot, streamId, churchId, now).run();
      const saved = await readStream(env, churchId, streamId);
      return ctx.json({ ok: true, slot: publicSlot(saved.slots.find(s => s.id === slot.id)), stream: publicStream(saved, nowMs) }, 201);
    }
    if (rest.length === 3 && method === 'DELETE') {
      const slotId = decodeURIComponent(rest[2]);
      if (!stream.slots.some(s => s.id === slotId)) throw new ApiError(404, 'Time slot not found.');
      await env.DB.prepare('delete from simulated_live_slots where id = ? and stream_id = ?').bind(slotId, streamId).run();
      return ctx.json({ ok: true });
    }
    throw new ApiError(405, 'Method not allowed.');
  }
  throw new ApiError(404, 'Not found.');
}

async function handleBatchNowPlaying(request, env, ctx, url, nowMs) {
  const ids = [...new Set(String(url.searchParams.get('churchIds') || '').split(',').map(id => id.trim()).filter(Boolean))];
  if (ids.length > MAX_BATCH_CHURCHES) fail('invalid_request', `Ask for at most ${MAX_BATCH_CHURCHES} churches at a time.`);
  if (ids.some(id => id.length > 128)) fail('invalid_request', 'Invalid church id.');
  const streams = ids.length ? await loadStreams(env, { churchIds: ids, statuses: ['active'] }) : [];
  const churches = {};
  for (const id of ids) {
    const result = computeNowPlaying(streams.filter(s => s.churchId === id), nowMs);
    churches[id] = { state: result.state, timezone: result.timezone, poster: result.poster, slotId: result.slotId, play: result.play, nextPlay: result.nextPlay };
  }
  return noStore(ctx.json({ ok: true, serverTime: iso(nowMs), churches }));
}

async function handleAdmin(request, env, ctx, url, nowMs) {
  if (request.method !== 'GET') throw new ApiError(405, 'Method not allowed.');
  const user = await ctx.getSessionUser(request, env);
  if (!user) throw new ApiError(401, 'Sign in required.');
  if (!await isOwner(env, user)) throw new ApiError(403, 'Verified platform owner with MFA required.');
  const status = url.searchParams.get('status') || '', churchId = url.searchParams.get('churchId') || '', q = (url.searchParams.get('q') || '').trim();
  if (status && !['active', 'paused', 'archived'].includes(status)) fail('invalid_request', "Status must be 'active', 'paused' or 'archived'.");
  const limit = Math.min(100, Math.max(1, Math.floor(Number(url.searchParams.get('limit') || 50)) || 50));
  const offset = Math.max(0, Math.floor(Number(url.searchParams.get('cursor') || url.searchParams.get('offset') || 0)) || 0);
  const where = [], binds = [];
  if (status) { where.push('s.status = ?'); binds.push(status); }
  if (churchId) { where.push('s.church_id = ?'); binds.push(churchId); }
  if (q) {
    const like = '%' + q.slice(0, 200).replace(/[\\%_]/g, c => '\\' + c) + '%';
    where.push("(s.title like ? escape '\\' or c.name like ? escape '\\' or s.video_url like ? escape '\\')"); binds.push(like, like, like);
  }
  const { results } = await env.DB.prepare(`select ${STREAM_COLUMNS}, c.name as church_name from simulated_live_streams s left join churches c on c.id = s.church_id ${where.length ? 'where ' + where.join(' and ') : ''} order by s.updated_at desc, s.id limit ? offset ?`).bind(...binds, limit + 1, offset).all();
  const page = (results || []).slice(0, limit);
  const streams = page.map(row => ({ ...streamFromRow(row), churchName: row.church_name ?? null }));
  if (streams.length) {
    const { results: slotRows } = await env.DB.prepare(`select * from simulated_live_slots where stream_id in (${streams.map(() => '?').join(',')}) order by created_at, id`).bind(...streams.map(s => s.id)).all();
    const byId = new Map(streams.map(s => [s.id, s]));
    for (const row of slotRows || []) byId.get(row.stream_id)?.slots.push(slotFromRow(row, row.stream_id, ''));
  }
  const out = streams.map(stream => {
    const next = stream.status === 'active' ? streamPlays(stream, stream.slots, nowMs, nowMs + OVERLAP_HORIZON_MS).find(p => p.startsAt > nowMs) : null;
    const { slots, ...rest } = stream;
    return { ...rest, slots: slots.map(publicSlot), nextPlay: next ? { startsAt: iso(next.startsAt), slotId: next.slotId, title: stream.title } : null };
  });
  return ctx.json({ ok: true, streams: out, nextCursor: (results || []).length > limit ? String(offset + limit) : null });
}

export async function handleSimulatedLiveApi(request, env, ctx) {
  const url = new URL(request.url), path = url.pathname.replace(/\/+$/, '');
  const churchMatch = path.match(/^\/api\/churches\/([^/]+)\/(simulated-live|now-playing)(?:\/(.+))?$/);
  const isBatch = path === '/api/simulated-live/now-playing', isAdmin = path === '/api/admin/simulated-live';
  if (!churchMatch && !isBatch && !isAdmin) return null;
  if (churchMatch && churchMatch[2] === 'now-playing' && churchMatch[3]) return null;
  if (!env.DB) throw new ApiError(503, 'Storage unavailable.');
  const nowMs = typeof ctx.now === 'function' ? ctx.now() : Date.now();
  try {
    if (isBatch) { if (request.method !== 'GET') throw new ApiError(405, 'Method not allowed.'); return await handleBatchNowPlaying(request, env, ctx, url, nowMs); }
    if (isAdmin) return await handleAdmin(request, env, ctx, url, nowMs);
    const churchId = decodeURIComponent(churchMatch[1]);
    if (churchMatch[2] === 'now-playing') {
      if (request.method !== 'GET') throw new ApiError(405, 'Method not allowed.');
      const streams = await loadStreams(env, { churchIds: [churchId], statuses: ['active'] });
      return noStore(ctx.json({ ok: true, serverTime: iso(nowMs), ...computeNowPlaying(streams, nowMs) }));
    }
    return await handleOwnerRoutes(request, env, ctx, churchId, churchMatch[3] ? churchMatch[3].split('/') : [], url, nowMs);
  } catch (error) {
    if (error instanceof SimulatedLiveError) { const { httpStatus = 400, ...extra } = error.extra || {}; return ctx.json({ ok: false, error: error.message, code: error.code, ...extra }, httpStatus); }
    throw error;
  }
}
