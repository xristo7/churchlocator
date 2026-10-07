import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleSpotlightApi,deliverSpotlightNotifications} from '../src/spotlight.js';

function setup(){
  const sql=new DatabaseSync(':memory:');sql.exec(`pragma foreign_keys=on;
    create table users(id text primary key,name text); create table tenants(id text primary key);
    create table platform_entities(id text primary key,kind text,state text,tenant_id text,data_json text);
    insert into users values('system:platform','System'),('a','Alice'),('b','Bob');insert into tenants values('platform-system');
    insert into platform_entities values('channel-a','channels','published','platform-system','{}'),('channel-b','channels','published','platform-system','{}');`);
  sql.exec(readFileSync(new URL('../migrations/0006_spotlight.sql',import.meta.url),'utf8'));
  sql.exec(readFileSync(new URL('../migrations/0013_spotlight_discovery.sql',import.meta.url),'utf8'));
  sql.exec(readFileSync(new URL('../migrations/0015_separate_live.sql',import.meta.url),'utf8'));
  sql.exec("update spotlight_items set channel_entity_id='channel-a'");
  sql.exec("update spotlight_publications set published_at='2019-01-01T00:00:00.000Z'");
  const db={prepare(query){const statement=sql.prepare(query);let params=[];const wrapper={bind(...values){params=values;return wrapper;},async first(){return statement.get(...params)||null;},async all(){return {results:statement.all(...params)};},async run(){return {meta:statement.run(...params)};}};return wrapper;},async batch(statements){sql.exec('begin');try{const results=[];for(const statement of statements)results.push(await statement.run());sql.exec('commit');return results;}catch(error){sql.exec('rollback');throw error;}}};
  async function call(path,body,userId='a',method=body?'POST':'GET'){
    const request=new Request('https://example.test/api/spotlight/'+path,{method,...(body?{body:JSON.stringify(body),headers:{'content-type':'application/json'}}:{})});
    return handleSpotlightApi(request,{DB:db},{getSessionUser:async()=>userId?{id:userId,name:userId==='a'?'Alice':'Bob'}:null,json:(data,status=200)=>({status,...data})});
  }
  return {sql,db,call};
}

