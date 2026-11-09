import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/worker.js';

test('bare / serves the landing page, /?query and /home open the member shell, /landing is the explicit landing alias',async()=>{
 for(const [path,asset] of [['/','/index.html'],['/?view=store','/app.html'],['/index.html','/app.html'],['/landing','/index.html'],['/home','/app.html'],['/app.html?view=store','/app.html']]){
  let requested;
  const response=await worker.fetch(new Request('https://example.test'+path),{ASSETS:{fetch(request){requested=new URL(request.url);return new Response('page',{headers:{'content-type':'text/html'}});}}},{});
  assert.equal(response.status,200);assert.equal(requested.pathname,asset);
  if(path.includes('?'))assert.equal(requested.searchParams.get('view'),'store');
 }
});
