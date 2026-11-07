import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { seal } from '../src/identity-security.js';
import { handleMeditationSession } from '../src/meditation-session.js';

test('room voice enforces owner-only publishing, safe listeners, lifecycle and provider failures',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec("pragma foreign_keys=on; create table users(id text primary key); insert into users values ('owner'),('guest'); create table tenants(id text,owner_user_id text); insert into tenants values ('tenant','owner'); create table platform_entities(id text primary key,kind text,state text,data_json text,created_by text,tenant_id text); insert into platform_entities values ('room','meditation','published','{}','owner','tenant'); create table live_provider_settings(id integer primary key,account_id text,app_id text,token_encrypted text);");
 for(const name of ['0028_meditation_sessions.sql','0029_meditation_voice.sql'])db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
 // The guest initiated playback. That must not grant microphone broadcast rights.
 db.exec("insert into meditation_sessions values ('session','room','guest','{}',1,0)");
 const env={AUTH_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),DB:{
  prepare(sql){return {async first(){return db.prepare(sql).get()||null;},bind(...args){return {
   async first(){return db.prepare(sql).get(...args)||null;},
   async run(){return db.prepare(sql).run(...args);}
  };}};}
 }};
 const original=globalThis.fetch,calls=[];let unsafe=false,providerFailure=false;
 globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname,body=options.body?JSON.parse(options.body):{};calls.push({path,body,method:options.method});
  if(providerFailure)return Response.json({success:false},{status:503});
  let data={};
  if(path.endsWith('/presets'))data=[{id:'presenter',name:'webinar_presenter'},{id:'viewer',name:'webinar_viewer'}];
  else if(path.includes('/presets/'))data={config:{view_type:'WEBINAR'},permissions:{stage_enabled:true,stage_access:path.endsWith('/presenter')?'ALLOWED':'CAN_REQUEST',can_accept_production_requests:unsafe,media:{audio:{can_produce:path.endsWith('/presenter')?'ALLOWED':'CAN_REQUEST'},video:{can_produce:'CAN_REQUEST'}}}};
  else if(path.endsWith('/meetings'))data={id:'meeting'};
  else if(path.endsWith('/participants'))data={id:'participant',token:'test-token'};
  return Response.json({success:true,data});
 };
 const call=(user,method,action='')=>handleMeditationSession(new Request('https://example.test/api/meditation-session/room/session/voice'+(action?'/'+action:''),{method}),env,{getSessionUser:async()=>user?{id:user,name:user}:null,json:body=>body});
 try {
  assert.equal((await call('owner','GET')).canSpeak,true);
  assert.equal((await call('guest','GET')).canSpeak,false);
  await assert.rejects(call('guest','POST','start'),{status:403});assert.equal(calls.length,0);
  await assert.rejects(call('owner','POST','start'),{status:503});
  db.prepare('insert into live_provider_settings values (1,?,?,?)').run('account','app',await seal(env,'test-provider-token','live-provider-settings'));
  unsafe=true;await assert.rejects(call('owner','POST','start'),{status:503});assert.equal(calls.some(c=>c.path.endsWith('/meetings')),false);
  unsafe=false;await call('owner','POST','start');assert.equal((await call('guest','GET')).active,true);
  await call('guest','POST','join');assert.equal(calls.at(-1).body.preset_name,'webinar_viewer');
  await call('owner','POST','join');assert.equal(calls.at(-1).body.preset_name,'webinar_presenter');
  await assert.rejects(call('guest','POST','end'),{status:403});
  await call('owner','POST','end');assert.equal((await call('guest','GET')).active,false);
  await assert.rejects(call('guest','POST','join'),{status:409});
  providerFailure=true;await assert.rejects(call('owner','POST','start'),{status:502});
  assert.equal(db.prepare('select status from meditation_voice').get().status,'failed');
 }finally{globalThis.fetch=original;db.close();}
});


test('meditation documents permit microphone and provider connections without camera access',async()=>{
 const {default:worker}=await import('../src/worker.js');
 const response=await worker.fetch(new Request('https://example.test/meditation.html'),{ASSETS:{fetch:async()=>new Response('<!doctype html>',{headers:{'content-type':'text/html'}})}},{});
 assert.match(response.headers.get('permissions-policy'),/microphone=\(self\)/);
 assert.match(response.headers.get('permissions-policy'),/camera=\(\)/);
 assert.match(response.headers.get('content-security-policy'),/wss:\/\/\*\.realtime\.cloudflare\.com/);
});
