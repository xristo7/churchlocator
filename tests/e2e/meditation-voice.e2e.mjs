// Browser component test: real microphone capture with Chromium fake devices;
// RealtimeKit transport and authenticated token responses are simulated.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH || 'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
try {
 for(const owner of [true,false]) {
  const context=await browser.newContext({permissions:['microphone']});
  const page=await context.newPage();
  const response=await fetch('http://127.0.0.1:8787/meditation.html');
  const headers=Object.fromEntries(response.headers);headers['content-type']='text/html';delete headers['content-length'];
  await page.route('**/voice-component-test',route=>route.fulfill({status:200,headers,body:'<!doctype html><main id="room"></main>'}));
  await page.goto('http://127.0.0.1:8787/voice-component-test');
  await page.addScriptTag({path:'public/meditation-voice.js'});
  await page.evaluate(owner=>{
   window.stageJoins=0;window.captures=0;window.tracks=[];window.denied=owner;window.defaults=null;window.active=false;window.generation='voice-1';
   const joined={addListener(){},removeListener(){},toArray(){return [];}};
   window.RealtimeKitClient={async init(options){window.defaults=options.defaults;return {
    stage:{status:'OFF_STAGE',async join(){window.stageJoins++;this.status='ON_STAGE';}},
    self:{audioEnabled:false,audioTrack:null,async enableAudio(){window.captures++;if(window.denied){window.denied=false;throw new DOMException('Denied','NotAllowedError');}const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});this.audioTrack=stream.getAudioTracks()[0];window.tracks.push(this.audioTrack);this.audioEnabled=true;},async disableAudio(){this.audioEnabled=false;this.audioTrack?.stop();}},
    participants:{joined},async join(){},async leave(){}
   };}};
   window.voice=new window.MWEMeditationVoice(document.getElementById('room'),'meditation-session/room/session',async(path)=>{
    if(path.endsWith('/start')){window.active=true;return {ok:true};}
    if(path.endsWith('/join'))return {ok:true,authToken:'test-token',canSpeak:owner,generation:window.generation};
    if(path.endsWith('/end')){window.active=false;return {ok:true};}
    return {ok:true,active:owner?window.active:true,canSpeak:owner,generation:window.generation};
   });
  },owner);
  const region=page.getByRole('region',{name:'Room owner voice'});
  await region.getByRole('button',{name:owner?'Start voice broadcast':'Listen to owner',exact:true}).click();
  await page.waitForFunction(()=>window.voice.meeting && !window.voice.busy);
  assert.deepEqual(await page.evaluate(()=>window.defaults),{audio:false,video:false});
  assert.equal(await page.evaluate(()=>window.captures),0);
  if(owner){
   const unmute=region.getByRole('button',{name:'Unmute microphone',exact:true});
   await unmute.click();await page.waitForFunction(()=>document.body.textContent.includes('Microphone permission denied'));
   assert.equal(await unmute.getAttribute('aria-pressed'),'false');
   await unmute.click();await page.waitForFunction(()=>window.voice.meeting.self.audioEnabled);
   assert.equal(await region.getByRole('button',{name:'Mute microphone',exact:true}).getAttribute('aria-pressed'),'true');
   assert.equal(await page.evaluate(()=>window.tracks.at(-1).readyState),'live');
   await region.getByRole('button',{name:'Mute microphone',exact:true}).click();
   await page.waitForFunction(()=>!window.voice.meeting.self.audioEnabled);
   await unmute.click();await page.waitForFunction(()=>window.voice.meeting.self.audioEnabled);
   await region.getByRole('button',{name:'End voice broadcast',exact:true}).click();
   await page.waitForFunction(()=>window.tracks.every(track=>track.readyState==='ended'));
   console.log('PASS owner: muted start, denied permission, actual capture, mute/unmute, end stops tracks');
  }else{
   assert.equal(await region.getByRole('button',{name:'Unmute microphone',exact:true}).isVisible(),false);
   // Exercise received remote audio using an actual browser MediaStream track.
   await page.evaluate(()=>{
    window.ac=new AudioContext();const source=window.ac.createOscillator(),destination=window.ac.createMediaStreamDestination();source.connect(destination);source.start();
    window.voice.attach({id:'owner',audioEnabled:true,audioTrack:destination.stream.getAudioTracks()[0],addListener(){},removeListener(){}});
   });
   assert.equal(await region.locator('audio').evaluate(audio=>audio.srcObject.getAudioTracks().length),1);
   await region.getByRole('button',{name:'Leave voice audio'}).click();
   assert.equal(await region.locator('audio').count(),0);
   assert.equal(await page.evaluate(()=>window.captures),0);
   assert.equal(await page.evaluate(()=>window.stageJoins),0);
   console.log('PASS listener: received track attachment, no microphone capture, leave cleans audio');
  }
  await page.evaluate(()=>window.voice.stop());await context.close();
 }
}finally{await browser.close();}
