import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const js=fs.readFileSync('public/channel-live.js','utf8'),cp=fs.readFileSync('public/creator-public.js','utf8'),lp=fs.readFileSync('public/live-player.js','utf8');
test('channel live demo mode is gated off production hosts',()=>{assert.match(js,/PROD_HOSTS=\['my-way-of-evangelism\.doxalight-inc\.workers\.dev','nuahn\.baby'/);assert.match(js,/isDemo=params\.get\('demo'\)==='1'&&demoAllowed\(\)/);});
test('offline states show only the Offline label',()=>{assert.match(js,/<span>Offline<\/span>/);assert.match(cp,/<span>Offline<\/span>/);assert.doesNotMatch(js,/has not started a live stage/);});
test('no Open on provider links for embeddable sources',()=>{assert.doesNotMatch(cp,/Open on YouTube/);assert.doesNotMatch(lp,/'Open on '\+/);});
test('channel live keeps the existing live API flow',()=>{for(const r of [/sessions\/'\+encodeURIComponent\(sessionId\)\+'\/join'/,/\/end'/,/RealtimeKitClient\.init/])assert.match(js,r);});
