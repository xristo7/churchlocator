import { handleMeditationVoice } from './meditation-voice.js';
import { ApiError, readJson } from './security.js';

export function validatePlayback(input, room) {
  const position = Number(input.position);
  const verse = Number(input.verse);
  if (typeof input.playing !== 'boolean' || !Number.isFinite(position) || position < 0 || position > 604800 || !Number.isInteger(verse) || verse < 0 || verse >= Math.max(1, room.verses?.length || 0)) throw new ApiError(400, 'Invalid playback state.');
  if (!['bible','prayer','sermon','worship','instrumental','silence'].includes(input.audioType)) throw new ApiError(400, 'Invalid audio selection.');
  return { playing: input.playing, position, verse, audioType: input.audioType };
}

// A session belongs to its initiating member, independently of room ownership.
export async function handleMeditationSession(request, env, ctx) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  if (parts[1] !== 'meditation-session') return null;
  if (!env.DB) throw new ApiError(503, 'Storage unavailable.');
  const roomId = parts[2], sessionId = parts[3];
  if (!roomId || roomId.length > 128 || parts.length > 6) throw new ApiError(404, 'Session not found.');
  const entity = await env.DB.prepare("select data_json,created_by,tenant_id from platform_entities where id=? and kind='meditation' and state='published'").bind(roomId).first();
  if (!entity) throw new ApiError(404, 'Meditation room not found.');
  const room = JSON.parse(entity.data_json);
  const user = await ctx.getSessionUser(request, env);
  if (!user) throw new ApiError(401, 'Sign in to join this session.');
  const respond = row => ctx.json({ok:true, canControl: row.host_user_id === user.id, serverTime:Date.now(), session:{id:row.id, ...JSON.parse(row.state_json), revision:row.revision, updatedAt:row.updated_at}});
  if (request.method === 'POST' && !sessionId) {
    const state = validatePlayback(await readJson(request), room), id = crypto.randomUUID(), now = Date.now();
    await env.DB.prepare('insert into meditation_sessions (id,room_id,host_user_id,state_json,revision,updated_at) values (?,?,?,?,1,?)').bind(id,roomId,user.id,JSON.stringify(state),now).run();
    return respond({id,host_user_id:user.id,state_json:JSON.stringify(state),revision:1,updated_at:now});
  }
  if (!sessionId || !/^[\w-]{1,128}$/.test(sessionId)) throw new ApiError(404, 'Session not found.');
  const row = await env.DB.prepare('select * from meditation_sessions where id=? and room_id=?').bind(sessionId,roomId).first();
  if (!row) throw new ApiError(404, 'Session not found. Ask the host for a new invitation.');
  if (parts[4] === 'voice') return handleMeditationVoice(request, env, ctx, row, entity, user, parts[5]);
  if (parts[4] === 'chat' && parts.length === 5) return sessionChat(request, env, ctx, row, user);
  if (parts[4] === 'bookmarks' && parts.length <= 6) return sessionBookmarks(request, env, ctx, row, user, parts[5]);
  if (parts.length > 4) throw new ApiError(404, 'Session action not found.');
  if (request.method === 'GET') return respond(row);
  if (request.method === 'PUT') {
    if (row.host_user_id !== user.id) throw new ApiError(403, 'Only the session host can control playback.');
    const input = await readJson(request), state = validatePlayback(input, room);
    if (!Number.isInteger(input.revision)) throw new ApiError(400, 'Playback revision required.');
    const updated = await env.DB.prepare('update meditation_sessions set state_json=?,revision=revision+1,updated_at=? where id=? and room_id=? and revision=? returning *').bind(JSON.stringify(state),Date.now(),sessionId,roomId,input.revision).first();
    if (!updated) throw new ApiError(409, 'Playback changed. Synchronize before trying again.');
    return respond(updated);
  }
  throw new ApiError(405, 'Method not allowed.');
}

