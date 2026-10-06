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
  if (/^(?:\/|\.\/)?(?:assets\/[^\s]*|(?:app|channels|channel-detail|channel-content|church-profile|event-profile)\.html(?:[?#][^\s]*)?)$/i.test(text)) return text;
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
    ,following: Boolean(row.following)
    ,reminderAt: row.reminder_at || null
    ,channelUrl: row.channel_entity_id ? 'app.html?view=channel-detail&id=' + encodeURIComponent(row.channel_entity_id) : null
    ,contentUrl: 'app.html?view=channel-content&id=' + encodeURIComponent(row.channel_entity_id || '') + '&post=' + encodeURIComponent(row.id)
    ,permalink: 'app.html?view=spotlight&post=' + encodeURIComponent(row.id)
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
      exists(select 1 from spotlight_engagements e where e.item_id=s.id and e.user_id=? and e.action='save') saved,
      exists(select 1 from channel_follows f where f.channel_id=s.channel_entity_id and f.user_id=?) following,
      (select due_at from spotlight_reminders r where r.item_id=s.id and r.user_id=? and r.delivered_at is null) reminder_at
    from spotlight_items s
    where (
      s.status='live' or
      (s.status='approved' and (s.scheduled_at is null or s.scheduled_at<=?)) or
      (s.status='scheduled' and s.scheduled_at<=?)
    ) and (s.expires_at is null or s.expires_at>?)
    and exists(select 1 from platform_entities channel where channel.id=s.channel_entity_id and channel.kind='channels' and channel.state='published')
    order by s.priority desc, coalesce(s.published_at,s.scheduled_at,s.updated_at) desc
    limit 100
  `).bind(user?.id || '', user?.id || '', user?.id || '', user?.id || '', now, now, now).all();
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
    if (!data.channelEntityId) throw new ApiError(400, 'Choose the channel submitting this content.');
    if (['short','long-preview','live'].includes(data.contentType) && !/^https:\/\//i.test(data.fullContentUrl||'')) throw new ApiError(400, 'Add the HTTPS full video URL.');
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
    if (!data.channelEntityId) throw new ApiError(400, 'Choose the channel submitting this content.');
    if (['short','long-preview','live'].includes(data.contentType) && !/^https:\/\//i.test(data.fullContentUrl||'')) throw new ApiError(400, 'Add the HTTPS full video URL.');
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
  if (['live','approved','scheduled'].includes(status)) {
    if (!existing.channel_entity_id) throw new ApiError(409, 'Assign a published channel before publishing.');
    await verifyChannel(env, user, existing.channel_entity_id, existing.tenant_id, true);
    if (['short','long-preview','live'].includes(existing.content_type) && !/^https:\/\//i.test(existing.full_content_url||'')) throw new ApiError(409, 'Add the HTTPS full video URL before publishing.');
  }
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
  await publicItem(env,itemId);
  const { results } = await env.DB.prepare(`select c.id,c.body,c.created_at,u.name from spotlight_comments c join users u on u.id=c.user_id where c.item_id=? and c.status='visible' order by c.created_at desc limit 100`).bind(itemId).all();
  return ctx.json({ ok: true, comments: (results || []).map(row => ({ id: row.id, body: row.body, author: row.name, createdAt: row.created_at })) });
}

async function engage(request, env, ctx, itemId) {
  if (request.method !== 'POST') throw new ApiError(405, 'Method not allowed.');
  const user = await requireUser(request, env, ctx);
  const item = await publicItem(env,itemId);
  const input = await readJson(request);
  const action = cleanText(input.action, 20, 'Action', true);
  const now = new Date().toISOString();
  if (action === 'follow') {
    if (!item.channel_entity_id) throw new ApiError(409,'This post needs a channel association.');
    if (typeof input.active !== 'boolean') throw new ApiError(400,'Choose follow or unfollow.');
    if (input.active) await env.DB.prepare('insert into channel_follows(user_id,channel_id,created_at) values (?,?,?) on conflict do nothing').bind(user.id,item.channel_entity_id,now).run();
    else await env.DB.prepare('delete from channel_follows where user_id=? and channel_id=?').bind(user.id,item.channel_entity_id).run();
    return ctx.json({ok:true,active:input.active});
  }
  if (['like', 'save'].includes(action)) {
    if (typeof input.active === 'boolean') {
      if (input.active) await env.DB.prepare('insert into spotlight_engagements values (?,?,?,?) on conflict do nothing').bind(itemId,user.id,action,now).run();
      else await env.DB.prepare('delete from spotlight_engagements where item_id=? and user_id=? and action=?').bind(itemId,user.id,action).run();
      return ctx.json({ok:true,active:input.active,item:await memberItem(env,itemId,user.id)});
    }
    const existing = await env.DB.prepare('select action from spotlight_engagements where item_id=? and user_id=? and action=?').bind(itemId, user.id, action).first();
    if (existing) await env.DB.prepare('delete from spotlight_engagements where item_id=? and user_id=? and action=?').bind(itemId, user.id, action).run();
    else await env.DB.prepare('insert into spotlight_engagements values (?,?,?,?)').bind(itemId, user.id, action, now).run();
    return ctx.json({ ok: true, active: !existing, item:await memberItem(env,itemId,user.id) });
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
    return ctx.json({ ok: true, comment: { id, body, author: user.name, createdAt: now }, item:await memberItem(env,itemId,user.id) }, 201);
  }
  throw new ApiError(400, 'Unsupported Spotlight action.');
}

const visibleSql = `(s.status='live' or (s.status='approved' and (s.scheduled_at is null or s.scheduled_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now'))) or (s.status='scheduled' and s.scheduled_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now'))) and (s.expires_at is null or s.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')) and exists(select 1 from platform_entities channel where channel.id=s.channel_entity_id and channel.kind='channels' and channel.state='published')`;
async function publicItem(env,id) {
  const row=await env.DB.prepare(`select s.* from spotlight_items s where s.id=? and ${visibleSql}`).bind(id).first();
  if(!row) throw new ApiError(404,'This Spotlight post is unavailable.');
  return row;
}
async function memberItem(env,id,userId='') {
  const row=await publicItem(env,id);
  const stats=await env.DB.prepare(`select
    (select count(*) from spotlight_engagements where item_id=? and action='like') likes,
    (select count(*) from spotlight_engagements where item_id=? and action='save') saves,
    (select count(*) from spotlight_comments where item_id=? and status='visible') comments,
    exists(select 1 from spotlight_engagements where item_id=? and user_id=? and action='like') liked,
    exists(select 1 from spotlight_engagements where item_id=? and user_id=? and action='save') saved,
    exists(select 1 from channel_follows where channel_id=? and user_id=?) following,
    (select due_at from spotlight_reminders where item_id=? and user_id=? and delivered_at is null) reminder_at`).bind(id,id,id,id,userId,id,userId,row.channel_entity_id,userId,id,userId).first();
  return itemRecord({...row,...stats});
}

export async function deliverSpotlightNotifications(env) {
  if(!env.DB) return;
  const now=new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`insert into spotlight_publications select s.id,coalesce(s.published_at,s.scheduled_at,s.updated_at) from spotlight_items s where ${visibleSql} and s.channel_entity_id is not null and not exists(select 1 from spotlight_publications p where p.item_id=s.id) limit 500`),
    env.DB.prepare(`insert or ignore into spotlight_notifications(id,user_id,item_id,kind,created_at)
      select 'publication:'||f.user_id||':'||s.id,f.user_id,s.id,'publication',p.published_at
      from spotlight_publications p join spotlight_items s on s.id=p.item_id join channel_follows f on f.channel_id=s.channel_entity_id
      where ${visibleSql} and f.notifications_enabled=1 and f.created_at<=p.published_at
      and not exists(select 1 from spotlight_notifications n where n.id='publication:'||f.user_id||':'||s.id) limit 500`),
    env.DB.prepare(`insert or ignore into spotlight_notifications(id,user_id,item_id,kind,created_at)
      select 'reminder:'||r.user_id||':'||r.item_id||':'||r.due_at,r.user_id,r.item_id,'reminder',?
      from spotlight_reminders r join spotlight_items s on s.id=r.item_id where r.delivered_at is null and r.due_at<=? and ${visibleSql} limit 500`).bind(now,now),
    env.DB.prepare(`update spotlight_reminders set delivered_at=? where delivered_at is null and exists(select 1 from spotlight_notifications n where n.id='reminder:'||spotlight_reminders.user_id||':'||spotlight_reminders.item_id||':'||spotlight_reminders.due_at)`).bind(now)
  ]);
}

async function discovery(request,env,ctx,scope,id) {
  if(scope==='item' || scope==='channel') {
    if(request.method!=='GET') throw new ApiError(405,'Method not allowed.');
    const user=await ctx.getSessionUser(request,env);
    if(scope==='item') return ctx.json({ok:true,item:await memberItem(env,id,user?.id||'')});
    const channel=await env.DB.prepare("select id from platform_entities where id=? and kind='channels' and state='published'").bind(id).first();
    if(!channel)throw new ApiError(404,'Channel unavailable.');
    const {results}=await env.DB.prepare(`select s.id from spotlight_items s where s.channel_entity_id=? and ${visibleSql} order by coalesce(s.published_at,s.updated_at) desc limit 100`).bind(id).all();
    const follow=await env.DB.prepare('select notifications_enabled from channel_follows where user_id=? and channel_id=?').bind(user?.id||'',id).first();
    const counts=await env.DB.prepare('select count(*) count from channel_follows where channel_id=?').bind(id).first();
    return ctx.json({ok:true,following:!!follow,notificationsEnabled:!!follow?.notifications_enabled,followers:counts.count,items:await Promise.all(results.map(row=>memberItem(env,row.id,user?.id||'')))});
  }
  const user=await requireUser(request,env,ctx);
  if(scope==='channel-follow') {
    if(request.method!=='PUT')throw new ApiError(405,'Method not allowed.');
    const channel=await env.DB.prepare("select id from platform_entities where id=? and kind='channels' and state='published'").bind(id).first();if(!channel)throw new ApiError(404,'Channel unavailable.');
    const input=await readJson(request);if(typeof input.active!=='boolean')throw new ApiError(400,'Choose follow or unfollow.');
    if(input.active)await env.DB.prepare('insert into channel_follows(user_id,channel_id,notifications_enabled,created_at) values (?,?,?,?) on conflict(user_id,channel_id) do update set notifications_enabled=excluded.notifications_enabled').bind(user.id,id,input.notificationsEnabled===false?0:1,new Date().toISOString()).run();
    else await env.DB.prepare('delete from channel_follows where user_id=? and channel_id=?').bind(user.id,id).run();
    return ctx.json({ok:true,following:input.active,notificationsEnabled:input.active&&input.notificationsEnabled!==false});
  }
  if(scope==='saved' || scope==='following') {
    if(request.method!=='GET') throw new ApiError(405,'Method not allowed.');
    const cursor=new URL(request.url).searchParams.get('cursor')||'';
    const relation=scope==='saved'?`exists(select 1 from spotlight_engagements e where e.item_id=s.id and e.user_id=? and e.action='save')`:`exists(select 1 from channel_follows f where f.channel_id=s.channel_entity_id and f.user_id=?)`;
    const {results}=await env.DB.prepare(`select s.id from spotlight_items s where ${visibleSql} and ${relation} and s.id>? order by s.id limit 50`).bind(user.id,cursor).all();
    return ctx.json({ok:true,items:await Promise.all(results.map(row=>memberItem(env,row.id,user.id))),nextCursor:results.length===50?results.at(-1).id:null});
  }
  if(scope==='notifications') {
    if(request.method==='PUT') {
      await env.DB.prepare('update spotlight_notifications set read_at=? where user_id=? and id=?').bind(new Date().toISOString(),user.id,id).run();
      return ctx.json({ok:true});
    }
    if(request.method!=='GET') throw new ApiError(405,'Method not allowed.');
    const {results}=await env.DB.prepare(`select n.*,s.title,s.channel_entity_id from spotlight_notifications n join spotlight_items s on s.id=n.item_id where n.user_id=? and ${visibleSql} order by n.created_at desc limit 100`).bind(user.id).all();
    return ctx.json({ok:true,notifications:results.map(row=>({id:row.id,itemId:row.item_id,title:row.title,kind:row.kind,read:!!row.read_at,createdAt:row.created_at,url:'app.html?view=spotlight&post='+encodeURIComponent(row.item_id)}))});
  }
  if(scope==='reminders') {
    await publicItem(env,id);
    if(request.method==='DELETE') {await env.DB.prepare('delete from spotlight_reminders where user_id=? and item_id=?').bind(user.id,id).run();return ctx.json({ok:true});}
    if(request.method!=='PUT') throw new ApiError(405,'Method not allowed.');
    const input=await readJson(request); const dueAt=isoDate(input.dueAt,'Reminder time');
    if(!dueAt || Date.parse(dueAt)<=Date.now() || Date.parse(dueAt)>Date.now()+90*86400000) throw new ApiError(400,'Choose a future time within 90 days.');
    await env.DB.prepare('insert into spotlight_reminders(user_id,item_id,due_at) values (?,?,?) on conflict(user_id,item_id) do update set due_at=excluded.due_at,delivered_at=null').bind(user.id,id,dueAt).run();
    return ctx.json({ok:true,dueAt});
  }
  throw new ApiError(404,'Spotlight endpoint not found.');
}

export async function handleSpotlightApi(request, env, ctx) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  if(parts[3]) {try{parts[3]=decodeURIComponent(parts[3]);}catch{throw new ApiError(400,'Invalid Spotlight identifier.');}}
  if (parts[0] !== 'api' || parts[1] !== 'spotlight') return null;
  if (!env.DB) throw new ApiError(503, 'Storage unavailable.');
  const scope = parts[2] || 'feed';
  if (['item','channel','channel-follow','saved','following','notifications','reminders'].includes(scope)) return discovery(request,env,ctx,scope,parts[3]);
  if (scope === 'feed') return listFeed(request, env, ctx);
  if (scope === 'workspace') return workspace(request, env, ctx, parts[3]);
  if (scope === 'admin') return moderate(request, env, ctx, parts[3]);
  if (scope === 'comments') return comments(request, env, ctx, parts[3]);
  if (scope === 'engagement') return engage(request, env, ctx, parts[3]);
  throw new ApiError(404, 'Spotlight endpoint not found.');
}