test('likes and saves use explicit state, persistent counts and member isolation',async()=>{
  const {sql,call}=setup();try{
    let result=await call('engagement/spotlight-grace-story',{action:'like',active:true});assert.equal(result.item.likes,1);assert.equal(result.item.liked,true);
    result=await call('engagement/spotlight-grace-story',{action:'like',active:true});assert.equal(result.item.likes,1);
    await call('engagement/spotlight-grace-story',{action:'save',active:true});assert.equal((await call('saved')).items.length,1);assert.equal((await call('saved',null,'b')).items.length,0);
    result=await call('item/spotlight-grace-story',null,'b');assert.equal(result.item.liked,false);assert.equal(result.item.likes,1);
    await call('engagement/spotlight-grace-story',{action:'like',active:false});assert.equal((await call('item/spotlight-grace-story')).item.likes,0);
    await assert.rejects(call('saved',null,null),/Sign in|Authentication|sign in/);
  }finally{sql.close();}
});
test('comments belong to the chosen post and unpublished posts cannot be read or engaged',async()=>{
  const {sql,call}=setup();try{
    const result=await call('engagement/spotlight-marcus-word',{action:'comment',body:'Encouraging message'});assert.equal(result.item.comments,1);
    assert.equal((await call('comments/spotlight-grace-story')).comments.length,0);assert.equal((await call('comments/spotlight-marcus-word')).comments[0].body,'Encouraging message');
    sql.exec("update spotlight_items set comments_enabled=0 where id='spotlight-marcus-word'");await assert.rejects(call('engagement/spotlight-marcus-word',{action:'comment',body:'Closed'}),/closed/);
    sql.exec("update spotlight_items set status='pending' where id='spotlight-grace-story'");
    for(const path of ['item/spotlight-grace-story','comments/spotlight-grace-story'])await assert.rejects(call(path),/unavailable/);
    await assert.rejects(call('engagement/spotlight-grace-story',{action:'like',active:true}),/unavailable/);
  }finally{sql.close();}
});
test('channel follows synchronize with the feed and scheduled publications notify once',async()=>{
  const {sql,db,call}=setup();try{
    await call('channel-follow/channel-a',{active:true},'a','PUT');assert.equal((await call('channel/channel-a')).following,true);assert.equal((await call('following')).items.length,3);
    // A post scheduled in the future must wait for actual publication.
    sql.exec("delete from spotlight_publications where item_id='spotlight-marcus-word';update spotlight_items set status='scheduled',scheduled_at='2099-01-01T00:00:00.000Z' where id='spotlight-marcus-word'");
    await deliverSpotlightNotifications({DB:db});assert.equal((await call('notifications')).notifications.length,0);
    sql.exec("update channel_follows set created_at='2020-01-01T00:00:00.000Z';update spotlight_items set scheduled_at='2020-01-01T00:00:00.000Z' where id='spotlight-marcus-word'");
    await deliverSpotlightNotifications({DB:db});await deliverSpotlightNotifications({DB:db});let notifications=(await call('notifications')).notifications;assert.equal(notifications.length,1);assert.equal(notifications[0].itemId,'spotlight-marcus-word');
    await call('notifications/'+encodeURIComponent(notifications[0].id),{},'b','PUT');assert.equal((await call('notifications')).notifications[0].read,false);
    await call('notifications/'+encodeURIComponent(notifications[0].id),{},'a','PUT');assert.equal((await call('notifications')).notifications[0].read,true);
    await call('channel-follow/channel-a',{active:false},'a','PUT');assert.equal((await call('following')).items.length,0);
  }finally{sql.close();}
});
test('notification preferences and watch reminders persist, deduplicate and cancel',async()=>{
  const {sql,db,call}=setup();try{
    await call('channel-follow/channel-a',{active:true,notificationsEnabled:false},'a','PUT');
    sql.exec("update channel_follows set created_at='2020-01-01T00:00:00.000Z';delete from spotlight_publications where item_id='spotlight-grace-story'");await deliverSpotlightNotifications({DB:db});assert.equal((await call('notifications')).notifications.length,0);
    await assert.rejects(call('reminders/spotlight-grace-story',{dueAt:'2020-01-01T00:00:00Z'},'a','PUT'),/future/);
    const dueAt=new Date(Date.now()+3600000).toISOString();await call('reminders/spotlight-grace-story',{dueAt},'a','PUT');assert.equal((await call('item/spotlight-grace-story')).item.reminderAt,dueAt);
    sql.exec("update spotlight_reminders set due_at='2020-01-01T00:00:00.000Z'");await deliverSpotlightNotifications({DB:db});await deliverSpotlightNotifications({DB:db});assert.equal((await call('notifications')).notifications.length,1);
    await call('reminders/spotlight-grace-story',{dueAt},'a','PUT');await call('reminders/spotlight-grace-story',null,'a','DELETE');assert.equal(sql.prepare('select count(*) count from spotlight_reminders').get().count,0);
  }finally{sql.close();}
});

test('approved example mapping preserves associations and does not invent video URLs',()=>{
  const {sql}=setup();try{
    for(const id of ['owner-demo-channel-harbor-worship','owner-demo-channel-strong-homes','owner-demo-channel-everyday-faith'])sql.prepare("insert into platform_entities values(?,'channels','published','platform-system','{}')").run(id);
    sql.exec("update spotlight_items set channel_entity_id=null");
    sql.exec(readFileSync(new URL('../migrations/0014_spotlight_channel_assignments.sql',import.meta.url),'utf8'));
    const grace=sql.prepare("select * from spotlight_items where id='spotlight-grace-story'").get();assert.equal(grace.channel_entity_id,'owner-demo-channel-harbor-worship');assert.equal(grace.full_content_url,null);assert.equal(grace.content_type,'channel');
    sql.exec("update spotlight_items set channel_entity_id='channel-b' where id='spotlight-grace-story'");
    sql.exec(readFileSync(new URL('../migrations/0014_spotlight_channel_assignments.sql',import.meta.url),'utf8'));
    assert.equal(sql.prepare("select channel_entity_id id from spotlight_items where id='spotlight-grace-story'").get().id,'channel-b');
  }finally{sql.close();}
});
