import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {handleLiveApi,closeExpiredLiveSessions,deliverLiveNotifications} from '../src/live.js';
import {seal} from '../src/identity-security.js';

async function fixture(){
  const sql=new DatabaseSync(':memory:');sql.exec(`pragma foreign_keys=on;
    create table users(id text primary key,name text);create table tenants(id text primary key);
    create table tenant_memberships(tenant_id text,user_id text,role text);
    create table platform_roles(user_id text,role text);
    create table platform_entities(id text primary key,kind text,state text,tenant_id text,data_json text);
    create table audit_log(id text,actor_user_id text,action text,entity_id text,tenant_id text,created_at text);
    insert into users values('system:platform','System'),('owner','Owner'),('host','Host'),('viewer','Viewer'),('other','Other');
    insert into tenants values('platform-system'),('tenant');
    insert into tenant_memberships values('tenant','host','owner');insert into platform_roles values('owner','owner');
    insert into platform_entities values('church','churches','published','tenant','{"name":"Church","livestream":{"enabled":false}}'),('channel','channels','published','tenant','{"name":"Channel"}');`);
  sql.exec(readFileSync(new URL('../migrations/0006_spotlight.sql',import.meta.url),'utf8'));
  sql.exec(readFileSync(new URL('../migrations/0013_spotlight_discovery.sql',import.meta.url),'utf8'));
  sql.exec(readFileSync(new URL('../migrations/0015_separate_live.sql',import.meta.url),'utf8'));
  const DB={prepare(query){const statement=sql.prepare(query);let args=[];const obj={bind(...values){args=values;return obj;},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};},async run(){return {meta:statement.run(...args)};}};return obj;},async batch(statements){sql.exec('begin');try{const result=[];for(const statement of statements)result.push(await statement.run());sql.exec('commit');return result;}catch(error){sql.exec('rollback');throw error;}}};
  const env={DB,AUTH_ENCRYPTION_KEY:btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))),LIVE_CF_ACCOUNT_ID:'1'.repeat(32),PUBLIC_ORIGIN:'https://example.test'};
  const originalFetch=globalThis.fetch,calls=[];let fail=false;
  globalThis.fetch=async(url,options={})=>{
    const path=new URL(url).pathname,method=options.method||'GET',body=options.body?JSON.parse(options.body):null;calls.push({path,method,body});
    if(fail)return Response.json({success:false},{status:503});
    let data={};
    if(path.endsWith('/stream/live_inputs'))data=method==='POST'?{uid:'input-test',playback:{hls:'https://customer-test.cloudflarestream.com/input-test/manifest/video.m3u8'}}:[];
    else if(path.endsWith('/stream/live_inputs/input-test'))data={rtmps:{url:'rtmps://example.test/live',streamKey:'TEST_ONLY_PRIVATE_STREAM_KEY'},playback:{hls:'https://customer-test.cloudflarestream.com/input-test/manifest/video.m3u8'},status:'connected'};
    else if(path.endsWith('/apps'))data=[{id:'app-test',name:'My Way Channel Live'}];
    else if(path.endsWith('/presets'))data=[{id:'presenter',name:'webinar_presenter'},{id:'viewer',name:'webinar_viewer'}];
    else if(/\/presets\/(viewer|presenter)$/.test(path)){const viewer=path.endsWith('/viewer');data={config:{view_type:'WEBINAR'},permissions:{stage_enabled:true,stage_access:viewer?'CAN_REQUEST':'ALLOWED',can_accept_production_requests:!viewer,media:{audio:{can_produce:viewer?'CAN_REQUEST':'ALLOWED'},video:{can_produce:viewer?'CAN_REQUEST':'ALLOWED'}}}};}
    else if(path.endsWith('/meetings')&&method==='POST')data={id:'meeting-'+calls.length};
    else if(path.endsWith('/participants')&&method==='POST')data={id:'participant-'+body.custom_participant_id,token:'TEST_ONLY_PARTICIPANT_TOKEN'};
    else if(path.endsWith('/token'))data={token:'TEST_ONLY_REFRESHED_TOKEN'};
    return Response.json({success:true,...(path.includes('/stream/')?{result:data}:{data})});
  };
  async function call(path,body,userId='host',method=body?'POST':'GET'){
    const request=new Request('https://example.test/api/live/'+path,{method,...(body?{body:JSON.stringify(body),headers:{'content-type':'application/json'}}:{})});
    const user=userId?{id:userId,name:userId,...(userId==='owner'?{email_verified_at:'verified',totp_secret_encrypted:'test-mfa',mfa_verified_at:'verified'}:{})}:null;
    return handleLiveApi(request,env,{getSessionUser:async()=>user,json:(data,status=200)=>({status,...data})});
  }
  async function connect(){return call('settings',{accountId:env.LIVE_CF_ACCOUNT_ID,apiToken:'TEST_ONLY_PROVIDER_TOKEN',appId:'app-test',revision:0},'owner','PUT');}
  return {sql,env,calls,call,connect,fail:value=>fail=value,close(){globalThis.fetch=originalFetch;sql.close();}};
}

