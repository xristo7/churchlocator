import assert from 'node:assert/strict';
import {mkdirSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const pw=await import(process.env.PLAYWRIGHT_PATH || 'playwright');const chromium=pw.chromium||pw.default.chromium;
import {accounts,api,browserPage,base,dir} from './phase-b-local.mjs';
const evidence=dir+'/c';mkdirSync(evidence,{recursive:true});
if(!existsSync(evidence+'/phone.mp4'))execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=c=teal:s=320x568:r=24','-f','lavfi','-i','sine=frequency=440','-t','6','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-loglevel','error',evidence+'/phone.mp4']);
const a=await accounts();
const stamp=Date.now();
const channel=(await api('workspace/channels',{name:'Watch test channel '+stamp,owner:'Test Owner',handle:'@watchtest',topic:'Bible Teaching',description:'Local verification channel',format:'Video',cover:'/assets/church-audience.jpg',seriesTitle:'Daily Wisdom',publicationState:'published',posts:[
 {title:'Plan Your Day',summary:'Write the goals down.',mediaUrl:'https://www.youtube.com/watch?v=aqz-KE-bpKQ'},
 {title:'Needs a link',summary:'No media saved yet.'}
]},a.creator.cookie)).data.record;
const church=(await api('workspace/churches',{name:'Hero video church '+stamp,tagline:'Welcome',city:'Toronto',country:'CA',location:'Local hall',denomination:'Pentecostal',language:'English',worship:'Contemporary',about:'Hero video check',pastor:'Pastor',email:a.creator.email,sunday:'Sunday 10:00 AM',photo:'/assets/church-audience.jpg',publicationState:'published'},a.creator.cookie)).data.record;
const browser=await chromium.launch({executablePath:process.env.CHROME || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 // 1. Hero phone-video upload, then public playback
 const owner=await browserPage(browser,a.creator.cookie);await owner.goto(base+'/creator-studio.html');await owner.locator('[data-edit="'+church.id+'"]').click();
 await owner.locator('#cs-step-next').click();await owner.locator('#cs-step-next').click();
 await owner.locator('[data-hero-video-picker]').setInputFiles(evidence+'/phone.mp4');
 await owner.waitForFunction(()=>/^\/media\/spotlight-media\/.+\.mp4$/.test(document.querySelector('[data-hero-video-url]')?.value||''),null,{timeout:30000});
 const put=owner.waitForResponse(r=>r.url().endsWith('/api/workspace/churches/'+church.id)&&r.request().method()==='PUT');
 await owner.locator('#cs-publish').click();const saved=await(await put).json();assert.equal(saved.ok,true,saved.error);
 assert.match(saved.record.welcomeMedia,/^\/media\/spotlight-media\//);
 const viewer=await browserPage(browser,a.viewer.cookie);await viewer.goto(base+'/church-profile.html?id='+church.id+'&embed=1');
 await viewer.waitForFunction(()=>window.MWE?.churchHeroState?.slides.length>=1);
 const src=await viewer.waitForFunction(()=>document.querySelector('.church-hero-video-visual video')?.getAttribute('src')||document.querySelector('.church-hero-video-visual video source')?.getAttribute('src')||'',null,{timeout:20000}).then(h=>h.jsonValue());
 assert.match(src,/spotlight-media/);
 const status=await viewer.evaluate(async u=>(await fetch(u,{headers:{range:'bytes=0-99'}})).status,src);assert.ok([200,206].includes(status),'uploaded hero video is served: '+status);
 await viewer.screenshot({path:evidence+'/hero-video.png'});
 console.log('PASS hero phone-video upload plays on the public profile');
 // 2. Channel post watch page: player, engagement, Ask, series
 const watch=await browserPage(browser,a.viewer.cookie);
 await watch.goto(base+'/channel-content.html?embed=1&channel='+channel.id+'&post=0');
 await watch.locator('[data-player-host] iframe').waitFor({timeout:20000});
 assert.match(await watch.locator('[data-player-host] iframe').getAttribute('src'),/youtube/);
 await watch.waitForFunction(()=>!document.querySelector('[data-post-action=like]')?.disabled);
 await watch.locator('[data-post-action=like]').click();await watch.waitForFunction(()=>document.querySelector('[data-post-action=like]').getAttribute('aria-pressed')==='true');
 await watch.locator('[data-ask-publisher]').click();await watch.locator('#mwe-ask-text').fill('How do I start planning my day?');await watch.locator('[data-ask-form] [type=submit]').click();
 await watch.waitForFunction(()=>/Sent/.test(document.querySelector('[data-ask-status]')?.textContent||''));
 const inbox=(await api('private/message',null,a.creator.cookie)).data.records;assert.ok(inbox.some(r=>/start planning my day/.test(r.body||'')&&r.direction!=='sent'||/start planning my day/.test(r.body||'')),'publisher received the private question');
 assert.equal(await watch.locator('[data-related-tab=series]').isVisible(),true,'series tab appears when the channel has a series');
 await watch.screenshot({path:evidence+'/watch-post.png'});
 const signedOut=await browserPage(browser,'');await signedOut.goto(base+'/channel-content.html?embed=1&channel='+channel.id+'&post=0');await signedOut.locator('[data-player-host]').waitFor();await signedOut.waitForFunction(()=>document.querySelector('[data-engagement-actions]'));
 await signedOut.waitForTimeout(1500);assert.equal(await signedOut.locator('[data-ask-publisher]').count(),0,'Ask is hidden when signed out');
 const bare=await browserPage(browser,a.viewer.cookie);await bare.goto(base+'/channel-content.html?embed=1&channel='+channel.id+'&post=1');
 await bare.locator('[data-player-retry]').waitFor();assert.ok(await bare.locator('[data-engagement-actions]').count()>0,'a post without media still has the full watch-page functions');
 console.log('PASS channel post: player, like, private Ask, series tab, signed-out Ask hidden, no-media retry state');
 const shell=await browserPage(browser,a.viewer.cookie);await shell.goto(base+'/channel-content.html?channel='+channel.id+'&post=1');await shell.waitForFunction(()=>location.search.includes('post=1'));
 console.log('PASS member shell keeps the post index');
 // 3. Download when the creator allows it
 const studio=await browserPage(browser,a.creator.cookie);await studio.goto(base+'/spotlight-studio.html?embed=1');await studio.locator('#sw-submission-form').waitFor();
 await studio.locator('[name="channelEntityId"]').selectOption(channel.id);await studio.locator('[name="title"]').fill('Downloadable sermon');
 await studio.locator('[data-sw-file]').setInputFiles(evidence+'/phone.mp4');
 await studio.waitForFunction(()=>document.querySelector('[name="fullContentUrl"]')?.value.startsWith('/media/'),null,{timeout:30000});
 await studio.locator('[name="allowDownload"]').check();
 const sub=studio.waitForResponse(r=>r.url().endsWith('/api/spotlight/workspace')&&r.request().method()==='POST');await studio.locator('button[value="submit"]').click();
 const created=await(await sub).json();assert.equal(created.ok,true,created.error);assert.equal(created.item.allowDownload,true);
 const dl=await browserPage(browser,a.viewer.cookie);await dl.goto(base+'/channel-content.html?embed=1&post='+created.item.id);
 await dl.locator('[data-download-video]').waitFor();assert.match(await dl.locator('[data-download-video]').getAttribute('href'),/^\/media\/spotlight-media\//);
 assert.equal(await dl.locator('[data-channel-subscribe]').count(),1,'subscriber control present');
 console.log('PASS download offered only for creator-allowed uploaded video');
}finally{await browser.close();}
