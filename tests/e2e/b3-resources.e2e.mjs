import assert from 'node:assert/strict';
import {mkdirSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH || 'playwright');
import {accounts,api,browserPage,base,dir} from './phase-b-local.mjs';
const evidence=dir+'/b3';mkdirSync(evidence,{recursive:true});
if(!existsSync(evidence+'/cover.png'))execFileSync('ffmpeg',['-y','-f','lavfi','-i','color=c=blue:s=320x568','-frames:v','1','-loglevel','error',evidence+'/cover.png']);
import {writeFileSync} from 'node:fs';
const marker='Phase B '+Date.now();
const a=await accounts(),created=[];
for(const item of [
 {title:'Phase B video resource',type:'Video',format:'MP4',sourceUrl:'https://www.youtube.com/embed/dQw4w9WgXcQ',access:'Free',price:0},
 {title:'Phase B PDF resource',type:'Text',format:'PDF',sourceUrl:'https://phase-b-material.example.invalid/study.pdf',access:'Free',price:0},
 {title:'Phase B paid resource',type:'Text',format:'PDF',sourceUrl:'https://phase-b-material.example.invalid/private.pdf',access:'Paid',price:15}
]){
 const record=(await api('workspace/resources',{...item,title:item.title.replace('Phase B',marker),creator:'Phase B creator',topic:'Bible Study',description:'Local resource verification',duration:'Two pages',image:'/assets/church-audience.jpg',publicationState:'published'},a.creator.cookie)).data.record;created.push(record);
}
writeFileSync(evidence+'/items.json',JSON.stringify(created));
const video=(await api('resources/'+created[0].id,null,a.viewer.cookie)).data;
assert.equal(video.material.embedUrl,created[0].sourceUrl,'video embed entered as the creator material URL must be delivered');
function pdfFixture(){
 const stream='BT /F1 16 Tf 20 100 Td (Phase B resource material) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream'];
 let text='%PDF-1.4\n',offsets=[0];objects.forEach((object,index)=>{offsets.push(text.length);text+=(index+1)+' 0 obj\n'+object+'\nendobj\n';});
 const xref=text.length;text+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';return Buffer.from(text);
}
const browser=await chromium.launch({executablePath:process.env.CHROME || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 async function filter(page,id,value){const select=page.locator('#'+id),index=await select.evaluate(e=>[...e.parentElement.querySelectorAll('select')].indexOf(e));const wrapper=select.locator('..').locator('.custom-select-container').nth(index);await wrapper.locator('.custom-select-trigger').click();await wrapper.locator('.custom-option').filter({hasText:new RegExp('^'+value+'$')}).click();}
 const page=await browserPage(browser,a.viewer.cookie);
 let privateRequests=0;await page.route('https://phase-b-material.example.invalid/**',route=>{if(route.request().url().includes('private'))privateRequests++;return route.fulfill({status:200,contentType:'application/pdf',headers:{'access-control-allow-origin':'*'},body:pdfFixture()});});
 await page.goto(base+'/resources.html?embed=1');await page.locator('#resource-search').fill(marker);
 await page.waitForFunction(()=>document.querySelectorAll('#resources-grid .resource-card').length===3);
 await filter(page,'resource-type','Video');assert.equal(await page.locator('.resource-card').count(),1);await filter(page,'resource-type','All media');
 await filter(page,'resource-access','Paid');assert.equal(await page.locator('.resource-card').count(),1);await filter(page,'resource-access','Free & paid');
 const save=page.waitForResponse(response=>response.url().includes('/api/resources/'+created[0].id+'/library') && response.request().method()==='POST');
 await page.locator('[data-resource-action="'+created[0].id+'"]').click();
 assert.equal((await save).status(),200);
 await page.reload();
 assert.equal((await api('resources/'+created[0].id,null,a.viewer.cookie)).data.viewer.inLibrary,true,'library action persists on server');
 await page.goto(base+'/resources/'+created[0].id);
 await page.getByRole('heading',{name:created[0].title,exact:true}).waitFor();
 assert.ok((await page.locator('body').innerText()).includes('Phase B creator'));
 assert.equal(await page.locator('.rv-player iframe').count(),1);
 await page.locator('[data-rv-bookmark]').click();await page.waitForFunction(()=>document.querySelector('[data-rv-bookmark]')?.getAttribute('aria-pressed')==='true');
 await page.reload();await page.waitForFunction(()=>document.querySelector('[data-rv-bookmark]')?.getAttribute('aria-pressed')==='true');
 await page.locator('#rv-comment-input').fill('Local resource comment');await page.locator('[data-rv-comment-form] button[type="submit"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-rv-comments]')?.textContent.includes('Local resource comment'));
 await page.reload();await page.waitForFunction(()=>document.querySelector('[data-rv-comments]')?.textContent.includes('Local resource comment'));
 await page.goto(base+'/resources/'+created[1].id+'/read');
 await page.waitForFunction(()=>document.querySelector('[data-p="page"]')?.textContent==='Page 1 of 1');
 assert.ok((await page.locator('.rv-doc-canvas canvas').evaluate(canvas=>canvas.toDataURL())).length>1000);
 await page.screenshot({path:evidence+'/pdf-reader.png'});
 await page.goto(base+'/resources/'+created[2].id+'/read');await page.getByRole('heading',{name:created[2].title,exact:true}).waitFor();
 assert.ok((await page.locator('body').innerText()).includes('paid resource'));
 const paid=(await api('resources/'+created[2].id,null,a.viewer.cookie)).data;assert.equal(paid.locked,true);assert.equal(paid.material.fileUrl,null);
 const blocked=await fetch(base+'/api/resources/'+created[2].id+'/library',{method:'POST',headers:{origin:base,cookie:a.viewer.cookie,'content-type':'application/json'},body:'{}'});assert.equal(blocked.status,402);
 assert.equal(privateRequests,0);
 await page.screenshot({path:evidence+'/paid-locked.png'});
 const creator=await browserPage(browser,a.creator.cookie);
 await creator.goto(base+'/creator-studio.html?kind=resources');
 await creator.locator('#cs-editor-form').waitFor();
 await creator.locator('[name="title"]').fill('Owner resource workflow '+Date.now());
 await creator.locator('[name="creator"]').fill('Phase B creator');
 await creator.locator('[name="description"]').fill('Created through the local studio');
 await creator.locator('[name="type"]').selectOption('Video');await creator.locator('[name="format"]').selectOption('MP4');
 await creator.locator('[name="duration"]').fill('8 seconds');
 await creator.locator('[data-image-picker]').setInputFiles(evidence+'/cover.png');
 await creator.waitForFunction(()=>document.querySelector('[name="image"]')?.value.startsWith('/media/'));
 await creator.locator('#cs-step-next').click();
 await creator.locator('[name="access"]').selectOption('Free');await creator.locator('[name="price"]').fill('0');
 await creator.locator('[name="sourceUrl"]').fill('https://www.youtube.com/embed/dQw4w9WgXcQ');
 const published=creator.waitForResponse(response=>response.url().endsWith('/api/workspace/resources') && response.request().method()==='POST');
 await creator.locator('#cs-publish').click();const saved=await(await published).json();assert.equal(saved.ok,true);assert.equal(saved.record.publicationState,'published');
 await creator.reload();
 assert.equal((await api('resources/'+saved.record.id,null,a.viewer.cookie)).data.material.embedUrl,'https://www.youtube.com/embed/dQw4w9WgXcQ');
 console.log('PASS creator UI publication, metadata, search/filters, PDF rendering, library, bookmark, comments, paid lock');
}finally{await browser.close();}