test('only the verified owner can connect providers; credentials stay encrypted and never return',async()=>{
  const f=await fixture();try{
    await assert.rejects(f.call('settings',{accountId:f.env.LIVE_CF_ACCOUNT_ID,apiToken:'test',revision:0},'host','PUT'),/owner/);
    await assert.rejects(f.call('settings',{accountId:'2'.repeat(32),apiToken:'test',revision:0},'owner','PUT'),/hosting/);
    await f.connect();const stored=f.sql.prepare('select token_encrypted from live_provider_settings').get().token_encrypted;assert(!stored.includes('TEST_ONLY_PROVIDER_TOKEN'));
    const visible=await f.call('settings',null,'owner');assert(!JSON.stringify(visible).includes('TOKEN'));assert(visible.configured);
    await assert.rejects(f.call('settings',{accountId:f.env.LIVE_CF_ACCOUNT_ID,revision:0},'owner','PUT'),/changed/);
  }finally{f.close();}
});
test('church publishing keys require management rights and are excluded from public playback metadata',async()=>{
  const f=await fixture();try{
    await f.connect();await assert.rejects(f.call('churches/church/managed',{},'viewer'),/managers/);
    const result=await f.call('churches/church/managed',{});assert.equal(result.source.enabled,false);assert.equal(result.source.mode,'cloudflare');
    const publicResult=await f.call('churches/church',null,null);assert(!JSON.stringify(publicResult).includes('PRIVATE_STREAM_KEY'));
    await assert.rejects(f.call('churches/church/publishing',null,'viewer'),/managers/);
    assert.equal((await f.call('churches/church/publishing')).rtmps.streamKey,'TEST_ONLY_PRIVATE_STREAM_KEY');
    const current=await f.call('churches/church');await f.call('churches/church',{mode:'cloudflare',enabled:true,revision:current.source.revision},'host','PUT');
    assert.equal((await f.call('directory',null,null)).broadcasts.length,1);
    await assert.rejects(f.call('churches/church',{url:'rtmp://encoder.test/key',revision:999},'host','PUT'),/unsafe/);
  }finally{f.close();}
});
test('external broadcast configuration rejects unsafe URLs and prevents stale updates',async()=>{
  const f=await fixture();try{
    for(const url of ['javascript:alert(1)','http://video.example.test/live.m3u8','https://name:password@video.example.test/live.m3u8','https://localhost/live.m3u8'])await assert.rejects(f.call('churches/church',{mode:'external',url,enabled:true,revision:0},'host','PUT'));
    await f.call('churches/church',{mode:'external',url:'https://video.example.test/live.m3u8',enabled:true,revision:0},'host','PUT');
    await assert.rejects(f.call('churches/church',{url:'https://video.example.test/other.m3u8',revision:0},'host','PUT'),/changed/);
    await assert.rejects(f.call('churches/church',{url:'https://video.example.test/live.m3u8',revision:1},'other','PUT'),/managers/);
  }finally{f.close();}
});
test('channel stages derive host/viewer roles on the server, refuse duplicate rooms and revoke ended access',async()=>{
  const f=await fixture();try{
    await f.connect();await assert.rejects(f.call('channels/channel/start',{title:'Forged host'},'viewer'),/managers/);
    const started=await f.call('channels/channel/start',{title:'Live discussion'});const id=started.sessionId;
    const again=await f.call('channels/channel/start',{title:'Duplicate'});assert.equal(again.sessionId,id);assert.equal(f.calls.filter(call=>call.path.endsWith('/meetings')&&call.method==='POST').length,1);
    const host=await f.call('sessions/'+id+'/join',{});assert.equal(host.role,'host');
    const viewer=await f.call('sessions/'+id+'/join',{role:'host',preset_name:'webinar_presenter'},'viewer');assert.equal(viewer.role,'viewer');assert.equal(f.calls.filter(call=>call.path.endsWith('/participants')).at(-1).body.preset_name,'webinar_viewer');
    await assert.rejects(f.call('sessions/'+id+'/end',{},'viewer'),/managers/);
    await f.call('sessions/'+id+'/end',{});assert.equal((await f.call('sessions/'+id,null,'viewer')).session.status,'ended');
    await assert.rejects(f.call('sessions/'+id+'/join',{},'viewer'),/ended/);assert.equal((await f.call('directory',null,null)).stages.length,0);
  }finally{f.close();}
});
test('removed participants cannot rejoin and failed provider requests never create a fake live room',async()=>{
  const f=await fixture();try{
    await f.connect();f.fail(true);await assert.rejects(f.call('channels/channel/start',{title:'Failure'}),/Cloudflare/);assert.equal(f.sql.prepare("select count(*) count from channel_live_sessions where status='live'").get().count,0);
    f.fail(false);const {sessionId:id}=await f.call('channels/channel/start',{title:'Working'});await f.call('sessions/'+id+'/join',{},'viewer');
    await f.call('sessions/'+id+'/kick',{userId:'viewer'});await assert.rejects(f.call('sessions/'+id+'/join',{},'viewer'),/removed/);
    f.sql.prepare('update channel_live_sessions set expires_at=? where id=?').run('2000-01-01T00:00:00.000Z',id);await closeExpiredLiveSessions(f.env);assert.equal((await f.call('sessions/'+id)).session.status,'ended');
  }finally{f.close();}
});
test('rejoining after management access is revoked refreshes a viewer preset',async()=>{
  const f=await fixture();try{
    await f.connect();const {sessionId:id}=await f.call('channels/channel/start',{title:'Roles'});
    await f.call('sessions/'+id+'/join',{});
    f.sql.prepare('update tenant_memberships set role=? where user_id=?').run('viewer','host');
    const joined=await f.call('sessions/'+id+'/join',{});assert.equal(joined.role,'viewer');
    assert.equal(f.calls.filter(call=>call.method==='PATCH'&&call.path.includes('/participants/')).at(-1).body.preset_name,'webinar_viewer');
    await assert.rejects(f.call('sessions/'+id+'/end',{}),/managers/);
  }finally{f.close();}
});
test('live follower notices honor preferences and are delivered once',async()=>{
  const f=await fixture();try{
    await f.connect();f.sql.exec("insert into channel_follows values('viewer','channel',1,'2000-01-01T00:00:00.000Z'),('other','channel',0,'2000-01-01T00:00:00.000Z')");
    await f.call('channels/channel/start',{title:'Watch together'});await deliverLiveNotifications(f.env);await deliverLiveNotifications(f.env);
    const rows=f.sql.prepare('select * from live_notifications').all();assert.equal(rows.length,1);assert.equal(rows[0].user_id,'viewer');
  }finally{f.close();}
});
test('broadcast resolver handles actual provider URLs without framing arbitrary pages',()=>{
  const context={window:{}};vm.runInNewContext(readFileSync(new URL('../public/live-player.js',import.meta.url),'utf8'),{...context,URL});const resolve=context.window.MWELivePlayer.source;
  assert.equal(resolve('https://youtube.com/live/ak06MSETeo4').url,'https://www.youtube-nocookie.com/embed/ak06MSETeo4');
  assert.equal(resolve('https://vimeo.com/event/123456/embed').provider,'Vimeo Live');assert.equal(resolve('https://vimeo.com/123456/abc123').url,'https://player.vimeo.com/video/123456?h=abc123');
  assert.equal(resolve('https://www.facebook.com/Church/videos/123').provider,'Facebook');assert.equal(resolve('https://x.com/user/status/123').kind,'x-post');assert.equal(resolve('https://x.com/i/broadcasts/123').kind,'external');
  assert.equal(resolve('https://video.example.test/service.m3u8?token=playback').kind,'hls');assert.equal(resolve('https://player.mediadelivery.net/embed/123/abc-def').provider,'Bunny');
  assert.equal(resolve('https://unrecognized.example.test/page').kind,'external');assert.equal(resolve('javascript:alert(1)').kind,'invalid');assert.equal(resolve('https://user:secret@example.test/').kind,'invalid');
});
