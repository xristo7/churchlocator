import { ApiError } from './security.js';
import { isMeditationRoomEnabled } from '../public/meditation-availability.js';

export function validateRoomSchedule(data) {
  if (data.scheduledOpensAt !== undefined) {
    if (!data.scheduledOpensAt) data.scheduledOpensAt='';
    else { const time=Date.parse(data.scheduledOpensAt);if (!Number.isFinite(time)) throw new ApiError(400,'Choose a valid opening date and time.');data.scheduledOpensAt=new Date(time).toISOString(); }
  }
  if (data.openingMode!==undefined && !['manual','automatic'].includes(data.openingMode)) throw new ApiError(400,'Choose automatic or manual room opening.');
  if(data.openingMode==='automatic'&&!data.scheduledOpensAt)throw new ApiError(400,'Set an opening date and time for automatic opening.');
  if (data.playbackStart!==undefined && !['automatic','owner'].includes(data.playbackStart)) throw new ApiError(400,'Choose automatic audio or wait for the owner.');
  if (data.scheduleTimeZone!==undefined) {
    try { new Intl.DateTimeFormat('en',{timeZone:data.scheduleTimeZone}); }
    catch (_) { throw new ApiError(400,'Choose a valid schedule time zone.'); }
  }
}
export function publicRoomSchedule(room) {
  return {...(room.scheduledOpensAt?{scheduledOpensAt:room.scheduledOpensAt,scheduleTimeZone:room.scheduleTimeZone||'UTC'}:{}),...(room.openingMode?{openingMode:room.openingMode}:{}),...(room.playbackStart?{playbackStart:room.playbackStart}:{})};
}
async function scheduleId(roomId,date) {
  const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(roomId+':'+date)));
  return 'schedule-'+[...hash].map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,40);
}
// Called by the minute job and request paths, so waiting guests do not depend on cron timing.
export async function processRoomSchedule(env,entity,now=Date.now()) {
  const room=JSON.parse(entity.data_json);
  if (!room.scheduledOpensAt || entity.state!=='published' || !isMeditationRoomEnabled({...room,id:entity.id})) return null;
  const due=Date.parse(room.scheduledOpensAt);if(!Number.isFinite(due))return null;
  const id=await scheduleId(entity.id,room.scheduledOpensAt),stamp=new Date(now).toISOString();
  await env.DB.prepare('insert or ignore into meditation_schedule_events(id,room_id,owner_user_id,scheduled_at,created_at,updated_at) values (?,?,?,?,?,?)').bind(id,entity.id,entity.created_by,room.scheduledOpensAt,stamp,stamp).run();
  let event=await env.DB.prepare('select * from meditation_schedule_events where id=?').bind(id).first();
  if (room.openingMode==='automatic' && now>=due && !event.session_id) {
    const previous=await env.DB.prepare("select * from meditation_sessions where room_id=? and host_user_id=? and coalesce(json_extract(state_json,'$.ended'),0)=0 order by updated_at desc limit 1").bind(entity.id,entity.created_by).first();
    if(previous && room.timeMode!=='loop'){
      const old=JSON.parse(previous.state_json),position=old.position+(old.playing?Math.max(0,now-previous.updated_at)/1000:0);
      if(position>=(Number(room.durationMinutes)||20)*60) await env.DB.prepare("update meditation_sessions set state_json=json_set(state_json,'$.ended',json('true'),'$.playing',json('false')),revision=revision+1 where id=? and revision=?").bind(previous.id,previous.revision).run();
    }
    const sessionId='scheduled-'+id.slice(9);
    const automaticAudio=room.playbackStart==='automatic';
    const state={playing:automaticAudio,position:0,verse:0,audioType:['bible','prayer','sermon','worship','instrumental','silence'].includes(room.selectedAudio)?room.selectedAudio:'bible',ended:false,waitingForOwner:!automaticAudio};
    const startedAt=automaticAudio?due:now;
    // A deterministic ID and conditional insert make concurrent request/cron runs idempotent.
    await env.DB.prepare("insert or ignore into meditation_sessions(id,room_id,host_user_id,state_json,revision,updated_at) select ?,?,?,?,1,? where not exists(select 1 from meditation_sessions where room_id=? and host_user_id=? and coalesce(json_extract(state_json,'$.ended'),0)=0)").bind(sessionId,entity.id,entity.created_by,JSON.stringify(state),startedAt,entity.id,entity.created_by).run();
    const session=await env.DB.prepare("select * from meditation_sessions where room_id=? and host_user_id=? and coalesce(json_extract(state_json,'$.ended'),0)=0 order by updated_at desc limit 1").bind(entity.id,entity.created_by).first();
    if (session) await markScheduleOpened(env,entity,session,now);
    event=await env.DB.prepare('select * from meditation_schedule_events where id=?').bind(id).first();
  }
  const stage=event.opened_at?3:now>=due?2:due-now<=15*60*1000?1:0;
  await env.DB.prepare('update meditation_schedule_events set alert_stage=?,updated_at=?,read_at=null where id=? and alert_stage<?').bind(stage,stamp,id,stage).run();
  return event;
}
export async function markScheduleOpened(env,entity,session,now=Date.now()) {
  const room=JSON.parse(entity.data_json);if(!room.scheduledOpensAt)return;
  await env.DB.prepare('update meditation_schedule_events set session_id=?,opened_at=coalesce(opened_at,?),alert_stage=3,read_at=null,updated_at=? where room_id=? and scheduled_at=? and session_id is null').bind(session.id,new Date(now).toISOString(),new Date(now).toISOString(),entity.id,room.scheduledOpensAt).run();
}
export async function deliverMeditationSchedules(env,now=Date.now()) {
  if (!env.DB) return;
  const {results}=await env.DB.prepare("select * from platform_entities where kind='meditation' and state='published' and coalesce(json_extract(data_json,'$.scheduledOpensAt'),'')<>''").all();
  for(const room of results||[]) await processRoomSchedule(env,room,now);
}
export async function ownerScheduleAlerts(request,env,ctx,id) {
  const user=await ctx.getSessionUser(request,env);if(!user)throw new ApiError(401,'Sign in to view room alerts.');
  if(request.method==='PUT'&&id){await env.DB.prepare('update meditation_schedule_events set read_at=? where id=? and owner_user_id=?').bind(new Date().toISOString(),id,user.id).run();return ctx.json({ok:true});}
  if(request.method!=='GET'||id)throw new ApiError(405,'Method not allowed.');
  const {results}=await env.DB.prepare("select * from platform_entities where kind='meditation' and state='published' and created_by=? and coalesce(json_extract(data_json,'$.scheduledOpensAt'),'')<>''").bind(user.id).all();
  for(const entity of results||[]) await processRoomSchedule(env,entity);
  const alerts=[];
  for(const entity of results||[]){
    const room=JSON.parse(entity.data_json),event=await env.DB.prepare('select * from meditation_schedule_events where room_id=? and scheduled_at=?').bind(entity.id,room.scheduledOpensAt).first();
    if(event)alerts.push({openedAt:event.opened_at,id:event.id,roomId:entity.id,title:room.title,stage:event.alert_stage,read:!!event.read_at,updatedAt:event.updated_at,...publicRoomSchedule(room)});
  }
  return ctx.json({ok:true,alerts:alerts.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))});
}
