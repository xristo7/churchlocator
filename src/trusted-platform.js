import { ApiError, readJson } from './security.js';
import { auditStatement, seal, unseal } from './identity-security.js';

export const kinds=['churches','meditation','events','store','products','channels','resources'];
export const taxonomyKeys=['denominations','languages','worship_styles','store_categories','product_categories','channel_topics','resource_topics'];
const privateKinds=['prayer','reflection','ride','visit','salvation','foundation','message','settings'];
const livestreamKinds={church:'churches',channel:'channels',store:'store'};
const forbidden=new Set(['createdBy','tenantId','createdAt','updatedAt','revision','verified','ticketsSold','followers','items','rating','orders','amountPaidCents','attachmentData','totpSecret','password','isOwner','role']);
const fields={
 churches:['name','city','country','postal','denomination','pastor','pastorTitle','pastorBio','pastorPhoto','about','location','email','phone','phoneLabel','emailHref','website','language','worship','ministries','sunday','midweek','photo','logo','tagline','livestream','history','vision','mission','statementOfFaith','firstVisit','parkingInformation','childrenInformation','gallery'],
 meditation:['title','subtitle','category','categoryLabel','theme','template','purpose','mode','timeMode','durationMinutes','toneFreq','themeColor','themeHue','cover','selectedAudio','audioTracks','ambience','verses','pictures','teachings','prayers','worship','journeySteps','inhaleWord','exhaleWord','autoPlayInterval','allowUserNavigation','icon','commentsEnabled','ownerName'],
 events:['title','churchId','eventType','startsAt','endsAt','venueName','city','country','coverImageUrl','registrationRequired','ticketPriceCents','currency','totalTickets','isFeatured','isPromoted','registrationUrl','livestreamUrl','directionsUrl','description','highlights','expectations','speakers','schedule','faqs','ownerName'],
 store:['name','ownerName','category','description','image','email','liveUrl','live'],
 products:['title','storeId','seller','sellerType','category','description','price','compareAt','inventory','status','featured','image','itemType','serviceType','packages'],
 channels:['name','owner','handle','topic','description','format','cover','avatar','live','liveUrl','posts'],
 resources:['title','creator','topic','description','type','format','duration','image','access','price','sourceUrl','pages','audioSrc','embedUrl']
};
function boolean(value) { return value===true || value===1 || value==='true'; }
function number(value, field, maximum=100000000) {
 const n=Number(value??0); if(!Number.isFinite(n) || n<0 || n>maximum) throw new ApiError(400,'Invalid '+field+'.'); return n;
}
function whole(value,field,max=1000000) { const n=number(value,field,max); if(!Number.isSafeInteger(n)) throw new ApiError(400,field+' must be a whole number.'); return n; }
const pastoralRoles=new Set(['owner','editor','pastor']);
function requiredText(value,label,maximum=5000) {
 const text=String(value||'').trim();
 if(!text || text.length>maximum) throw new ApiError(400,label+' is required and must be shorter than '+maximum+' characters.');
 return text;
}
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim()); }
function privateSubmission(kind,input,entity) {
 const allowed={
  prayer:['requestText','text','fullName','contact','confidential','urgency'],
  ride:['fullName','phone','email','ageGroup','passengers','preferredService','pickupAddress','accessibility','consent'],
  visit:['firstName','lastName','email','phone','gathering','interests','passCode'],
  salvation:['fullName','phone','email','address','needBible','needPrayer']
 }[kind];
 if(!allowed) return null;
 const data=Object.fromEntries(allowed.filter(key=>input[key]!==undefined).map(key=>[key,sanitizeValue(input[key],key)]));
 if(entity) {
  const entityData=JSON.parse(entity.data_json);
  data.churchId=entity.id;
  data.churchName=String(entityData.name||'Church');
 }
 if(kind==='prayer') {
  const request=requiredText(data.requestText||data.text,'Prayer request');
  data.requestText=request; delete data.text;
  if(data.urgency && !['normal','urgent'].includes(data.urgency)) throw new ApiError(400,'Invalid prayer urgency.');
  if(data.confidential && !['team','private'].includes(data.confidential)) throw new ApiError(400,'Invalid confidentiality setting.');
 }
 if(kind==='ride') {
  data.fullName=requiredText(data.fullName,'Full name',200); data.phone=requiredText(data.phone,'Phone',200);
  data.email=String(data.email||'').trim().toLowerCase(); if(!validEmail(data.email)) throw new ApiError(400,'Enter a valid email address.');
  data.pickupAddress=requiredText(data.pickupAddress,'Pickup address',1000);
  data.passengers=whole(data.passengers||1,'Passengers',10); if(data.passengers<1) throw new ApiError(400,'At least one passenger is required.');
  if(data.consent!==true && data.consent!=='true') throw new ApiError(400,'Contact consent is required for ride coordination.');
  data.consent=true; data.stage=1; data.stage1Confirmed=false; data.stage2Confirmed=false; data.driver='Unassigned'; data.pickupWindow='Pending availability verification';
 }
 if(kind==='visit') {
  data.firstName=requiredText(data.firstName,'First name',200); data.lastName=requiredText(data.lastName,'Last name',200);
  data.email=String(data.email||'').trim().toLowerCase(); if(!validEmail(data.email)) throw new ApiError(400,'Enter a valid email address.');
  data.phone=requiredText(data.phone,'Phone',200); data.gathering=requiredText(data.gathering,'Gathering',300);
  data.interests=Array.isArray(data.interests)?data.interests.slice(0,10).map(item=>String(item).slice(0,80)):[];
 }
 if(kind==='salvation') {
  data.fullName=requiredText(data.fullName,'Full name',200); data.phone=requiredText(data.phone,'Phone',200);
  data.email=String(data.email||'').trim().toLowerCase(); if(!validEmail(data.email)) throw new ApiError(400,'Enter a valid email address.');
  data.needBible=boolean(data.needBible); data.needPrayer=boolean(data.needPrayer);
 }
 return data;
}
function sanitizeValue(value, key='') {
 if(typeof value==='string') {
  if(/url$|^(website|image|photo|cover|logo|pastorPhoto|src|audioSrc)$/i.test(key) && value && value!=='#') {
   const url=new URL(value,'https://assets.invalid/');
   if(url.protocol!=='https:' || url.username || url.password) throw new ApiError(400,'Use a safe HTTPS media URL.');
  }
  if(/^[a-z][a-z0-9_-]*$/i.test(key) && ['icon','theme','template','categoryLabel'].includes(key) && /[<>"'\\]/.test(value)) throw new ApiError(400,'Invalid display value.');
  return value;
 }
 if(Array.isArray(value)) { if(value.length>100) throw new ApiError(400,'Too many entries.'); return value.map(v=>sanitizeValue(v,key)); }
 if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).filter(([k])=>!forbidden.has(k) && !['__proto__','constructor','prototype'].includes(k)).map(([k,v])=>[k,sanitizeValue(v,k)]));
 return value;
}
export function validateEntity(kind,input) {
 if(!kinds.includes(kind) || !input || typeof input!=='object' || Array.isArray(input)) throw new ApiError(400,'Invalid content.');
 const data=Object.fromEntries(fields[kind].filter(k=>input[k]!==undefined).map(k=>[k,sanitizeValue(input[k],k)]));
 if(!String(data.name||data.title||'').trim()) throw new ApiError(400,'A title or name is required.');
 if(kind==='churches') { if(!data.city || !data.country) throw new ApiError(400,'City and country are required.'); if(data.livestream) { data.livestream.enabled=boolean(data.livestream.enabled); data.livestream.paid=false; if(data.livestream.enabled && !data.livestream.url) throw new ApiError(400,'Broadcast URL required.'); } }
 if(kind==='events') {
  const start=Date.parse(data.startsAt), end=Date.parse(data.endsAt);
  if(!Number.isFinite(start) || !Number.isFinite(end) || end<=start) throw new ApiError(400,'Use valid event dates with end after start.');
  if(!['in-person','online','streamed','hybrid'].includes(data.eventType)) throw new ApiError(400,'Invalid event format.');
  data.ticketPriceCents=whole(data.ticketPriceCents,'Ticket price'); data.totalTickets=whole(data.totalTickets,'Capacity');
  if(!['CAD','USD','GBP','EUR'].includes(data.currency)) throw new ApiError(400,'Unsupported currency.');
 }
 if(kind==='products') { data.price=number(data.price,'Price',100000); if(!Number.isSafeInteger(Math.round(data.price*100)) || Math.abs(data.price*100-Math.round(data.price*100))>1e-7) throw new ApiError(400,'Use prices in whole minor units.'); data.inventory=whole(data.inventory,'Inventory'); if(!['Draft','Active','Archived'].includes(data.status)) throw new ApiError(400,'Invalid product state.'); }
 if(kind==='resources') { data.price=number(data.price,'Price',100000); if(!['Free','Paid'].includes(data.access) || (data.access==='Paid' && data.price<=0)) throw new ApiError(400,'Invalid resource access or price.'); if(data.access==='Free') data.price=0; }
 if(kind==='meditation') { data.toneFreq=number(data.toneFreq,'Tone',2000); if(data.toneFreq<20 || !Array.isArray(data.verses) || !data.verses.length) throw new ApiError(400,'Add scripture and a tone between 20 and 2000 Hz.'); data.commentsEnabled=boolean(data.commentsEnabled); }
 for(const key of ['live','featured','registrationRequired','isFeatured','isPromoted']) if(key in data) data[key]=boolean(data[key]);
 return data;
}
export async function requireUser(request,env,ctx) {
 const user=await ctx.getSessionUser(request,env); if(!user) throw new ApiError(401,'Sign in required.'); return user;
}
export async function isOwner(env,user) {
 if(!user?.email_verified_at || !user.totp_secret_encrypted || !user.mfa_verified_at) return false;
 return !!await env.DB.prepare("select user_id from platform_roles where user_id=? and role='owner'").bind(user.id).first();
}
export async function requireOwner(request,env,ctx) { const user=await requireUser(request,env,ctx); if(!await isOwner(env,user)) throw new ApiError(403,'Verified platform owner with MFA required.'); return user; }
export async function ownTenant(env,user) {
 if(!user.is_creator) throw new ApiError(403,'Creator account required.');
 const existing=await env.DB.prepare('select id from tenants where owner_user_id=?').bind(user.id).first();
 if(existing) return existing.id;
 const id=crypto.randomUUID(), now=new Date().toISOString();
 await env.DB.batch([
  env.DB.prepare('insert into tenants values (?,?,?,?) on conflict(owner_user_id) do nothing').bind(id,user.id,user.name,now),
  env.DB.prepare("insert into tenant_memberships select id,?,'owner' from tenants where owner_user_id=? on conflict(tenant_id,user_id) do nothing").bind(user.id,user.id)
 ]);
 return (await env.DB.prepare('select id from tenants where owner_user_id=?').bind(user.id).first()).id;
}
export async function membership(env,userId,tenantId) { return env.DB.prepare('select role from tenant_memberships where tenant_id=? and user_id=?').bind(tenantId,userId).first(); }
function entityRecord(row,publicView=false) {
 const data=JSON.parse(row.data_json);
 if(publicView && row.kind==='resources' && data.access==='Paid') for(const field of ['sourceUrl','pages','audioSrc','embedUrl']) delete data[field];
 if(publicView && row.kind==='resources') delete data.sourceUrl;
 return {...data,id:row.id,kind:row.kind,tenantId:row.tenant_id,createdBy:publicView?'tenant:'+row.tenant_id:row.created_by,state:row.state,publicationState:row.state,revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at,verified:row.state==='published',...(publicView?{canMessage:!!row.owner_user_id&&!row.owner_user_id.startsWith('system:')}:{})};
}

