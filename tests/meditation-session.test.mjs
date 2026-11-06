import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleMeditationSession, validatePlayback } from '../src/meditation-session.js';

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec("pragma foreign_keys=on; create table users(id text primary key); insert into users values ('host'),('guest'); create table platform_entities(id text primary key,kind text,state text,data_json text); insert into platform_entities values ('room','meditation','published','{\"verses\":[{},{}]}'),('draft','meditation','draft','{}');");
  db.exec(readFileSync(new URL('../migrations/0028_meditation_sessions.sql',import.meta.url),'utf8'));
  const env = {DB: {
    prepare(sql) {
      return {bind(...args) {
        return {
          async first() { return db.prepare(sql).get(...args) || null; },
          async run() { return db.prepare(sql).run(...args); }
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
 db.exec("insert into platform_entities values ('other','meditation','published','{}')");
 await assert.rejects(request('guest','GET','other/'+created.session.id),{status:404});
 db.close();
});
test('playback rejects malformed positions, audio types and scripture indices',()=>{
 for(const patch of [{position:-1},{position:Infinity},{playing:'yes'},{verse:2},{verse:0.5},{audioType:'untrusted'}]) assert.throws(()=>validatePlayback({...state,...patch},{verses:[{},{}]}),{status:400});
});
