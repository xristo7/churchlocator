import { ApiError, readJson } from './security.js';
import { auditStatement } from './identity-security.js';
import { isOwner, membership, ownTenant, requireOwner, requireUser } from './trusted-platform.js';

const contentTypes = new Set(['short', 'long-preview', 'church', 'channel', 'event', 'live']);
const states = new Set(['draft', 'pending', 'needs-changes', 'approved', 'scheduled', 'live', 'rejected', 'expired']);
const placements = new Set(['organic', 'editorial', 'sponsored']);

function cleanText(value, maximum, label, required = false) {
  const text = String(value || '').trim();
  if (required && !text) throw new ApiError(400, label + ' is required.');
  if (text.length > maximum) throw new ApiError(400, label + ' is too long.');
  return text;
}

function safeUrl(value, label, required = false) {
  const text = cleanText(value, 2000, label, required);
  if (!text) return null;
  if (/^(?:\/|\.\/)?(?:assets\/|app\.html|channels\.html|church-profile\.html|event-profile\.html)/i.test(text)) return text;
  let parsed;
  try { parsed = new URL(text); } catch { throw new ApiError(400, 'Use a valid ' + label.toLowerCase() + '.'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new ApiError(400, label + ' must use HTTPS.');
  return parsed.toString();
}

function integer(value, label, maximum = 86400) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > maximum) throw new ApiError(400, 'Invalid ' + label.toLowerCase() + '.');
  return number;
}

function isoDate(value, label) {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new ApiError(400, 'Invalid ' + label.toLowerCase() + '.');
  return new Date(time).toISOString();
}

function itemRecord(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    channelEntityId: row.channel_entity_id,
    subjectEntityId: row.subject_entity_id,
    contentType: row.content_type,
    title: row.title,
    caption: row.caption,
    creatorName: row.creator_name,
    creatorHandle: row.creator_handle,
    creatorAvatarUrl: row.creator_avatar_url,
    mediaUrl: row.media_url,
    posterUrl: row.poster_url,
    fullContentUrl: row.full_content_url,
    previewSource: row.preview_source,
    previewStartSeconds: row.preview_start_seconds,
    previewEndSeconds: row.preview_end_seconds,
    durationSeconds: row.duration_seconds,
    ctaLabel: row.cta_label,
    ctaUrl: row.cta_url,
    status: row.status,
    placementKind: row.placement_kind,
    moderationNote: row.moderation_note,
    commentsEnabled: Boolean(row.comments_enabled),
    priority: row.priority,
    scheduledAt: row.scheduled_at,
    expiresAt: row.expires_at,
    publishedAt: row.published_at,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    likes: Number(row.likes || 0),
    saves: Number(row.saves || 0),
    comments: Number(row.comments || 0),
    liked: Boolean(row.liked),
    saved: Boolean(row.saved)
  };
}

function validateItem(input) {
  const contentType = cleanText(input.contentType, 30, 'Content type', true);
  if (!contentTypes.has(contentType)) throw new ApiError(400, 'Choose a valid Spotlight content type.');
  const previewSource = input.previewSource === 'automatic' ? 'automatic' : 'creator';
  let previewStartSeconds = integer(input.previewStartSeconds, 'Preview start') ?? 0;
  let previewEndSeconds = integer(input.previewEndSeconds, 'Preview end');
  const durationSeconds = integer(input.durationSeconds, 'Duration', 43200);
  if (previewSource === 'automatic') {
    previewStartSeconds = 0;
    previewEndSeconds = Math.min(durationSeconds || 60, 60);
  }
  if (previewEndSeconds !== null && previewEndSeconds <= previewStartSeconds) throw new ApiError(400, 'Preview end must be after preview start.');
  if (durationSeconds !== null && previewEndSeconds !== null && previewEndSeconds > durationSeconds) throw new ApiError(400, 'Preview cannot end after the full content.');
  return {
    channelEntityId: cleanText(input.channelEntityId, 128, 'Channel') || null,
    subjectEntityId: cleanText(input.subjectEntityId, 128, 'Featured profile') || null,
    contentType,
    title: cleanText(input.title, 120, 'Title', true),
    caption: cleanText(input.caption, 1000, 'Caption'),
    creatorName: cleanText(input.creatorName, 120, 'Creator name'),
    creatorHandle: cleanText(input.creatorHandle, 80, 'Creator handle'),
    creatorAvatarUrl: safeUrl(input.creatorAvatarUrl, 'Creator image'),
    mediaUrl: safeUrl(input.mediaUrl, 'Media URL'),
    posterUrl: safeUrl(input.posterUrl, 'Poster image', true),
    fullContentUrl: safeUrl(input.fullContentUrl, 'Full content URL'),
    previewSource,
    previewStartSeconds,
    previewEndSeconds,
    durationSeconds,
    ctaLabel: cleanText(input.ctaLabel, 60, 'Action label'),
    ctaUrl: safeUrl(input.ctaUrl, 'Action URL'),
    commentsEnabled: input.commentsEnabled !== false
  };
}

