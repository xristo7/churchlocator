// Start local Wrangler with preview D1 migrations applied, then run this file.
// Uses only --local D1. Install Playwright outside the repo and set PLAYWRIGHT_PATH if needed.
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const {chromium} = await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = 'http://127.0.0.1:8787';
const suffix = randomBytes(6).toString('hex'), roomId = 'sync-test-'+suffix;
const dir = mkdtempSync(join(tmpdir(),'meditation-e2e-'));
const tokens = [randomBytes(32).toString('base64url'), randomBytes(32).toString('base64url')];
const users = ['sync-host-'+suffix, 'sync-guest-'+suffix];
const quote = value => "'"+String(value).replaceAll("'","''")+"'";
const now = new Date().toISOString();
const room = {title:'Sync verification',category:'featured',template:'ripple',theme:'chapel',timeMode:'timed',durationMinutes:20,selectedAudio:'bible',toneFreq:432,verses:[{text:'First verse',ref:'One'},{text:'Second verse',ref:'Two'}]};
const mediaTest = process.env.MEDITATION_E2E_MEDIA === '1';
let media;
if (mediaTest) {
 room.audioSrc = '/media/creator-media/sync-e2e.mp3';
 const file = join(dir,'tone.mp3');
 execFileSync('ffmpeg',['-y','-f','lavfi','-i','sine=frequency=432:duration=30','-loglevel','error',file]);
 media = readFileSync(file);
}
const sql = users.map((id,i)=>`insert into users(id,email,password_hash,password_salt,name,is_creator,created_at,email_verified_at) values (${quote(id)},${quote(id+'@example.invalid')},'authentication-disabled','','Sync tester',0,${quote(now)},${quote(now)}); insert into sessions(token,user_id,created_at,expires_at) values (${quote('v2:'+createHash('sha256').update(tokens[i]).digest('base64'))},${quote(id)},${quote(now)},${quote(new Date(Date.now()+3600000).toISOString())});`).join('\n')+`\ninsert into platform_entities(id,kind,tenant_id,created_by,state,data_json,created_at,updated_at) values (${quote(roomId)},'meditation','platform-system',${quote(users[0])},'published',${quote(JSON.stringify(room))},${quote(now)},${quote(now)});`;
function execute(sql) {
 const file=join(dir,'fixture.sql');writeFileSync(file,sql,{mode:0o600});
 execFileSync('./node_modules/.bin/wrangler',['d1','execute','my-way-of-evangelism-preview','--local','--env','preview','--file',file],{stdio:'pipe'});
}
execute(sql);
const browser = await chromium.launch({executablePath:process.env.CHROME || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const contexts=[];
try {
 async function pageFor(index) {
  const ctx=await browser.newContext();contexts.push(ctx);
  await ctx.addCookies([{name:'mwe_session_v2',value:tokens[index],url:base}]);
  await ctx.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.__meditationAudio = [];
    window.Audio = class extends NativeAudio { constructor(...args) { super(...args); window.__meditationAudio.push(this); } };
  });
  await ctx.route('**/*',route=> {
    if(mediaTest && new URL(route.request().url()).pathname === room.audioSrc) return route.fulfill({status:200,contentType:'audio/mpeg',body:media});
    return new URL(route.request().url()).origin!==base?route.abort():route.continue();
  });
  const page = await ctx.newPage();
  page.on('pageerror', error => console.error('Browser error:', error.message));
  page.on('response', response => { if(response.url().includes('/api/') && response.status() >= 400) console.error('API failure:', response.status(), new URL(response.url()).pathname); });
  return page;
 }
 const hostPage=await pageFor(0),guestPage=await pageFor(1),sameUserPage=await pageFor(0);
 async function openRoom(page, url) {
  await page.goto(url);
  await page.waitForURL('**/app.html?**');
  await page.waitForFunction(()=>document.querySelector('#member-shell-frame')?.contentDocument?.getElementById('meditation-sync-status'));
  return (await page.locator('#member-shell-frame').elementHandle()).contentFrame();
 }
 const host=await openRoom(hostPage,base+'/meditation.html?room='+roomId);
 await host.waitForFunction(()=>/you control|Tap Play/.test(document.getElementById('meditation-sync-status')?.textContent || ''));
 if (await host.locator('#timer-primary-label').textContent() !== 'Pause') await host.locator('#btn-ripple-play').click();
 await host.waitForFunction(()=>document.getElementById('timer-primary-label')?.textContent==='Pause');
 console.log('Host playing');
 const invite=host.url().replace(/([?&])embed=1&?/, '$1');
 let guest=await openRoom(guestPage,invite);
 await guest.waitForFunction(()=>/Tap Play|Following|unavailable/.test(document.getElementById('meditation-sync-status')?.textContent || ''));
 console.log('Guest status',await guest.locator('#meditation-sync-status').textContent(),await guest.locator('#timer-primary-label').textContent());
 console.log('Guest joining');
 await guest.locator('#btn-ripple-play').click();
 await guest.waitForFunction(()=>document.getElementById('timer-primary-label')?.textContent==='Pause');
 await host.locator('#btn-ripple-play').click();
 await guest.waitForFunction(()=>document.getElementById('timer-primary-label')?.textContent==='Resume');
 if(mediaTest) assert.equal(await guest.evaluate(()=>window.__meditationAudio.some(audio=>!audio.paused)), false);
 console.log('Guest paused');
 // The ripple template hides the legacy navigation button; exercise its registered handler.
 await host.evaluate(()=>document.getElementById('room-next-verse-btn').click());
 await guest.waitForFunction(()=>document.getElementById('room-scripture-text')?.textContent.includes('Second verse'));
 await host.locator('#btn-ripple-play').click();
 await guest.waitForFunction(()=>document.getElementById('timer-primary-label')?.textContent==='Pause');
 if(mediaTest) await guest.waitForFunction(()=>window.__meditationAudio.some(audio=>!audio.paused && audio.currentTime > 0));
 console.log('Guest resumed');
 await guestPage.reload();
 await guestPage.waitForFunction(()=>document.querySelector('#member-shell-frame')?.contentDocument?.getElementById('meditation-sync-status'));
 guest=await (await guestPage.locator('#member-shell-frame').elementHandle()).contentFrame();
 await guest.waitForFunction(()=>document.getElementById('meditation-sync-status')?.textContent.includes('Tap Play'));
 console.log('PASS independent browsers: join audio, host play/pause, scripture, refresh');
 await host.locator('#btn-ripple-reflection').click();
 await host.locator('#reflection-note-text').fill('God is good '+suffix);
 let posts=0;
 await hostPage.route('**/api/private/reflection',async route=>{
  posts++;
  await new Promise(resolve=>setTimeout(resolve,700));
  await route.continue();
 });
 await host.locator('#btn-save-reflection').click();
 await host.evaluate(()=>document.getElementById('btn-save-reflection').click());
 await host.waitForFunction(text=>document.getElementById('reflection-entries-list')?.textContent.includes(text),'God is good '+suffix);
 assert.equal(posts,1);
 const sameUser=await openRoom(sameUserPage,invite);
 await sameUser.locator('#btn-ripple-reflection').click();
 await sameUser.waitForFunction(text=>document.getElementById('reflection-entries-list')?.textContent.includes(text),'God is good '+suffix);
 const privateRecords=await guest.evaluate(async()=>await(await fetch('/api/private/reflection')).json());
 assert.equal(privateRecords.records.some(note=>note.text?.includes(suffix)),false);
 await hostPage.unroute('**/api/private/reflection');
 await hostPage.route('**/api/private/reflection',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'Simulated save failure'})}));
 await host.locator('#reflection-note-text').fill('Preserve this draft');
 await host.locator('#btn-save-reflection').click();
 await host.waitForFunction(()=>!document.getElementById('btn-save-reflection').disabled);
 assert.equal(await host.locator('#reflection-note-text').inputValue(),'Preserve this draft');
 console.log('PASS reflections: single POST, immediate history, separate profile persistence, privacy, failed draft retention');
} finally {
 await browser.close();
 execute(`delete from private_records where user_id in (${users.map(quote).join(',')}); delete from platform_entities where id=${quote(roomId)}; delete from sessions where user_id in (${users.map(quote).join(',')}); delete from users where id in (${users.map(quote).join(',')});`);
 rmSync(dir,{recursive:true,force:true});
}
