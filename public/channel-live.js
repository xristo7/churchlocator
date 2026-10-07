(function(){
  const panel=document.getElementById('channel-live'),stage=document.getElementById('channel-stage'),params=new URLSearchParams(location.search),channelId=params.get('id');let sessionId=params.get('session'),meeting,timer;
  const esc=value=>window.MWE.escapeHtml(String(value??''));
  async function api(path,body){const response=await fetch('/api/live/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'content-type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});const result=await response.json();if(!response.ok){if(response.status===401)window.MWE?.openMemberLogin?.(location.pathname+location.search);throw new Error(result.error);}return result;}
  async function leave(){clearInterval(timer);await meeting?.leave?.();stage.hidden=true;stage.meeting=undefined;meeting=null;}
  function notice(message){panel.querySelector('[role=status]').textContent=message;}
  document.addEventListener('DOMContentLoaded',async()=>{
    try{
      const current=await api('channels/'+encodeURIComponent(channelId||''));sessionId=sessionId||current.session?.id;
      if(!sessionId){panel.innerHTML='<h1>This channel is offline</h1><p>The host has not started a live stage.</p>'+(current.canManage?'<a class="live-link" href="live-setup.html">Start a channel stage</a>':'');return;}
      panel.innerHTML='<h1>'+esc(current.session?.title||'Channel Live')+'</h1><p>Watch the host and guests together. Join as a viewer, then request stage access if you want to participate on camera.</p><button type="button" data-join>Join live stage</button><button type="button" data-invite>Copy stage invitation</button>'+(current.canManage?'<button type="button" data-end>End stage for everyone</button>':'')+'<button type="button" data-leave hidden>Leave stage</button><p role="status" aria-live="polite"></p>';
      panel.querySelector('[data-join]').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{
        const result=await api('sessions/'+encodeURIComponent(sessionId)+'/join',{});if(!result.authToken)throw new Error('The provider did not return a participant token.');
        if(!window.RealtimeKitClient)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/vendor/live/realtimekit.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});
        const {defineCustomElements}=await import('/vendor/live/ui/loader.js');await defineCustomElements();
        meeting=await window.RealtimeKitClient.init({authToken:result.authToken,defaults:{audio:false,video:false}});
        stage.showSetupScreen=result.role==='host';stage.meeting=meeting;stage.hidden=false;panel.querySelector('[data-leave]').hidden=false;
        if(result.role==='viewer')await meeting.join();
        notice(result.role==='host'?'Use the stage controls to admit guest requests and manage participants.':'You joined as a viewer. Use Request to join when you want the host to bring you on camera.');
        timer=setInterval(async()=>{try{const state=await api('sessions/'+encodeURIComponent(sessionId));if(state.session.status!=='live'||new Date(state.session.expiresAt)<=new Date()){await leave();notice('This live stage has ended.');}}catch{await leave();notice('Your stage session is no longer available.');}},20000);
      }catch(error){await leave();notice(error.message);button.disabled=false;}};
      panel.querySelector('[data-leave]').onclick=async()=>{await leave();panel.querySelector('[data-join]').disabled=false;notice('You left the stage.');};
      panel.querySelector('[data-end]')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{await api('sessions/'+encodeURIComponent(sessionId)+'/end',{});await leave();notice('The stage has ended for everyone.');panel.querySelector('[data-join]').disabled=true;}catch(error){notice(error.message);button.disabled=false;}});
      panel.querySelector('[data-invite]').onclick=async()=>{const link=new URL('channel-live.html',location.href);link.searchParams.set('id',channelId);link.searchParams.set('session',sessionId);try{await navigator.clipboard.writeText(link.href);notice('Stage invitation copied. Guests join as viewers until you approve stage access.');}catch{window.prompt('Copy stage invitation:',link.href);}};
    }catch(error){panel.innerHTML='<h1>Channel Live is unavailable</h1><p>'+esc(error.message)+'</p>';}
  });
  window.addEventListener('pagehide',()=>{clearInterval(timer);meeting?.leave?.();});
})();
