import { ApiError, readJson } from './security.js';
import { auditStatement } from './identity-security.js';

// Viewer actions around a live broadcast page: like, private dislike, subscribe (follow) and report.
// A broadcast is addressed by the published church, store or channel that is streaming.
const KINDS = { church: 'churches', store: 'store', channel: 'channels' };

async function stream(env, type, id) {
  const kind = KINDS[type];
  if (!kind || !id || id.length > 128) throw new ApiError(404, 'This broadcast is unavailable.');
  const row = await env.DB.prepare("select id,tenant_id,kind from platform_entities where id=? and kind=? and state='published'").bind(id, kind).first();
  if (!row) throw new ApiError(404, 'This broadcast is unavailable.');
  return row;
}

async function summary(env, type, id, userId) {
  const stats = await env.DB.prepare(`select
    (select count(*) from live_ratings where stream_type=? and stream_id=? and rating='like') likes,
    (select count(*) from channel_follows where channel_id=?) followers,
    exists(select 1 from live_ratings where stream_type=? and stream_id=? and user_id=? and rating='like') liked,
    exists(select 1 from live_ratings where stream_type=? and stream_id=? and user_id=? and rating='dislike') disliked,
    exists(select 1 from channel_follows where channel_id=? and user_id=?) following,
    exists(select 1 from live_reports where stream_type=? and stream_id=? and user_id=?) reported`)
    .bind(type, id, id, type, id, userId, type, id, userId, id, userId, type, id, userId).first();
  return { likes: Number(stats.likes), followers: Number(stats.followers), liked: !!stats.liked, disliked: !!stats.disliked, following: !!stats.following, reported: !!stats.reported };
}

export async function handleLiveWatchApi(request, env, ctx) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/live-watch/')) return null;
  const [, , , type, id, action] = url.pathname.split('/');
  const target = await stream(env, type, id);
  const user = await ctx.getSessionUser(request, env);
  const need = () => { if (!user) throw new ApiError(401, 'Sign in required.'); return user; };
  if (request.method === 'GET' && !action) return ctx.json({ ok: true, ...await summary(env, type, id, user?.id || '') });
  const now = new Date().toISOString();
  if (request.method === 'POST' && action === 'rating') {
    const member = need(), input = await readJson(request);
    if (!['like', 'dislike'].includes(input.action)) throw new ApiError(400, 'Choose like or dislike.');
    if (typeof input.active !== 'boolean') throw new ApiError(400, 'Choose an on or off state.');
    if (input.active) await env.DB.prepare("insert into live_ratings(stream_type,stream_id,user_id,rating,created_at) values (?,?,?,?,?) on conflict(stream_type,stream_id,user_id) do update set rating=excluded.rating,created_at=excluded.created_at").bind(type, id, member.id, input.action, now).run();
    else await env.DB.prepare('delete from live_ratings where stream_type=? and stream_id=? and user_id=? and rating=?').bind(type, id, member.id, input.action).run();
    return ctx.json({ ok: true, ...await summary(env, type, id, member.id) });
  }
  if (request.method === 'PUT' && action === 'follow') {
    const member = need(), input = await readJson(request);
    if (typeof input.active !== 'boolean') throw new ApiError(400, 'Choose follow or unfollow.');
    if (input.active) await env.DB.prepare('insert into channel_follows(user_id,channel_id,notifications_enabled,created_at) values (?,?,1,?) on conflict(user_id,channel_id) do update set notifications_enabled=1').bind(member.id, id, now).run();
    else await env.DB.prepare('delete from channel_follows where user_id=? and channel_id=?').bind(member.id, id).run();
    return ctx.json({ ok: true, ...await summary(env, type, id, member.id) });
  }
  if (request.method === 'POST' && action === 'report') {
    const member = need();
    await env.DB.batch([
      env.DB.prepare('insert or ignore into live_reports(stream_type,stream_id,user_id,created_at) values (?,?,?,?)').bind(type, id, member.id, now),
      auditStatement(env, member.id, 'live.reported', id, target.tenant_id)
    ]);
    return ctx.json({ ok: true, ...await summary(env, type, id, member.id) });
  }
  throw new ApiError(405, 'Method not allowed.');
}