// Brief 05.3: chat for the people inside one session (not the public room), pause requests and bookmarks.
// Access is the same as the session itself: signed in and holding the unguessable session id from the host's invitation.
const CHAT_KINDS = new Set(['chat', 'pause-request', 'bookmark']);
const cleanText = (value, max) => String(value ?? '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max);
const cleanPosition = (value) => { const n = Number(value); if (!Number.isFinite(n) || n < 0 || n > 604800) throw new ApiError(400, 'Invalid session moment.'); return Math.round(n * 10) / 10; };

async function sessionChat(request, env, ctx, session, user) {
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(`select c.id,c.user_id,c.body,c.kind,c.position_sec,c.created_at,u.name from meditation_session_chat c join users u on u.id=c.user_id
      where c.room_id=? and c.session_id=? order by c.created_at desc limit 100`).bind(session.room_id, session.id).all();
    return ctx.json({ ok: true, isHost: session.host_user_id === user.id, messages: (results || []).reverse().map(r => ({ id: r.id, name: r.name, body: r.body, kind: r.kind || 'chat', position: r.position_sec, createdAt: r.created_at, own: r.user_id === user.id, fromHost: r.user_id === session.host_user_id })) });
  }
  if (request.method !== 'POST') throw new ApiError(405, 'Method not allowed.');
  const input = await readJson(request) || {};
  const kind = CHAT_KINDS.has(input.kind) ? input.kind : 'chat';
  if (kind === 'pause-request' && session.host_user_id === user.id) throw new ApiError(400, 'You are the host; use Pause instead.');
  const position = kind === 'chat' ? null : cleanPosition(input.position);
  const body = kind === 'pause-request' ? cleanText(input.body, 120) || 'asked the host to pause' : cleanText(input.body, 300);
  if (!body) throw new ApiError(400, 'Messages must be between 1 and 300 characters.');
  const recent = await env.DB.prepare("select count(*) as n from meditation_session_chat where session_id=? and user_id=? and created_at>?").bind(session.id, user.id, new Date(Date.now() - 10000).toISOString()).first();
  if (Number(recent?.n || 0) >= 5) throw new ApiError(429, 'Slow down a little before sending another message.');
  if (kind === 'pause-request') {
    const last = await env.DB.prepare("select created_at from meditation_session_chat where session_id=? and user_id=? and kind='pause-request' order by created_at desc limit 1").bind(session.id, user.id).first();
    if (last && Date.parse(last.created_at) > Date.now() - 20000) throw new ApiError(429, 'Your pause request was already sent to the host.');
  }
  const id = crypto.randomUUID(), now = new Date().toISOString();
  await env.DB.prepare('insert into meditation_session_chat (id,room_id,session_id,user_id,body,kind,position_sec,created_at) values (?,?,?,?,?,?,?,?)').bind(id, session.room_id, session.id, user.id, body, kind, position, now).run();
  return ctx.json({ ok: true, message: { id, name: user.name, body, kind, position, createdAt: now, own: true, fromHost: session.host_user_id === user.id } }, 201);
}

async function sessionBookmarks(request, env, ctx, session, user, bookmarkId) {
  if (request.method === 'GET' && !bookmarkId) {
    const { results } = await env.DB.prepare('select id,position_sec,verse,label,created_at from meditation_session_bookmarks where session_id=? and user_id=? order by position_sec asc limit 100').bind(session.id, user.id).all();
    return ctx.json({ ok: true, bookmarks: (results || []).map(r => ({ id: r.id, position: r.position_sec, verse: r.verse, label: r.label, createdAt: r.created_at })) });
  }
  if (request.method === 'POST' && !bookmarkId) {
    const input = await readJson(request) || {};
    const position = cleanPosition(input.position), verse = Number.isInteger(input.verse) && input.verse >= 0 && input.verse < 1000 ? input.verse : 0;
    const count = await env.DB.prepare('select count(*) as n from meditation_session_bookmarks where session_id=? and user_id=?').bind(session.id, user.id).first();
    if (Number(count?.n || 0) >= 100) throw new ApiError(400, 'This session already has 100 bookmarks.');
    const id = crypto.randomUUID(), now = new Date().toISOString(), label = cleanText(input.label, 120);
    await env.DB.prepare('insert into meditation_session_bookmarks (id,room_id,session_id,user_id,position_sec,verse,label,created_at) values (?,?,?,?,?,?,?,?)').bind(id, session.room_id, session.id, user.id, position, verse, label, now).run();
    return ctx.json({ ok: true, bookmark: { id, position, verse, label, createdAt: now } }, 201);
  }
  if (request.method === 'DELETE' && bookmarkId) {
    if (!/^[0-9a-f-]{36}$/.test(bookmarkId)) throw new ApiError(404, 'Bookmark not found.');
    const gone = await env.DB.prepare('delete from meditation_session_bookmarks where id=? and session_id=? and user_id=? returning id').bind(bookmarkId, session.id, user.id).first();
    if (!gone) throw new ApiError(404, 'Bookmark not found.');
    return ctx.json({ ok: true });
  }
  throw new ApiError(405, 'Method not allowed.');
}
