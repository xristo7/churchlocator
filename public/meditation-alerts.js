/* Persistent owner schedule alerts. The app shell handles them once, outside its page iframe. */
(function(){
  if(window.parent!==window || window.__meditationAlerts)return;window.__meditationAlerts=true;
  let busy=false,box=null,current=null;const shown=new Set();
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function refresh(){
    if(busy||document.hidden||!window.MWEPlatform?.session)return;busy=true;
    try{
      const data=await window.MWEPlatform.api('meditation-session/owner-alerts');
      if(current&&!data.alerts.some(a=>a.id===current.id)){if(box)box.hidden=true;current=null;}
      const alert=data.alerts.find(a=>!a.read&&!shown.has(a.id+':'+a.stage));
      if(!alert)return;current=alert;shown.add(alert.id+':'+alert.stage);
      if(!box){box=document.createElement('aside');box.className='meditation-owner-alert';box.setAttribute('aria-label','Meditation room schedule alert');document.body.append(box);}
      const when=new Date(alert.scheduledOpensAt).toLocaleString([],{dateStyle:'medium',timeStyle:'short',timeZone:alert.scheduleTimeZone||undefined});
      const title=alert.stage===3?'Your room opened':alert.stage===2?'It’s time to open your room':alert.stage===1?'Your room opens soon':'Your room is scheduled';
      const detail=alert.stage===3?(alert.playbackStart==='owner'?'The room opened for guests. You control when audio begins.':'The scheduled opening has completed. Open the room to manage playback.'):alert.stage===2?(alert.openingMode==='automatic'?'Automatic opening is enabled.':'Guests are waiting for you to open the room.'):'Opening '+when+' ('+(alert.scheduleTimeZone||'local time')+').';
      box.innerHTML='<span class="owner-alert-icon"><i data-lucide="calendar-clock" aria-hidden="true"></i></span><div><strong role="status">'+esc(title)+'</strong><b>'+esc(alert.title)+'</b><p>'+esc(detail)+'</p><a href="app.html?view=meditation&amp;room='+encodeURIComponent(alert.roomId)+'">Open room <i data-lucide="arrow-up-right" aria-hidden="true"></i></a></div><button type="button" aria-label="Dismiss room alert"><i data-lucide="x" aria-hidden="true"></i></button>';
      box.hidden=false;window.lucide?.createIcons({root:box});
      box.querySelector('button').onclick=async()=>{try{await window.MWEPlatform.api('meditation-session/owner-alerts/'+encodeURIComponent(alert.id),{},'PUT');box.hidden=true;}catch(error){box.querySelector('p').textContent=error.message;}};
    }catch(_){}finally{busy=false;}
  }
  async function init(){await window.MWEPlatform?.ready;refresh();setInterval(refresh,30000);}
  window.addEventListener('mwe-platform-ready',refresh);
  window.addEventListener('message',event=>{if(event.origin===location.origin&&event.data?.type==='faithlink:meditation-schedule')refresh();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
