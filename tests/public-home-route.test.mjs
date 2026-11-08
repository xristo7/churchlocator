import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/worker.js';

test('public home aliases serve the landing page while the member shell remains explicit',async()=>{
 for(const [path,asset] of [['/','/index.html'],['/index.html','/index.html'],['/home','/index.html'],['/app.html?view=store','/app.html']]){
  let requested;
  const response=await worker.fetch(new Request('https://example.test'+path),{ASSETS:{fetch(request){requested=new URL(request.url);return new Response('page',{headers:{'content-type':'text/html'}});}}},{});
  assert.equal(response.status,200);assert.equal(requested.pathname,asset);
  if(path.includes('?'))assert.equal(requested.searchParams.get('view'),'store');
 }
});
