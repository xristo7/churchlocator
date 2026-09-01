(function initMeditationSanctuary() {

  const roomsCatalog = [
    // 1. Favorite & Featured
    {
      id: "room-peace",
      title: "Sanctuary of Peace & Stillness",
      subtitle: "Calm your soul and release all anxiety into His hands.",
      category: "featured",
      categoryLabel: "⭐ Favorite Room",
      icon: "heart",
      cover: "https://images.unsplash.com/photo-1548625361-195fe578ae14?auto=format&fit=crop&w=800&q=80",
      theme: "chapel",
      toneFreq: 432,
      verses: [
        { topic: "Perfect Peace", text: "“Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.”", ref: "— John 14:27" },
        { topic: "Quiet Waters", text: "“The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.”", ref: "— Psalm 23:1-3" },
        { topic: "Steadfast Mind", text: "“You will keep in perfect peace those whose minds are steadfast, because they trust in you.”", ref: "— Isaiah 26:3" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Psalms of Peace", cat: "Dramatized Scripture", freq: 432 },
        instrumental: { title: "Still Waters Harp & Strings", cat: "Soaking Instrumental (432Hz)", freq: 432 },
        worship: { title: "Acoustic Peace in the Room", cat: "Christian Worship", freq: 432 },
        sermon: { title: "Resting in God's Unshakable Peace", cat: "Pastor Mark", freq: 432 }
      }
    },
    {
      id: "room-healing",
      title: "Health & Divine Healing Room",
      subtitle: "Meditation and promises for physical and spiritual restoration.",
      category: "featured",
      categoryLabel: "⭐ Favorite Room",
      icon: "sparkles",
      cover: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
      theme: "stream",
      toneFreq: 528,
      verses: [
        { topic: "Restoration", text: "“For I will restore health to you, and your wounds I will heal, declares the Lord.”", ref: "— Jeremiah 30:17" },
        { topic: "By His Stripes", text: "“He was pierced for our transgressions, crushed for our iniquities; the punishment that brought us peace was on him, and by his wounds we are healed.”", ref: "— Isaiah 53:5" },
        { topic: "Whole-Body Health", text: "“He himself bore our sins in his body on the cross, so that we might die to sins and live for righteousness; by his wounds you have been healed.”", ref: "— 1 Peter 2:24" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Healing Promises", cat: "Dramatized Scripture", freq: 528 },
        instrumental: { title: "Restoration Ambient Piano Pads", cat: "Soaking Instrumental (528Hz)", freq: 528 },
        worship: { title: "Healing Streams of Worship", cat: "Christian Worship", freq: 528 },
        sermon: { title: "Receiving Divine Healing Today", cat: "Amara Okafor", freq: 528 }
      }
    },
    {
      id: "room-secret-place",
      title: "The Secret Place Soaking Sanctuary",
      subtitle: "Abiding in the shadow of the Almighty with deep prayer.",
      category: "featured",
      categoryLabel: "⭐ Favorite Room",
      icon: "shield",
      cover: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80",
      theme: "chapel",
      toneFreq: 396,
      verses: [
        { topic: "The Secret Place", text: "“Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. I will say of the Lord, ‘He is my refuge and my fortress, my God, in whom I trust.’”", ref: "— Psalm 91:1-2" },
        { topic: "Abiding in Christ", text: "“Remain in me, as I also remain in you. No branch can bear fruit by itself; it must remain in the vine. Neither can you bear fruit unless you remain in me.”", ref: "— John 15:4" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Psalm 91 Refuge", cat: "Dramatized Scripture", freq: 396 },
        instrumental: { title: "Secret Place Ambient Pads & Cello", cat: "Soaking Instrumental (396Hz)", freq: 396 },
        worship: { title: "Deep Intimacy Worship", cat: "Christian Worship", freq: 396 },
        sermon: { title: "The Power of the Secret Place", cat: "Pastor Mark", freq: 396 }
      }
    },
    {
      id: "room-bedtime",
      title: "Nighttime Rest & Sleep Sanctuary",
      subtitle: "Gentle spoken scripture and peace to release the day into sleep.",
      category: "featured",
      categoryLabel: "⭐ Favorite Room",
      icon: "moon",
      cover: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80",
      theme: "stars",
      toneFreq: 432,
      verses: [
        { topic: "Rest in Safety", text: "“In peace I will lie down and sleep, for you alone, Lord, make me dwell in safety.”", ref: "— Psalm 4:8" },
        { topic: "The Keeper", text: "“He who watches over you will not slumber; indeed, he who watches over Israel will neither slumber nor sleep.”", ref: "— Psalm 121:3-4" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Nightfall Blessings", cat: "Dramatized Scripture", freq: 432 },
        instrumental: { title: "Starlight Lullaby Harp", cat: "Soaking Instrumental (432Hz)", freq: 432 },
        worship: { title: "Evening Prayer Melodies", cat: "Christian Worship", freq: 432 },
        sermon: { title: "A Father's Bedtime Prayer", cat: "Spoken Devotional", freq: 432 }
      }
    },

    // 2. Books of the Bible
    {
      id: "room-psalms",
      title: "The Book of Psalms Room",
      subtitle: "150 Sacred Songs of Solace, Deliverance, Praise & Refuge.",
      category: "bible-books",
      categoryLabel: "📖 Bible Book",
      icon: "book-open",
      cover: "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=700&q=80",
      theme: "mountains",
      toneFreq: 432,
      verses: [
        { topic: "The Lord is My Strength", text: "“The Lord is my light and my salvation—whom shall I fear? The Lord is the stronghold of my life—of whom shall I be afraid?”", ref: "— Psalm 27:1" },
        { topic: "Praise & Majesty", text: "“I will exalt you, my God the King; I will praise your name for ever and ever. Every day I will praise you and extol your name for ever and ever.”", ref: "— Psalm 145:1-2" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Psalms 1 to 150 Highlights", cat: "Narrated Word", freq: 432 },
        instrumental: { title: "Davidic Harp & Strings", cat: "Soaking Instrumental", freq: 432 },
        worship: { title: "Psalms Set to Music", cat: "Worship Music", freq: 432 },
        sermon: { title: "Walking Through the Psalms", cat: "Dr. Peter Cole", freq: 432 }
      }
    },
    {
      id: "room-proverbs",
      title: "The Book of Proverbs Room",
      subtitle: "Daily Divine Wisdom, Discernment, Guidance & Righteous Living.",
      category: "bible-books",
      categoryLabel: "📖 Bible Book",
      icon: "compass",
      cover: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=700&q=80",
      theme: "chapel",
      toneFreq: 440,
      verses: [
        { topic: "Trust in the Lord", text: "“Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.”", ref: "— Proverbs 3:5-6" },
        { topic: "Guarding Your Heart", text: "“Above all else, guard your heart, for everything you do flows from it.”", ref: "— Proverbs 4:23" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Proverbs Chapters 1-31", cat: "Spoken Word", freq: 440 },
        instrumental: { title: "Wisdom Contemplation Piano", cat: "Soaking Instrumental", freq: 440 },
        worship: { title: "Hymns of Guidance", cat: "Worship Music", freq: 440 },
        sermon: { title: "Applying Biblical Wisdom Daily", cat: "Amara Okafor", freq: 440 }
      }
    },
    {
      id: "room-gospels",
      title: "The Holy Gospels Room",
      subtitle: "Matthew, Mark, Luke & John — The Words, Miracles & Grace of Christ.",
      category: "bible-books",
      categoryLabel: "📖 Bible Book",
      icon: "sun",
      cover: "https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=700&q=80",
      theme: "sunrise",
      toneFreq: 528,
      verses: [
        { topic: "The Bread of Life", text: "“Jesus declared, ‘I am the bread of life. Whoever comes to me will never go hungry, and whoever believes in me will never be thirsty.’”", ref: "— John 6:35" },
        { topic: "The Good Shepherd", text: "“I am the good shepherd. The good shepherd lays down his life for the sheep.”", ref: "— John 10:11" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: The Words of Jesus in Red", cat: "Dramatized Word", freq: 528 },
        instrumental: { title: "Gospel Grace Acoustic Harmony", cat: "Soaking Instrumental", freq: 528 },
        worship: { title: "Worthy is the Lamb", cat: "Worship Music", freq: 528 },
        sermon: { title: "The Life & Ministry of Jesus", cat: "Pastor Mark", freq: 528 }
      }
    },
    {
      id: "room-epistles",
      title: "The Epistles of Grace Room",
      subtitle: "Romans to Jude — Living in the Spirit, Eternal Security & New Identity.",
      category: "bible-books",
      categoryLabel: "📖 Bible Book",
      icon: "feather",
      cover: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=700&q=80",
      theme: "chapel",
      toneFreq: 432,
      verses: [
        { topic: "More than Conquerors", text: "“No, in all these things we are more than conquerors through him who loved us.”", ref: "— Romans 8:37" },
        { topic: "New Creation", text: "“Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!”", ref: "— 2 Corinthians 5:17" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Romans & Ephesians", cat: "Spoken Word", freq: 432 },
        instrumental: { title: "Grace Unmeasured Strings", cat: "Soaking Instrumental", freq: 432 },
        worship: { title: "Songs of Justification", cat: "Worship Music", freq: 432 },
        sermon: { title: "Living in the Power of the Holy Spirit", cat: "Dr. Peter Cole", freq: 432 }
      }
    },

    // 3. Scriptural Themes & Entities
    {
      id: "room-faith",
      title: "Faith & Bold Trust Room",
      subtitle: "Moving mountains, believing God's promises, and walking with boldness.",
      category: "themes",
      categoryLabel: "🕊️ Biblical Theme",
      icon: "mountain",
      cover: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=700&q=80",
      theme: "mountains",
      toneFreq: 528,
      verses: [
        { topic: "The Nature of Faith", text: "“Now faith is confidence in what we hope for and assurance about what we do not see.”", ref: "— Hebrews 11:1" },
        { topic: "Mountain Moving Faith", text: "“Truly I tell you, if you have faith as small as a mustard seed, you can say to this mountain, ‘Move from here to there,’ and it will move. Nothing will be impossible for you.”", ref: "— Matthew 17:20" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Hebrews 11 Hall of Faith", cat: "Spoken Word", freq: 528 },
        instrumental: { title: "Unshakable Faith Piano", cat: "Soaking Instrumental", freq: 528 },
        worship: { title: "Overcomer Praise", cat: "Worship Music", freq: 528 },
        sermon: { title: "Unlocking Mountain-Moving Faith", cat: "Pastor Mark", freq: 528 }
      }
    },
    {
      id: "room-love",
      title: "Divine Love & Compassion Room",
      subtitle: "Experiencing the unconditional, steadfast Agape love of the Father.",
      category: "themes",
      categoryLabel: "🕊️ Biblical Theme",
      icon: "heart-handshake",
      cover: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=700&q=80",
      theme: "chapel",
      toneFreq: 639,
      verses: [
        { topic: "Agape Love", text: "“Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking, it is not easily angered, it keeps no record of wrongs.”", ref: "— 1 Corinthians 13:4-5" },
        { topic: "God is Love", text: "“Dear friends, let us love one another, for love comes from God. Everyone who loves has been born of God and knows God. Whoever does not love does not know God, because God is love.”", ref: "— 1 John 4:7-8" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: 1 Corinthians 13 & 1 John 4", cat: "Spoken Word", freq: 639 },
        instrumental: { title: "Father's Love Soaking Strings", cat: "Soaking Instrumental (639Hz)", freq: 639 },
        worship: { title: "How Deep the Father's Love", cat: "Worship Music", freq: 639 },
        sermon: { title: "Resting in Unconditional Love", cat: "Amara Okafor", freq: 639 }
      }
    },
    {
      id: "room-salvation",
      title: "Salvation & Eternal Grace Room",
      subtitle: "Contemplating the finished work of the Cross and redemption in Christ.",
      category: "themes",
      categoryLabel: "🕊️ Biblical Theme",
      icon: "cross",
      cover: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=700&q=80",
      theme: "chapel",
      toneFreq: 432,
      verses: [
        { topic: "Saved by Grace", text: "“For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast.”", ref: "— Ephesians 2:8-9" },
        { topic: "Eternal Life", text: "“For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.”", ref: "— John 3:16" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Gospel of John Redemption", cat: "Spoken Word", freq: 432 },
        instrumental: { title: "At the Cross Acoustic Soaking", cat: "Soaking Instrumental", freq: 432 },
        worship: { title: "Grace Greater than Our Sin", cat: "Worship Music", freq: 432 },
        sermon: { title: "The Finished Work of Christ", cat: "Dr. Peter Cole", freq: 432 }
      }
    },
    {
      id: "room-victory",
      title: "Spiritual Victory & Strength Room",
      subtitle: "Putting on the full armor of God and standing firm in triumph.",
      category: "themes",
      categoryLabel: "🕊️ Biblical Theme",
      icon: "zap",
      cover: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=700&q=80",
      theme: "mountains",
      toneFreq: 528,
      verses: [
        { topic: "Armor of God", text: "“Finally, be strong in the Lord and in his mighty power. Put on the full armor of God, so that you can take your stand against the devil’s schemes.”", ref: "— Ephesians 6:10-11" },
        { topic: "Spirit of Power", text: "“For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.”", ref: "— 2 Timothy 1:7" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Ephesians 6 & Romans 8", cat: "Spoken Word", freq: 528 },
        instrumental: { title: "Triumphant Ambient Pads", cat: "Soaking Instrumental", freq: 528 },
        worship: { title: "Surrounded (Fight My Battles)", cat: "Worship Music", freq: 528 },
        sermon: { title: "Standing Firm in Victory", cat: "Pastor Mark", freq: 528 }
      }
    }
  ];

  let activeRoom = null;
  let activeVerseIndex = 0;
  let activeAudioType = "bible";
  let isPlaying = false;
  let timerInterval = null;
  let timerSecondsLeft = 0;
  let isFullscreen = false;
  let audioContext = null;
  let synthGain = null;
  let osc1 = null;
  let osc2 = null;

  function initAudioEngine() {
    if (audioContext) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtx();
      synthGain = audioContext.createGain();
      synthGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      synthGain.connect(audioContext.destination);
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  function startAudioHarmonics(freq = 432) {
    if (activeAudioType === "silence") {
      stopAudioHarmonics();
      return;
    }
    initAudioEngine();
    if (!audioContext || !synthGain) return;
    if (audioContext.state === "suspended") audioContext.resume();

    stopAudioHarmonics();

    osc1 = audioContext.createOscillator();
    osc2 = audioContext.createOscillator();

    osc1.type = "sine";
    osc2.type = "triangle";

    osc1.frequency.setValueAtTime(freq, audioContext.currentTime);
    osc2.frequency.setValueAtTime(freq * 1.5, audioContext.currentTime);

    const vol = (Number(document.getElementById("bottom-volume-slider")?.value || 85) / 100) * 0.12;

    osc1.connect(synthGain);
    osc2.connect(synthGain);

    synthGain.gain.cancelScheduledValues(audioContext.currentTime);
    synthGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    synthGain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), audioContext.currentTime + 1.2);

    osc1.start();
    osc2.start();
  }

  function stopAudioHarmonics() {
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

  function renderLobby() {
    const featuredGrid = document.getElementById("grid-featured");
    const booksGrid = document.getElementById("grid-books");
    const themesGrid = document.getElementById("grid-themes");

    if (!featuredGrid || !booksGrid || !themesGrid) return;

    function cardHtml(room) {
      return '<div class="sanctuary-room-card" data-enter-room="' + room.id + '">' +
        '<div class="room-card-cover">' +
          '<img src="' + room.cover + '" alt="' + room.title + '" />' +
          '<span class="room-card-tag">' + room.categoryLabel + '</span>' +
          '<span class="room-enter-pill"><i data-lucide="door-open"></i> Enter Room</span>' +
        '</div>' +
        '<div class="room-card-body">' +
          '<h3>' + room.title + '</h3>' +
          '<p>' + room.subtitle + '</p>' +
          '<div class="room-card-footer">' +
            '<span><i data-lucide="' + room.icon + '"></i> ' + room.verses.length + ' Scriptures</span>' +
            '<span class="room-audio-count"><i data-lucide="music"></i> 4 Audio Streams</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    featuredGrid.innerHTML = roomsCatalog.filter(r => r.category === "featured").map(cardHtml).join("");
    booksGrid.innerHTML = roomsCatalog.filter(r => r.category === "bible-books").map(cardHtml).join("");
    themesGrid.innerHTML = roomsCatalog.filter(r => r.category === "themes").map(cardHtml).join("");

    const switchList = document.getElementById("room-switch-list");
    if (switchList) {
      switchList.innerHTML = roomsCatalog.map(r => {
        return '<button type="button" data-switch-room-id="' + r.id + '"><i data-lucide="' + r.icon + '"></i> ' + r.title + '</button>';
      }).join("");
    }

    window.lucide?.createIcons();
  }

  function enterRoom(roomId, autoStartAudio = false) {
    const room = roomsCatalog.find(r => r.id === roomId) || roomsCatalog[0];
    activeRoom = room;
    activeVerseIndex = 0;

    document.body.classList.add("in-meditation-room");
    document.getElementById("meditation-lobby").hidden = true;
    const roomView = document.getElementById("meditation-room-view");
    roomView.hidden = false;
    window.scrollTo({ top: 0, behavior: "instant" });

    document.getElementById("room-badge-title").textContent = room.title;
    const iconEl = document.getElementById("room-badge-icon");
    if (iconEl) iconEl.innerHTML = '<i data-lucide="' + room.icon + '"></i>';

    setAtmosphereTheme(room.theme || "chapel");
    renderRoomScripture();
    updateAudioDropdownLabels();

    if (autoStartAudio) {
      isPlaying = true;
      startAudioHarmonics(room.toneFreq || 432);
    } else {
      isPlaying = false;
      stopAudioHarmonics();
    }
    updatePlayState();

    window.lucide?.createIcons();
  }

  function exitToLobby() {
    isPlaying = false;
    stopAudioHarmonics();
    clearInterval(timerInterval);

    if (isFullscreen) toggleFullscreen(false);

    document.body.classList.remove("in-meditation-room");
    document.getElementById("meditation-room-view").hidden = true;
    document.getElementById("meditation-lobby").hidden = false;
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function renderRoomScripture() {
    if (!activeRoom || !activeRoom.verses.length) return;
    const v = activeRoom.verses[activeVerseIndex];
    document.getElementById("room-scripture-topic").textContent = v.topic;
    document.getElementById("room-scripture-text").textContent = v.text;
    document.getElementById("room-scripture-ref").textContent = v.ref;
  }

  function nextVerse() {
    if (!activeRoom || !activeRoom.verses.length) return;
    activeVerseIndex = (activeVerseIndex + 1) % activeRoom.verses.length;
    renderRoomScripture();
  }

  function selectInRoomAudio(type) {
    activeAudioType = type;
    updateAudioDropdownLabels();

    if (type === "silence") {
      isPlaying = false;
      stopAudioHarmonics();
      document.getElementById("bottom-track-title").textContent = "Silence / Ambience Only";
      document.getElementById("bottom-track-cat").textContent = "Ambient Atmosphere";
    } else {
      const track = activeRoom?.audioTracks?.[type] || { title: "Meditation Audio", cat: "Spiritual Audio", freq: 432 };
      document.getElementById("bottom-track-title").textContent = track.title;
      document.getElementById("bottom-track-cat").textContent = track.cat;
      isPlaying = true;
      startAudioHarmonics(track.freq || activeRoom?.toneFreq || 432);
    }

    updatePlayState();
  }

  function updateAudioDropdownLabels() {
    const track = activeRoom?.audioTracks?.[activeAudioType];
    const label = activeAudioType === "silence" ? "Silence / Ambience" : (track?.title || "Select Audio");
    document.getElementById("current-audio-label").textContent = label.length > 24 ? label.slice(0, 22) + "..." : label;

    document.querySelectorAll("#audio-select-menu button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.audioType === activeAudioType);
    });
  }

  function togglePlay() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      if (activeAudioType === "silence") activeAudioType = "bible";
      selectInRoomAudio(activeAudioType);
    } else {
      stopAudioHarmonics();
    }
    updatePlayState();
  }

  function updatePlayState() {
    const playIcon = document.getElementById("bottom-play-icon");
    const indicator = document.getElementById("audio-pulse-indicator");
    if (playIcon) playIcon.setAttribute("data-lucide", isPlaying ? "pause" : "play");
    if (indicator) indicator.classList.toggle("active", isPlaying);
    window.lucide?.createIcons();
  }

  function setAtmosphereTheme(theme) {
    const backdrop = document.getElementById("meditation-backdrop");
    if (!backdrop) return;
    backdrop.className = 'meditation-backdrop bg-' + theme;
    document.querySelectorAll("#theme-select-menu button").forEach(b => {
      b.classList.toggle("active", b.dataset.bgTheme === theme);
    });
  }

  function toggleFullscreen(force) {
    isFullscreen = typeof force === "boolean" ? force : !isFullscreen;
    const body = document.body;
    body.classList.toggle("is-fullscreen-sanctuary", isFullscreen);

    const icon = document.getElementById("fullscreen-icon");
    const text = document.getElementById("fullscreen-text");
    if (icon) icon.setAttribute("data-lucide", isFullscreen ? "minimize-2" : "maximize-2");
    if (text) text.textContent = isFullscreen ? "Exit Full" : "Full Screen";

    if (isFullscreen && !document.fullscreenElement) {
      try { document.documentElement.requestFullscreen?.(); } catch (e) {}
    } else if (!isFullscreen && document.fullscreenElement) {
      try { document.exitFullscreen?.(); } catch (e) {}
    }

    window.parent?.postMessage({
      type: "faithlink:fullscreen",
      fullscreen: isFullscreen
    }, window.location.origin);
    window.parent?.postMessage({
      type: "mwe-fullscreen",
      fullscreen: isFullscreen
    }, window.location.origin);

    window.lucide?.createIcons();
  }

  function setRoomTimer(minutes) {
    clearInterval(timerInterval);
    const label = document.getElementById("timer-label");
    if (minutes <= 0) {
      label.textContent = "Timer: Off";
      return;
    }
    timerSecondsLeft = minutes * 60;
    label.textContent = minutes + 'm';
    timerInterval = setInterval(() => {
      timerSecondsLeft--;
      if (timerSecondsLeft <= 0) {
        clearInterval(timerInterval);
        isPlaying = false;
        stopAudioHarmonics();
        updatePlayState();
        label.textContent = "Timer: Off";
      } else {
        const m = Math.floor(timerSecondsLeft / 60);
        const s = timerSecondsLeft % 60;
        label.textContent = m + ':' + (s < 10 ? '0' : '') + s;
      }
    }, 1000);
  }

  function closeAllDropdowns() {
    document.querySelectorAll(".room-dropdown-menu").forEach(m => m.hidden = true);
    document.querySelectorAll(".room-tab-trigger").forEach(t => t.classList.remove("active"));
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderLobby();

    const params = new URLSearchParams(window.location.search);
    const initialRoom = params.get("room");
    if (initialRoom) {
      enterRoom(initialRoom, false);
    } else {
      document.body.classList.remove("in-meditation-room");
      const lobby = document.getElementById("meditation-lobby");
      const roomView = document.getElementById("meditation-room-view");
      if (lobby) lobby.hidden = false;
      if (roomView) roomView.hidden = true;
    }

    document.getElementById("lobby-filter-tabs")?.addEventListener("click", e => {
      const btn = e.target.closest(".lobby-tab-btn");
      if (!btn) return;
      const filter = btn.dataset.lobbyFilter;
      document.querySelectorAll(".lobby-tab-btn").forEach(b => b.classList.toggle("active", b === btn));

      document.getElementById("sec-featured").hidden = (filter !== "all" && filter !== "featured");
      document.getElementById("sec-books").hidden = (filter !== "all" && filter !== "bible-books");
      document.getElementById("sec-themes").hidden = (filter !== "all" && filter !== "themes");
    });

    document.getElementById("meditation-lobby")?.addEventListener("click", e => {
      const card = e.target.closest("[data-enter-room]");
      if (!card) return;
      const roomId = card.dataset.enterRoom;
      enterRoom(roomId, false);
    });

    document.getElementById("room-exit-btn")?.addEventListener("click", exitToLobby);

    function setupDropdown(triggerId, menuId) {
      const trigger = document.getElementById(triggerId);
      const menu = document.getElementById(menuId);
      if (!trigger || !menu) return;

      trigger.addEventListener("click", e => {
        e.stopPropagation();
        const isCurrentlyOpen = !menu.hidden;
        closeAllDropdowns();
        if (!isCurrentlyOpen) {
          menu.hidden = false;
          trigger.classList.add("active");
        }
      });
    }

    setupDropdown("audio-select-trigger", "audio-select-menu");
    setupDropdown("room-switch-trigger", "room-switch-menu");
    setupDropdown("theme-select-trigger", "theme-select-menu");
    setupDropdown("ambient-trigger", "ambient-menu");
    setupDropdown("timer-trigger", "timer-menu");

    document.getElementById("audio-select-menu")?.addEventListener("click", e => {
      const btn = e.target.closest("[data-audio-type]");
      if (!btn) return;
      selectInRoomAudio(btn.dataset.audioType);
      closeAllDropdowns();
    });

    document.getElementById("room-switch-menu")?.addEventListener("click", e => {
      const btn = e.target.closest("[data-switch-room-id]");
      if (!btn) return;
      enterRoom(btn.dataset.switchRoomId, isPlaying);
      closeAllDropdowns();
    });

    document.getElementById("theme-select-menu")?.addEventListener("click", e => {
      const btn = e.target.closest("[data-bg-theme]");
      if (!btn) return;
      setAtmosphereTheme(btn.dataset.bgTheme);
      closeAllDropdowns();
    });

    document.getElementById("timer-menu")?.addEventListener("click", e => {
      const btn = e.target.closest("[data-room-timer]");
      if (!btn) return;
      const mins = Number(btn.dataset.roomTimer);
      setRoomTimer(mins);
      document.querySelectorAll("#timer-menu button").forEach(b => b.classList.toggle("active", b === btn));
      closeAllDropdowns();
    });

    document.getElementById("room-next-verse-btn")?.addEventListener("click", nextVerse);
    document.getElementById("room-fullscreen-btn")?.addEventListener("click", () => toggleFullscreen());
    document.getElementById("bottom-play-btn")?.addEventListener("click", togglePlay);

    document.addEventListener("click", e => {
      if (!e.target.closest(".room-dropdown-wrap")) {
        closeAllDropdowns();
      }
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && isFullscreen) {
        toggleFullscreen(false);
      } else if (e.key === "f" || e.key === "F") {
        if (!document.getElementById("meditation-room-view").hidden) {
          toggleFullscreen();
        }
      }
    });
  });
})();
