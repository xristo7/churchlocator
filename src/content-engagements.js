import { ApiError, readJson } from './security.js';

const allowedTypes = new Set(['channel', 'product', 'resource', 'livestream']);
const validId = value => /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(String(value || ''));

function validatedType(value) {
  const type = String(value || '').toLowerCase();
  if (!allowedTypes.has(type)) throw new ApiError(400, 'Unsupported content type.');
  return type;
}

function validatedIds(values) {
  const ids = [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
  if (!ids.length || ids.length > 50 || ids.some(id => !validId(id))) throw new ApiError(400, 'Use between 1 and 50 valid content IDs.');
  return ids;
}

export async function handleContentEngagementApi(request, env, context) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  if (path !== '/api/content-engagements') return null;
  if (!env.DB) return context.json({ ok: false, error: 'storage unavailable' }, 503);

  const user = await context.getSessionUser(request, env);
  if (request.method === 'GET') {
    const type = validatedType(url.searchParams.get('type'));
    const ids = validatedIds((url.searchParams.get('ids') || '').split(','));
    const placeholders = ids.map(() => '?').join(',');
    const totals = await env.DB.prepare(`
      select content_id, count(*) total
      from content_engagements
      where content_type=? and reaction='love' and content_id in (${placeholders})
      group by content_id
    `).bind(type, ...ids).all();
    let loved = [];
    if (user) {
      const result = await env.DB.prepare(`
        select content_id from content_engagements
        where content_type=? and user_id=? and reaction='love' and content_id in (${placeholders})
      `).bind(type, user.id, ...ids).all();
      loved = (result.results || []).map(row => row.content_id);
    }
    const counts = Object.fromEntries(ids.map(id => [id, 0]));
    for (const row of totals.results || []) counts[row.content_id] = Number(row.total || 0);
    return context.json({ ok: true, type, counts, loved });
  }

  if (request.method === 'POST') {
    if (!user) return context.json({ ok: false, error: 'unauthorized' }, 401);
    const body = await readJson(request);
    const type = validatedType(body.type);
    const [id] = validatedIds([body.id]);
    const existing = await env.DB.prepare(`
      select 1 from content_engagements
      where content_type=? and content_id=? and user_id=? and reaction='love'
    `).bind(type, id, user.id).first();
    if (existing) {
      await env.DB.prepare(`delete from content_engagements where content_type=? and content_id=? and user_id=? and reaction='love'`).bind(type, id, user.id).run();
    } else {
      await env.DB.prepare(`insert into content_engagements(content_type,content_id,user_id,reaction,created_at) values (?,?,?,'love',?)`).bind(type, id, user.id, new Date().toISOString()).run();
    }
    const total = await env.DB.prepare(`select count(*) total from content_engagements where content_type=? and content_id=? and reaction='love'`).bind(type, id).first();
    return context.json({ ok: true, type, id, loved: !existing, count: Number(total?.total || 0) });
  }

  return context.json({ ok: false, error: 'method not allowed' }, 405);
}
