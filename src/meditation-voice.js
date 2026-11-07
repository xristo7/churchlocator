import { ApiError } from './security.js';
import { liveConfiguration, liveRequest, liveKitPath } from './live.js';

export async function roomOwner(env, user, entity) {
  if (entity.created_by === user.id) return true;
  const tenant = await env.DB.prepare('select owner_user_id from tenants where id=?').bind(entity.tenant_id).first();
  return tenant?.owner_user_id === user.id;
}

export async function handleMeditationVoice(request, env, ctx, session, entity, user, action) {
  const canSpeak = await roomOwner(env, user, entity);
  let voice = await env.DB.prepare('select * from meditation_voice where session_id=?').bind(session.id).first();
  const active = () => voice?.status === 'live' && voice.expires_at > Date.now();
  if (request.method === 'GET' && !action) return ctx.json({ok:true,canSpeak,active:active(),generation:active()?voice.generation:null});
  if (request.method !== 'POST') throw new ApiError(405,'Method not allowed.');
  if (!['start','join','end'].includes(action)) throw new ApiError(404,'Voice action not found.');
  if (action !== 'join' && !canSpeak) throw new ApiError(403,'Only the room owner can broadcast their microphone.');
  const config = await liveConfiguration(env);
  if (action === 'start') {
    if (active()) return ctx.json({ok:true,active:true,generation:voice.generation});
    if (voice?.status === 'creating' && voice.expires_at > Date.now()) throw new ApiError(409,'Voice is starting. Please try again shortly.');
    const generation=crypto.randomUUID(), expires=Date.now()+60000;
    const claim=await env.DB.prepare("insert into meditation_voice(session_id,generation,status,expires_at) values (?,?,'creating',?) on conflict(session_id) do update set generation=excluded.generation,meeting_id=null,status='creating',expires_at=excluded.expires_at where meditation_voice.status in ('ended','failed') or meditation_voice.expires_at<=? returning *").bind(session.id,generation,expires,Date.now()).first();
    if (!claim) throw new ApiError(409,'Voice changed. Please try again.');
    try {
      // These presets are also validated by Live setup. Recheck listener permissions before issuing tokens.
      const presets=await liveRequest(config,liveKitPath(config,'/presets'));
      for (const name of ['webinar_presenter','webinar_viewer']) {
        const preset=presets?.find(p=>p.name===name);
        if (!preset) throw new ApiError(503,'Configure the webinar presets in Live setup.');
        const details=await liveRequest(config,liveKitPath(config,'/presets/'+encodeURIComponent(preset.id)));
        const p=details.permissions;
        if (!p?.stage_enabled || details.config?.view_type!=='WEBINAR' || (name==='webinar_presenter' && (p.stage_access!=='ALLOWED' || p.media?.audio?.can_produce!=='ALLOWED')) || (name==='webinar_viewer' && (p.can_accept_production_requests || p.stage_access!=='CAN_REQUEST' || p.media?.audio?.can_produce!=='CAN_REQUEST' || p.media?.video?.can_produce!=='CAN_REQUEST'))) throw new ApiError(503,'Live setup needs listener-safe webinar permissions.');
      }
      const meeting=await liveRequest(config,liveKitPath(config,'/meetings'),'POST',{title:'Meditation voice',record_on_start:false,persist_chat:false,session_keep_alive_time_in_secs:60});
      if (!meeting?.id) throw new ApiError(502,'The voice provider did not create a meeting.');
      const activated=await env.DB.prepare("update meditation_voice set meeting_id=?,status='live',expires_at=? where session_id=? and generation=? and status='creating' returning session_id").bind(meeting.id,Date.now()+2*3600000,session.id,generation).first();
      if(!activated){
        await liveRequest(config,liveKitPath(config,'/meetings/'+encodeURIComponent(meeting.id)),'PATCH',{status:'INACTIVE'});
        throw new ApiError(409,'Voice was cancelled while starting.');
      }
      return ctx.json({ok:true,active:true,generation});
    } catch(error) {
      await env.DB.prepare("update meditation_voice set status='failed' where session_id=? and generation=? and status='creating'").bind(session.id,generation).run();
      throw error;
    }
  }
  if (action === 'end') {
    if (voice?.meeting_id && voice.status==='live') {
      await liveRequest(config,liveKitPath(config,'/meetings/'+encodeURIComponent(voice.meeting_id)),'PATCH',{status:'INACTIVE'});
      await env.DB.prepare("update meditation_voice set status='ended' where session_id=? and generation=?").bind(session.id,voice.generation).run();
    }
    if(voice?.status==='creating')await env.DB.prepare("update meditation_voice set status='ended' where session_id=? and generation=?").bind(session.id,voice.generation).run();
    return ctx.json({ok:true});
  }
  if (!active()) throw new ApiError(409,'The owner’s voice broadcast is not active.');
  const participant=await liveRequest(config,liveKitPath(config,'/meetings/'+encodeURIComponent(voice.meeting_id)+'/participants'),'POST',{
    name:user.name,custom_participant_id:user.id,preset_name:canSpeak?'webinar_presenter':'webinar_viewer'
  });
  const latest=await env.DB.prepare('select * from meditation_voice where session_id=?').bind(session.id).first();
  if (latest?.status!=='live' || latest.generation!==voice.generation || latest.expires_at<=Date.now()) throw new ApiError(409,'The voice broadcast ended while you were joining.');
  const authToken=participant?.token || participant?.authToken;
  if (!participant?.id || typeof authToken!=='string' || !authToken) throw new ApiError(502,'The voice provider did not return a participant token.');
  return ctx.json({ok:true,authToken,canSpeak,generation:voice.generation});
}
