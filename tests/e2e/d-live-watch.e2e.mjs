import assert from 'node:assert/strict';
const pw=await import(process.env.PLAYWRIGHT_PATH || 'playwright');const chromium=pw.chromium||pw.default.chromium;
import {accounts,api,browserPage,base,dir} from './phase-b-local.mjs';
const a=await accounts();const stamp=Date.now();
const church=(await api('workspace/churches',{name:'Live watch church '+stamp,tagline:'Welcome',city:'Toronto',country:'CA',location:'Hall',denomination:'Pentecostal',language:'English',worship:'Contemporary',about:'Live parity check',pastor:'Pastor',email:a.creator.email,sunday:'Sunday 10:00 AM',photo:'/assets/church-audience.jpg',publicationState:'published',livestream:{enabled:true,paid:false,url:'https://www.youtube.com/watch?v=aqz-KE-bpKQ'}},a.creator.cookie)).data.record;
const browser=await chromium.launch({executablePath:process.env.CHROME || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const url=base+'/broadcast.html?embed=1&type=church&id='+church.id;
 const v=await browserPage(browser,a.viewer.cookie);await v.goto(url);
 await v.waitForFunction(()=>document.querySelector('[data-live-subscribe]')&&!document.querySelector('[data-live-subscribe]').disabled,null,{timeout:20000});
 assert.match(await v.locator('[data-live-followers]').innerText(),/0 subscribers/);
 await v.locator('[data-live-subscribe]').click();await v.waitForFunction(()=>/1 subscriber$/.test(document.querySelector('[data-live-followers]').textContent.split(' · ')[0]));
 assert.equal(await v.locator('[data-live-subscribe]').getAttribute('aria-pressed'),'true');
 await v.locator('[data-live-rate=like]').click();await v.waitForFunction(()=>document.querySelector('[data-live-rate=like]').getAttribute('aria-pressed')==='true');
 await v.locator('[data-live-rate=dislike]').click();await v.waitForFunction(()=>document.querySelector('[data-live-rate=dislike]').getAttribute('aria-pressed')==='true'&&document.querySelector('[data-live-rate=like]').getAttribute('aria-pressed')==='false');
 await v.locator('[data-live-ask]').click();await v.locator('#live-ask-text').fill('Can I join the Bible study?');await v.locator('[data-ask-form] [type=submit]').click();
 await v.waitForFunction(()=>/Sent/.test(document.querySelector('[data-ask-status]')?.textContent||''));
 const inbox=(await api('private/message',null,a.creator.cookie)).data.records;assert.ok(inbox.some(r=>/join the Bible study/.test(r.body||'')),'host received the private question');
 v.on('dialog',d=>d.accept());await v.locator('[data-live-report]').click();await v.waitForFunction(()=>/Report submitted/.test(document.querySelector('[data-live-report]').textContent));
 await v.getByRole('tab',{name:'More videos'}).click();await v.locator('[data-more-filter=all]').waitFor();
 await v.waitForFunction(()=>document.querySelector('[data-more-content] .mwe-upnext-item'),null,{timeout:15000});
 for(const f of ['series','followed','all'])await v.locator('[data-more-filter='+f+']').click();
 assert.ok(await v.locator('[data-more-content] .mwe-upnext-item small').first().innerText());
 await v.screenshot({path:dir+'/d-live.png'});
 const out=await browserPage(browser,'');await out.goto(url);await out.waitForFunction(()=>document.querySelector('[data-live-subscribe]')&&!document.querySelector('[data-live-subscribe]').disabled,null,{timeout:20000});
 await out.waitForTimeout(800);assert.equal(await out.locator('[data-live-ask]').isHidden(),true,'Ask hidden when signed out');
 assert.match(await out.locator('[data-live-followers]').innerText(),/1 subscriber/);
 console.log('PASS live broadcast page: subscribe with count, like/dislike, private Ask, report, More videos filters, signed-out gating');
}finally{await browser.close();}
