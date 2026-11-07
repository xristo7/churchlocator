/* Audio-only owner broadcast. Provider tokens are issued by authenticated server routes. */
(function(root) {
  let sdk;
  function loadSdk() {
    if(root.RealtimeKitClient) return Promise.resolve(root.RealtimeKitClient);
    if(!sdk) sdk=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='/vendor/live/realtimekit.js';
      script.onload=()=>resolve(root.RealtimeKitClient);
      script.onerror=()=>{script.remove();sdk=null;reject(new Error('Could not load live audio. Please retry.'));};
      document.head.append(script);
    });
    return sdk;
  }
  root.MWEMeditationVoice=class {
    constructor(container,path,api) {
      this.path=path+'/voice';this.api=api;this.disposed=false;this.busy=false;this.meeting=null;this.peers=new Map();
      this.node=document.createElement('section');this.node.setAttribute('aria-label','Room owner voice');
      this.node.style.cssText='position:relative;z-index:5;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 12px;background:var(--surface,#fff);color:var(--ink,#17231c)';
      this.status=document.createElement('span');this.status.setAttribute('role','status');
      this.join=this.button('Listen to owner',()=>this.connect());
      this.mic=this.button('Unmute microphone',()=>this.toggleMic());this.mic.hidden=true;
      this.end=this.button('End voice broadcast',()=>this.endBroadcast());this.end.hidden=true;
      this.node.prepend(this.status);container.prepend(this.node);
      this.refresh();this.timer=setInterval(()=>this.refresh(),5000);
    }
    button(label,action) {
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.addEventListener('click',()=>this.perform(action));this.node.append(button);return button;
    }
    async perform(action) {
      if(this.busy || this.disposed)return;
      this.busy=true;this.buttons(true);
      try{await action();}catch(error){if(!this.disposed)this.status.textContent=error.name==='NotAllowedError'?'Microphone permission denied. Allow it in browser settings, then retry.':error.message;}
      finally{this.busy=false;if(!this.disposed)this.buttons(false);}
    }
    buttons(disabled){for(const button of [this.join,this.mic,this.end])button.disabled=disabled;this.join.disabled=disabled || (!this.canSpeak && !this.active && !this.meeting);}
    async refresh() {
      if(this.busy || this.disposed || this.reading)return;
      this.reading=true;
      try {
        const state=await this.api(this.path);
        if(this.disposed || this.busy)return;
        if(this.meeting && (!state.active || this.generation!==state.generation))await this.leave();
        if(this.disposed)return;
        this.canSpeak=state.canSpeak;this.active=state.active;
        this.join.textContent=this.meeting?'Leave voice audio':state.canSpeak?(state.active?'Join owner microphone':'Start voice broadcast'):'Listen to owner';
        this.join.disabled=!state.canSpeak && !state.active;
        this.mic.hidden=!this.meeting || !state.canSpeak;
        this.end.hidden=!state.canSpeak || !state.active;
        if(!this.meeting)this.status.textContent=state.active?'Owner voice is available.':state.canSpeak?'Microphone is off. Start a voice broadcast to speak.':'The owner has not started voice audio.';
      }catch(error){if(!this.disposed)this.status.textContent='Voice connection unavailable: '+error.message;}
      finally{this.reading=false;}
    }
    async connect() {
      if(this.meeting){await this.leave();await this.refresh();return;}
      if(this.canSpeak && !this.active)await this.api(this.path+'/start',{});
      if(this.disposed)return;
      const result=await this.api(this.path+'/join',{});
      const Client=await loadSdk();
      if(this.disposed)return;
      const meeting=await Client.init({authToken:result.authToken,defaults:{audio:false,video:false}});
      if(this.disposed){await meeting.leave();return;}
      this.meeting=meeting;
      this.onAudio=({audioEnabled})=>{
        if(this.disposed || this.meeting!==meeting || !this.canSpeak)return;
        this.mic.textContent=audioEnabled?'Mute microphone':'Unmute microphone';this.mic.setAttribute('aria-pressed',String(audioEnabled));
        this.status.textContent=audioEnabled?'Microphone live — participants can hear you.':'Microphone muted.';
      };
      meeting.self.addListener?.('audioUpdate',this.onAudio);
      this.generation=result.generation;this.canSpeak=result.canSpeak;
      this.onJoined=participant=>this.attach(participant);
      this.onLeft=participant=>this.detach(participant.id);
      meeting.participants.joined.addListener('participantJoined',this.onJoined);
      meeting.participants.joined.addListener('participantLeft',this.onLeft);
      try {
        await meeting.join();
        if(this.disposed || this.meeting!==meeting){await this.leave();return;}
        for(const participant of meeting.participants.joined.toArray())this.attach(participant);
        this.join.textContent='Leave voice audio';this.mic.hidden=!result.canSpeak;this.end.hidden=!result.canSpeak;
        this.mic.textContent='Unmute microphone';this.mic.setAttribute('aria-pressed','false');
        this.status.textContent=result.canSpeak?'Connected. Your microphone is muted.':'Listening to the room owner.';
      }catch(error){await this.leave();throw error;}
    }
    attach(participant) {
      if(participant.id===this.meeting?.self.id || this.peers.has(participant.id))return;
      const audio=document.createElement('audio');audio.autoplay=true;audio.setAttribute('playsinline','');this.node.append(audio);
      const update=({audioEnabled,audioTrack})=>{
        audio.srcObject=audioEnabled && audioTrack?new MediaStream([audioTrack]):null;
        if(audio.srcObject)audio.play().catch(()=>{if(!this.disposed)this.status.textContent='Audio was blocked. Leave and rejoin voice audio to listen.';});
      };
      participant.addListener('audioUpdate',update);this.peers.set(participant.id,{participant,update,audio});update(participant);
    }
    detach(id) {
      const peer=this.peers.get(id);if(!peer)return;
      peer.participant.removeListener('audioUpdate',peer.update);peer.audio.pause();peer.audio.srcObject=null;peer.audio.remove();this.peers.delete(id);
    }
    async toggleMic() {
      if(!this.meeting || !this.canSpeak)return;
      const meeting=this.meeting;
      try {
        if(meeting.self.audioEnabled)await meeting.self.disableAudio();
        else {
          if(meeting.stage && meeting.stage.status!=='ON_STAGE')await meeting.stage.join();
          if(this.disposed || this.meeting!==meeting)return;
          await meeting.self.enableAudio();
        }
        if(this.disposed || this.meeting!==meeting){meeting.self.audioTrack?.stop();await meeting.leave();return;}
        const enabled=meeting.self.audioEnabled;
        this.mic.textContent=enabled?'Mute microphone':'Unmute microphone';this.mic.setAttribute('aria-pressed',String(enabled));
        this.status.textContent=enabled?'Microphone live — participants can hear you.':'Microphone muted.';
      }catch(error){meeting.self.audioTrack?.stop();throw error;}
    }
    async endBroadcast() {
      try{await this.api(this.path+'/end',{});}finally{await this.leave();}
      this.active=false;this.end.hidden=true;this.join.textContent='Start voice broadcast';this.status.textContent='Voice broadcast ended.';
    }
    async leave() {
      const meeting=this.meeting;this.meeting=null;
      if(meeting){
        meeting.self.removeListener?.('audioUpdate',this.onAudio);
        meeting.self.audioTrack?.stop();
        meeting.participants.joined.removeListener('participantJoined',this.onJoined);
        meeting.participants.joined.removeListener('participantLeft',this.onLeft);
        for(const id of [...this.peers.keys()])this.detach(id);
        try{await meeting.self.disableAudio();}catch{}
        try{await meeting.leave();}catch{}
      }
      this.mic.hidden=true;
    }
    stop(){this.disposed=true;clearInterval(this.timer);this.leave();this.node.remove();}
  };
})(window);
