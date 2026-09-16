import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { pbkdf2Sync } from 'node:crypto';
import { handlePlatformApi } from '../src/trusted-platform.js';
import { handleIdentityApi, seal, unseal, totpCode, verifyTotp, modernPassword, tokenDigest } from '../src/identity-security.js';

function setup() {
 const db=new DatabaseSync(':memory:'); db.exec('pragma foreign_keys=on');
 for(const file of readdirSync(new URL('../migrations/',import.meta.url)).sort()) db.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
 const prepare=sql=>({bind(...args){ const statement=db.prepare(sql); const values=args.map(v=>v??null); const execute=()=>{const results=statement.columns().length?statement.all(...values):[]; const meta=results.length?{}:statement.columns().length?{}:statement.run(...values); return {results,meta,success:true};}; return {execute,async first(){return statement.get(...values)||null;},async all(){return {results:statement.all(...values)};},async run(){return execute();}}; }});
 const env={DB:{prepare,async batch(statements){db.exec('begin');try {const result=statements.map(s=>s.execute());db.exec('commit');return result;}catch(e){db.exec('rollback');throw e;}}},AUTH_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64')};
 const now=new Date().toISOString();
 for(const id of ['alice','bob','viewer','pastor','owner']) db.prepare('insert into users (id,email,name,password_hash,password_salt,is_creator,created_at,email_verified_at,totp_secret_encrypted) values (?,?,?,?,?,?,?,?,?)').run(id,id+'@example.test',id,'authentication-disabled','',1,now,now,id==='owner'?'encrypted-mfa':null);
 db.prepare("insert into platform_roles values ('owner','owner')").run();
 let current='alice';
 const ctx={json:(body,status=200)=>new Response(JSON.stringify(body),{status}),getSessionUser:async()=>({...db.prepare('select * from users where id=?').get(current),mfa_verified_at:now,session_created_at:now})};
 const call=async(path,method='GET',body)=>{const request=new Request('https://example.test/api/'+path,{method,headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return handlePlatformApi(request,env,ctx);};
 return {db,env,ctx,call,as:id=>current=id};
}
test('tenant writes reject impersonation, foreign ownership, viewer edits and stale revisions',async()=>{
 const s=setup(); const response=await s.call('workspace/channels','POST',{name:'Alice channel',createdBy:'bob',tenantId:'foreign',verified:true}); const {record}=await response.json();
 assert.equal(response.status,201);assert.equal(record.createdBy,'alice');assert.equal(record.state,'pending');
 s.as('bob');await assert.rejects(s.call('workspace/channels/'+record.id,'PUT',{name:'Hijacked',revision:1}),{status:403});
 s.db.prepare("insert into tenant_memberships values (?, 'viewer','viewer')").run(record.tenantId);s.as('viewer');
 assert.equal((await (await s.call('workspace')).json()).records[0].canManage,false);
 await assert.rejects(s.call('workspace/channels/'+record.id,'PUT',{name:'Hijacked',revision:1}),{status:403});
 s.as('alice');await assert.rejects(s.call('workspace/channels/'+record.id,'PUT',{name:'Publish',revision:1,publicationState:'published'}),{status:403});
 await s.call('workspace/channels/'+record.id,'PUT',{name:'Updated',revision:1});
 await assert.rejects(s.call('workspace/channels/'+record.id,'PUT',{name:'Stale',revision:1}),{status:409});
 s.as('owner');await s.call('workspace/channels/'+record.id,'PUT',{revision:2,publicationState:'published'});
 const publicRecord=(await (await s.call('catalog')).json()).records[0]; assert.equal(publicRecord.name,'Updated');assert.equal(publicRecord.createdBy.startsWith('tenant:'),true);
});
test('platform taxonomies are public, owner-managed and enforced for new classifications',async()=>{
 const s=setup();
 const initial=await (await s.call('taxonomies')).json();
 assert.deepEqual(initial.taxonomies.denominations.items,['Christ Embassy','New Generation','Pentecostal','Full Gospel','Charismatic','Baptist','Catholic','Anglican','Presbyterian','Protestant']);
 await assert.rejects(s.call('taxonomies/denominations','PUT',{items:['Baptist'],revision:1}),{status:403});
 s.as('owner');
 const updated=await (await s.call('taxonomies/denominations','PUT',{items:['Baptist','Presbyterian'],revision:1})).json();
 assert.equal(updated.taxonomy.revision,2);
 await assert.rejects(s.call('taxonomies/denominations','PUT',{items:['Baptist','baptist'],revision:2}),{status:400});
 s.as('alice');
 await assert.rejects(s.call('workspace/churches','POST',{name:'Church',city:'City',country:'Country',denomination:'Made Up'}),{status:400});
 const response=await s.call('workspace/churches','POST',{name:'Church',city:'City',country:'Country',denomination:'Baptist'});
 assert.equal(response.status,201);
});
test('private records encrypt text and enforce author, recipient and explicit pastoral scope',async()=>{
 const s=setup(); const {record}=await (await s.call('private/prayer','POST',{text:'Confidential prayer',recipientUserId:'bob'})).json();
 const stored=s.db.prepare('select data_encrypted from private_records where id=?').get(record.id);assert.equal(stored.data_encrypted.includes('Confidential'),false);
 s.as('bob');assert.equal((await (await s.call('private')).json()).records.length,0);
 s.as('owner');assert.equal((await (await s.call('private')).json()).records.length,0);
 await assert.rejects(s.call('private/prayer/'+record.id,'PUT',{status:'read',revision:1}),{status:404});
 s.as('alice');assert.equal((await (await s.call('private')).json()).records[0].text,'Confidential prayer');
 const {record:church}=await (await s.call('workspace/churches','POST',{name:'Church',city:'City',country:'Country'})).json();s.as('owner');await s.call('workspace/churches/'+church.id,'PUT',{revision:1,publicationState:'published'});s.as('alice');
 await s.call('private/prayer','POST',{churchId:church.id,visibility:'pastors',text:'Pastoral prayer'});
 s.db.prepare("insert into tenant_memberships values (?,'pastor','pastor')").run(church.tenantId);s.as('pastor');assert.equal((await (await s.call('private')).json()).records.length,1);
 s.as('viewer');assert.equal((await (await s.call('private')).json()).records.length,0);
});
test('paid resource material never appears in public catalog and access requires a server entitlement',async()=>{
 const s=setup();s.as('owner'); const {record}=await (await s.call('workspace/resources','POST',{title:'Paid book',access:'Paid',price:12,pages:['Secret chapter'],sourceUrl:'https://material.example/book.pdf',publicationState:'published'})).json();
 assert.equal((await (await s.call('catalog/resources')).json()).records[0].pages,undefined);s.as('bob');await assert.rejects(s.call('resource-material/'+record.id),{status:403});
});
test('event projection preserves reservations and rejects capacity reductions',async()=>{
 const s=setup();s.as('owner');const payload={title:'Future event',eventType:'online',startsAt:'2099-01-01T10:00:00Z',endsAt:'2099-01-01T11:00:00Z',currency:'USD',totalTickets:10,ticketPriceCents:0,publicationState:'published'};
 const {record}=await (await s.call('workspace/events','POST',payload)).json();s.db.prepare('update events set tickets_sold=5 where id=?').run(record.id);
 await s.call('workspace/events/'+record.id,'PUT',{revision:1,title:'Updated',ticketsSold:0});assert.equal(s.db.prepare('select tickets_sold from events where id=?').get(record.id).tickets_sold,5);
 await assert.rejects(s.call('workspace/events/'+record.id,'PUT',{revision:2,totalTickets:4}),{status:409});
 assert.throws(()=>s.db.prepare('update events set tickets_sold=0 where id=?').run(record.id),/invalid event inventory/);
});
test('authenticated message replies reach the original sender and unrelated users cannot reply',async()=>{
 const s=setup();const {record:channel}=await (await s.call('workspace/channels','POST',{name:'Alice channel'})).json();s.as('owner');await s.call('workspace/channels/'+channel.id,'PUT',{revision:1,publicationState:'published'});s.as('bob');
 const {record:message}=await (await s.call('private/message','POST',{entityId:channel.id,body:'Question'})).json();s.as('alice');const {record:reply}=await (await s.call('private/message','POST',{entityId:channel.id,replyTo:message.id,body:'Answer'})).json();
 assert.equal(reply.threadId,message.threadId);s.as('bob');assert.equal((await (await s.call('private/message')).json()).records.length,2);s.as('viewer');await assert.rejects(s.call('private/message','POST',{entityId:channel.id,replyTo:message.id,body:'Intrusion'}),{status:404});
});
test('AES-GCM rejects altered ciphertext and cross-record substitution',async()=>{const {env}=setup();const encrypted=await seal(env,{text:'Private'},'record:alice');assert.deepEqual(await unseal(env,encrypted,'record:alice'),{text:'Private'});await assert.rejects(unseal(env,encrypted,'record:bob'));await assert.rejects(unseal(env,encrypted.slice(0,-4)+'AAAA','record:alice'));});
test('authenticator follows RFC 6238 vectors and rejects replay',async()=>{const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';assert.equal(await totpCode(secret,1),'287082');assert.equal(await verifyTotp(secret,'287082',-1,59000),1);assert.equal(await verifyTotp(secret,'287082',1,59000),null);});
test('password KDF matches native PBKDF2 at 600,000 iterations',async()=>{const salt=Buffer.alloc(16,1).toString('base64');assert.equal(await modernPassword('correct horse battery staple',salt),'pbkdf2-sha256$600000$'+pbkdf2Sync('correct horse battery staple',Buffer.from(salt,'base64'),600000,32,'sha256').toString('base64'));});
test('verification links are hashed and single use',async()=>{const s=setup();const token='a'.repeat(43);s.db.prepare('insert into security_tokens values (?,?,?,?,?)').run(await tokenDigest(token),'alice','verify','2099-01-01T00:00:00Z',new Date().toISOString());const request=()=>new Request('https://example.test/api/auth/verification/confirm',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})});assert.equal((await handleIdentityApi(request(),s.env,s.ctx)).status,200);await assert.rejects(handleIdentityApi(request(),s.env,s.ctx),{status:400});});
