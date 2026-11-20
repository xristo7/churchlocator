import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {validateRoomSchedule,processRoomSchedule,deliverMeditationSchedules} from '../src/meditation-schedule.js';
import {handleMeditationSession} from '../src/meditation-session.js';
function setup(patch={}){
 const sql=new DatabaseSync(':memory:');sql.exec("pragma foreign_keys=on;create table users(id text primary key);insert into users values('owner'),('guest');create table platform_entities(id text primary key,kind text,state text,created_by text,tenant_id text,data_json text);");
 for(const file of ['0028_meditation_sessions.sql','0038_meditation_schedules.sql'])sql.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
 const room={title:'Scheduled prayer',template:'timer',durationMinutes:20,selectedAudio:'instrumental',scheduledOpensAt:new Date(Date.now()+3600000).toISOString(),scheduleTimeZone:'Africa/Kampala',openingMode:'manual',playbackStart:'owner',...patch};
 sql.prepare('insert into platform_entities values (?,?,?,?,?,?)').run('room','meditation','published','owner','tenant',JSON.stringify(room));
 const db={prepare(query){let args=[];return {bind(...a){args=a;return this},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){return {meta:sql.prepare(query).run(...args)}}}}};
 const env={DB:db},entity=()=>sql.prepare("select * from platform_entities where id='room'").get();
 const call=(user,method,path='room',body)=>handleMeditationSession(new Request('https://example.test/api/meditation-session/'+path,{method,...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})}),env,{getSessionUser:async()=>user?{id:user}:null,json:value=>value});
 return {sql,env,room,entity,call};
}
const initial={playing:true,position:0,verse:0,audioType:'instrumental'};
test('schedule dates normalize offsets and reject invalid modes and time zones',()=>{
 const data={scheduledOpensAt:'2026-11-20T18:30:00+03:00',openingMode:'automatic',playbackStart:'owner',scheduleTimeZone:'Africa/Kampala'};validateRoomSchedule(data);assert.equal(data.scheduledOpensAt,'2026-11-20T15:30:00.000Z');
 for(const data of [{scheduledOpensAt:'nope'},{openingMode:'unknown'},{openingMode:'automatic'},{playbackStart:'guests-control'},{scheduleTimeZone:'Invalid/Place'}])assert.throws(()=>validateRoomSchedule(data),{status:400});
});
test('manual schedules stay inactive before and after due time until the owner explicitly opens',async()=>{
 const {sql,env,room,entity,call}=setup();
 await assert.rejects(call('owner','POST','room',initial),{status:409});await assert.rejects(call('guest','POST','room',{...initial,openNow:true}),{status:409});
 assert.equal(sql.prepare('select count(*) n from meditation_sessions').get().n,0);
 await processRoomSchedule(env,entity(),Date.parse(room.scheduledOpensAt)+1000);
 assert.equal(sql.prepare('select alert_stage from meditation_schedule_events').get().alert_stage,2);
 const opened=await call('owner','POST','room',{...initial,openNow:true});assert.equal(opened.canControl,true);assert.equal(opened.session.playing,false);assert.equal(opened.session.waitingForOwner,true);
 const event=sql.prepare('select * from meditation_schedule_events').get();assert.equal(event.session_id,opened.session.id);assert.equal(event.alert_stage,3);
 const started=await call('owner','PUT','room/'+opened.session.id,{...initial,revision:opened.session.revision});assert.equal(started.session.playing,true);assert.equal(started.session.waitingForOwner,undefined);
 sql.close();
});
test('automatic opening starts at the scheduled time once, including concurrent requests, and never reopens after Stop',async()=>{
 const {sql,env,entity,call,room}=setup({scheduledOpensAt:new Date(Date.now()-4000).toISOString(),openingMode:'automatic',playbackStart:'automatic'});
 await Promise.all(Array.from({length:5},()=>processRoomSchedule(env,entity())));
 assert.equal(sql.prepare('select count(*) n from meditation_sessions').get().n,1);assert.equal(sql.prepare('select count(*) n from meditation_schedule_events').get().n,1);
 const live=await call('guest','POST','room',initial);assert.equal(live.canControl,false);assert.equal(live.session.playing,true);assert.equal(live.session.updatedAt,Date.parse(room.scheduledOpensAt));
 await assert.rejects(call('guest','PUT','room/'+live.session.id,{...initial,revision:1}),{status:403});
 await call('owner','PUT','room/'+live.session.id,{...initial,playing:false,ended:true,revision:1});await processRoomSchedule(env,entity());
 assert.equal(sql.prepare('select count(*) n from meditation_sessions').get().n,1);await assert.rejects(call('guest','POST','room',initial),{status:409});sql.close();
});
test('automatic admission can wait for owner audio while accepting members',async()=>{
 const {sql,call}=setup({scheduledOpensAt:new Date(Date.now()-1000).toISOString(),openingMode:'automatic',playbackStart:'owner'});
 const availability=await call(null,'GET','availability?ids=room');assert.equal(availability.rooms[0].status,'waiting');
 const joined=await call('guest','POST','room',initial);assert.equal(joined.session.playing,false);assert.equal(joined.session.waitingForOwner,true);
 const started=await call('owner','PUT','room/'+joined.session.id,{...initial,revision:1});assert.equal(started.session.playing,true);
 assert.equal((await call(null,'GET','availability?ids=room')).rooms[0].status,'live');sql.close();
});
test('owner schedule alerts are persistent, isolated, readable and cancelled with an unpublished room',async()=>{
 const {sql,call}=setup();
 await assert.rejects(call(null,'GET','owner-alerts'),{status:401});assert.deepEqual((await call('guest','GET','owner-alerts')).alerts,[]);
 const first=(await call('owner','GET','owner-alerts')).alerts[0];assert.equal(first.title,'Scheduled prayer');assert.equal(first.read,false);assert.equal(first.stage,0);
 await call('guest','PUT','owner-alerts/'+first.id,{});assert.equal((await call('owner','GET','owner-alerts')).alerts[0].read,false);
 await call('owner','PUT','owner-alerts/'+first.id,{});assert.equal((await call('owner','GET','owner-alerts')).alerts[0].read,true);
 sql.prepare("update platform_entities set state='draft'").run();assert.deepEqual((await call('owner','GET','owner-alerts')).alerts,[]);sql.close();
});
test('the background job opens due published rooms without an owner browser',async()=>{
 const {sql,env}=setup({openingMode:'automatic',playbackStart:'automatic',scheduledOpensAt:new Date(Date.now()-1000).toISOString()});
 await deliverMeditationSchedules(env);assert.equal(sql.prepare('select count(*) n from meditation_sessions').get().n,1);sql.close();
});
test('a future automatic schedule cannot open early through a guest request',async()=>{
 const {sql,call}=setup({openingMode:'automatic',playbackStart:'automatic'});
 const status=await call(null,'GET','availability?ids=room');assert.equal(status.rooms[0].status,'inactive');await assert.rejects(call('guest','POST','room',{...initial,openNow:true}),{status:409});
 assert.equal(sql.prepare('select count(*) n from meditation_sessions').get().n,0);sql.close();
});
