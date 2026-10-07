import {ApiError,readJson} from './security.js';
import {seal,unseal,auditStatement} from './identity-security.js';
import {requireUser,requireOwner,isOwner,membership} from './trusted-platform.js';

const settingsContext='live-provider-settings';
const stamp=()=>new Date().toISOString();
const encode=value=>encodeURIComponent(value);
async function configuration(env) {
  const row=await env.DB.prepare('select * from live_provider_settings where id=1').first();
  if(!row)throw new ApiError(503,'The platform owner needs to connect Cloudflare Stream and RealtimeKit in Live setup.');
  return {...row,token:await unseal(env,row.token_encrypted,settingsContext)};
}
async function cloudflare(config,path,method='GET',body,allowMissing=false) {
  const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+encode(config.account_id)+path,{method,headers:{authorization:'Bearer '+config.token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  let result;try{result=await response.json();}catch{throw new ApiError(502,'The live provider returned an unreadable response.');}
  if(allowMissing&&response.status===404)return {};
  if(!response.ok||result.success===false)throw new ApiError(response.status===401||response.status===403?503:502,'Cloudflare could not complete this live request. Check product access and API permissions in Live setup.');
  return result.result?.data??result.result??result.data;
}
const kit=(config,suffix)=>'/realtime/kit/'+encode(config.app_id)+suffix;
async function entity(env,id,kind) {
  const row=await env.DB.prepare('select * from platform_entities where id=? and kind=?').bind(id,kind).first();
  if(!row||row.state!=='published')throw new ApiError(404,'This published profile is unavailable.');
  return row;
}
async function manager(env,user,row) {return await isOwner(env,user)||['owner','editor'].includes((await membership(env,user.id,row.tenant_id))?.role);}
async function requireManager(request,env,ctx,row) {
  const user=await requireUser(request,env,ctx);if(!await manager(env,user,row))throw new ApiError(403,'Only this profile’s managers can control its live session.');return user;
}
function clean(value,max=160) {return String(value||'').trim().slice(0,max);}
function broadcastUrl(value) {
  let url;try{url=new URL(String(value||''));}catch{throw new ApiError(400,'Use a valid HTTPS playback or provider URL.');}
  if(url.protocol!=='https:'||url.username||url.password||['localhost','127.0.0.1','::1','[::1]'].includes(url.hostname)||!url.hostname.includes('.'))throw new ApiError(400,'Use a public HTTPS playback URL. Publishing URLs and stream keys belong in your streaming software.');
  return url.href;
}
function publicSource(row) {return row?{mode:row.mode,url:row.source_url,enabled:!!row.enabled,ready:row.status==='ready',revision:row.revision}:null;}

async function providerSettings(request,env,ctx) {
  const user=await requireOwner(request,env,ctx);
  const existing=await env.DB.prepare('select * from live_provider_settings where id=1').first();
  if(request.method==='GET')return ctx.json({ok:true,configured:!!existing,accountId:existing?.account_id||env.LIVE_CF_ACCOUNT_ID||'',appId:existing?.app_id||'',revision:existing?.revision||0});
  if(request.method!=='PUT')throw new ApiError(405,'Method not allowed.');
  const input=await readJson(request);
  const accountId=clean(input.accountId,32);
  if(!/^[a-f0-9]{32}$/.test(accountId)||accountId!==env.LIVE_CF_ACCOUNT_ID)throw new ApiError(400,'Use this platform’s hosting Cloudflare account.');
  if(Number(input.revision)!==(existing?.revision||0))throw new ApiError(409,'Live settings changed. Reload before saving.');
  const token=clean(input.apiToken,512)||(existing?await unseal(env,existing.token_encrypted,settingsContext):'');
  if(!token)throw new ApiError(400,'Enter a Cloudflare API token with Stream Edit and Realtime Admin permissions.');
  let appId=clean(input.appId,80)||existing?.app_id||'';
  if(appId&&!/^[a-zA-Z0-9-]+$/.test(appId))throw new ApiError(400,'Invalid RealtimeKit app ID.');
  if(existing&&appId!==existing.app_id&&(await env.DB.prepare("select id from channel_live_sessions where status in ('creating','live','ending') limit 1").first()))throw new ApiError(409,'End channel sessions before changing the RealtimeKit app.');
  const config={account_id:accountId,app_id:appId,token};
  await cloudflare(config,'/stream/live_inputs?limit=1');
  const apps=await cloudflare(config,'/realtime/kit/apps');
  if(!appId)appId=(apps||[]).find(app=>app.name==='My Way Channel Live')?.id||(await cloudflare(config,'/realtime/kit/apps','POST',{name:'My Way Channel Live'}))?.id;
  if(!appId||(apps?.length&&input.appId&&!apps.some(app=>app.id===appId)))throw new ApiError(400,'Select a RealtimeKit app from the hosting account.');
  config.app_id=appId;
  const presets=await cloudflare(config,kit(config,'/presets'));
  for(const name of ['webinar_presenter','webinar_viewer']){
    const preset=(presets||[]).find(p=>p.name===name);if(!preset)throw new ApiError(409,'The RealtimeKit app needs its webinar_presenter and webinar_viewer presets.');
    const details=await cloudflare(config,kit(config,'/presets/'+encode(preset.id)));
    const permissions=details.permissions;
    if(!permissions?.stage_enabled||details.config?.view_type!=='WEBINAR')throw new ApiError(409,'Configure webinar stage permissions before connecting this app.');
    if(name==='webinar_viewer'&&(permissions.can_accept_production_requests||permissions.stage_access!=='CAN_REQUEST'||permissions.media?.audio?.can_produce!=='CAN_REQUEST'||permissions.media?.video?.can_produce!=='CAN_REQUEST'))throw new ApiError(409,'Viewers must request stage access and cannot approve themselves.');
  }
  await env.DB.batch([
    env.DB.prepare('insert into live_provider_settings(id,account_id,app_id,token_encrypted,updated_at) values(1,?,?,?,?) on conflict(id) do update set account_id=excluded.account_id,app_id=excluded.app_id,token_encrypted=excluded.token_encrypted,revision=revision+1,updated_at=excluded.updated_at').bind(accountId,appId,await seal(env,token,settingsContext),stamp()),
    auditStatement(env,user.id,'live.providers.connected')
  ]);
  return ctx.json({ok:true,configured:true,appId});
}

async function church(request,env,ctx,id,action) {
  const row=await entity(env,id,'churches');
  const source=await env.DB.prepare('select * from church_broadcast_sources where church_id=?').bind(id).first();
  if(request.method==='GET'&&!action){
    const user=await ctx.getSessionUser(request,env);const canManage=user&&await manager(env,user,row);
    const legacy=JSON.parse(row.data_json).livestream;
    return ctx.json({ok:true,canManage:!!canManage,source:publicSource(source)||{mode:'external',url:legacy?.url||'',enabled:!!legacy?.enabled,ready:!!legacy?.url,revision:0}});
  }
  const user=await requireManager(request,env,ctx,row);
  if(request.method==='GET'&&action==='publishing'){
    if(!source?.input_id)throw new ApiError(404,'Create a managed broadcast first.');
    const config=await configuration(env),details=await cloudflare(config,'/stream/live_inputs/'+encode(source.input_id));
    return ctx.json({ok:true,rtmps:details.rtmps,status:details.status,playback:details.playback});
  }
  if(request.method==='POST'&&action==='managed'){
    const config=await configuration(env);
    if(source?.input_id){const input=await cloudflare(config,'/stream/live_inputs/'+encode(source.input_id));await env.DB.prepare("update church_broadcast_sources set mode='cloudflare',source_url=?,status='ready',enabled=0,revision=revision+1,updated_at=? where church_id=?").bind(broadcastUrl(input.playback.hls),stamp(),id).run();return ctx.json({ok:true});}
    const claim=await env.DB.prepare("insert into church_broadcast_sources(church_id,mode,status,updated_at) values(?,'cloudflare','creating',?) on conflict(church_id) do update set mode='cloudflare',status='creating',revision=revision+1,updated_at=excluded.updated_at where status!='creating' or updated_at<? returning church_id").bind(id,stamp(),new Date(Date.now()-120000).toISOString()).first();
    if(!claim)throw new ApiError(409,'A broadcast is being created. Reload in a moment.');
    try{
      const input=await cloudflare(config,'/stream/live_inputs','POST',{meta:{name:JSON.parse(row.data_json).name,churchId:id},enabled:true,recording:{mode:'automatic',allowedOrigins:[new URL(env.PUBLIC_ORIGIN).hostname]}});
      if(!input?.uid||!input.playback?.hls)throw new ApiError(502,'Cloudflare did not return the broadcast playback address.');
      const url=broadcastUrl(input.playback.hls);
      await env.DB.batch([env.DB.prepare("update church_broadcast_sources set input_id=?,source_url=?,status='ready',enabled=0,updated_at=? where church_id=?").bind(input.uid,url,stamp(),id),auditStatement(env,user.id,'church.broadcast.created',id,row.tenant_id)]);
      return ctx.json({ok:true,source:publicSource(await env.DB.prepare('select * from church_broadcast_sources where church_id=?').bind(id).first())});
    }catch(error){await env.DB.prepare("update church_broadcast_sources set status='failed',updated_at=? where church_id=?").bind(stamp(),id).run();throw error;}
  }
  if(request.method==='PUT'&&!action){
    const input=await readJson(request);if(Number(input.revision)!==(source?.revision||0))throw new ApiError(409,'Broadcast settings changed. Reload before saving.');
    const mode=input.mode==='cloudflare'?'cloudflare':'external';
    if(mode==='cloudflare'&&(!source?.input_id||source.status!=='ready'))throw new ApiError(409,'Create the managed broadcast first.');
    const url=mode==='cloudflare'?source.source_url:broadcastUrl(input.url);
    const updated=await env.DB.prepare("insert into church_broadcast_sources(church_id,mode,source_url,status,enabled,updated_at) values(?,?,?,'ready',?,?) on conflict(church_id) do update set mode=excluded.mode,source_url=excluded.source_url,status='ready',enabled=excluded.enabled,revision=revision+1,updated_at=excluded.updated_at where revision=? and status!='creating' returning church_id").bind(id,mode,url,Number(input.enabled===true),stamp(),Number(input.revision)).first();if(!updated)throw new ApiError(409,'Broadcast settings changed. Reload before saving.');
    return ctx.json({ok:true});
  }
  throw new ApiError(405,'Method not allowed.');
}

async function sessionRow(env,id) {
  const row=await env.DB.prepare('select * from channel_live_sessions where id=?').bind(id).first();if(!row)throw new ApiError(404,'Live stage not found.');return row;
}
async function endSession(env,config,session) {
  if(session.status==='ended')return;
  await env.DB.prepare("update channel_live_sessions set status='ending' where id=?").bind(session.id).run();
  if(session.meeting_id){await cloudflare(config,kit(config,'/meetings/'+encode(session.meeting_id)),'PATCH',{status:'INACTIVE'});await cloudflare(config,kit(config,'/meetings/'+encode(session.meeting_id)+'/active-session/kick-all'),'POST',{},true);}
  await env.DB.prepare("update channel_live_sessions set status='ended',ended_at=? where id=?").bind(stamp(),session.id).run();
}
async function channel(request,env,ctx,id,action) {
  const row=await entity(env,id,'channels');
  if(request.method==='GET'&&!action){const user=await ctx.getSessionUser(request,env);const canManage=!!user&&await manager(env,user,row);const session=await env.DB.prepare("select id,title,expires_at from channel_live_sessions where channel_id=? and status='live' and expires_at>? order by created_at desc limit 1").bind(id,stamp()).first();const unfinished=canManage&&!session?await env.DB.prepare("select id,title,status,expires_at from channel_live_sessions where channel_id=? and status in ('creating','live','ending') limit 1").bind(id).first():null;return ctx.json({ok:true,canManage,session,unfinishedSession:unfinished});}
  const user=await requireManager(request,env,ctx,row);
  if(request.method!=='POST'||action!=='start')throw new ApiError(405,'Method not allowed.');
  const config=await configuration(env),input=await readJson(request);const title=clean(input.title)||JSON.parse(row.data_json).name+' Live';
  const existing=await env.DB.prepare("select * from channel_live_sessions where channel_id=? and status in ('creating','live','ending') limit 1").bind(id).first();
  if(existing){if(existing.status==='live'&&existing.expires_at>stamp())return ctx.json({ok:true,sessionId:existing.id});throw new ApiError(409,'Finish or end the previous live session first.');}
  const sessionId=crypto.randomUUID();
  try{await env.DB.prepare("insert into channel_live_sessions(id,channel_id,created_by,title,status,created_at,expires_at) values(?,?,?,?,'creating',?,?)").bind(sessionId,id,user.id,title,stamp(),new Date(Date.now()+2*3600000).toISOString()).run();}catch{throw new ApiError(409,'This channel is already starting a stage.');}
  try{const meeting=await cloudflare(config,kit(config,'/meetings'),'POST',{title,record_on_start:false,persist_chat:false,session_keep_alive_time_in_secs:60});if(!meeting?.id)throw new ApiError(502,'Cloudflare did not return a room ID.');await env.DB.batch([env.DB.prepare("update channel_live_sessions set meeting_id=?,status='live' where id=?").bind(meeting.id,sessionId),auditStatement(env,user.id,'channel.stage.started',id,row.tenant_id)]);return ctx.json({ok:true,sessionId});}
  catch(error){await env.DB.prepare("update channel_live_sessions set status='failed',ended_at=? where id=?").bind(stamp(),sessionId).run();throw error;}
}
async function session(request,env,ctx,id,action) {
  const user=await requireUser(request,env,ctx),session=await sessionRow(env,id),row=await entity(env,session.channel_id,'channels');
  const host=await manager(env,user,row);
  if(request.method==='GET'&&!action)return ctx.json({ok:true,session:{id:session.id,title:session.title,status:session.status,channelId:session.channel_id,expiresAt:session.expires_at},host});
  if(request.method!=='POST')throw new ApiError(405,'Method not allowed.');
  if(action==='end'){
    if(!host)throw new ApiError(403,'Only the channel’s managers can end this stage.');
    if(session.status==='ended')return ctx.json({ok:true});await endSession(env,await configuration(env),session);return ctx.json({ok:true});
  }
  if(session.status!=='live'||session.expires_at<=stamp())throw new ApiError(409,'This live stage has ended or expired.');
  const config=await configuration(env);
  if(action==='join'){
    const member=await env.DB.prepare('select * from channel_live_members where session_id=? and user_id=?').bind(id,user.id).first();
    if(member?.blocked)throw new ApiError(403,'You have been removed from this stage.');
    let participantId=member?.participant_id;
    if(!participantId){
      const claim=await env.DB.prepare('insert into channel_live_members(session_id,user_id) values(?,?) on conflict do nothing returning user_id').bind(id,user.id).first();if(!claim)throw new ApiError(409,'You are already joining. Reload in a moment.');
      try{const result=await cloudflare(config,kit(config,'/meetings/'+encode(session.meeting_id)+'/participants'),'POST',{name:user.name,custom_participant_id:user.id,preset_name:host?'webinar_presenter':'webinar_viewer'});participantId=result.id;
        if(!participantId||typeof(result.token||result.authToken)!=='string')throw new ApiError(502,'The provider did not return a valid participant token.');
        await env.DB.prepare('update channel_live_members set participant_id=?,role=? where session_id=? and user_id=?').bind(participantId,host?'host':'viewer',id,user.id).run();
        if((await sessionRow(env,id)).status!=='live')throw new ApiError(409,'The host ended the stage while you were joining.');
        return ctx.json({ok:true,authToken:result.token||result.authToken,role:host?'host':'viewer'});
      }catch(error){await env.DB.prepare('delete from channel_live_members where session_id=? and user_id=? and participant_id is null').bind(id,user.id).run();throw error;}
    }
    if(member.role!==(host?'host':'viewer')){await cloudflare(config,kit(config,'/meetings/'+encode(session.meeting_id)+'/participants/'+encode(participantId)),'PATCH',{preset_name:host?'webinar_presenter':'webinar_viewer'});await env.DB.prepare('update channel_live_members set role=? where session_id=? and user_id=?').bind(host?'host':'viewer',id,user.id).run();}
    const token=await cloudflare(config,kit(config,'/meetings/'+encode(session.meeting_id)+'/participants/'+encode(participantId)+'/token'),'POST',{});
    const authToken=token?.token||token?.authToken||(typeof token==='string'?token:null);if(!authToken)throw new ApiError(502,'The provider did not return a valid participant token.');
    return ctx.json({ok:true,authToken,role:host?'host':'viewer'});
  }
  if(action==='kick'){
    if(!host)throw new ApiError(403,'Only the channel’s managers can remove guests.');
    const input=await readJson(request);if(input.userId===user.id)throw new ApiError(400,'Use Leave to exit your stage.');
    const member=await env.DB.prepare('select * from channel_live_members where session_id=? and user_id=?').bind(id,clean(input.userId)).first();if(!member?.participant_id)throw new ApiError(404,'Participant not found.');
    await cloudflare(config,kit(config,'/meetings/'+encode(session.meeting_id)+'/participants/'+encode(member.participant_id)),'DELETE');
    await env.DB.prepare('update channel_live_members set blocked=1 where session_id=? and user_id=?').bind(id,input.userId).run();return ctx.json({ok:true});
  }
  throw new ApiError(404,'Live action not found.');
}

export async function handleLiveApi(request,env,ctx) {
  const parts=new URL(request.url).pathname.split('/').filter(Boolean);if(parts[0]!=='api'||parts[1]!=='live')return null;
  if(!env.DB)throw new ApiError(503,'Live storage is unavailable.');
  if(parts[2]==='settings')return providerSettings(request,env,ctx);
  if(parts[2]==='status'&&request.method==='GET')return ctx.json({ok:true,connected:!!await env.DB.prepare('select id from live_provider_settings where id=1').first()});
  if(parts[2]==='directory'&&request.method==='GET'){
    const stages=await env.DB.prepare("select s.id sessionId,s.channel_id channelId,s.title from channel_live_sessions s join platform_entities e on e.id=s.channel_id where s.status='live' and s.expires_at>? and e.state='published' order by s.created_at desc limit 100").bind(stamp()).all();
    const broadcasts=await env.DB.prepare("select b.church_id churchId,b.source_url url from church_broadcast_sources b join platform_entities e on e.id=b.church_id where b.enabled=1 and b.status='ready' and e.state='published' limit 100").all();
    return ctx.json({ok:true,stages:stages.results,broadcasts:broadcasts.results});
  }
  let id;try{id=decodeURIComponent(parts[3]||'');}catch{throw new ApiError(400,'Invalid live identifier.');}if(!id||id.length>128)throw new ApiError(404,'Live profile or session not found.');
  if(parts[2]==='churches')return church(request,env,ctx,id,parts[4]);
  if(parts[2]==='channels')return channel(request,env,ctx,id,parts[4]);
  if(parts[2]==='sessions')return session(request,env,ctx,id,parts[4]);
  throw new ApiError(404,'Live endpoint not found.');
}
export async function closeExpiredLiveSessions(env) {
  const {results}=await env.DB.prepare("select * from channel_live_sessions where (status='live' and expires_at<=?) or status='ending' or (status='creating' and created_at<?) limit 10").bind(stamp(),new Date(Date.now()-120000).toISOString()).all();
  if(!results.length)return;const config=await configuration(env);
  for(const session of results){try{await endSession(env,config,session);}catch{console.error(JSON.stringify({event:'live.stage.cleanup.retry',sessionId:session.id}));}}
}
export async function deliverLiveNotifications(env) {
  await env.DB.prepare(`insert or ignore into live_notifications(session_id,user_id,created_at)
  select s.id,f.user_id,s.created_at from channel_live_sessions s join channel_follows f on f.channel_id=s.channel_id join platform_entities e on e.id=s.channel_id
  where s.status='live' and s.expires_at>? and e.state='published' and f.notifications_enabled=1 and f.created_at<=s.created_at
  and not exists(select 1 from live_notifications n where n.session_id=s.id and n.user_id=f.user_id) limit 500`).bind(stamp()).run();
}
