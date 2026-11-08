import assert from 'node:assert/strict';
// Run against the locally seeded preview Worker. No remote requests or mutations.
import {mkdirSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const output=process.env.EVIDENCE_DIR || '/tmp/b1-shop-navigation';mkdirSync(output,{recursive:true});
const base=process.env.BASE || 'http://127.0.0.1:8799';
const browser=await chromium.launch({executablePath:process.env.CHROME || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 for(const width of [1366,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await page.goto(base+'/');
  await page.evaluate(()=>window.MWEPlatform?.ready);
  if(width===390)await page.locator('.mobile-menu-toggle').click();
  const nav=page.locator('.nav-links');
  const labels=await nav.locator('a:not(.mobile-only-link)').allTextContents();
  assert.deepEqual(labels.slice(0,6).map(x=>x.trim()),['Churches','Channels','Events','Shop','Watch Live','Spotlight']);
  await page.screenshot({path:`${output}/nav-${width}.png`});
  await nav.getByRole('link',{name:'Shop',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('#store-products-grid .sf-card').length>0);
  assert.ok(new URL(page.url()).pathname.includes('store'));
  const products=await page.locator('#store-products-grid .sf-card').count();
  await page.screenshot({path:`${output}/store-${width}.png`});
  console.log(`PASS ${width}: Shop navigation, real store route, ${products} product cards`);
  const publicTitles=await page.locator('#store-products-grid .sf-card h3').allTextContents();
  await page.goto(base+'/app.html?view=store');
  await page.waitForFunction(()=>document.querySelector('#member-shell-frame')?.contentDocument?.querySelectorAll('#store-products-grid .sf-card').length>0);
  const embeddedTitles=await page.frameLocator('#member-shell-frame').locator('#store-products-grid .sf-card h3').allTextContents();
  assert.deepEqual(embeddedTitles,publicTitles);
  console.log(`PASS ${width}: member app and public store list the same products`);
  await page.close();
 }
}finally{await browser.close();}
