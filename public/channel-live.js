(function(){
  const params=new URLSearchParams(location.search),channelId=params.get('id');let sessionId=params.get('session'),meeting,timer,memberTimer,joinedMembers=0,channelName='',mobileLayout=false;
  const esc=value=>(window.MWE?.escapeHtml||(v=>String(v).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';')))(String(value??''));
  const PROD_HOSTS=['my-way-of-evangelism.doxalight-inc.workers.dev','nuahn.baby','www.nuahn.baby'];
  const demoAllowed=()=>!PROD_HOSTS.includes(location.hostname)&&(/preview|localhost|127\.0\.0\.1/.test(location.hostname));
  const isDemo=params.get('demo')==='1'&&demoAllowed();
  const icon=name=>'<i data-lucide="'+name+'"></i>';
  const initials=n=>String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  let root,panel,stage;
  function openProviderPanel(){
    if(!meeting)return;
    const EventClass=window.CustomEvent||CustomEvent;
    stage.dispatchEvent(new EventClass('rtkStateUpdate',{detail:{activeSidebar:true,sidebar:'chat',activeMoreMenu:false},bubbles:true,composed:true}));
    notice('Live chat opened. It belongs to this live session; recorded comments are separate.');
  }
  async function api(path,body){const response=await fetch('/api/live/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'content-type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});const result=await response.json();if(!response.ok){if(response.status===401)window.MWE?.openMemberLogin?.(location.pathname+location.search);throw new Error(result.error);}return result;}
  async function leave(){clearInterval(timer);clearInterval(memberTimer);root.querySelector('.mwe-stage-top').hidden=false;root.querySelector('.mwe-stage-controls').hidden=false;await meeting?.leave?.();stage.hidden=true;stage.meeting=undefined;meeting=null;root.classList.remove('has-rtk');}
  function notice(message){const el=root.querySelector('[data-stage-notice]');if(!el)return;el.textContent=message;el.hidden=!message;clearTimeout(notice.t);if(message)notice.t=setTimeout(()=>{el.hidden=true;},5000);}
  function shell(){
    const main=document.querySelector('main.live-shell');
    main.innerHTML='<div class="mwe-stage" id="mwe-stage">'+
      '<header class="mwe-stage-top"><a class="mwe-round ghost" href="channels.html" aria-label="Close">'+icon('x')+'</a><div class="mwe-stage-title"><b data-title>Channel Live</b><span data-meta></span></div><span class="mwe-stage-count" data-count hidden>'+icon('eye')+'<span></span></span></header>'+
      '<section id="channel-live" class="mwe-stage-body"><div class="mwe-tiles" data-tiles></div></section>'+
      '<rtk-meeting id="channel-stage" hidden></rtk-meeting>'+
      '<div class="mwe-stage-overlay" aria-live="polite"><div class="mwe-comments" data-comments></div><div class="mwe-reactions" data-reactions></div></div>'+
      '<p class="mwe-stage-toast" data-stage-notice role="status" hidden></p>'+
      '<nav class="mwe-stage-controls" data-controls aria-label="Stage controls"></nav>'+
      '<div class="mwe-sheet" data-sheet hidden><div class="mwe-sheet-card" role="dialog" aria-label="Host controls"><header><b>Participants</b><button class="mwe-round ghost" type="button" data-sheet-close aria-label="Close">'+icon('x')+'</button></header><div data-sheet-body></div></div></div>'+
      '</div>';
    root=main.querySelector('#mwe-stage');panel=main.querySelector('#channel-live');stage=main.querySelector('#channel-stage');
    const loading=document.createElement('div');loading.id='rtk-loading';loading.className='mwe-player-status is-loading';loading.setAttribute('role','status');
    loading.innerHTML='<div class="mwe-player-status-copy"><strong>Connecting to the live session…</strong><p>The provider may need permission to open audio, chat and camera controls.</p><button type="button" class="mwe-chip" data-live-retry>Retry</button></div>';
    root.insertBefore(loading,stage);loading.hidden=true;loading.querySelector('[data-live-retry]').onclick=()=>root.querySelector('[data-ctl=join]')?.click();
    const setStageLayout=()=>{
      mobileLayout=window.matchMedia('(max-width:959.98px)').matches;
      root.querySelector('.mwe-stage-top').hidden=false;
      root.querySelector('.mwe-stage-controls').hidden=false;
      stage.style.cssText=mobileLayout?'flex:none;height:58dvh;min-height:300px;margin-bottom:118px':'display:block;width:100%;margin:16px;min-height:0;';
    };
    root._rsSetStageLayout=setStageLayout;window.matchMedia('(max-width:959.98px)').addEventListener?.('change',setStageLayout);
    setStageLayout();
    const dialog=root.querySelector('.mwe-sheet-card'),sheetClose=root.querySelector('[data-sheet-close]');
    let sheetFocus=null;
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&!root.querySelector('[data-sheet]').hidden){root.querySelector('[data-sheet]').hidden=true;sheetFocus?.focus?.();return;}
      if(event.key==='Tab'&&!root.querySelector('[data-sheet]').hidden){const controls=[...dialog.querySelectorAll('button:not([disabled]),a[href]')];if(!controls.length)return;const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
    });
    root.querySelector('[data-sheet-close]').onclick=()=>{root.querySelector('[data-sheet]').hidden=true;sheetFocus?.focus?.();};
    root._rsRememberSheetFocus=()=>{sheetFocus=document.activeElement;sheetClose.focus();};
    root.addEventListener('click',e=>{if(e.target.closest('[data-sheet-close]')){root.querySelector('[data-sheet]').hidden=true;sheetFocus?.focus?.();}});
    root.querySelector('[data-sheet]').addEventListener('click',e=>{if(e.target.matches('[data-sheet]')){e.target.hidden=true;sheetFocus?.focus?.();}});
  }
  function offline(canManage){
    root.classList.add('is-offline');
    panel.innerHTML='<div class="mwe-offline-frame" role="status">'+icon('video-off')+'<span>Offline</span></div>'+(canManage?'<a class="mwe-pill-btn" href="live-setup.html">'+icon('radio')+' Go live</a>':'');
    root.querySelector('[data-controls]').innerHTML='';
  }
  function setHeader(title,meta,count){root.querySelector('[data-title]').textContent=title;root.querySelector('[data-meta]').innerHTML='<span class="mwe-live-badge"><span></span>LIVE</span>'+(meta?'<small>'+esc(meta)+'</small>':'');const c=root.querySelector('[data-count]');if(count!=null){c.hidden=false;c.querySelector('span').textContent=count+' joined';c.title='Persisted members who joined this stage; live online presence is shown by the provider when available.';}}
  function renderTiles(people){
    const box=root.querySelector('[data-tiles]');box.dataset.count=String(Math.min(people.length,7));
    box.innerHTML=people.map(p=>'<figure class="mwe-tile'+(p.speaking?' is-speaking':'')+'" data-pid="'+esc(p.id)+'" style="--tile-a:'+p.a+';--tile-b:'+p.b+'">'+
      (p.video?'<video src="'+esc(p.video)+'" autoplay muted loop playsinline></video>':'<span class="mwe-tile-avatar">'+esc(initials(p.name))+'</span>')+
      '<figcaption><span class="mwe-tile-name">'+(p.host?'<em>Host</em>':'')+esc(p.name)+'</span>'+(p.muted?'<span class="mwe-tile-mic" aria-label="Muted">'+icon('mic-off')+'</span>':'<span class="mwe-tile-mic on" aria-label="Speaking">'+icon('mic')+'</span>')+'</figcaption></figure>').join('');
    window.lucide?.createIcons();
  }
  function controls(list){const nav=root.querySelector('[data-controls]');nav.innerHTML=list.map(c=>'<button type="button" class="mwe-round'+(c.cls?' '+c.cls:'')+'" data-ctl="'+c.id+'" aria-label="'+esc(c.label)+'" aria-pressed="'+(c.pressed?'true':'false')+'"'+(c.hidden?' hidden':'')+'>'+icon(c.icon)+'<span>'+esc(c.short||c.label)+'</span></button>').join('');window.lucide?.createIcons();return nav;}
  function on(id,fn){const b=root.querySelector('[data-ctl="'+id+'"]');if(b)b.onclick=fn;}
  function addComment(name,text){const box=root.querySelector('[data-comments]');const el=document.createElement('p');el.className='mwe-comment';el.innerHTML='<span class="mwe-comment-av">'+esc(initials(name))+'</span><span><b>'+esc(name)+'</b> '+esc(text)+'</span>';box.append(el);while(box.children.length>4)box.firstElementChild.remove();}
  function react(emoji){const box=root.querySelector('[data-reactions]');const el=document.createElement('span');el.className='mwe-float-react';el.textContent=emoji;el.style.left=(10+Math.random()*50)+'%';box.append(el);setTimeout(()=>el.remove(),2600);}
  function drawChannelSubscription(info,button){
    if(!info||!button)return;
    const followers=Number(info.followers)||0;
    button.textContent=info.following?'Subscribed':'Subscribe';
    button.setAttribute('aria-pressed',String(Boolean(info.following)));
    button.title='Free channel subscription. '+(info.following?'Turn off live notices when you unfollow.':'Follow this channel and enable live notices.');
    button.disabled=false;
    const label=root.querySelector('[data-channel-followers]');
    if(label)label.textContent=followers.toLocaleString()+(followers===1?' follower':' followers');
  }
  function hostMembersSheet(members){
    const body=root.querySelector('[data-sheet-body]');
    body.replaceChildren();
    for(const member of members){
      const row=document.createElement('div');row.className='mwe-sheet-row';row.dataset.memberId=member.id;
      const identity=document.createElement('span');identity.className='mwe-sheet-name';
      const name=document.createElement('b');name.textContent=member.name;
      const role=document.createElement('small');role.textContent=member.removed?'Removed from this stage':member.role==='host'?'Host':'Stage member';
      identity.append(name,role);row.append(identity);
      if(member.role!=='host'&&!member.removed){const remove=document.createElement('button');remove.type='button';remove.className='mwe-mini danger';remove.dataset.removeMember=member.id;remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+member.name+' from this stage');row.append(remove);}
      body.append(row);
    }
    root.querySelector('[data-sheet]').hidden=false;root._rsRememberSheetFocus?.();
    body.onclick=async event=>{
      const button=event.target.closest('[data-remove-member]');if(!button||button.disabled)return;
      if(!window.confirm('Remove this guest from the live stage? They cannot rejoin this session.'))return;
      button.disabled=true;
      try{await api('sessions/'+encodeURIComponent(sessionId)+'/kick',{userId:button.dataset.removeMember});notice('Guest removed from this stage.');
        const state=await api('sessions/'+encodeURIComponent(sessionId)+'/members');joinedMembers=Number(state.joinedMembers)||0;setHeader(root.querySelector('[data-title]').textContent,channelName,joinedMembers);hostMembersSheet(state.members);
      }catch(error){notice(error.message);button.disabled=false;}
    };
  }
  async function refreshMembers(showSheet=false){
    const state=await api('sessions/'+encodeURIComponent(sessionId)+'/members');
    joinedMembers=Number(state.joinedMembers)||0;
    setHeader(root.querySelector('[data-title]').textContent,channelName,joinedMembers);
    if(showSheet&&Array.isArray(state.members))hostMembersSheet(state.members);
    return state;
  }

  async function share(){const link=new URL('channel-live.html',location.href);if(channelId)link.searchParams.set('id',channelId);if(sessionId)link.searchParams.set('session',sessionId);if(isDemo)link.searchParams.set('demo','1');try{if(navigator.share){await navigator.share({title:document.title,url:link.href});}else{await navigator.clipboard.writeText(link.href);notice('Stage link copied.');}}catch(e){if(e?.name!=='AbortError')window.prompt('Copy stage link:',link.href);}}
  function toggle(btn,a,b){const p=btn.getAttribute('aria-pressed')!=='true';btn.setAttribute('aria-pressed',String(p));btn.innerHTML=icon(p?b:a)+'<span>'+btn.querySelector('span').textContent+'</span>';window.lucide?.createIcons();return p;}

  function runDemo(){
    document.title='Demo stage · Channel Live | RhemaSphere';
    const people=[
      {id:'h',name:'Pastor Grace Mwangi',host:true,speaking:true,muted:false,a:'#1e3a8a',b:'#3b82f6'},
      {id:'g1',name:'Daniel Okello',muted:false,a:'#7c2d12',b:'#f59e0b'},
      {id:'g2',name:'Ruth Nakato',muted:true,a:'#134e4a',b:'#14b8a6'},
      {id:'g3',name:'James Carter',muted:true,a:'#4c1d95',b:'#a78bfa'},
      {id:'g4',name:'Esther Kim',muted:false,a:'#831843',b:'#f472b6'},
      {id:'g5',name:'Samuel Adeyemi',muted:true,a:'#14532d',b:'#4ade80'}];
    const queue=[{id:'r1',name:'Mary Achieng',request:true,muted:true,a:'#0c4a6e',b:'#38bdf8'}];
    setHeader('Friday Night Worship & Prayer','Demo stage',1284);
    const draw=()=>renderTiles(people);draw();
    controls([{id:'mic',icon:'mic-off',label:'Unmute',short:'Mic'},{id:'cam',icon:'video-off',label:'Turn camera on',short:'Cam'},{id:'hand',icon:'hand',label:'Request to join',short:'Join'},{id:'react',icon:'heart',label:'Ready for live reactions',short:'React',hidden:true},{id:'share',icon:'share-2',label:'Share',short:'Share'},{id:'host',icon:'users',label:'Host controls',short:'People'},{id:'leave',icon:'phone-off',label:'Leave',short:'Leave',cls:'danger'}]);
    on('mic',e=>toggle(e.currentTarget,'mic-off','mic'));on('cam',e=>toggle(e.currentTarget,'video-off','video'));
    on('hand',e=>{const p=toggle(e.currentTarget,'hand','hand');notice(p?'Request sent. The host will bring you on stage.':'Request withdrawn.');});
    on('react',()=>['❤️','🙏','🔥','🙌'].forEach((r,i)=>setTimeout(()=>react(r),i*160)));on('share',share);
    on('leave',()=>{location.href='channels.html';});
    const openSheet=()=>{const body=sheet([...people,...queue],true);body.onclick=e=>{const b=e.target.closest('[data-act]');if(!b)return;const id=b.closest('[data-pid]').dataset.pid;const act=b.dataset.act;
      if(act==='approve'){const i=queue.findIndex(q=>q.id===id);const [p]=queue.splice(i,1);p.request=false;people.push(p);notice(p.name+' joined the stage.');}
      if(act==='mute'){const p=people.find(x=>x.id===id);p.muted=!p.muted;p.speaking=false;}
      if(act==='remove'){const i=people.findIndex(x=>x.id===id);notice(people[i].name+' was removed.');people.splice(i,1);}
      draw();openSheet();};};
    on('host',openSheet);
    const comments=[['Ruth N.','Amen! 🙏'],['Kevin','Joining from Toronto'],['Esther K.','This worship is beautiful'],['Daniel','Praying for everyone tonight'],['Sarah','Can you share the verse?'],['Mike','🔥🔥']];
    comments.slice(0,3).forEach(c=>addComment(...c));let i=3;
    setInterval(()=>{addComment(...comments[i++%comments.length]);if(Math.random()>.4)react(['❤️','🙏','🙌'][i%3]);const talk=people.filter(p=>!p.muted);people.forEach(p=>p.speaking=false);if(talk.length){talk[i%talk.length].speaking=true;}root.querySelectorAll('.mwe-tile').forEach(t=>t.classList.toggle('is-speaking',!!people.find(p=>p.id===t.dataset.pid)?.speaking));},2600);
    react('❤️');setTimeout(()=>react('🙏'),300);
  }

  document.addEventListener('DOMContentLoaded',async()=>{
    shell();document.documentElement.classList.add('mwe-stage-page');
    if(isDemo){runDemo();return;}
    try{
      const current=await api('channels/'+encodeURIComponent(channelId||''));sessionId=sessionId||current.session?.id;
      if(!sessionId){offline(current.canManage);window.lucide?.createIcons();return;}
      const title=current.session?.title||'Channel Live';document.title=title+' · Live | RhemaSphere';
      channelName=current.channel?.name||'';
      const channelInfo=channelId?await fetch('/api/spotlight/channel/'+encodeURIComponent(channelId),{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null):null;
      channelName=channelInfo?.channel?.name||current.channel?.name||'';
      setHeader(title,channelName,current.session?.joinedMembers??null);
      if(channelInfo&&typeof channelInfo.followers==='number'){
        const row=root.querySelector('.mwe-stage-title>span');
        const followers=document.createElement('small');followers.dataset.channelFollowers='';followers.textContent=Number(channelInfo.followers).toLocaleString()+' followers';
        const subscribe=document.createElement('button');subscribe.type='button';subscribe.className='mwe-stage-subscribe';subscribe.dataset.channelSubscribe='';row.append(followers,subscribe);
        if(channelInfo.following)subscribe.classList.add('is-subscribed');
        let subscription={following:!!channelInfo.following,followers:Number(channelInfo.followers)||0};
        subscribe.onclick=async()=>{if(subscribe.disabled)return;subscribe.disabled=true;
          const desired=!subscription.following;
          try{const response=await fetch('/api/spotlight/channel-follow/'+encodeURIComponent(channelId),{method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({active:desired})});
            if(response.status===401){window.MWE?.openMemberLogin?.(location.pathname+location.search);throw new Error('Sign in to subscribe free to this channel.');}
            const result=await response.json();if(!response.ok)throw new Error(result.error);
            if(typeof result.followers==='number'){subscription.following=!!result.following;subscription.followers=Number(result.followers);drawChannelSubscription(subscription,subscribe);notice(desired?'Subscribed free with live notices on.':'Unsubscribed from live notices.');}
          }catch(error){notice(error.message);drawChannelSubscription(subscription,subscribe);}finally{subscribe.disabled=false;}
        };
        drawChannelSubscription(subscription,subscribe);
      }

      renderTiles([{id:'host',name:current.channel?.name||current.session?.hostName||'Host',host:true,muted:false,speaking:true,a:'#1e3a8a',b:'#3b82f6'}]);
      const nav=controls([{id:'mic',icon:'mic-off',label:'Microphone',short:'Mic'},{id:'cam',icon:'video-off',label:'Camera',short:'Cam'},{id:'join',icon:current.canManage?'radio':'hand',label:current.canManage?'Open stage':'Join live stage',short:current.canManage?'Stage':'Join'},{id:'react',icon:'heart',label:'Ready for live reactions',short:'React',hidden:true},{id:'share',icon:'share-2',label:'Copy stage invitation',short:'Share'},{id:'chat',icon:'message-circle',label:'Open live chat',short:'Chat',hidden:true},...(current.canManage?[{id:'people',icon:'users',label:'Stage members',short:'People'},{id:'end',icon:'square',label:'End stage for everyone',short:'End',cls:'danger'}]:[]),{id:'leave',icon:'phone-off',label:'Leave stage',short:'Leave',cls:'danger',hidden:true}]);
      on('react',()=>['❤️','🙏','🙌'].forEach((r,i)=>setTimeout(()=>react(r),i*160)));on('share',share);
      on('mic',async e=>{if(!meeting)return notice('Join the stage first.');const p=toggle(e.currentTarget,'mic-off','mic');try{p?await meeting.self.enableAudio():await meeting.self.disableAudio();}catch(err){notice(err.message);}});
      on('cam',async e=>{if(!meeting)return notice('Join the stage first.');const p=toggle(e.currentTarget,'video-off','video');try{p?await meeting.self.enableVideo():await meeting.self.disableVideo();}catch(err){notice(err.message);}});
      on('join',async event=>{const button=event.currentTarget;button.disabled=true;try{
        const loading=root.querySelector('#rtk-loading');if(loading){loading.hidden=false;loading.classList.remove('is-error');loading.querySelector('strong').textContent='Connecting to the live session…';loading.querySelector('p').textContent='Audio, camera and chat are supplied by the existing live provider.';}
        const result=await api('sessions/'+encodeURIComponent(sessionId)+'/join',{});if(!result.authToken)throw new Error('The provider did not return a participant token.');
        if(!window.RealtimeKitClient)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/vendor/live/realtimekit.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});
        const {defineCustomElements}=await import('/vendor/live/ui/loader.js');await defineCustomElements();
        meeting=await window.RealtimeKitClient.init({authToken:result.authToken,defaults:{audio:false,video:false}});
        stage.showSetupScreen=result.role==='host';stage.setAttribute('show-setup-screen',String(result.role==='host'));stage.meeting=meeting;stage.hidden=false;root.classList.add('has-rtk');window.MWEWatchTheatre?.mount(root,stage,'stage',nav);nav.querySelector('[data-ctl=leave]').hidden=false;nav.querySelector('[data-ctl=chat]').hidden=false;root._rsSetStageLayout?.();
        stage.addEventListener('rtkMeetingJoined',()=>refreshMembers().catch(()=>{}));
        const joined=()=>refreshMembers().catch(()=>{});
        meeting.participants?.joined?.on('participantJoined',joined);
        meeting.participants?.joined?.on('participantLeft',joined);
        meeting.participants?.waitlisted?.on('participantJoined',joined);
        meeting.participants?.waitlisted?.on('participantLeft',joined);
        await refreshMembers().catch(()=>{});
        if(result.role==='viewer')await meeting.join();
        notice(result.role==='host'?'Use the stage controls to admit guests and manage participants.':'You joined as a viewer. Use Request to join to come on camera.');
        memberTimer=setInterval(()=>refreshMembers().catch(()=>{}),60000);
        timer=setInterval(async()=>{try{const state=await api('sessions/'+encodeURIComponent(sessionId));if(state.session.status!=='live'||new Date(state.session.expiresAt)<=new Date()){await leave();offline(false);window.lucide?.createIcons();}}catch{await leave();notice('Your stage session is no longer available.');}},20000);
      }catch(error){await leave();notice(error.message);button.disabled=false;const retry=root.querySelector('#rtk-loading');if(retry){retry.hidden=false;retry.classList.add('is-error');retry.querySelector('strong').textContent='Live connection failed';retry.querySelector('p').textContent=error.message||'Retry the connection.';}}finally{const loading=root.querySelector('#rtk-loading');if(loading&&!loading.classList.contains('is-error'))loading.hidden=true;}});
      on('people',async()=>{try{await refreshMembers(true);}catch(error){notice(error.message);}});
      on('chat',()=>openProviderPanel());
      on('leave',async e=>{await leave();e.currentTarget.hidden=true;nav.querySelector('[data-ctl=join]').disabled=false;notice('You left the stage.');});
      on('end',async event=>{const button=event.currentTarget;if(!window.confirm('End this live stage for everyone?'))return;button.disabled=true;try{await api('sessions/'+encodeURIComponent(sessionId)+'/end',{});await leave();offline(false);window.lucide?.createIcons();}catch(error){notice(error.message);button.disabled=false;}});
    }catch(error){offline(false);notice(error.message);window.lucide?.createIcons();}
  });
  window.addEventListener('pagehide',()=>{clearInterval(timer);meeting?.leave?.();});
})();