async function verifyChannel(env, user, channelId, tenantId, owner) {
  if (!channelId) return null;
  const channel = await env.DB.prepare("select id,tenant_id,state,data_json from platform_entities where id=? and kind='channels'").bind(channelId).first();
  if (!channel) throw new ApiError(404, 'Selected channel was not found.');
  if (!owner && channel.tenant_id !== tenantId) throw new ApiError(403, 'Choose a channel you manage.');
  if (!owner && !['owner', 'editor'].includes((await membership(env, user.id, channel.tenant_id))?.role)) throw new ApiError(403, 'Choose a channel you manage.');
  if (channel.state !== 'published') throw new ApiError(409, 'Publish and verify the channel before submitting it to Spotlight.');
  return JSON.parse(channel.data_json);
}

async function listFeed(request, env, ctx) {
  if (request.method !== 'GET') throw new ApiError(405, 'Method not allowed.');
  const now = new Date().toISOString();
  const user = await ctx.getSessionUser(request, env);
  const { results } = await env.DB.prepare(`
    select s.*,
      (select count(*) from spotlight_engagements e where e.item_id=s.id and e.action='like') likes,
      (select count(*) from spotlight_engagements e where e.item_id=s.id and e.action='save') saves,
      (select count(*) from spotlight_comments c where c.item_id=s.id and c.status='visible') comments,
      exists(select 1 from spotlight_engagements e where e.item_id=s.id and e.user_id=? and e.action='like') liked,
      exists(select 1 from spotlight_engagements e where e.item_id=s.id and e.user_id=? and e.action='save') saved
    from spotlight_items s
    where (
      s.status='live' or
      (s.status='approved' and (s.scheduled_at is null or s.scheduled_at<=?)) or
      (s.status='scheduled' and s.scheduled_at<=?)
    ) and (s.expires_at is null or s.expires_at>?)
    order by s.priority desc, coalesce(s.published_at,s.scheduled_at,s.updated_at) desc
    limit 100
  `).bind(user?.id || '', user?.id || '', now, now, now).all();
  return ctx.json({ ok: true, items: (results || []).map(itemRecord) });
}

