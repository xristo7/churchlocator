import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {mkdirSync,existsSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH || 'playwright');
import {accounts,api,browserPage,base,dir} from './phase-b-local.mjs';
const evidence=dir+'/b2';mkdirSync(evidence,{recursive:true});
if(!existsSync(evidence+'/sample.mp4'))execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=c=blue:s=320x568:r=24','-f','lavfi','-i','sine=frequency=440','-t','8','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-loglevel','error',evidence+'/sample.mp4']);
const accountsData=await accounts(),channel=(await api('workspace/channels',{name:'Phase B Spotlight channel',handle:'phase-b-local',publicationState:'published',topic:'Bible Teaching',about:'Local browser verification'},accountsData.creator.cookie)).data.record;
const browser=await chromium.launch({executablePath:process.env.CHROME || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const creator=await browserPage(browser,accountsData.creator.cookie);
 await creator.goto(base+'/spotlight-studio.html?embed=1');
 await creator.locator('#sw-submission-form').waitFor();
 await creator.locator('[name="channelEntityId"]').selectOption(channel.id);
 await creator.locator('[name="title"]').fill('Phase B uploaded teaser');
 await creator.locator('[name="fullContentUrl"]').fill('https://www.youtube.com/watch?v=phase-b-local');
 await creator.locator('[data-sw-file]').setInputFiles(evidence+'/sample.mp4');
 await creator.waitForFunction(()=>document.querySelector('[name="mediaUrl"]')?.value.startsWith('/media/'));
 await creator.locator('[name="previewStartSeconds"]').fill('1');
 await creator.locator('[name="previewEndSeconds"]').fill('3');
 const response=creator.waitForResponse(r=>r.url().endsWith('/api/spotlight/workspace') && r.request().method()==='POST');
 await creator.locator('button[value="submit"]').click();
 const result=await(await response).json();assert.equal(result.ok,true,result.error);assert.equal(result.item.status,'approved');
 const uploaded=result.item;
 const variants=[];
 for(const [name,start,end] of [['one',0,2],['two',2,4],['broken',0,2]]){
  variants.push((await api('spotlight/workspace',{channelEntityId:channel.id,contentType:'long-preview',title:'Phase B linked '+name,posterUrl:uploaded.posterUrl,mediaUrl:'https://phase-b-media.example.invalid/'+name+'.mp4',fullContentUrl:'https://www.youtube.com/watch?v='+name,previewSource:'creator',previewStartSeconds:start,previewEndSeconds:end,durationSeconds:8},accountsData.creator.cookie)).data.item);
 }
 const viewer=await browserPage(browser,accountsData.viewer.cookie);
 await viewer.route('https://phase-b-media.example.invalid/**',route=>route.request().url().includes('broken')?route.fulfill({status:404,body:'missing'}):(()=>{const data=readFileSync(evidence+'/sample.mp4');const range=route.request().headers().range?.match(/bytes=(\d+)-(\d*)/);if(!range)return route.fulfill({status:200,contentType:'video/mp4',headers:{'accept-ranges':'bytes'},body:data});const start=Number(range[1]),end=range[2]?Number(range[2]):data.length-1;return route.fulfill({status:206,contentType:'video/mp4',headers:{'accept-ranges':'bytes','content-range':`bytes ${start}-${end}/${data.length}`},body:data.subarray(start,end+1)});})());
 for(const item of [uploaded,...variants.slice(0,2)]){
  await viewer.goto(base+'/spotlight.html?embed=1&post='+item.id);
  const card=viewer.locator('[data-spotlight-id="'+item.id+'"]');
  await card.waitFor();await card.scrollIntoViewIfNeeded();
  const video=card.locator('video');await video.waitFor();
  await viewer.waitForFunction(id=>{const v=document.querySelector('[data-spotlight-id="'+id+'"] video');return v && !v.paused && v.currentTime>0.05;},item.id);
  const index=Number(await card.getAttribute('data-index'));
  await viewer.locator(index>0?'[data-feed-previous]':'[data-feed-next]').click();
  await viewer.waitForFunction(id=>document.querySelector('[data-spotlight-id="'+id+'"] video')?.paused,item.id);
  await viewer.locator(index>0?'[data-feed-next]':'[data-feed-previous]').click();
  const sound=viewer.locator('[data-sound-toggle]');await sound.click();assert.equal(await video.evaluate(v=>v.muted),false);await sound.click();
  await viewer.waitForTimeout(4500);
  const playback=await video.evaluate(v=>({paused:v.paused,time:v.currentTime,muted:v.muted}));
  console.log('Playback',item.title,JSON.stringify(playback));
  assert.equal(playback.paused,true,'teaser must stop at its end');
  assert.ok(playback.time<=item.previewEndSeconds+.5 && playback.time>=item.previewEndSeconds-.5,'teaser must stop at its configured end');
  assert.equal(playback.muted,true);
  const cta=card.locator('[data-spotlight-cta]');assert.ok((await cta.getAttribute('href')).includes('post='+item.id));assert.ok((await cta.getAttribute('href')).includes('id='+channel.id));
  assert.ok((await card.innerText()).includes('Phase B Spotlight channel'));
  await cta.click();
  await viewer.waitForFunction(title=>document.querySelector('#member-shell-frame')?.contentDocument?.querySelector('#channel-content-detail')?.textContent.includes(title),item.title);
  const detail=viewer.frameLocator('#member-shell-frame').locator('#channel-content-detail');assert.ok((await detail.innerText()).includes('Phase B Spotlight channel'));
  if(item.id===uploaded.id){const full=detail.locator('video');await full.waitFor();assert.ok((await full.getAttribute('src')).includes(uploaded.fullContentUrl));await full.evaluate(v=>{v.muted=true;return v.play();});await viewer.waitForFunction(()=>document.querySelector('#member-shell-frame')?.contentDocument?.querySelector('#channel-content-detail video')?.currentTime>0);}
 }
 assert.ok((await api('spotlight/item/'+uploaded.id,null,accountsData.viewer.cookie)).data.item.views>=1,'feed playback records a view');
 const key='phase-b-'+crypto.randomUUID().replaceAll('-','');
 const first=await api('spotlight/playback/'+uploaded.id,{playbackKey:key},accountsData.viewer.cookie);
 const second=await api('spotlight/playback/'+uploaded.id,{playbackKey:key},accountsData.viewer.cookie);
 assert.equal(first.data.views,second.data.views);assert.equal(first.data.recorded,true);assert.equal(second.data.recorded,false);
 await viewer.goto(base+'/spotlight.html?embed=1&post='+variants[2].id);
 await viewer.waitForFunction(id=>document.querySelector('[data-spotlight-id="'+id+'"] [data-video-fallback]'),variants[2].id);
 await viewer.screenshot({path:evidence+'/poster-fallback.png'});
 writeFileSync(evidence+'/items.json',JSON.stringify([uploaded,...variants]));
 console.log('PASS upload UI, three teaser excerpts, publisher destinations, duplicate playback key, poster fallback');
}finally{await browser.close();}
