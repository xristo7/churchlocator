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
  if (!roomId || roomId.length > 128 || parts.length > 4) throw new ApiError(404, 'Session not found.');
  const entity = await env.DB.prepare("select data_json from platform_entities where id=? and kind='meditation' and state='published'").bind(roomId).first();
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
