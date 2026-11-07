import test from 'node:test';
import assert from 'node:assert/strict';
import{DatabaseSync}from'node:sqlite';
import{readFileSync,readdirSync}from'node:fs';
import worker from '../src/worker.js';

test('public event listing omits drafts and archived workspace events while retaining legacy records',async()=>{
 const db=new DatabaseSync(':memory:');
 for(const file of readdirSync(new URL('../migrations/',import.meta.url)).sort())db.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
 for(const id of ['legacy','draft','published','archived'])db.prepare('insert into events(id,title,starts_at) values (?,?,?)').run(id,id,'2030-01-01T00:00:00Z');
 for(const state of ['draft','published','archived'])db.prepare("insert into platform_entities(id,kind,tenant_id,created_by,state,data_json,created_at,updated_at) values (?,'events','platform-system','system:platform',?,'{}','now','now')").run(state,state);
 const env={DB:{prepare(sql){return {bind(...args){return {async all(){return {results:db.prepare(sql).all(...args)};}};}}}}};
 try{const result=await(await worker.fetch(new Request('https://example.test/api/events'),env,{})).json();assert.equal(result.ok,true);assert.deepEqual(result.events.map(row=>row.id).sort(),['legacy','published']);}finally{db.close();}
});
