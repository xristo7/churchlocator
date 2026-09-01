(function initMeditationSanctuary() {
  const data = () => window.MyWayModules || window.FaithLinkModules;

  const audioCatalog = [
    { id: "med-harp-still", title: "Still Waters & Harp", category: "instrumental", catLabel: "Soaking Instrumental", duration: "18:40", speaker: "Grace Audio Collective", cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=600&q=80", toneFreq: 432, desc: "Gentle acoustic harp and grand piano tuned for quiet prayer." },
    { id: "med-piano-soaking", title: "In His Secret Place (Piano)", category: "instrumental", catLabel: "Soaking Instrumental", duration: "24:15", speaker: "David Praise Project", cover: "https://images.unsplash.com/photo-1520523839898-507127054c8d?auto=format&fit=crop&w=600&q=80", toneFreq: 528, desc: "Atmospheric ambient piano pads for deep scripture contemplation." },
    { id: "med-strings-sanctuary", title: "Sanctuary Ambient Strings", category: "instrumental", catLabel: "Soaking Instrumental", duration: "32:00", speaker: "Heavenly Harmony", cover: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80", toneFreq: 396, desc: "Peaceful orchestral strings with soft cello and warmth." },

    { id: "med-bible-psalms", title: "Psalms of Peace & Deliverance", category: "bible", catLabel: "Audio Bible", duration: "15:20", speaker: "Narrated Scripture", cover: "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=600&q=80", toneFreq: 440, desc: "Psalms 23, 91, 121 & 139 read aloud with gentle background strings." },
    { id: "med-bible-healing", title: "Healing Promises of God", category: "bible", catLabel: "Audio Bible", duration: "20:10", speaker: "Narrated Scripture", cover: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=600&q=80", toneFreq: 528, desc: "30 powerful verses of renewal, health, and comfort." },
    { id: "med-bible-sleep", title: "Bedtime Scripture & Blessing", category: "bible", catLabel: "Audio Bible", duration: "45:00", speaker: "Spoken Word", cover: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80", toneFreq: 396, desc: "Calming bedtime scriptures to quiet the soul into restful sleep." },

    { id: "med-worship-acoustic", title: "Acoustic Worship in the Room", category: "worship", catLabel: "Christian Worship", duration: "22:30", speaker: "The Worship Room", cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80", toneFreq: 432, desc: "Raw, unhurried praise and acoustic devotion." },
    { id: "med-worship-hymns", title: "Hymns of Grace & Glory", category: "worship", catLabel: "Christian Worship", duration: "19:45", speaker: "Sanctuary Choir", cover: "https://images.unsplash.com/photo-1445743432342-eac500ce72b7?auto=format&fit=crop&w=600&q=80", toneFreq: 440, desc: "Timeless hymns arranged for peaceful prayer and thanksgiving." },

    { id: "med-sermon-abiding", title: "Abiding in the Vine", category: "sermons", catLabel: "Guided Preaching", duration: "14:10", speaker: "Pastor Mark", cover: "https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=600&q=80", toneFreq: 432, desc: "A guided devotional on resting in Jesus from John 15." },
    { id: "med-sermon-anxiety", title: "Overcoming Anxiety with Prayer", category: "sermons", catLabel: "Guided Preaching", duration: "16:50", speaker: "Amara Okafor", cover: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80", toneFreq: 528, desc: "Practical biblical steps to trade anxious thoughts for God's peace." }
  ];

  const scriptureVerses = [
    { topic: "Peace & Stillness", text: "“Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.”", ref: "— John 14:27" },
    { topic: "Divine Rest", text: "“Come to me, all you who are weary and burdened, and I will give you rest. Take my yoke upon you and learn from me, for I am gentle and humble in heart.”", ref: "— Matthew 11:28-29" },
    { topic: "God's Faithfulness", text: "“You will keep in perfect peace those whose minds are steadfast, because they trust in you.”", ref: "— Isaiah 26:3" },
    { topic: "The Good Shepherd", text: "“The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.”", ref: "— Psalm 23:1-3" },
    { topic: "Overcoming Worry", text: "“Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.”", ref: "— Philippians 4:6" }
  ];

  let currentTrack = audioCatalog[0];
  let isPlaying = false;
  let currentCategory = "all";
  let activeVerseIndex = 0;
  let timerInterval = null;
  let timerSecondsLeft = 0;
  let audioContext = null;
  let synthGain = null;
  let osc1 = null;
  let osc2 = null;

  function initSynthesizer() {
    if (audioContext) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtx();
      synthGain = audioContext.createGain();
      synthGain.gain.setValueAtTime(0.001, audioContext.currentTime);
      synthGain.connect(audioContext.destination);
    } catch (e) {
      console.warn("Web Audio not supported", e);
    }
  }

  function startSynthTone(baseFreq = 432) {
    initSynthesizer();
    if (!audioContext || !synthGain) return;
    if (audioContext.state === "suspended") audioContext.resume();

    stopSynthTone();

    osc1 = audioContext.createOscillator();
    osc2 = audioContext.createOscillator();

    osc1.type = "sine";
    osc2.type = "triangle";

    osc1.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
    osc2.frequency.setValueAtTime(baseFreq * 1.5, audioContext.currentTime);

    const vol = Number(document.getElementById("master-volume")?.value || 85) / 100 * 0.12;

    osc1.connect(synthGain);
    osc2.connect(synthGain);

    synthGain.gain.cancelScheduledValues(audioContext.currentTime);
    synthGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    synthGain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), audioContext.currentTime + 1.2);

    osc1.start();
    osc2.start();
  }

  function stopSynthTone() {
    if (synthGain && audioContext) {
      synthGain.gain.cancelScheduledValues(audioContext.currentTime);
      synthGain.gain.setValueAtTime(synthGain.gain.value, audioContext.currentTime);
      synthGain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.6);
    }
    setTimeout(() => {
      try { osc1?.stop(); osc1?.disconnect(); } catch (e) {}
      try { osc2?.stop(); osc2?.disconnect(); } catch (e) {}
      osc1 = null; osc2 = null;
    }, 650);
  }

  function renderGrid() {
    const grid = document.getElementById("meditation-audio-grid");
    if (!grid) return;
    const filtered = currentCategory === "all" ? audioCatalog : audioCatalog.filter(t => t.category === currentCategory);

    grid.innerHTML = filtered.map(item => {
      const active = item.id === currentTrack.id ? "active" : "";
      const playingClass = (active && isPlaying) ? "playing" : "";
      return '<div class="med-card ' + active + ' ' + playingClass + '" data-track-id="' + item.id + '">' +
        '<div class="med-card-cover">' +
          '<img src="' + item.cover + '" alt="' + item.title + '" />' +
          '<span class="med-card-tag">' + item.catLabel + '</span>' +
          '<button class="med-card-play" type="button" aria-label="Play ' + item.title + '">' +
            '<i data-lucide="' + (active && isPlaying ? "pause" : "play") + '"></i>' +
          '</button>' +
        '</div>' +
        '<div class="med-card-body">' +
          '<strong>' + item.title + '</strong>' +
          '<p>' + item.desc + '</p>' +
          '<div class="med-card-footer">' +
            '<span><i data-lucide="clock"></i> ' + item.duration + '</span>' +
            '<small>' + item.speaker + '</small>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join("");

    window.lucide?.createIcons();
  }

  function setTrack(track, autoPlay = true) {
    currentTrack = track;
    document.getElementById("player-title").textContent = track.title;
    document.getElementById("player-subtitle").textContent = track.catLabel + ' • ' + track.speaker;
    document.getElementById("player-thumb").src = track.cover;
    document.getElementById("player-duration").textContent = track.duration;
    document.getElementById("current-channel-tag").textContent = track.catLabel.replace("Christian ", "");

    if (autoPlay) {
      isPlaying = true;
      startSynthTone(track.toneFreq || 432);
    }
    updatePlayIcons();
    renderGrid();
  }

  function togglePlay() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      startSynthTone(currentTrack.toneFreq || 432);
    } else {
      stopSynthTone();
    }
    updatePlayIcons();
    renderGrid();
  }

  function updatePlayIcons() {
    const playBtn = document.getElementById("player-play-toggle");
    if (playBtn) {
      playBtn.innerHTML = '<i data-lucide="' + (isPlaying ? "pause" : "play") + '"></i>';
      window.lucide?.createIcons();
    }
  }

  function switchCategory(cat) {
    currentCategory = cat;
    document.querySelectorAll(".med-tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.cat === cat));
    
    if (cat !== "all") {
      const firstInCat = audioCatalog.find(t => t.category === cat);
      if (firstInCat && firstInCat.id !== currentTrack.id) {
        setTrack(firstInCat, isPlaying);
      }
    }
    renderGrid();
  }

  function rotateVerse() {
    activeVerseIndex = (activeVerseIndex + 1) % scriptureVerses.length;
    const v = scriptureVerses[activeVerseIndex];
    document.getElementById("verse-topic").textContent = v.topic;
    document.getElementById("verse-text").textContent = v.text;
    document.getElementById("verse-reference").textContent = v.ref;
  }

  function setTimer(minutes) {
    clearInterval(timerInterval);
    const badge = document.getElementById("timer-badge");
    if (minutes <= 0) {
      badge.textContent = "Off";
      return;
    }
    timerSecondsLeft = minutes * 60;
    badge.textContent = minutes + 'm';
    timerInterval = setInterval(() => {
      timerSecondsLeft--;
      if (timerSecondsLeft <= 0) {
        clearInterval(timerInterval);
        isPlaying = false;
        stopSynthTone();
        updatePlayIcons();
        renderGrid();
        badge.textContent = "Off";
      } else {
        const m = Math.floor(timerSecondsLeft / 60);
        const s = timerSecondsLeft % 60;
        badge.textContent = m + ':' + (s < 10 ? '0' : '') + s;
      }
    }, 1000);
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderGrid();
    setTrack(audioCatalog[0], false);

    document.getElementById("meditation-audio-grid")?.addEventListener("click", e => {
      const card = e.target.closest(".med-card");
      if (!card) return;
      const id = card.dataset.trackId;
      const track = audioCatalog.find(t => t.id === id);
      if (!track) return;
      if (track.id === currentTrack.id) {
        togglePlay();
      } else {
        setTrack(track, true);
      }
    });

    document.getElementById("player-play-toggle")?.addEventListener("click", togglePlay);

    document.getElementById("player-prev")?.addEventListener("click", () => {
      const idx = audioCatalog.findIndex(t => t.id === currentTrack.id);
      const nextIdx = (idx - 1 + audioCatalog.length) % audioCatalog.length;
      setTrack(audioCatalog[nextIdx], isPlaying);
    });

    document.getElementById("player-next")?.addEventListener("click", () => {
      const idx = audioCatalog.findIndex(t => t.id === currentTrack.id);
      const nextIdx = (idx + 1) % audioCatalog.length;
      setTrack(audioCatalog[nextIdx], isPlaying);
    });

    document.getElementById("med-cat-tabs")?.addEventListener("click", e => {
      const btn = e.target.closest(".med-tab-btn");
      if (!btn) return;
      switchCategory(btn.dataset.cat);
    });

    const channelBtn = document.getElementById("channel-switch-btn");
    const channelMenu = document.getElementById("channel-switch-menu");
    channelBtn?.addEventListener("click", () => channelMenu.hidden = !channelMenu.hidden);
    channelMenu?.addEventListener("click", e => {
      const btn = e.target.closest("[data-switch-cat]");
      if (!btn) return;
      switchCategory(btn.dataset.switchCat);
      channelMenu.hidden = true;
    });

    const themeBtn = document.getElementById("theme-menu-btn");
    const themeDropdown = document.getElementById("theme-dropdown");
    const backdrop = document.getElementById("meditation-backdrop");
    themeBtn?.addEventListener("click", () => themeDropdown.hidden = !themeDropdown.hidden);
    themeDropdown?.addEventListener("click", e => {
      const btn = e.target.closest("[data-theme-bg]");
      if (!btn) return;
      const bg = btn.dataset.themeBg;
      backdrop.className = 'meditation-backdrop bg-' + bg;
      document.getElementById("current-theme-label").textContent = btn.textContent.trim();
      themeDropdown.querySelectorAll("button").forEach(b => b.classList.toggle("active", b === btn));
      themeDropdown.hidden = true;
    });

    const breathBtn = document.getElementById("breathing-toggle-btn");
    const breathCircle = document.getElementById("breathing-circle");
    breathBtn?.addEventListener("click", () => {
      const isHidden = breathCircle.hidden;
      breathCircle.hidden = !isHidden;
      breathBtn.classList.toggle("active", isHidden);
    });

    const mixerBtn = document.getElementById("ambient-mixer-btn");
    const mixerDrawer = document.getElementById("ambient-mixer-drawer");
    mixerBtn?.addEventListener("click", () => mixerDrawer.hidden = !mixerDrawer.hidden);
    document.getElementById("ambient-close-btn")?.addEventListener("click", () => mixerDrawer.hidden = true);

    const timerBtn = document.getElementById("player-timer-btn");
    const timerDropdown = document.getElementById("timer-dropdown");
    timerBtn?.addEventListener("click", () => timerDropdown.hidden = !timerDropdown.hidden);
    timerDropdown?.addEventListener("click", e => {
      const btn = e.target.closest("[data-timer-min]");
      if (!btn) return;
      const mins = Number(btn.dataset.timerMin);
      setTimer(mins);
      timerDropdown.querySelectorAll("button").forEach(b => b.classList.toggle("active", b === btn));
      timerDropdown.hidden = true;
    });

    document.getElementById("next-verse-btn")?.addEventListener("click", rotateVerse);

    document.addEventListener("click", e => {
      if (!e.target.closest(".player-channel-switcher")) channelMenu.hidden = true;
      if (!e.target.closest(".meditation-theme-picker")) themeDropdown.hidden = true;
      if (!e.target.closest(".player-timer-dropdown-wrap")) timerDropdown.hidden = true;
    });
  });
})();
