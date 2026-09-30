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
 const publicRecord=(await (await s.call('catalog')).json()).records[0]; assert.equal(publicRecord.name,'Updated');assert.equal(publicRecord.createdBy.startsWith('tenant:'),true);assert.equal(publicRecord.canMessage,true);
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
 const response=await s.call('workspace/churches','POST',{name:'Church',city:'City',country:'Country',area:'Downtown',denomination:'Baptist'});
 assert.equal(response.status,201);
 assert.equal((await response.json()).record.area,'Downtown');
});
test('church creation reaches owner review and the owner can publish it while it remains pending',async()=>{
 const s=setup();
 const createdResponse=await s.call('workspace/churches','POST',{name:'Pending Hope Church',city:'Edmonton',country:'Canada',denomination:'Baptist',pastor:'Pastor Hope',email:'hope@example.test',phone:'555-0101'});
 assert.equal(createdResponse.status,201);
 const {record:created}=await createdResponse.json();
 assert.equal(created.publicationState,'pending');
 assert.equal(created.verified,false);

 const creatorWorkspace=await (await s.call('workspace')).json();
 assert.equal(creatorWorkspace.records.some(record=>record.id===created.id),true);
 assert.equal((await (await s.call('catalog/churches')).json()).records.some(record=>record.id===created.id),false);

 s.as('owner');
 const ownerWorkspace=await (await s.call('workspace')).json();
 assert.equal(ownerWorkspace.records.some(record=>record.id===created.id&&record.publicationState==='pending'),true);
 const initialSettings=await (await s.call('platform-settings')).json();
 assert.equal(initialSettings.churchPublication.autoPublishPendingChurches,false);
 const enabled=await (await s.call('platform-settings/church-publication','PUT',{autoPublishPendingChurches:true,revision:initialSettings.churchPublication.revision})).json();
 assert.equal(enabled.churchPublication.autoPublishPendingChurches,true);

 const publicPending=(await (await s.call('catalog/churches')).json()).records.find(record=>record.id===created.id);
 assert.equal(publicPending.publicationState,'pending');
 assert.equal(publicPending.verified,false);

 await s.call('workspace/churches/'+created.id,'PUT',{revision:created.revision,publicationState:'published'});
 const publicApproved=(await (await s.call('catalog/churches')).json()).records.find(record=>record.id===created.id);
 assert.equal(publicApproved.publicationState,'published');
 assert.equal(publicApproved.verified,true);
});
test('only the verified platform owner can change church auto publication',async()=>{
 const s=setup();
 const initial=(await (await s.call('platform-settings')).json()).churchPublication;
 await assert.rejects(s.call('platform-settings/church-publication','PUT',{autoPublishPendingChurches:true,revision:initial.revision}),{status:403});
});
test('meditation creation reaches owner review and can be public while still pending',async()=>{
 const s=setup();
 const payload={title:'Pending Peace Room',subtitle:'A quiet place to rest',category:'community',theme:'chapel',template:'timer',purpose:'prayer',mode:'light',timeMode:'timed',durationMinutes:20,toneFreq:432,selectedAudio:'silence',verses:[{topic:'Peace',text:'Be still',ref:'Psalm 46:10'}],commentsEnabled:true};
 const createdResponse=await s.call('workspace/meditation','POST',payload);
 assert.equal(createdResponse.status,201);
 const {record:created}=await createdResponse.json();
 assert.equal(created.publicationState,'pending');
 assert.equal(created.verified,false);
 assert.equal((await (await s.call('catalog/meditation')).json()).records.some(record=>record.id===created.id),false);
 await assert.rejects(s.call('meditation-chat/'+created.id),{status:404});
 s.as('owner');
 const ownerWorkspace=await (await s.call('workspace')).json();
 assert.equal(ownerWorkspace.records.some(record=>record.id===created.id&&record.kind==='meditation'&&record.publicationState==='pending'),true);
 const initial=(await (await s.call('platform-settings')).json()).meditationPublication;
 assert.equal(initial.autoPublishPendingMeditations,false);
 const enabled=await (await s.call('platform-settings/meditation-publication','PUT',{autoPublishPendingMeditations:true,revision:initial.revision})).json();
 assert.equal(enabled.meditationPublication.autoPublishPendingMeditations,true);
 const publicPending=(await (await s.call('catalog/meditation')).json()).records.find(record=>record.id===created.id);
 assert.equal(publicPending.publicationState,'pending');
 assert.equal(publicPending.verified,false);
 assert.equal((await s.call('meditation-chat/'+created.id)).status,200);
 await s.call('workspace/meditation/'+created.id,'PUT',{revision:created.revision,publicationState:'published'});
 const publicApproved=(await (await s.call('catalog/meditation')).json()).records.find(record=>record.id===created.id);
 assert.equal(publicApproved.publicationState,'published');
 assert.equal(publicApproved.verified,true);
});
test('only the verified platform owner can change meditation auto publication',async()=>{
 const s=setup();
 const initial=(await (await s.call('platform-settings')).json()).meditationPublication;
 await assert.rejects(s.call('platform-settings/meditation-publication','PUT',{autoPublishPendingMeditations:true,revision:initial.revision}),{status:403});
});
test('every remaining module can be public while pending, stays in owner review, and loses the badge state after approval',async()=>{
 const s=setup();
 const created={};
 const payloads={
  events:{title:'Pending Community Night',eventType:'in-person',startsAt:'2099-05-01T18:00:00Z',endsAt:'2099-05-01T20:00:00Z',city:'Edmonton',country:'Canada',currency:'CAD',totalTickets:100,ticketPriceCents:0},
  store:{name:'Pending Community Store',ownerName:'Alice',category:'Books & Resources',description:'Books and tools',email:'alice@example.test',live:false},
  channels:{name:'Pending Teaching Channel',owner:'Alice',handle:'@pending-teaching',topic:'Bible Teaching',description:'Weekly teaching',format:'Video',cover:'https://example.test/channel.jpg',avatar:'https://example.test/avatar.jpg',live:false},
  resources:{title:'Pending Study Guide',creator:'Alice',topic:'Bible Study',description:'A short study guide',type:'Text',format:'PDF',duration:'12 pages',image:'https://example.test/resource.jpg',access:'Free',price:0,pages:['Study page']}
 };
 for(const kind of ['events','store','channels','resources']) {
  const response=await s.call('workspace/'+kind,'POST',payloads[kind]);
  assert.equal(response.status,201);
  created[kind]=(await response.json()).record;
  assert.equal(created[kind].publicationState,'pending');
  assert.equal((await (await s.call('catalog/'+kind)).json()).records.some(record=>record.id===created[kind].id),false);
 }
 const productResponse=await s.call('workspace/products','POST',{title:'Pending Journal',storeId:created.store.id,seller:'Pending Community Store',sellerType:'Channel',category:'Books',description:'A guided journal',price:18,inventory:25,status:'Active',featured:false,image:'https://example.test/journal.jpg',itemType:'product'});
 assert.equal(productResponse.status,201);
 created.products=(await productResponse.json()).record;
 assert.equal(created.products.publicationState,'pending');
 assert.equal((await (await s.call('catalog/products')).json()).records.some(record=>record.id===created.products.id),false);

 const definitions={
  events:['eventPublication','event-publication','autoPublishPendingEvents'],
  store:['storePublication','store-publication','autoPublishPendingStores'],
  products:['productPublication','product-publication','autoPublishPendingProducts'],
  channels:['channelPublication','channel-publication','autoPublishPendingChannels'],
  resources:['resourcePublication','resource-publication','autoPublishPendingResources']
 };
 const creatorWorkspace=(await (await s.call('workspace')).json()).records;
 for(const [kind,record] of Object.entries(created)) assert.equal(creatorWorkspace.some(item=>item.id===record.id&&item.publicationState==='pending'),true,kind+' should remain pending in the creator workspace');

 const initial=await (await s.call('platform-settings')).json();
 for(const [kind,[responseKey,route,field]] of Object.entries(definitions)) {
  assert.equal(initial[responseKey][field],false);
  await assert.rejects(s.call('platform-settings/'+route,'PUT',{[field]:true,revision:initial[responseKey].revision}),{status:403});
 }

 s.as('owner');
 const ownerWorkspace=(await (await s.call('workspace')).json()).records;
 for(const [kind,record] of Object.entries(created)) assert.equal(ownerWorkspace.some(item=>item.id===record.id&&item.publicationState==='pending'),true,kind+' should reach owner review');
 for(const [kind,[responseKey,route,field]] of Object.entries(definitions)) {
  const enabled=await (await s.call('platform-settings/'+route,'PUT',{[field]:true,revision:initial[responseKey].revision})).json();
  assert.equal(enabled[responseKey][field],true);
  const pending=(await (await s.call('catalog/'+kind)).json()).records.find(record=>record.id===created[kind].id);
  assert.equal(pending.publicationState,'pending');
  assert.equal(pending.verified,false);
  await s.call('workspace/'+kind+'/'+created[kind].id,'PUT',{revision:created[kind].revision,publicationState:'published'});
  const approved=(await (await s.call('catalog/'+kind)).json()).records.find(record=>record.id===created[kind].id);
  assert.equal(approved.publicationState,'published');
  assert.equal(approved.verified,true);
 }
});
test('private records encrypt text and enforce author, recipient and explicit pastoral scope',async()=>{
 const s=setup(); const {record}=await (await s.call('private/prayer','POST',{text:'Confidential prayer',recipientUserId:'bob'})).json();
 const stored=s.db.prepare('select data_encrypted from private_records where id=?').get(record.id);assert.equal(stored.data_encrypted.includes('Confidential'),false);
 s.as('bob');assert.equal((await (await s.call('private')).json()).records.length,0);
 s.as('owner');assert.equal((await (await s.call('private')).json()).records.length,0);
 await assert.rejects(s.call('private/prayer/'+record.id,'PUT',{status:'read',revision:1}),{status:404});
 s.as('alice');assert.equal((await (await s.call('private')).json()).records[0].requestText,'Confidential prayer');
 const {record:church}=await (await s.call('workspace/churches','POST',{name:'Church',city:'City',country:'Country'})).json();s.as('owner');await s.call('workspace/churches/'+church.id,'PUT',{revision:1,publicationState:'published'});s.as('alice');
 await s.call('private/prayer','POST',{churchId:church.id,visibility:'pastors',text:'Pastoral prayer'});
 s.db.prepare("insert into tenant_memberships values (?,'pastor','pastor')").run(church.tenantId);s.as('pastor');assert.equal((await (await s.call('private')).json()).records.length,1);
 s.as('viewer');assert.equal((await (await s.call('private')).json()).records.length,0);
});
test('church teams control ride dispatch while requesters cannot forge confirmation state',async()=>{
 const s=setup();
 const {record:church}=await (await s.call('workspace/churches','POST',{name:'Ride Church',city:'City',country:'Country'})).json();
 s.as('owner');await s.call('workspace/churches/'+church.id,'PUT',{revision:1,publicationState:'published'});
 s.as('bob');
 const response=await s.call('private/ride','POST',{churchId:church.id,visibility:'pastors',fullName:'Rider',phone:'555-0100',email:'rider@example.test',pickupAddress:'Main Street',passengers:2,consent:true,stage:2,stage2Confirmed:true,driver:'Attacker'});
 const {record}=await response.json();
 assert.equal(record.stage,1);assert.equal(record.stage2Confirmed,false);assert.equal(record.driver,'Unassigned');
 await assert.rejects(s.call('private/ride/'+record.id,'PUT',{status:'confirmed',revision:1,driver:'Self assigned'}),{status:403});
 s.as('alice');
 const received=(await (await s.call('private/ride')).json()).records;
 assert.equal(received.length,1);assert.equal(received[0].direction,'received');
 assert.equal((await s.call('private/ride/'+record.id,'PUT',{status:'confirmed',revision:1,driver:'Church Driver',pickupWindow:'09:00'})).status,200);
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
test('livestream chat persists authenticated messages and exposes them to every viewer',async()=>{
 const s=setup();
 const {record:channel}=await (await s.call('workspace/channels','POST',{name:'Live channel',live:true,liveUrl:'https://www.youtube.com/watch?v=abcdefghijk'})).json();
 s.as('owner');await s.call('workspace/channels/'+channel.id,'PUT',{revision:1,publicationState:'published'});
 s.as('bob');
 const posted=await s.call('livestream-chat/channel/'+channel.id,'POST',{body:'Joining from London'});
 assert.equal(posted.status,201);
 assert.equal((await posted.json()).message.name,'bob');
 s.as('viewer');
 const publicFeed=await (await s.call('livestream-chat/channel/'+channel.id)).json();
 assert.equal(publicFeed.messages.length,1);
 assert.equal(publicFeed.messages[0].body,'Joining from London');
 assert.equal(publicFeed.messages[0].name,'bob');
 assert.equal(publicFeed.messages[0].userId,undefined);
 assert.equal(publicFeed.messages[0].email,undefined);
 await assert.rejects(s.call('livestream-chat/channel/'+channel.id,'POST',{body:'x'.repeat(301)}),{status:400});
});
test('meditation room comments persist, respect host moderation, and remain publicly readable',async()=>{
 const s=setup();
 const {record:room}=await (await s.call('workspace/meditation','POST',{title:'Prayer room',toneFreq:432,commentsEnabled:false,verses:[{topic:'Peace',text:'Be still',ref:'Psalm 46:10'}]})).json();
 s.as('owner');await s.call('workspace/meditation/'+room.id,'PUT',{revision:1,publicationState:'published'});
 s.as('bob');
 await assert.rejects(s.call('meditation-chat/'+room.id,'POST',{body:'Closed comment'}),{status:409});
 s.as('alice');
 const initial=await (await s.call('meditation-chat/'+room.id)).json();
 assert.equal(initial.enabled,false);assert.equal(initial.canManage,true);
 const enabled=await (await s.call('meditation-chat/'+room.id,'PUT',{enabled:true,revision:initial.revision})).json();
 assert.equal(enabled.enabled,true);
 s.as('bob');
 const posted=await (await s.call('meditation-chat/'+room.id,'POST',{body:'A real reflection'})).json();
 assert.equal(posted.message.isHost,false);
 s.as('alice');
 const hostPost=await (await s.call('meditation-chat/'+room.id,'POST',{body:'Welcome to the room'})).json();
 assert.equal(hostPost.message.isHost,true);
 s.as('viewer');
 const publicFeed=await (await s.call('meditation-chat/'+room.id)).json();
 assert.deepEqual(publicFeed.messages.map(message=>message.body),['A real reflection','Welcome to the room']);
 assert.equal(publicFeed.messages[0].userId,undefined);assert.equal(publicFeed.canManage,false);
 await assert.rejects(s.call('meditation-chat/'+room.id,'PUT',{enabled:false,revision:enabled.revision}),{status:403});
});
test('AES-GCM rejects altered ciphertext and cross-record substitution',async()=>{const {env}=setup();const encrypted=await seal(env,{text:'Private'},'record:alice');assert.deepEqual(await unseal(env,encrypted,'record:alice'),{text:'Private'});await assert.rejects(unseal(env,encrypted,'record:bob'));await assert.rejects(unseal(env,encrypted.slice(0,-4)+'AAAA','record:alice'));});
test('authenticator follows RFC 6238 vectors and rejects replay',async()=>{const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';assert.equal(await totpCode(secret,1),'287082');assert.equal(await verifyTotp(secret,'287082',-1,59000),1);assert.equal(await verifyTotp(secret,'287082',1,59000),null);});
test('password KDF matches native PBKDF2 at 600,000 iterations',async()=>{const salt=Buffer.alloc(16,1).toString('base64');assert.equal(await modernPassword('correct horse battery staple',salt),'pbkdf2-sha256$600000$'+pbkdf2Sync('correct horse battery staple',Buffer.from(salt,'base64'),600000,32,'sha256').toString('base64'));});
test('verification links are hashed and single use',async()=>{const s=setup();const token='a'.repeat(43);s.db.prepare('insert into security_tokens values (?,?,?,?,?)').run(await tokenDigest(token),'alice','verify','2099-01-01T00:00:00Z',new Date().toISOString());const request=()=>new Request('https://example.test/api/auth/verification/confirm',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})});assert.equal((await handleIdentityApi(request(),s.env,s.ctx)).status,200);await assert.rejects(handleIdentityApi(request(),s.env,s.ctx),{status:400});});
test('only the configured, MFA-verified bootstrap account can claim the initial owner role',async()=>{const s=setup();s.env.OWNER_BOOTSTRAP_EMAIL='alice@example.test';const request=()=>new Request('https://example.test/api/auth/security/owner-claim',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});await assert.rejects(handleIdentityApi(request(),s.env,s.ctx),{status:409});s.db.prepare("update users set totp_secret_encrypted='encrypted-mfa' where id='alice'").run();const response=await handleIdentityApi(request(),s.env,s.ctx);assert.equal(response.status,200);assert.equal((await response.json()).ok,true);assert.equal(s.db.prepare("select role from platform_roles where user_id='alice'").get().role,'owner');s.as('bob');await assert.rejects(handleIdentityApi(request(),s.env,s.ctx),{status:403});});
