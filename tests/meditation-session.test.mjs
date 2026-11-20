import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleMeditationSession, validatePlayback } from '../src/meditation-session.js';

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec("pragma foreign_keys=on; create table users(id text primary key); insert into users values ('host'),('guest'); create table platform_entities(id text primary key,kind text,state text,data_json text,created_by text,tenant_id text); insert into platform_entities values ('room','meditation','published','{\"verses\":[{},{}]}','host','tenant'),('draft','meditation','draft','{}','host','tenant');");
  db.exec(readFileSync(new URL('../migrations/0028_meditation_sessions.sql',import.meta.url),'utf8'));
  const env = {DB: {
    prepare(sql) {
      return {bind(...args) {
        return {
          async first() { return db.prepare(sql).get(...args) || null; },
          async run() { return db.prepare(sql).run(...args); },
          async all() { return {results:db.prepare(sql).all(...args)}; }
        };
      }};
    }
  }};
  async function request(user, method, path, body) {
    const req=new Request('https://example.test/api/meditation-session/'+path,{method,...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});
    return handleMeditationSession(req,env,{getSessionUser:async()=>user?{id:user}:null,json:body=>body});
  }
  return {db,request};
}
const state = {playing:true,position:12,verse:1,audioType:'bible'};
test('separate members join the same timeline; only the initiator can update it', async()=>{
 const {db,request}=setup();
 const created=await request('host','POST','room',state), id=created.session.id;
 assert.equal(created.canControl,true);
 const guest=await request('guest','GET','room/'+id);
 assert.equal(guest.canControl,false);assert.equal(guest.session.position,12);
 await assert.rejects(request('guest','PUT','room/'+id,{...state,revision:1}),{status:403});
 const paused=await request('host','PUT','room/'+id,{...state,playing:false,position:25,revision:1});
 assert.equal(paused.session.revision,2);
 const refreshed=await request('guest','GET','room/'+id);
 assert.equal(refreshed.session.playing,false); assert.equal(refreshed.session.position,25);
 await assert.rejects(request('host','PUT','room/'+id,{...state,revision:1}),{status:409});
 db.close();
});
test('sessions require authentication, published room, and correct room scope',async()=>{
 const {db,request}=setup();
 await assert.rejects(request(null,'POST','room',state),{status:401});
 await assert.rejects(request('host','POST','draft',state),{status:404});
 await assert.rejects(request('guest','GET','room/missing'),{status:404});
 const created=await request('host','POST','room',state);
 db.exec("insert into platform_entities values ('other','meditation','published','{}','host','tenant')");
 await assert.rejects(request('guest','GET','other/'+created.session.id),{status:404});
 db.close();
});
test('playback rejects malformed positions, audio types and scripture indices',()=>{
 for(const patch of [{position:-1},{position:Infinity},{playing:'yes'},{verse:2},{verse:0.5},{audioType:'untrusted'}]) assert.throws(()=>validatePlayback({...state,...patch},{verses:[{},{}]}),{status:400});
});

test('joining from the archive reuses the owner timeline without accepting guest playback state',async()=>{
 const {db,request}=setup();
 await assert.rejects(request('guest','POST','room',state),{status:409});
 assert.equal(db.prepare('select count(*) n from meditation_sessions').get().n,0);
 const owner=await request('host','POST','room',state);
 const guest=await request('guest','POST','room',{...state,playing:false,position:0});
 assert.equal(guest.session.id,owner.session.id);
 assert.equal(guest.session.playing,true);assert.equal(guest.session.position,12);assert.equal(guest.canControl,false);
 const again=await request('host','POST','room',{...state,position:0});
 assert.equal(again.session.id,owner.session.id);assert.equal(again.session.position,12);
 assert.equal(db.prepare('select count(*) n from meditation_sessions').get().n,1);
 db.close();
});

test('stopping a room blocks new and existing joiners until the owner starts a new session',async()=>{
 const {db,request}=setup();
 const owner=await request('host','POST','room',state),path='room/'+owner.session.id;
 const stopped=await request('host','PUT',path,{...state,playing:false,ended:true,revision:1});
 assert.equal(stopped.session.ended,true);
 await assert.rejects(request('guest','POST','room',state),{status:409});
 await assert.rejects(request('guest','GET',path),{status:409});
 await assert.rejects(request('guest','GET',path+'/chat'),{status:409});
 const fresh=await request('host','POST','room',state);
 assert.notEqual(fresh.session.id,owner.session.id);assert.equal(fresh.session.ended,false);
 assert.equal((await request('guest','POST','room',state)).session.id,fresh.session.id);
 await assert.rejects(request('guest','GET',path),{status:409});
 db.close();
});

test('owner pause keeps the room joinable without allowing a joiner to resume or rewind',async()=>{
 const {db,request}=setup();
 const owner=await request('host','POST','room',state),path='room/'+owner.session.id;
 await request('host','PUT',path,{...state,playing:false,position:40,revision:1});
 const guest=await request('guest','POST','room',state);
 assert.equal(guest.session.playing,false);assert.equal(guest.session.position,40);
 await assert.rejects(request('guest','PUT',path,{...state,position:0,revision:2}),{status:403});
 db.close();
});

test('completed timers are inactive even without a final browser update',async()=>{
 const {db,request}=setup();
 const owner=await request('host','POST','room',state);
 db.prepare('update meditation_sessions set updated_at=?').run(Date.now()-25*60*1000);
 await assert.rejects(request('guest','POST','room',state),{status:409});
 await assert.rejects(request('guest','GET','room/'+owner.session.id),{status:409});
 const fresh=await request('host','POST','room',state);
 assert.notEqual(fresh.session.id,owner.session.id);
 db.close();
});

test('Stop closes earlier owner timelines left by older application versions',async()=>{
 const {db,request}=setup();
 const owner=await request('host','POST','room',state);
 db.prepare('insert into meditation_sessions values (?,?,?,?,1,?)').run('old-owner-session','room','host',JSON.stringify(state),Date.now()-10000);
 await request('host','PUT','room/'+owner.session.id,{...state,playing:false,ended:true,revision:1});
 await assert.rejects(request('guest','GET','room/old-owner-session'),{status:409});
 const fresh=await request('host','POST','room',state);
 assert.notEqual(fresh.session.id,owner.session.id);
 assert.equal((await request('guest','POST','room',state)).session.id,fresh.session.id);
 db.close();
});

test('public availability distinguishes inactive, live, paused and completed rooms without leaking session IDs',async()=>{
 const {db,request}=setup();
 const path='availability?ids=room,draft,unknown';
 assert.deepEqual((await request(null,'GET',path)).rooms,[{id:'room',status:'inactive'}]);
 const created=await request('host','POST','room',state);
 assert.deepEqual((await request(null,'GET',path)).rooms,[{id:'room',status:'live'}]);
 await request('host','PUT','room/'+created.session.id,{...state,playing:false,revision:1});
 assert.deepEqual((await request(null,'GET',path)).rooms,[{id:'room',status:'paused'}]);
 await request('host','PUT','room/'+created.session.id,{...state,playing:false,ended:true,revision:2});
 assert.deepEqual((await request(null,'GET',path)).rooms,[{id:'room',status:'inactive'}]);
 await request('host','POST','room',state);
 db.prepare('update meditation_sessions set updated_at=?').run(Date.now()-25*60*1000);
 assert.deepEqual((await request(null,'GET',path)).rooms,[{id:'room',status:'inactive'}]);
 await assert.rejects(request(null,'GET','availability?ids='+Array.from({length:101},(_,i)=>'room'+i).join(',')),{status:400});
 db.close();
});
