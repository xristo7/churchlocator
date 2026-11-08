import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {handleResourcesApi} from '../src/resources.js';
import worker from '../src/worker.js';

test('resource material and saved lists respect access and user scope',async()=>{
 const db=new DatabaseSync(':memory:');
 for(const file of readdirSync(new URL('../migrations/',import.meta.url)).sort())db.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
 db.exec("insert into users(id,email,name,password_hash,password_salt,created_at) values ('one','one@example.invalid','One','disabled','','now'),('two','two@example.invalid','Two','disabled','','now')");
 for(const [id,data] of [['free',{title:'Video',type:'Video',access:'Free',sourceUrl:'https://www.youtube.com/embed/dQw4w9WgXcQ'}],['paid',{title:'Paid PDF',type:'Text',format:'PDF',access:'Paid',price:10,sourceUrl:'https://material.example.invalid/private.pdf'}]])db.prepare("insert into platform_entities(id,kind,tenant_id,created_by,state,data_json,created_at,updated_at) values (?,'resources','platform-system','system:platform','published',?,'now','now')").run(id,JSON.stringify(data));
 const env={RESOURCE_HOSTS:'material.example.invalid,www.youtube.com',DB:{prepare(sql){return {bind(...args){const bound=[];const query=sql.replace(/\?(\d+)/g,(_,n)=>{bound.push(args[Number(n)-1]);return '?';});const values=bound.length?bound:args;return {async first(){return db.prepare(query).get(...values)||null;},async all(){return {results:db.prepare(query).all(...values)};},async run(){return db.prepare(query).run(...values);}};}}}}};
 const call=(path,user='one',body)=>handleResourcesApi(new Request('https://example.test/api/'+path,{method:body?'POST':'GET',...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})}),env,{getSessionUser:async()=>user?{id:user}:null,json:body=>body});
 try{
  const free=await call('resources/free');assert.equal(free.material.embedUrl,'https://www.youtube.com/embed/dQw4w9WgXcQ');assert.equal(free.material.fileUrl,null);
  await call('resources/free/library','one',{on:true});await call('resources/free/library','one',{on:true});await call('resources/free/bookmark','one',{on:true});
  assert.deepEqual((await call('resource-library')).library,['free']);assert.deepEqual((await call('resource-library')).bookmarks,['free']);
  assert.deepEqual((await call('resource-library','two')).library,[]);assert.deepEqual((await call('resource-library',null)).library,[]);
  const paid=await call('resources/paid');assert.equal(paid.locked,true);assert.equal(paid.material.fileUrl,null);await assert.rejects(call('resources/paid/library','one',{on:true}),{status:402});
 }finally{db.close();}
});

test('only configured material hosts are added to resource reader connections',async()=>{
 const env={RESOURCE_HOSTS:'material.example.invalid,bad; script-src *',ASSETS:{fetch:async()=>new Response('page',{headers:{'content-type':'text/html'}})}};
 const response=await worker.fetch(new Request('https://example.test/resources/free/read'),env,{});
 const policy=response.headers.get('content-security-policy');assert.ok(policy.includes('https://material.example.invalid'));assert.equal(policy.includes('bad;'),false);
});
