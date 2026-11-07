import assert from 'node:assert/strict';
import{mkdirSync}from'node:fs';
const{chromium}=await import(process.env.PLAYWRIGHT_PATH || 'playwright');
import{accounts,api,browserPage,base,dir}from'./phase-b-local.mjs';
const evidence=dir+'/b5';mkdirSync(evidence,{recursive:true});
import{writeFileSync}from'node:fs';
const a=await accounts();
const church=(await api('workspace/churches',{name:'Phase B event church',city:'Toronto',country:'CA',denomination:'Pentecostal',language:'English',worship:'Contemporary',about:'Local event owner test',photo:'/assets/church-audience.jpg',publicationState:'published'},a.creator.cookie)).data.record;
const browser=await chromium.launch({executablePath:process.env.CHROME || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const p=await browserPage(browser,a.creator.cookie);await p.goto(base+'/events.html?embed=1');await p.waitForFunction(()=>window.MWEPlatform?.session?.isCreator);await p.locator('.btn-host-event').click();
 await p.waitForURL('**/creator-studio.html?kind=events');await p.locator('#cs-editor-form').waitFor();
 await p.locator('[name=churchId]').selectOption(church.id);await p.locator('[name=title]').fill('Phase B owner event '+Date.now());await p.locator('[name=description]').fill('Saved by the local church owner');
 await p.locator('#cs-step-next').click();
 const start=new Date(Date.now()+86400000*10).toISOString().slice(0,16),end=new Date(Date.now()+86400000*10+3600000).toISOString().slice(0,16);
 await p.locator('[name=startsAt]').fill(start);await p.locator('[name=endsAt]').fill(end);await p.locator('[name=city]').fill('Toronto');await p.locator('[name=venueName]').fill('Local test hall');await p.locator('#cs-step-next').click();
 await p.locator('[name=totalTickets]').fill('10');await p.locator('[name=ticketPriceCents]').fill('0');await p.locator('[name=registrationRequired]').check();
 const draftResponse=p.waitForResponse(r=>r.url().endsWith('/api/workspace/events') && r.request().method()==='POST');await p.locator('#cs-save').click();const draft=await(await draftResponse).json();assert.equal(draft.ok,true);assert.equal(draft.record.publicationState,'draft');
 assert.equal((await api('events?churchId='+church.id)).data.events.some(row=>row.id===draft.record.id),false,'draft event must not appear on public church listings');
 const publishedResponse=p.waitForResponse(r=>r.url().endsWith('/api/workspace/events/'+draft.record.id) && r.request().method()==='PUT');await p.locator('#cs-publish').click();const published=await(await publishedResponse).json();assert.equal(published.ok,true);assert.equal(published.record.publicationState,'published');const event=published.record;
 const listed=(await api('events?churchId='+church.id)).data.events;assert.ok(listed.some(row=>row.id===event.id && row.church_id===church.id));
 await p.goto(base+'/creator-studio.html?kind=events&edit='+event.id);await p.locator('#cs-editor-form').waitFor();await p.locator('[name=title]').fill(event.title+' edited');await p.locator('#cs-step-next').click();assert.equal(await p.locator('[name=startsAt]').inputValue(),start);
 const editedResponse=p.waitForResponse(r=>r.url().endsWith('/api/workspace/events/'+event.id) && r.request().method()==='PUT');await p.locator('#cs-publish').click();const edited=await(await editedResponse).json();assert.equal(edited.ok,true);
 const viewer=await browserPage(browser,a.viewer.cookie);await viewer.goto(base+'/events.html?embed=1');await viewer.waitForFunction(title=>document.body.textContent.includes(title),event.title+' edited');
 await viewer.goto(base+'/church-profile.html?id='+church.id+'&embed=1');await viewer.waitForFunction(title=>document.body.textContent.includes(title),event.title+' edited');
 await viewer.screenshot({path:evidence+'/church-event.png'});
 await api('event-register',{eventId:event.id,fullName:'Local viewer',email:a.viewer.email,ticketQuantity:2},a.viewer.cookie);
 async function rejected(body,cookie,status){const r=await fetch(base+'/api/workspace/events'+(body.id?'/'+body.id:''),{method:body.id?'PUT':'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,status,data.error);assert.ok(data.error);}
 const valid={...edited.record,publicationState:'pending'};
 await rejected({...valid,totalTickets:1},a.creator.cookie,409);
 const fresh={...valid};delete fresh.id;delete fresh.revision;
 await rejected({...fresh,title:''},a.creator.cookie,400);
 await rejected({...fresh,startsAt:new Date(Date.now()-86400000).toISOString(),endsAt:new Date(Date.now()-80000000).toISOString()},a.creator.cookie,400);
 await rejected(fresh,a.viewer.cookie,403);
 writeFileSync(evidence+'/event.json',JSON.stringify(edited.record));
 console.log('PASS Host an Event, draft/publish/edit, church association, public listings, reservation capacity and invalid/missing/viewer cases');
}finally{await browser.close();}