async function canManageEntity(env,user,entity) {
 if(!user) return false;
 if(await isOwner(env,user)) return true;
 return ['owner','editor'].includes((await membership(env,user.id,entity.tenant_id))?.role);
}
async function checkRelated(env,user,kind,data,tenantId,owner) {
 const id=kind==='products'?data.storeId:kind==='events'?data.churchId:null;
 if(!id) { if(kind==='products') throw new ApiError(400,'Choose a store you manage.'); return; }
 const parent=await env.DB.prepare('select kind,tenant_id from platform_entities where id=?').bind(id).first();
 if(!parent || parent.kind!==(kind==='products'?'store':'churches') || parent.tenant_id!==tenantId) throw new ApiError(403,'Related content must belong to the same tenant.');
 if(!owner && !['owner','editor'].includes((await membership(env,user.id,parent.tenant_id))?.role)) throw new ApiError(403,'Related content is not yours to manage.');
}
async function checkTaxonomyValues(env,kind,data,previous={}) {
 const links={churches:{denomination:'denominations',language:'languages',worship:'worship_styles'},store:{category:'store_categories'},products:{category:'product_categories'},channels:{topic:'channel_topics'},resources:{topic:'resource_topics'}}[kind];
 if(!links) return;
 for(const [field,key] of Object.entries(links)) {
  const value=String(data[field]||'').trim();
  if(!value || value===String(previous[field]||'').trim()) continue;
  const row=await env.DB.prepare('select items_json from platform_taxonomies where key=?').bind(key).first();
  const allowed=row?JSON.parse(row.items_json):[];
  if(!allowed.includes(value)) throw new ApiError(400,'Choose a current '+field.replaceAll('_',' ')+'.');
 }
}
function projectionStatements(env,kind,id,data,state,updatedAt) {
 if(kind==='churches') return [env.DB.prepare(`insert into churches (id,name,city,country,postal_code,denomination,language,worship_style,website,phone,email,cover_image_url,livestream_enabled,livestream_paid,livestream_url,description,is_verified,created_at)
 select ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? where exists(select 1 from platform_entities where id=? and updated_at=?)
 on conflict(id) do update set name=excluded.name,city=excluded.city,country=excluded.country,postal_code=excluded.postal_code,denomination=excluded.denomination,language=excluded.language,worship_style=excluded.worship_style,website=excluded.website,phone=excluded.phone,email=excluded.email,cover_image_url=excluded.cover_image_url,livestream_enabled=excluded.livestream_enabled,livestream_paid=0,livestream_url=excluded.livestream_url,description=excluded.description,is_verified=excluded.is_verified`).bind(id,data.name,data.city,data.country,data.postal||'',data.denomination||'',data.language||'',data.worship||'',data.website||'',data.phone||'',data.email||'',data.photo||'',Number(state==='published'&&!!data.livestream?.enabled),0,data.livestream?.url||'',data.about||'',Number(state==='published'),updatedAt,id,updatedAt)];
 if(kind==='events') return [env.DB.prepare(`insert into events (id,church_id,title,event_type,starts_at,ends_at,venue_name,city,country,cover_image_url,registration_required,ticket_price_cents,currency,total_tickets,tickets_sold,is_featured,is_promoted,registration_url,livestream_url,directions_url,description)
 select ?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,? where exists(select 1 from platform_entities where id=? and updated_at=?)
 on conflict(id) do update set church_id=excluded.church_id,title=excluded.title,event_type=excluded.event_type,starts_at=excluded.starts_at,ends_at=excluded.ends_at,venue_name=excluded.venue_name,city=excluded.city,country=excluded.country,cover_image_url=excluded.cover_image_url,registration_required=excluded.registration_required,ticket_price_cents=excluded.ticket_price_cents,currency=excluded.currency,total_tickets=excluded.total_tickets,is_featured=excluded.is_featured,is_promoted=excluded.is_promoted,registration_url=excluded.registration_url,livestream_url=excluded.livestream_url,directions_url=excluded.directions_url,description=excluded.description`).bind(id,data.churchId||null,data.title,data.eventType,data.startsAt,data.endsAt,data.venueName||'',data.city||'',data.country||'',data.coverImageUrl||'',Number(!!data.registrationRequired),data.ticketPriceCents,data.currency,data.totalTickets,Number(!!data.isFeatured),Number(!!data.isPromoted),data.registrationUrl||'',data.livestreamUrl||'',data.directionsUrl||'',data.description||'',id,updatedAt)];
 return [];
}
export async function writeEntity(request,env,ctx,kind,id) {
 const user=await requireUser(request,env,ctx), owner=await isOwner(env,user), input=await readJson(request);
 const existing=id?await env.DB.prepare('select * from platform_entities where id=? and kind=?').bind(id,kind).first():null;
 if(id && !existing) throw new ApiError(404,'Content not found.');
 const tenantId=existing?.tenant_id || await ownTenant(env,{...user,is_creator:owner || user.is_creator});
 if(!owner && !['owner','editor'].includes((await membership(env,user.id,tenantId))?.role)) throw new ApiError(403,'You cannot manage this tenant.');
 if(existing && Number(input.revision)!==existing.revision) throw new ApiError(409,'Content changed. Reload before saving.');
 const previous=existing?JSON.parse(existing.data_json):{}, data=validateEntity(kind,{...previous,...input});
 await checkTaxonomyValues(env,kind,data,previous);
 await checkRelated(env,user,kind,data,tenantId,owner);
 let state=input.publicationState || (owner?existing?.state:'pending') || 'pending';
 if(!['draft','pending','published','archived'].includes(state)) throw new ApiError(400,'Invalid publication state.');
 if(state==='published' && (!owner || !user.email_verified_at)) throw new ApiError(403,'Platform owner approval is required to publish.');
 if(kind==='events') { const stock=await env.DB.prepare('select tickets_sold from events where id=?').bind(id||'').first(); if(data.totalTickets>0 && data.totalTickets<(stock?.tickets_sold||0)) throw new ApiError(409,'Capacity cannot be below existing reservations.'); }
 const entityId=id||kind+'-'+crypto.randomUUID(), now=new Date().toISOString(), updateStamp=now.replace('Z',String(crypto.getRandomValues(new Uint32Array(1))[0]).padStart(10,'0')+'Z');
 const statement=existing?env.DB.prepare('update platform_entities set data_json=?,state=?,revision=revision+1,updated_at=? where id=? and revision=? returning *').bind(JSON.stringify(data),state,updateStamp,entityId,existing.revision):env.DB.prepare('insert into platform_entities (id,kind,tenant_id,created_by,state,data_json,created_at,updated_at) values (?,?,?,?,?,?,?,?) returning *').bind(entityId,kind,tenantId,user.id,state,JSON.stringify(data),now,updateStamp);
 const results=await env.DB.batch([statement,...projectionStatements(env,kind,entityId,data,state,updateStamp),env.DB.prepare('insert into audit_log select ?,?,?,?,?,? where exists(select 1 from platform_entities where id=? and updated_at=?)').bind(crypto.randomUUID(),user.id,existing?'entity.updated':'entity.created',entityId,tenantId,now,entityId,updateStamp)]);
 if(!results[0].results?.length) throw new ApiError(409,'Content changed. Reload before saving.');
 return ctx.json({ok:true,record:entityRecord(results[0].results[0])},existing?200:201);
}
export async function handlePlatformApi(request,env,ctx) {
 const url=new URL(request.url), parts=url.pathname.split('/').filter(Boolean), scope=parts[1];
 if(!['catalog','taxonomies','workspace','private','admin-audit','tenant-members','resource-material','livestream-chat','meditation-chat'].includes(scope)) return null;
 if(!env.DB) throw new ApiError(503,'Storage unavailable.');
 if(scope==='meditation-chat') {
  const roomId=parts[2];
  if(!roomId || roomId.length>128) throw new ApiError(404,'Meditation chat not found.');
  const entity=await env.DB.prepare("select * from platform_entities where id=? and kind='meditation' and state='published'").bind(roomId).first();
  if(!entity) throw new ApiError(404,'Meditation chat not found.');
  const viewer=await ctx.getSessionUser(request,env), manager=await canManageEntity(env,viewer,entity), room=JSON.parse(entity.data_json);
  if(request.method==='GET') {
   const {results}=await env.DB.prepare(`select m.id,m.user_id,m.body,m.is_host,m.created_at,u.name
    from meditation_chat_messages m join users u on u.id=m.user_id
    where m.room_id=? and m.deleted_at is null
    order by m.created_at desc,m.id desc limit 100`).bind(roomId).all();
   const messages=(results||[]).reverse().map(row=>({id:row.id,name:row.name,body:row.body,isHost:!!row.is_host,createdAt:row.created_at,own:row.user_id===viewer?.id}));
   return ctx.json({ok:true,enabled:!!room.commentsEnabled,canManage:manager,revision:entity.revision,messages});
  }
  if(request.method==='POST') {
   const user=viewer||await requireUser(request,env,ctx), isHost=manager||await canManageEntity(env,user,entity);
   if(!room.commentsEnabled) throw new ApiError(409,'Comments are closed for this meditation room.');
   const input=await readJson(request), body=String(input.body||'').trim();
   if(!body || body.length>300) throw new ApiError(400,'Comments must be between 1 and 300 characters.');
   const id=crypto.randomUUID(), createdAt=new Date().toISOString();
   await env.DB.prepare('insert into meditation_chat_messages (id,room_id,user_id,body,is_host,created_at) values (?,?,?,?,?,?)').bind(id,roomId,user.id,body,Number(isHost),createdAt).run();
   return ctx.json({ok:true,message:{id,name:user.name,body,isHost,createdAt,own:true}},201);
  }
  if(request.method==='PUT') {
   const user=viewer||await requireUser(request,env,ctx);
   if(!manager && !await canManageEntity(env,user,entity)) throw new ApiError(403,'Only this room’s creator can change comments.');
   const input=await readJson(request), enabled=input.enabled===true, now=new Date().toISOString();
   room.commentsEnabled=enabled;
   const result=await env.DB.prepare('update platform_entities set data_json=?,revision=revision+1,updated_at=? where id=? and revision=? returning revision').bind(JSON.stringify(room),now,roomId,Number(input.revision)).first();
   if(!result) throw new ApiError(409,'Room settings changed. Reload and try again.');
   await auditStatement(env,user.id,'meditation.comments.'+(enabled?'enabled':'disabled'),roomId,entity.tenant_id).run();
   return ctx.json({ok:true,enabled,revision:result.revision});
  }
  throw new ApiError(405,'Method not allowed.');
 }
 if(scope==='livestream-chat') {
  const streamType=parts[2], entityId=parts[3], kind=livestreamKinds[streamType];
  if(!kind || !entityId || entityId.length>128) throw new ApiError(404,'Livestream chat not found.');
  const entity=await env.DB.prepare("select id,data_json from platform_entities where id=? and kind=? and state='published'").bind(entityId,kind).first();
  if(!entity) throw new ApiError(404,'Livestream chat not found.');
  const data=JSON.parse(entity.data_json), active=streamType==='church' ? boolean(data.livestream?.enabled) && !!data.livestream?.url : boolean(data.live) && !!data.liveUrl;
  if(!active) throw new ApiError(404,'This broadcast is offline.');
  if(request.method==='GET') {
   const viewer=await ctx.getSessionUser(request,env);
   const {results}=await env.DB.prepare(`select m.id,m.user_id,m.body,m.created_at,u.name
    from livestream_chat_messages m join users u on u.id=m.user_id
    where m.entity_id=? and m.stream_type=? and m.deleted_at is null
    order by m.created_at desc,m.id desc limit 100`).bind(entityId,streamType).all();
   const messages=(results||[]).reverse().map(row=>({id:row.id,name:row.name,body:row.body,createdAt:row.created_at,own:row.user_id===viewer?.id}));
   return ctx.json({ok:true,messages});
  }
  if(request.method==='POST') {
   const user=await requireUser(request,env,ctx), input=await readJson(request), body=String(input.body||'').trim();
   if(!body || body.length>300) throw new ApiError(400,'Chat messages must be between 1 and 300 characters.');
   const id=crypto.randomUUID(), createdAt=new Date().toISOString();
   await env.DB.prepare('insert into livestream_chat_messages (id,entity_id,stream_type,user_id,body,created_at) values (?,?,?,?,?,?)').bind(id,entityId,streamType,user.id,body,createdAt).run();
   return ctx.json({ok:true,message:{id,name:user.name,body,createdAt,own:true}},201);
  }
  throw new ApiError(405,'Method not allowed.');
 }
 if(scope==='catalog' && request.method==='GET') {
  const kind=parts[2]; if(kind && !kinds.includes(kind)) throw new ApiError(404,'Collection not found.');
  const {results}=await env.DB.prepare(`select e.*,t.owner_user_id from platform_entities e join tenants t on t.id=e.tenant_id where e.state='published' ${kind?'and e.kind=?':''} order by e.updated_at desc limit 1000`).bind(...(kind?[kind]:[])).all();
  return ctx.json({ok:true,records:(results||[]).map(row=>entityRecord(row,true))});
 }
 if(scope==='taxonomies' && request.method==='GET') {
  const {results}=await env.DB.prepare('select key,items_json,revision,updated_at from platform_taxonomies order by key').bind().all();
  return ctx.json({ok:true,taxonomies:Object.fromEntries((results||[]).map(row=>[row.key,{items:JSON.parse(row.items_json),revision:row.revision,updatedAt:row.updated_at}]))});
 }
 if(scope==='resource-material') {
  if(request.method!=='GET') throw new ApiError(405,'Method not allowed.');
  const row=await env.DB.prepare("select * from platform_entities where id=? and kind='resources' and state='published'").bind(parts[2]||'').first();
  if(!row) throw new ApiError(404,'Resource not available.');
  const data=JSON.parse(row.data_json);
  if(data.access==='Paid') { const user=await requireUser(request,env,ctx); if(!await env.DB.prepare('select order_id from entitlements where user_id=? and entity_id=? and revoked_at is null').bind(user.id,row.id).first()) throw new ApiError(403,'Purchase verified access before opening this resource.'); }
  const allowed=String(env.RESOURCE_HOSTS||'').split(',').map(v=>v.trim()).filter(Boolean);
  for(const field of ['sourceUrl','audioSrc','embedUrl']) if(data[field]) { const material=new URL(data[field]); if(material.protocol!=='https:' || !allowed.includes(material.hostname)) throw new ApiError(503,'Resource delivery awaits a trusted material provider.'); }
  return ctx.json({ok:true,material:{pages:data.pages||[],sourceUrl:data.sourceUrl||null,audioSrc:data.audioSrc||null,embedUrl:data.embedUrl||null}});
 }
 const user=await requireUser(request,env,ctx), owner=await isOwner(env,user);
 if(scope==='taxonomies') {
  if(request.method!=='PUT' || !parts[2] || !taxonomyKeys.includes(parts[2])) throw new ApiError(request.method==='PUT'?404:405,request.method==='PUT'?'Platform option not found.':'Method not allowed.');
  if(!owner) throw new ApiError(403,'Platform owner with MFA required.');
  const input=await readJson(request), items=Array.isArray(input.items)?input.items.map(item=>String(item).trim()):[];
  if(!items.length || items.length>100 || items.some(item=>item.length<2 || item.length>80 || /[<>\u0000-\u001f]/.test(item))) throw new ApiError(400,'Use 1–100 plain-text options, each 2–80 characters.');
  if(new Set(items.map(item=>item.toLocaleLowerCase('en'))).size!==items.length) throw new ApiError(400,'Each option must be unique.');
  const now=new Date().toISOString();
  const row=await env.DB.prepare('update platform_taxonomies set items_json=?,revision=revision+1,updated_by=?,updated_at=? where key=? and revision=? returning key,items_json,revision,updated_at').bind(JSON.stringify(items),user.id,now,parts[2],Number(input.revision)).first();
  if(!row) throw new ApiError(409,'These options changed elsewhere. Reload before saving.');
  await auditStatement(env,user.id,'taxonomy.updated',parts[2],null).run();
  return ctx.json({ok:true,taxonomy:{key:row.key,items:JSON.parse(row.items_json),revision:row.revision,updatedAt:row.updated_at}});
 }
 if(scope==='workspace') {
  if(request.method==='GET') {
   const memberships=await env.DB.prepare('select tenant_id,role from tenant_memberships where user_id=?').bind(user.id).all();
   if(!owner && !user.is_creator && !memberships.results?.length) throw new ApiError(403,'Creator access required.');
   if(user.is_creator && !memberships.results?.length) await ownTenant(env,user);
   const {results}=await env.DB.prepare(owner?'select *,1 as can_manage from platform_entities order by updated_at desc limit 1000':`select e.*,m.role in ('owner','editor') as can_manage from platform_entities e join tenant_memberships m on m.tenant_id=e.tenant_id where m.user_id=? order by e.updated_at desc limit 1000`).bind(...(owner?[]:[user.id])).all();
   return ctx.json({ok:true,role:owner?'owner':'creator',records:(results||[]).map(row=>({...entityRecord(row),canManage:!!row.can_manage}))});
  }
  const kind=parts[2]; if(!kinds.includes(kind)) throw new ApiError(404,'Collection not found.');
  if(['POST','PUT'].includes(request.method)) return writeEntity(request,env,ctx,kind,parts[3]);
  throw new ApiError(405,'Method not allowed. Archive content through its editor.');
 }
 if(scope==='admin-audit') { if(request.method!=='GET') throw new ApiError(405,'Method not allowed.'); if(!owner) throw new ApiError(403,'Platform owner with MFA required.'); const {results}=await env.DB.prepare('select actor_user_id,action,entity_id,tenant_id,created_at from audit_log order by created_at desc limit 100').all(); return ctx.json({ok:true,events:results||[]}); }
 if(scope==='tenant-members') {
  const tenantId=parts[2], role=(await membership(env,user.id,tenantId))?.role;
  if(!owner && role!=='owner') throw new ApiError(403,'Tenant owner required.');
  if(request.method==='GET') { const {results}=await env.DB.prepare('select u.email,u.name,m.role from tenant_memberships m join users u on u.id=m.user_id where m.tenant_id=?').bind(tenantId).all(); return ctx.json({ok:true,members:results||[]}); }
  if(request.method==='POST') {
   if(!user.email_verified_at || !user.mfa_verified_at) throw new ApiError(403,'Verify email and MFA before granting access.');
   const input=await readJson(request); if(!['editor','viewer','pastor'].includes(input.role)) throw new ApiError(400,'Invalid membership role.');
   const member=await env.DB.prepare('select id,email_verified_at from users where email=?').bind(String(input.email||'').trim().toLowerCase()).first(); if(!member?.email_verified_at) throw new ApiError(409,'Recipient must verify their account first.');
   await env.DB.batch([env.DB.prepare('insert into tenant_memberships values (?,?,?) on conflict(tenant_id,user_id) do update set role=excluded.role where role!=\'owner\'').bind(tenantId,member.id,input.role),auditStatement(env,user.id,'membership.changed',member.id,tenantId)]);
   return ctx.json({ok:true});
  }
  throw new ApiError(405,'Method not allowed.');
 }
 if(scope==='private') {
  const kind=parts[2]; if(kind && !privateKinds.includes(kind)) throw new ApiError(404,'Private collection not found.');
  if(request.method==='GET') {
   const {results}=await env.DB.prepare(`select p.* from private_records p where (p.user_id=? or (p.visibility='recipient' and p.recipient_user_id=?) or (p.visibility='pastors' and exists(select 1 from tenant_memberships m where m.tenant_id=p.tenant_id and m.user_id=? and m.role in ('owner','editor','pastor')))) ${kind?'and p.kind=?':''} order by p.created_at desc limit 100`).bind(user.id,user.id,user.id,...(kind?[kind]:[])).all();
   const records=await Promise.all((results||[]).map(async row=>({...await unseal(env,row.data_encrypted,'private:'+row.id+':'+row.user_id),id:row.id,kind:row.kind,userId:row.user_id,recipientUserId:row.recipient_user_id,entityId:row.entity_id,status:row.status,revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at,direction:row.user_id===user.id?'sent':'received'})));
   return ctx.json({ok:true,records});
  }
  if(request.method==='POST' && kind) {
   const input=await readJson(request), id=crypto.randomUUID(), now=new Date().toISOString();
   const entityId=String(input.entityId||input.churchId||'') || null;
   const entity=entityId?await env.DB.prepare("select e.*,t.owner_user_id from platform_entities e join tenants t on t.id=e.tenant_id where e.id=? and e.state='published'").bind(entityId).first():null;
   if(entityId && !entity) throw new ApiError(404,'Destination not available.');
   if(['prayer','visit','ride','salvation'].includes(kind) && entity && entity.kind!=='churches') throw new ApiError(400,'Choose a published church.');
   if(['visit','ride','salvation'].includes(kind) && !entity) throw new ApiError(400,'Choose a published church.');
   let recipient=null, visibility='private';
   if(kind==='message') { if(!entity || entity.owner_user_id.startsWith('system:')) throw new ApiError(409,'Recipient has not activated their account.'); recipient=entity.owner_user_id; visibility='recipient'; }
   if(kind==='message' && input.replyTo) {
    const original=await env.DB.prepare("select * from private_records where id=? and kind='message' and entity_id=? and (user_id=? or recipient_user_id=?)").bind(input.replyTo,entityId,user.id,user.id).first();
    if(!original) throw new ApiError(404,'Conversation not found.');
    recipient=original.user_id===user.id?original.recipient_user_id:original.user_id;
   }
   else if(['prayer','visit','ride','salvation'].includes(kind) && input.visibility==='pastors') { if(!entity) throw new ApiError(400,'Choose a church for pastoral follow-up.'); visibility='pastors'; }
   const data=privateSubmission(kind,input,entity) || Object.fromEntries(Object.entries(input).filter(([key])=>!forbidden.has(key) && !['recipientUserId','userId','visibility','status','id','kind'].includes(key)));
   if(kind==='settings' && data.forwardingEnabled) throw new ApiError(409,'Automatic forwarding awaits verified email delivery.');
   if(kind==='message') { data.threadId='entity:'+entity.id+':'+[user.id,recipient].sort().join(':'); data.participant=JSON.parse(entity.data_json).name||JSON.parse(entity.data_json).title; data.participantType=entity.kind; if(!String(data.body||'').trim()) throw new ApiError(400,'Message text required.'); }
   const encrypted=await seal(env,data,'private:'+id+':'+user.id);
   await env.DB.batch([env.DB.prepare('insert into private_records (id,user_id,tenant_id,kind,entity_id,recipient_user_id,visibility,data_encrypted,created_at,updated_at) values (?,?,?,?,?,?,?,?,?,?)').bind(id,user.id,entity?.tenant_id||null,kind,entityId,recipient,visibility,encrypted,now,now),auditStatement(env,user.id,'private.'+kind+'.created',id,entity?.tenant_id||null)]);
   return ctx.json({ok:true,record:{...data,id,kind,status:'new',revision:1,createdAt:now,direction:'sent'}},201);
  }
  if(request.method==='PUT' && kind && parts[3]) {
   const input=await readJson(request), row=await env.DB.prepare("select * from private_records where id=? and kind=? and (user_id=? or recipient_user_id=? or (visibility='pastors' and exists(select 1 from tenant_memberships m where m.tenant_id=private_records.tenant_id and m.user_id=? and m.role in ('owner','editor','pastor'))))").bind(parts[3],kind,user.id,user.id,user.id).first();
   if(!row) throw new ApiError(404,'Private record not found.');
   const pastoral=row.visibility==='pastors' && pastoralRoles.has((await membership(env,user.id,row.tenant_id))?.role);
   if(!pastoral && !['read','cancelled'].includes(input.status)) throw new ApiError(403,'Pastoral follow-up must be confirmed by an assigned pastor.');
   if(!['new','read','contacted','completed','cancelled',...(kind==='ride'?['stage2_scheduling','confirmed']:[])].includes(input.status)) throw new ApiError(400,'Invalid status.');
   const data=await unseal(env,row.data_encrypted,'private:'+row.id+':'+row.user_id);
   if(kind==='ride' && pastoral) {data.stage=input.status==='stage2_scheduling'||input.status==='confirmed'?2:1;data.stage1Confirmed=data.stage===2;data.stage2Confirmed=input.status==='confirmed';if(input.status==='confirmed'){data.driver=String(input.driver||'Assigned by church');data.pickupWindow=String(input.pickupWindow||'Contact your church for pickup details');}}
   const result=await env.DB.prepare('update private_records set status=?,data_encrypted=?,revision=revision+1,updated_at=? where id=? and revision=? returning id').bind(input.status,await seal(env,data,'private:'+row.id+':'+row.user_id),new Date().toISOString(),row.id,input.revision).first(); if(!result) throw new ApiError(409,'Record changed. Reload.');
   await auditStatement(env,user.id,'private.status.changed',row.id,row.tenant_id).run(); return ctx.json({ok:true});
  }
  if(request.method==='DELETE' && kind && parts[3]) { const result=await env.DB.prepare('delete from private_records where id=? and kind=? and user_id=? returning id').bind(parts[3],kind,user.id).first(); if(!result) throw new ApiError(404,'Private record not found.'); await auditStatement(env,user.id,'private.deleted',parts[3]).run(); return ctx.json({ok:true}); }
 }
 throw new ApiError(405,'Method not allowed.');
}