async function workspace(request, env, ctx, id) {
  const user = await requireUser(request, env, ctx);
  const owner = await isOwner(env, user);
  if (request.method === 'GET') {
    const tenant = owner ? null : await ownTenant(env, user);
    const items = await env.DB.prepare(owner ? 'select * from spotlight_items order by updated_at desc limit 500' : 'select * from spotlight_items where tenant_id=? order by updated_at desc limit 500').bind(...(owner ? [] : [tenant])).all();
    const channels = await env.DB.prepare(owner ? "select id,data_json,tenant_id from platform_entities where kind='channels' and state='published' order by updated_at desc" : "select e.id,e.data_json,e.tenant_id from platform_entities e join tenant_memberships m on m.tenant_id=e.tenant_id where e.kind='channels' and e.state='published' and m.user_id=? and m.role in ('owner','editor') order by e.updated_at desc").bind(...(owner ? [] : [user.id])).all();
    return ctx.json({ ok: true, role: owner ? 'owner' : 'creator', items: (items.results || []).map(itemRecord), channels: (channels.results || []).map(row => ({ id: row.id, tenantId: row.tenant_id, ...JSON.parse(row.data_json) })) });
  }

  const input = await readJson(request);
  const data = validateItem(input);
  if (request.method === 'POST') {
    const tenantId = owner && input.tenantId ? cleanText(input.tenantId, 128, 'Tenant', true) : await ownTenant(env, user);
    const channel = await verifyChannel(env, user, data.channelEntityId, tenantId, owner);
    if (!owner && !data.channelEntityId) throw new ApiError(400, 'Choose the channel submitting this content.');
    const now = new Date().toISOString();
    const itemId = 'spotlight-' + crypto.randomUUID();
    const creatorName = data.creatorName || channel?.name || user.name;
    const creatorHandle = data.creatorHandle || channel?.handle || '';
    const creatorAvatarUrl = data.creatorAvatarUrl || channel?.avatar || null;
    const status = input.saveAsDraft ? 'draft' : 'pending';
    await env.DB.batch([
      env.DB.prepare(`insert into spotlight_items
        (id,tenant_id,created_by,channel_entity_id,subject_entity_id,content_type,title,caption,creator_name,creator_handle,creator_avatar_url,media_url,poster_url,full_content_url,preview_source,preview_start_seconds,preview_end_seconds,duration_seconds,cta_label,cta_url,status,comments_enabled,created_at,updated_at)
        values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(itemId, tenantId, user.id, data.channelEntityId, data.subjectEntityId, data.contentType, data.title, data.caption, creatorName, creatorHandle, creatorAvatarUrl, data.mediaUrl, data.posterUrl, data.fullContentUrl, data.previewSource, data.previewStartSeconds, data.previewEndSeconds, data.durationSeconds, data.ctaLabel, data.ctaUrl, status, Number(data.commentsEnabled), now, now),
      auditStatement(env, user.id, 'spotlight.submitted', itemId, tenantId)
    ]);
    const created = await env.DB.prepare('select * from spotlight_items where id=?').bind(itemId).first();
    return ctx.json({ ok: true, item: itemRecord(created) }, 201);
  }

  if (request.method === 'PUT' && id) {
    const existing = await env.DB.prepare('select * from spotlight_items where id=?').bind(id).first();
    if (!existing) throw new ApiError(404, 'Spotlight submission not found.');
    if (!owner && !['owner', 'editor'].includes((await membership(env, user.id, existing.tenant_id))?.role)) throw new ApiError(403, 'You cannot edit this submission.');
    if (Number(input.revision) !== existing.revision) throw new ApiError(409, 'This submission changed. Reload and try again.');
    const channel = await verifyChannel(env, user, data.channelEntityId, existing.tenant_id, owner);
    const now = new Date().toISOString();
    const status = input.saveAsDraft ? 'draft' : 'pending';
    const result = await env.DB.prepare(`update spotlight_items set channel_entity_id=?,subject_entity_id=?,content_type=?,title=?,caption=?,creator_name=?,creator_handle=?,creator_avatar_url=?,media_url=?,poster_url=?,full_content_url=?,preview_source=?,preview_start_seconds=?,preview_end_seconds=?,duration_seconds=?,cta_label=?,cta_url=?,comments_enabled=?,status=?,moderation_note=null,revision=revision+1,updated_at=? where id=? and revision=? returning *`).bind(data.channelEntityId, data.subjectEntityId, data.contentType, data.title, data.caption, data.creatorName || channel?.name || user.name, data.creatorHandle || channel?.handle || '', data.creatorAvatarUrl || channel?.avatar || null, data.mediaUrl, data.posterUrl, data.fullContentUrl, data.previewSource, data.previewStartSeconds, data.previewEndSeconds, data.durationSeconds, data.ctaLabel, data.ctaUrl, Number(data.commentsEnabled), status, now, id, existing.revision).first();
    if (!result) throw new ApiError(409, 'This submission changed. Reload and try again.');
    await auditStatement(env, user.id, 'spotlight.resubmitted', id, existing.tenant_id).run();
    return ctx.json({ ok: true, item: itemRecord(result) });
  }
  throw new ApiError(405, 'Method not allowed.');
}

async function moderate(request, env, ctx, id) {
  const user = await requireOwner(request, env, ctx);
  if (request.method !== 'PUT' || !id) throw new ApiError(405, 'Method not allowed.');
  const input = await readJson(request);
  const existing = await env.DB.prepare('select * from spotlight_items where id=?').bind(id).first();
  if (!existing) throw new ApiError(404, 'Spotlight submission not found.');
  if (Number(input.revision) !== existing.revision) throw new ApiError(409, 'This submission changed. Reload and try again.');
  const status = cleanText(input.status, 30, 'Status', true);
  const placement = cleanText(input.placementKind || existing.placement_kind, 30, 'Placement', true);
  if (!states.has(status) || !placements.has(placement)) throw new ApiError(400, 'Invalid moderation decision.');
  const scheduledAt = isoDate(input.scheduledAt, 'Schedule');
  const expiresAt = isoDate(input.expiresAt, 'Expiry');
  if (status === 'scheduled' && !scheduledAt) throw new ApiError(400, 'Choose a publication time for scheduled content.');
  if (scheduledAt && expiresAt && Date.parse(expiresAt) <= Date.parse(scheduledAt)) throw new ApiError(400, 'Expiry must be after publication.');
  const priority = integer(input.priority, 'Priority', 1000) ?? 0;
  const note = cleanText(input.moderationNote, 1000, 'Moderator note');
  const now = new Date().toISOString();
  const publishedAt = status === 'live' ? (existing.published_at || now) : existing.published_at;
  const result = await env.DB.prepare('update spotlight_items set status=?,placement_kind=?,moderation_note=?,priority=?,scheduled_at=?,expires_at=?,published_at=?,revision=revision+1,updated_at=? where id=? and revision=? returning *').bind(status, placement, note || null, priority, scheduledAt, expiresAt, publishedAt, now, id, existing.revision).first();
  if (!result) throw new ApiError(409, 'This submission changed. Reload and try again.');
  await auditStatement(env, user.id, 'spotlight.moderated.' + status, id, existing.tenant_id).run();
  return ctx.json({ ok: true, item: itemRecord(result) });
}

async function comments(request, env, ctx, itemId) {
  if (request.method !== 'GET') throw new ApiError(405, 'Method not allowed.');
  const { results } = await env.DB.prepare(`select c.id,c.body,c.created_at,u.name from spotlight_comments c join users u on u.id=c.user_id where c.item_id=? and c.status='visible' order by c.created_at desc limit 100`).bind(itemId).all();
  return ctx.json({ ok: true, comments: (results || []).map(row => ({ id: row.id, body: row.body, author: row.name, createdAt: row.created_at })) });
}

async function engage(request, env, ctx, itemId) {
  if (request.method !== 'POST') throw new ApiError(405, 'Method not allowed.');
  const user = await requireUser(request, env, ctx);
  const item = await env.DB.prepare('select id,tenant_id,comments_enabled from spotlight_items where id=?').bind(itemId).first();
  if (!item) throw new ApiError(404, 'Spotlight item not found.');
  const input = await readJson(request);
  const action = cleanText(input.action, 20, 'Action', true);
  const now = new Date().toISOString();
  if (['like', 'save', 'follow'].includes(action)) {
    const existing = await env.DB.prepare('select action from spotlight_engagements where item_id=? and user_id=? and action=?').bind(itemId, user.id, action).first();
    if (existing) await env.DB.prepare('delete from spotlight_engagements where item_id=? and user_id=? and action=?').bind(itemId, user.id, action).run();
    else await env.DB.prepare('insert into spotlight_engagements values (?,?,?,?)').bind(itemId, user.id, action, now).run();
    return ctx.json({ ok: true, active: !existing });
  }
  if (action === 'report') {
    await env.DB.prepare("insert into spotlight_engagements values (?,?,'report',?) on conflict do nothing").bind(itemId, user.id, now).run();
    await auditStatement(env, user.id, 'spotlight.reported', itemId, item.tenant_id).run();
    return ctx.json({ ok: true, active: true });
  }
  if (action === 'comment') {
    if (!item.comments_enabled) throw new ApiError(409, 'Comments are closed for this item.');
    const body = cleanText(input.body, 600, 'Comment', true);
    const id = crypto.randomUUID();
    await env.DB.prepare('insert into spotlight_comments (id,item_id,user_id,body,created_at) values (?,?,?,?,?)').bind(id, itemId, user.id, body, now).run();
    return ctx.json({ ok: true, comment: { id, body, author: user.name, createdAt: now } }, 201);
  }
  throw new ApiError(400, 'Unsupported Spotlight action.');
}

export async function handleSpotlightApi(request, env, ctx) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  if (parts[0] !== 'api' || parts[1] !== 'spotlight') return null;
  if (!env.DB) throw new ApiError(503, 'Storage unavailable.');
  const scope = parts[2] || 'feed';
  if (scope === 'feed') return listFeed(request, env, ctx);
  if (scope === 'workspace') return workspace(request, env, ctx, parts[3]);
  if (scope === 'admin') return moderate(request, env, ctx, parts[3]);
  if (scope === 'comments') return comments(request, env, ctx, parts[3]);
  if (scope === 'engagement') return engage(request, env, ctx, parts[3]);
  throw new ApiError(404, 'Spotlight endpoint not found.');
}
