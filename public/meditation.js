(function initMeditationSanctuary() {

  const roomSeeds = [
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
      selectedAudio: "bible",
      ambience: { rain: 20, stream: 25, fire: 0, breeze: 10 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "Perfect Peace", text: "“Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.”", ref: "— John 14:27" },
        { topic: "Quiet Waters", text: "“The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.”", ref: "— Psalm 23:1-3" },
        { topic: "Steadfast Mind", text: "“You will keep in perfect peace those whose minds are steadfast, because they trust in you.”", ref: "— Isaiah 26:3" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Psalms of Peace", cat: "Dramatized Scripture", freq: 432 },
        instrumental: { title: "Still Waters Harp & Strings", cat: "Soaking Instrumental (432Hz)", freq: 432 },
        worship: { title: "Acoustic Peace in the Room", cat: "Christian Worship", freq: 432 },
        sermon: { title: "Resting in God's Unshakable Peace", cat: "Pastor Mark", freq: 432 },
        silence: { title: "Silence / Ambience Only", cat: "Ambient Atmosphere", freq: 432 }
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
      selectedAudio: "instrumental",
      ambience: { rain: 0, stream: 40, fire: 0, breeze: 15 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "Restoration", text: "“For I will restore health to you, and your wounds I will heal, declares the Lord.”", ref: "— Jeremiah 30:17" },
        { topic: "By His Stripes", text: "“He was pierced for our transgressions, crushed for our iniquities; the punishment that brought us peace was on him, and by his wounds we are healed.”", ref: "— Isaiah 53:5" },
        { topic: "Whole-Body Health", text: "“He himself bore our sins in his body on the cross, so that we might die to sins and live for righteousness; by his wounds you have been healed.”", ref: "— 1 Peter 2:24" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Healing Promises", cat: "Dramatized Scripture", freq: 528 },
        instrumental: { title: "Restoration Ambient Piano Pads", cat: "Soaking Instrumental (528Hz)", freq: 528 },
        worship: { title: "Healing Streams of Worship", cat: "Christian Worship", freq: 528 },
        sermon: { title: "Receiving Divine Healing Today", cat: "Amara Okafor", freq: 528 },
        silence: { title: "Silence / Ambience Only", cat: "Ambient Atmosphere", freq: 528 }
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
      selectedAudio: "worship",
      ambience: { rain: 0, stream: 0, fire: 30, breeze: 10 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "The Secret Place", text: "“Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. I will say of the Lord, ‘He is my refuge and my fortress, my God, in whom I trust.’”", ref: "— Psalm 91:1-2" },
        { topic: "Abiding in Christ", text: "“Remain in me, as I also remain in you. No branch can bear fruit by itself; it must remain in the vine. Neither can you bear fruit unless you remain in me.”", ref: "— John 15:4" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Psalm 91 Refuge", cat: "Dramatized Scripture", freq: 396 },
        instrumental: { title: "Secret Place Ambient Pads & Cello", cat: "Soaking Instrumental (396Hz)", freq: 396 },
        worship: { title: "Deep Intimacy Worship", cat: "Christian Worship", freq: 396 },
        sermon: { title: "The Power of the Secret Place", cat: "Pastor Mark", freq: 396 },
        silence: { title: "Silence / Ambience Only", cat: "Ambient Atmosphere", freq: 396 }
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
      selectedAudio: "bible",
      ambience: { rain: 15, stream: 0, fire: 0, breeze: 35 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "Rest in Safety", text: "“In peace I will lie down and sleep, for you alone, Lord, make me dwell in safety.”", ref: "— Psalm 4:8" },
        { topic: "The Keeper", text: "“He who watches over you will not slumber; indeed, he who watches over Israel will neither slumber nor sleep.”", ref: "— Psalm 121:3-4" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Nightfall Blessings", cat: "Dramatized Scripture", freq: 432 },
        instrumental: { title: "Starlight Lullaby Harp", cat: "Soaking Instrumental (432Hz)", freq: 432 },
        worship: { title: "Evening Prayer Melodies", cat: "Christian Worship", freq: 432 },
        sermon: { title: "A Father's Bedtime Prayer", cat: "Spoken Devotional", freq: 432 },
        silence: { title: "Silence / Ambience Only", cat: "Ambient Atmosphere", freq: 432 }
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
      selectedAudio: "bible",
      ambience: { rain: 0, stream: 30, fire: 0, breeze: 20 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "The Lord is My Strength", text: "“The Lord is my light and my salvation—whom shall I fear? The Lord is the stronghold of my life—of whom shall I be afraid?”", ref: "— Psalm 27:1" },
        { topic: "Praise & Majesty", text: "“I will exalt you, my God the King; I will praise your name for ever and ever. Every day I will praise you and extol your name for ever and ever.”", ref: "— Psalm 145:1-2" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Psalms 1 to 150 Highlights", cat: "Narrated Word", freq: 432 },
        instrumental: { title: "Davidic Harp & Strings", cat: "Soaking Instrumental", freq: 432 },
        worship: { title: "Psalms Set to Music", cat: "Worship Music", freq: 432 },
        sermon: { title: "Walking Through the Psalms", cat: "Dr. Peter Cole", freq: 432 },
        silence: { title: "Silence / Ambience Only", cat: "Ambient Atmosphere", freq: 432 }
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
      selectedAudio: "bible",
      ambience: { rain: 0, stream: 0, fire: 20, breeze: 10 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "Trust in the Lord", text: "“Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.”", ref: "— Proverbs 3:5-6" },
        { topic: "Guarding Your Heart", text: "“Above all else, guard your heart, for everything you do flows from it.”", ref: "— Proverbs 4:23" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Proverbs Chapters 1-31", cat: "Spoken Word", freq: 440 },
        instrumental: { title: "Wisdom Contemplation Piano", cat: "Soaking Instrumental", freq: 440 },
        worship: { title: "Hymns of Guidance", cat: "Worship Music", freq: 440 },
        sermon: { title: "Applying Biblical Wisdom Daily", cat: "Amara Okafor", freq: 440 },
        silence: { title: "Silence / Ambience Only", cat: "Ambient Atmosphere", freq: 432 }
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
      theme: "mountains",
      toneFreq: 528,
      selectedAudio: "bible",
      ambience: { rain: 0, stream: 20, fire: 0, breeze: 15 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "The Bread of Life", text: "“Jesus declared, ‘I am the bread of life. Whoever comes to me will never go hungry, and whoever believes in me will never be thirsty.’”", ref: "— John 6:35" },
        { topic: "The Good Shepherd", text: "“I am the good shepherd. The good shepherd lays down his life for the sheep.”", ref: "— John 10:11" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: The Words of Jesus in Red", cat: "Dramatized Word", freq: 528 },
        instrumental: { title: "Gospel Grace Acoustic Harmony", cat: "Soaking Instrumental", freq: 528 },
        worship: { title: "Worthy is the Lamb", cat: "Worship Music", freq: 528 },
        sermon: { title: "The Life & Ministry of Jesus", cat: "Pastor Mark", freq: 528 },
        silence: { title: "Silence / Ambience Only", cat: "Ambient Atmosphere", freq: 432 }
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
      selectedAudio: "bible",
      ambience: { rain: 10, stream: 0, fire: 15, breeze: 10 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "More than Conquerors", text: "“No, in all these things we are more than conquerors through him who loved us.”", ref: "— Romans 8:37" },
        { topic: "New Creation", text: "“Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!”", ref: "— 2 Corinthians 5:17" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Romans & Ephesians", cat: "Spoken Word", freq: 432 },
        instrumental: { title: "Grace Unmeasured Strings", cat: "Soaking Instrumental", freq: 432 },
        worship: { title: "Songs of Justification", cat: "Worship Music", freq: 432 },
        sermon: { title: "Living in the Power of the Holy Spirit", cat: "Dr. Peter Cole", freq: 432 },
        silence: { title: "Silence / Ambience Only", cat: "Ambient Atmosphere", freq: 432 }
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
      selectedAudio: "instrumental",
      ambience: { rain: 0, stream: 0, fire: 0, breeze: 35 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "The Nature of Faith", text: "“Now faith is confidence in what we hope for and assurance about what we do not see.”", ref: "— Hebrews 11:1" },
        { topic: "Mountain Moving Faith", text: "“Truly I tell you, if you have faith as small as a mustard seed, you can say to this mountain, ‘Move from here to there,’ and it will move. Nothing will be impossible for you.”", ref: "— Matthew 17:20" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Hebrews 11 Hall of Faith", cat: "Spoken Word", freq: 528 },
        instrumental: { title: "Unshakable Faith Piano", cat: "Soaking Instrumental", freq: 528 },
        worship: { title: "Overcomer Praise", cat: "Worship Music", freq: 528 },
        sermon: { title: "Unlocking Mountain-Moving Faith", cat: "Pastor Mark", freq: 528 },
        silence: { title: "Silence / Ambience Only", cat: "Ambient Atmosphere", freq: 432 }
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
      selectedAudio: "worship",
      ambience: { rain: 0, stream: 20, fire: 20, breeze: 0 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "Agape Love", text: "“Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking, it is not easily angered, it keeps no record of wrongs.”", ref: "— 1 Corinthians 13:4-5" },
        { topic: "God is Love", text: "“Dear friends, let us love one another, for love comes from God. Everyone who loves has been born of God and knows God. Whoever does not love does not know God, because God is love.”", ref: "— 1 John 4:7-8" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: 1 Corinthians 13 & 1 John 4", cat: "Spoken Word", freq: 639 },
        instrumental: { title: "Father's Love Soaking Strings", cat: "Soaking Instrumental (639Hz)", freq: 639 },
        worship: { title: "How Deep the Father's Love", cat: "Worship Music", freq: 639 },
        sermon: { title: "Resting in Unconditional Love", cat: "Amara Okafor", freq: 639 },
        silence: { title: "Silence / Ambience Only", cat: "Ambient Atmosphere", freq: 432 }
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
      selectedAudio: "bible",
      ambience: { rain: 15, stream: 0, fire: 15, breeze: 10 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "Saved by Grace", text: "“For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast.”", ref: "— Ephesians 2:8-9" },
        { topic: "Eternal Life", text: "“For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.”", ref: "— John 3:16" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Gospel of John Redemption", cat: "Spoken Word", freq: 432 },
        instrumental: { title: "At the Cross Acoustic Soaking", cat: "Soaking Instrumental", freq: 432 },
        worship: { title: "Grace Greater than Our Sin", cat: "Worship Music", freq: 432 },
        sermon: { title: "The Finished Work of Christ", cat: "Dr. Peter Cole", freq: 432 },
        silence: { title: "Silence / Ambience Only", cat: "Ambient Atmosphere", freq: 432 }
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
      selectedAudio: "worship",
      ambience: { rain: 0, stream: 0, fire: 0, breeze: 40 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "Armor of God", text: "“Finally, be strong in the Lord and in his mighty power. Put on the full armor of God, so that you can take your stand against the devil’s schemes.”", ref: "— Ephesians 6:10-11" },
        { topic: "Spirit of Power", text: "“For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.”", ref: "— 2 Timothy 1:7" }
      ],
      audioTracks: {
        bible: { title: "Audio Bible: Ephesians 6 & Romans 8", cat: "Spoken Word", freq: 528 },
        instrumental: { title: "Triumphant Ambient Pads", cat: "Soaking Instrumental", freq: 528 },
        worship: { title: "Surrounded (Fight My Battles)", cat: "Worship Music", freq: 528 },
        sermon: { title: "Standing Firm in Victory", cat: "Pastor Mark", freq: 528 },
        silence: { title: "Silence / Ambience Only", cat: "Ambient Atmosphere", freq: 432 }
      }
    }
  ];

  // One catalog for the sanctuary and owner workspace, using existing local-preview storage.
  const roomsKey = "mwe.meditation.rooms.v1";
  function enrichRoomWithMedia(room) {
    if (!room) return room;
    const title = room.title || "Sanctuary";
    if (!room.pictures || !room.pictures.length) {
      room.pictures = [
        {
          url: room.cover || "https://images.unsplash.com/photo-1548625361-195fe578ae14?auto=format&fit=crop&w=1200&q=80",
          title: title + " — Sacred Presence",
          caption: "“Be still, and know that I am God.” — Psalm 46:10",
          credit: "Sacred Sanctuary Visuals"
        },
        {
          url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
          title: "Still Waters & Living Streams",
          caption: "“He leads me beside quiet waters, he refreshes my soul.” — Psalm 23:2-3",
          credit: "Nature Sanctuary Photography"
        },
        {
          url: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80",
          title: "Heavenly Dawn Contemplation",
          caption: "“The steadfast love of the Lord never ceases; his mercies are new every morning.” — Lamentations 3:22-23",
          credit: "Sanctuary Visuals"
        }
      ];
    }
    if (!room.teachings || !room.teachings.length) {
      room.teachings = [
        {
          title: "Walking in the Reality of " + title,
          speaker: "Pastor Mark",
          duration: "10 min",
          summary: "Discover how to quiet mental chatter, yield your burdens to Christ, and dwell in uninterrupted spiritual communion.",
          ref: "— Devotional Teaching"
        },
        {
          title: "The Discipline of Sacred Stillness",
          speaker: "Dr. Peter Cole",
          duration: "14 min",
          summary: "In a world of noise, stillness is an act of spiritual defiance and deep trust in God's sovereignty over every storm.",
          ref: "— Expository Sermon"
        }
      ];
    }
    if (!room.prayers || !room.prayers.length) {
      room.prayers = [
        {
          title: "Prayer of Surrender & Peace",
          leader: "Amara Okafor",
          text: "“Father, I quiet my soul in Your holy presence. Every anxious thought and heavy burden I place at the foot of the Cross. Holy Spirit, breathe life and quiet confidence into my spirit. In Jesus’ name, Amen.”",
          ref: "— Guided Intercession"
        },
        {
          title: "Prayer for Spiritual Strength & Restoration",
          leader: "Pastor David",
          text: "“Lord God of heaven and earth, You are my refuge and high tower. Restore my inner strength today. Let Your peace rule in my heart and let Your joy be my strength. Amen.”",
          ref: "— Guided Contemplative Prayer"
        }
      ];
    }
    if (!room.worship || !room.worship.length) {
      room.worship = [
        {
          title: room.audioTracks?.instrumental?.title || "Soaking Strings & Ambient Harp",
          artist: "Davidic Soaking Harmonics",
          freq: room.toneFreq || 432,
          style: "Instrumental Soaking (" + (room.toneFreq || 432) + "Hz)"
        },
        {
          title: room.audioTracks?.worship?.title || "Intimate Praise Reflection",
          artist: "Grace Acoustic Collective",
          freq: room.toneFreq || 432,
          style: "Christian Acoustic Worship"
        }
      ];
    }
    if (!room.audioTracks) room.audioTracks = {};
    if (!room.audioTracks.prayer) {
      room.audioTracks.prayer = {
        title: "Guided Prayer: " + (room.prayers[0]?.title || "Surrender & Peace"),
        cat: "Contemplative Prayer (" + (room.toneFreq || 432) + "Hz)",
        freq: room.toneFreq || 432
      };
    }
    return room;
  }

  function getRooms() {
    const raw = localStorage.getItem(roomsKey);
    if (raw === null) return JSON.parse(JSON.stringify(roomSeeds)).map(enrichRoomWithMedia);
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) throw new Error("The meditation catalog could not be read.");
    return saved.map(enrichRoomWithMedia);
  }
  window.MWEMeditation = {
    getRooms,
    saveRooms: rooms => localStorage.setItem(roomsKey, JSON.stringify(rooms))
  };
  if (typeof document === "undefined" || !document.body || document.body.hasAttribute("data-admin-workspace")) return;
  const roomsCatalog = getRooms();
  const escape = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

  let activeRoom = null;
  let activeVerseIndex = 0;
  let activePictureIndex = 0;
  let activeTeachingIndex = 0;
  let activePrayerIndex = 0;
  let activeWorshipIndex = 0;
  let currentMediaType = "scriptures";
  let activeAudioType = "bible";
  let isPlaying = false;
  let isFullscreen = false;
  let audioContext = null;
  let synthGain = null;
  let osc1 = null;
  let osc2 = null;
  let currentSessionId = null;
  let roomChannel = null;
  let unreadChatCount = 0;
  const myUserId = "user_" + Math.random().toString(36).slice(2, 9);

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
    const communityGrid = document.getElementById("grid-community");

    if (!featuredGrid || !booksGrid || !themesGrid) return;

    function cardHtml(room) {
      const safe = { ...room, ...Object.fromEntries(["id", "cover", "title", "subtitle", "categoryLabel", "icon"].map(key => [key, escape(room[key])])) };
      const creatorName = escape(room.ownerName || "My Way");
      const audioName = ({ bible: "Audio Bible", instrumental: "Soaking Instrumental", worship: "Worship Stream", sermon: "Sermon", silence: "Silence / Ambient" })[room.selectedAudio] || "Curated Audio";
      return '<div class="sanctuary-room-card" data-enter-room="' + safe.id + '">' +
        '<div class="room-card-cover">' +
          '<img src="' + safe.cover + '" alt="' + safe.title + '" />' +
          '<span class="room-card-tag">' + safe.categoryLabel + '</span>' +
          '<span class="room-enter-pill"><i data-lucide="door-open"></i> Enter Room</span>' +
        '</div>' +
        '<div class="room-card-body">' +
          '<h3>' + safe.title + '</h3>' +
          '<p>' + safe.subtitle + '</p>' +
          '<div class="room-card-footer">' +
            '<span><i data-lucide="user"></i> ' + creatorName + '</span>' +
            '<span class="room-audio-count"><i data-lucide="music"></i> ' + escape(audioName) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    featuredGrid.innerHTML = roomsCatalog.filter(r => r.category === "featured").map(cardHtml).join("");
    booksGrid.innerHTML = roomsCatalog.filter(r => r.category === "bible-books").map(cardHtml).join("");
    themesGrid.innerHTML = roomsCatalog.filter(r => r.category === "themes").map(cardHtml).join("");
    if (communityGrid) {
      const custom = roomsCatalog.filter(r => r.category === "community" || (r.id && r.id.startsWith("room-custom-")));
      communityGrid.innerHTML = custom.length ? custom.map(cardHtml).join("") : '<p class="empty-hint">No custom community rooms created yet. Tap "Create Sanctuary Room" to start one!</p>';
    }

    window.lucide?.createIcons();
  }

  function applyThemeColors(color, hue) {
    const roomView = document.getElementById("meditation-room-view");
    if (!roomView) return;
    
    roomView.style.setProperty("--room-color", color);
    roomView.style.setProperty("--room-hue", hue);
    roomView.style.setProperty("--room-glow", `hsla(${hue}, 90%, 55%, 0.55)`);
    roomView.style.setProperty("--room-glow-soft", `hsla(${hue}, 90%, 55%, 0.2)`);
    
    const orb = document.getElementById("sacred-pulsing-orb");
    if (orb) {
      orb.style.background = `radial-gradient(circle at 35% 35%, #ffffff 0%, ${color} 55%, hsla(${hue}, 85%, 35%, 1) 100%)`;
      orb.style.boxShadow = `0 10px 40px hsla(${hue}, 85%, 50%, 0.45), 0 0 80px hsla(${hue}, 85%, 50%, 0.25)`;
    }
    
    const playBtn = document.getElementById("bottom-play-btn");
    if (playBtn) {
      playBtn.style.background = color;
      playBtn.style.boxShadow = `0 4px 16px hsla(${hue}, 85%, 50%, 0.45)`;
    }
  }

  function isCurrentHost() {
    if (!activeRoom) return false;
    const localOwner = localStorage.getItem("mwe.meditation.owner." + activeRoom.id);
    if (localOwner && activeRoom.ownerKey && localOwner === activeRoom.ownerKey) return true;
    if (activeRoom.isLocalHost === true) return true;
    const creatorAccount = window.MWECreator?.account?.();
    if (creatorAccount && activeRoom.createdBy && activeRoom.createdBy === creatorAccount.id) return true;
    if (sessionStorage.getItem("mwe.meditation.host." + activeRoom.id) === "true") return true;
    // Default seed rooms: platform owner or local test user can act as room creator
    if (!activeRoom.createdBy && localStorage.getItem("mwe.userLoggedIn") === "true") return true;
    return false;
  }

  function setAtmosphereTheme(theme) {
    const backdrop = document.getElementById("meditation-backdrop");
    if (!backdrop) return;
    backdrop.className = 'meditation-backdrop bg-' + theme;
  }

  function enterRoom(roomId, autoStartAudio = true, sessionId = null) {
    const room = roomsCatalog.find(r => r.id === roomId) || roomsCatalog[0];
    if (!room) return;
    enrichRoomWithMedia(room);
    activeRoom = room;
    activeVerseIndex = 0;
    activePictureIndex = 0;
    activeTeachingIndex = 0;
    activePrayerIndex = 0;
    activeWorshipIndex = 0;
    currentMediaType = "scriptures";
    currentSessionId = sessionId || new URLSearchParams(window.location.search).get("session") || Math.random().toString(36).slice(2, 9);

    document.body.classList.add("in-meditation-room");
    
    const lobby = document.getElementById("meditation-lobby");
    const roomView = document.getElementById("meditation-room-view");
    if (lobby) {
      lobby.hidden = true;
      lobby.style.display = "none";
    }
    if (roomView) {
      roomView.hidden = false;
      roomView.style.display = "flex";
    }

    window.scrollTo({ top: 0, behavior: "instant" });

    // Update Room Badge & Creator Attribution
    const titleEl = document.getElementById("room-badge-title");
    if (titleEl) titleEl.textContent = room.title;
    
    const iconEl = document.getElementById("room-badge-icon");
    if (iconEl) iconEl.innerHTML = '<i data-lucide="' + (room.icon || "sparkles") + '"></i>';

    const creatorTag = document.getElementById("room-creator-tag");
    if (creatorTag) {
      const descText = room.subtitle || "Abide in His sacred presence and peace.";
      creatorTag.textContent = descText;
    }

    const topDescText = document.getElementById("top-desc-text");
    if (topDescText) {
      topDescText.textContent = room.subtitle || "Abide in His sacred presence and peace.";
    }

    // Set Creator-Established Atmosphere & Backdrop
    setAtmosphereTheme(room.theme || "chapel");
    const themeInfo = ({"room-peace":{"color":"#3b82f6","hue":220},"room-healing":{"color":"#10b981","hue":160},"room-secret-place":{"color":"#8b5cf6","hue":265},"room-bedtime":{"color":"#6366f1","hue":240},"room-psalms":{"color":"#f59e0b","hue":38},"room-proverbs":{"color":"#d97706","hue":32},"room-gospels":{"color":"#ec4899","hue":330},"room-epistles":{"color":"#06b6d4","hue":190},"room-faith":{"color":"#0ea5e9","hue":200},"room-love":{"color":"#f43f5e","hue":350},"room-salvation":{"color":"#14b8a6","hue":175},"room-victory":{"color":"#f97316","hue":25}})[room.id] || { color: "#3b82f6", hue: 220 };
    applyThemeColors(themeInfo.color, themeInfo.hue);

    // Update Atmosphere Badge in Top Navigation
    const atmoMap = {
      chapel: { title: "Candlelit Chapel", icon: "flame" },
      mountains: { title: "Mountain Sunrise", icon: "sun" },
      stars: { title: "Starlit Midnight", icon: "moon" },
      stream: { title: "Living Waters", icon: "droplets" },
      deepdark: { title: "Deep Prayer", icon: "sparkles" }
    };
    const atmo = atmoMap[room.theme] || { title: "Candlelit Chapel", icon: "sun" };
    const atmoTitleEl = document.getElementById("room-atmosphere-title");
    const atmoIconEl = document.getElementById("room-atmosphere-icon");
    if (atmoTitleEl) atmoTitleEl.textContent = atmo.title;
    if (atmoIconEl) atmoIconEl.setAttribute("data-lucide", atmo.icon);

    // Lock in Creator-Established Audio Stream
    const chosenAudio = room.selectedAudio || "bible";
    selectInRoomAudio(chosenAudio);

    // Format and display Ambience Mix tag
    const ambTag = document.getElementById("bottom-ambience-tag");
    if (ambTag && room.ambience) {
      const parts = [];
      if (room.ambience.rain > 0) parts.push('Rain ' + room.ambience.rain + '%');
      if (room.ambience.stream > 0) parts.push('Stream ' + room.ambience.stream + '%');
      if (room.ambience.fire > 0) parts.push('Campfire ' + room.ambience.fire + '%');
      if (room.ambience.breeze > 0) parts.push('Breeze ' + room.ambience.breeze + '%');
      ambTag.innerHTML = '<i data-lucide="sliders"></i> Ambience: ' + (parts.length ? parts.join(' · ') : 'Natural Stillness');
    }

    // Dynamic background audio start & immediate frequency adaptation on room entry
    if (autoStartAudio) {
      isPlaying = true;
      startAudioHarmonics(room.toneFreq || 432);
      const unlockAudio = () => {
        if (audioContext && audioContext.state === "suspended") {
          audioContext.resume().then(() => {
            if (isPlaying && activeAudioType !== "silence") {
              startAudioHarmonics(activeRoom?.toneFreq || 432);
            }
          }).catch(() => {});
        }
      };
      document.addEventListener("click", unlockAudio, { once: true });
      document.addEventListener("touchstart", unlockAudio, { once: true });
    } else {
      isPlaying = false;
      stopAudioHarmonics();
    }
    updatePlayState();

    switchMediaType("scriptures");

    // Initialize Virtual Co-Meditation Session & Live Chat
    initVirtualRoomSession(room.id, currentSessionId);
    setupChatModerationUI();
    renderChatFeed();

    // Update browser URL without reload for direct sharing
    try {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("room", room.id);
      newUrl.searchParams.set("session", currentSessionId);
      window.history.replaceState({}, "", newUrl.toString());
    } catch (e) {}

    window.lucide?.createIcons();
  }

  function exitToLobby() {
    isPlaying = false;
    stopAudioHarmonics();

    if (isFullscreen) toggleFullscreen(false);
    if (roomChannel) {
      try {
        roomChannel.postMessage({ type: "presence_leave", userId: myUserId });
        roomChannel.close();
      } catch (e) {}
      roomChannel = null;
    }

    document.body.classList.remove("in-meditation-room");
    
    const lobby = document.getElementById("meditation-lobby");
    const roomView = document.getElementById("meditation-room-view");
    if (roomView) {
      roomView.hidden = true;
      roomView.style.display = "none";
    }
    if (lobby) {
      lobby.hidden = false;
      lobby.style.display = "block";
    }

    try {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("room");
      cleanUrl.searchParams.delete("session");
      window.history.replaceState({}, "", cleanUrl.toString());
    } catch (e) {}

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function renderRoomScripture() {
    if (!activeRoom || !activeRoom.verses || !activeRoom.verses.length) return;
    const v = activeRoom.verses[activeVerseIndex];
    const topicEl = document.getElementById("room-scripture-topic");
    const textEl = document.getElementById("room-scripture-text");
    const refEl = document.getElementById("room-scripture-ref");
    if (topicEl) topicEl.textContent = v.topic;
    if (textEl) textEl.textContent = v.text;
    if (refEl) refEl.textContent = v.ref;
  }

  function renderActiveMediaContent() {
    if (!activeRoom) return;
    enrichRoomWithMedia(activeRoom);

    const picDisplay = document.getElementById("room-picture-display");
    const picImg = document.getElementById("room-picture-img");
    const picCaption = document.getElementById("room-picture-caption");
    const topicEl = document.getElementById("room-scripture-topic");
    const textEl = document.getElementById("room-scripture-text");
    const refEl = document.getElementById("room-scripture-ref");
    const nextBtnText = document.getElementById("room-next-btn-text");

    if (currentMediaType === "pictures") {
      const pictures = activeRoom.pictures || [];
      const pic = pictures[activePictureIndex % Math.max(1, pictures.length)] || pictures[0];
      if (picDisplay) {
        picDisplay.hidden = false;
        picDisplay.style.display = "block";
      }
      if (picImg && pic) {
        picImg.src = pic.url;
        picImg.alt = pic.title || "Sacred Picture";
      }
      if (picCaption && pic) picCaption.textContent = pic.title + (pic.caption ? " · " + pic.caption : "");
      if (topicEl) topicEl.textContent = "SACRED VISUAL CONTEMPLATION";
      if (textEl && pic) textEl.textContent = pic.caption || "Be still, and behold His divine presence.";
      if (refEl && pic) refEl.textContent = pic.credit ? "— " + pic.credit : "— Sacred Visual";
      if (nextBtnText) nextBtnText.textContent = "Next Picture";
    } else if (currentMediaType === "prayers") {
      if (picDisplay) {
        picDisplay.hidden = true;
        picDisplay.style.display = "none";
      }
      const prayers = activeRoom.prayers || [];
      const prayer = prayers[activePrayerIndex % Math.max(1, prayers.length)] || prayers[0];
      if (topicEl) topicEl.textContent = (prayer?.title || "GUIDED PRAYER").toUpperCase();
      if (textEl && prayer) textEl.textContent = prayer.text;
      if (refEl && prayer) refEl.textContent = prayer.ref || ("— " + (prayer.leader || "Guided Prayer"));
      if (nextBtnText) nextBtnText.textContent = "Next Prayer";
    } else if (currentMediaType === "teachings") {
      if (picDisplay) {
        picDisplay.hidden = true;
        picDisplay.style.display = "none";
      }
      const teachings = activeRoom.teachings || [];
      const teaching = teachings[activeTeachingIndex % Math.max(1, teachings.length)] || teachings[0];
      if (topicEl) topicEl.textContent = (teaching?.title || "SPIRITUAL TEACHING").toUpperCase();
      if (textEl && teaching) textEl.textContent = "“" + teaching.summary + "”";
      if (refEl && teaching) refEl.textContent = teaching.speaker ? "— " + teaching.speaker + (teaching.duration ? " (" + teaching.duration + ")" : "") : (teaching?.ref || "— Pastoral Devotional");
      if (nextBtnText) nextBtnText.textContent = "Next Teaching";
    } else if (currentMediaType === "worship") {
      if (picDisplay) {
        picDisplay.hidden = true;
        picDisplay.style.display = "none";
      }
      const worshipList = activeRoom.worship || [];
      const item = worshipList[activeWorshipIndex % Math.max(1, worshipList.length)] || worshipList[0];
      if (topicEl) topicEl.textContent = "SOAKING WORSHIP & PRAISE";
      if (textEl && item) textEl.textContent = "“" + item.title + "” — " + (item.style || "Acoustic Worship") + ". Lift your heart in praise.";
      if (refEl && item) refEl.textContent = item.artist ? "— " + item.artist + (item.freq ? " (" + item.freq + "Hz)" : "") : "— Worship Collective";
      if (nextBtnText) nextBtnText.textContent = "Next Worship Track";
    } else {
      // scriptures
      if (picDisplay) {
        picDisplay.hidden = true;
        picDisplay.style.display = "none";
      }
      renderRoomScripture();
      if (nextBtnText) nextBtnText.textContent = "Next Scripture";
    }
  }

  function switchMediaType(type) {
    currentMediaType = type;
    document.querySelectorAll(".sanctuary-media-tab").forEach(tab => {
      const isActive = tab.dataset.mediaType === type;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    if (type === "scriptures") {
      selectInRoomAudio("bible");
    } else if (type === "prayers") {
      selectInRoomAudio("prayer");
    } else if (type === "teachings") {
      selectInRoomAudio("sermon");
    } else if (type === "worship") {
      selectInRoomAudio("worship");
    }

    renderActiveMediaContent();
    window.lucide?.createIcons();
  }

  function nextVerse() {
    if (!activeRoom) return;
    if (currentMediaType === "pictures") {
      const len = activeRoom.pictures?.length || 1;
      activePictureIndex = (activePictureIndex + 1) % len;
    } else if (currentMediaType === "prayers") {
      const len = activeRoom.prayers?.length || 1;
      activePrayerIndex = (activePrayerIndex + 1) % len;
    } else if (currentMediaType === "teachings") {
      const len = activeRoom.teachings?.length || 1;
      activeTeachingIndex = (activeTeachingIndex + 1) % len;
    } else if (currentMediaType === "worship") {
      const len = activeRoom.worship?.length || 1;
      activeWorshipIndex = (activeWorshipIndex + 1) % len;
    } else {
      const len = activeRoom.verses?.length || 1;
      activeVerseIndex = (activeVerseIndex + 1) % len;
    }
    renderActiveMediaContent();
  }

  function selectInRoomAudio(type) {
    activeAudioType = type;

    if (type === "silence") {
      isPlaying = false;
      stopAudioHarmonics();
      const titleEl = document.getElementById("bottom-track-title");
      const catEl = document.getElementById("bottom-track-cat");
      if (titleEl) titleEl.textContent = "Silence / Ambience Only";
      if (catEl) catEl.textContent = "Ambient Stillness";
    } else {
      const track = activeRoom?.audioTracks?.[type] || { title: "Meditation Audio", cat: "Spiritual Audio", freq: 432 };
      const titleEl = document.getElementById("bottom-track-title");
      const catEl = document.getElementById("bottom-track-cat");
      if (titleEl) titleEl.textContent = track.title;
      if (catEl) catEl.textContent = track.cat + (track.freq ? " (" + track.freq + "Hz)" : "");
      if (isPlaying) {
        startAudioHarmonics(track.freq || activeRoom?.toneFreq || 432);
      }
    }

    updatePlayState();
  }

  function togglePlay() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      if (activeAudioType === "silence") activeAudioType = activeRoom?.selectedAudio || "bible";
      selectInRoomAudio(activeAudioType);
      startAudioHarmonics(activeRoom?.toneFreq || 432);
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

  // --- VIRTUAL CO-MEDITATION & INVITE FRIEND FLOW ---
  const activeParticipants = new Set();

  function initVirtualRoomSession(roomId, sessionId) {
    activeParticipants.clear();
    activeParticipants.add(myUserId);
    updatePresenceDisplay();

    if (roomChannel) {
      try { roomChannel.close(); } catch (e) {}
    }

    try {
      roomChannel = new BroadcastChannel("mwe_meditation_" + roomId + "_" + sessionId);
      roomChannel.onmessage = handleChannelMessage;
      roomChannel.postMessage({ type: "presence_join", userId: myUserId });
    } catch (e) {
      console.warn("BroadcastChannel not available, running local session", e);
    }
  }

  function handleChannelMessage(event) {
    const data = event.data;
    if (!data) return;

    if (data.type === "presence_join") {
      activeParticipants.add(data.userId);
      updatePresenceDisplay();
      try {
        roomChannel?.postMessage({ type: "presence_reply", userId: myUserId });
      } catch (e) {}
    } else if (data.type === "presence_reply") {
      activeParticipants.add(data.userId);
      updatePresenceDisplay();
    } else if (data.type === "presence_leave") {
      activeParticipants.delete(data.userId);
      updatePresenceDisplay();
    } else if (data.type === "chat_toggle") {
      if (activeRoom) activeRoom.commentsEnabled = data.enabled;
      setupChatModerationUI();
      showToast(data.enabled ? "Live comments enabled by the host." : "Live comments deactivated by the host.");
    } else if (data.type === "chat_message") {
      appendChatMessage(data.message);
      const drawer = document.getElementById("meditation-chat-drawer");
      if (drawer && drawer.hidden) {
        unreadChatCount++;
        updateUnreadBadge();
      }
    }
  }

  function updatePresenceDisplay() {
    const presenceEl = document.getElementById("session-presence-text");
    if (!presenceEl) return;
    const count = Math.max(1, activeParticipants.size);
    if (count === 1) {
      presenceEl.innerHTML = '<i data-lucide="users"></i> 1 Meditating';
    } else {
      presenceEl.innerHTML = '<i data-lucide="users"></i> ' + count + ' Meditating Together';
    }
    window.lucide?.createIcons();
  }

  function openInviteFriendModal() {
    const modal = document.getElementById("modal-invite-friend");
    const shareInput = document.getElementById("invite-share-url");
    if (!modal || !shareInput || !activeRoom) return;

    const shareUrl = window.location.origin + window.location.pathname + "?room=" + encodeURIComponent(activeRoom.id) + "&session=" + encodeURIComponent(currentSessionId);
    shareInput.value = shareUrl;

    const shareTitle = activeRoom.title || "Meditation Sanctuary";
    const shareText = `Join me in this meditation sanctuary: "${shareTitle}" on My Way`;
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    // Direct Social Share URLs
    const waBtn = document.getElementById("share-whatsapp");
    if (waBtn) waBtn.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + shareUrl)}`;

    const tgBtn = document.getElementById("share-telegram");
    if (tgBtn) tgBtn.href = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;

    const smsBtn = document.getElementById("share-sms");
    if (smsBtn) smsBtn.href = `sms:?&body=${encodeURIComponent(shareText + " " + shareUrl)}`;

    const fbBtn = document.getElementById("share-facebook");
    if (fbBtn) fbBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

    const twBtn = document.getElementById("share-twitter");
    if (twBtn) twBtn.href = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;

    const mailBtn = document.getElementById("share-email");
    if (mailBtn) {
      const mailSubject = encodeURIComponent(`Join my meditation sanctuary: ${shareTitle}`);
      const mailBody = encodeURIComponent(`Hi,\n\nI would love for you to join me in this Christian meditation sanctuary: "${shareTitle}".\n\nClick here to join the room:\n${shareUrl}\n\nWe will meditate together with synchronized audio and scripture.`);
      mailBtn.href = `mailto:?subject=${mailSubject}&body=${mailBody}`;
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast("Invite link copied to clipboard!");
      }).catch(() => {});
    }

    modal.showModal?.();
    window.lucide?.createIcons();
  }

  // --- MINIMIZED LIVE CHAT & COMMENTS ---
  function setupChatModerationUI() {
    if (!activeRoom) return;
    const host = isCurrentHost();
    const commentsEnabled = !!activeRoom.commentsEnabled;

    const hostToggleWrapper = document.getElementById("host-toggle-wrapper");
    const chatEnableToggle = document.getElementById("chat-enable-toggle");
    const guestStatusBanner = document.getElementById("guest-status-banner");
    const chatInput = document.getElementById("chat-input");
    const chatSendBtn = document.getElementById("chat-send-btn");
    const chatStatusPill = document.getElementById("chat-status-pill");

    if (chatStatusPill) {
      chatStatusPill.textContent = commentsEnabled ? "Live Chat (Active)" : "Live Chat (Deactivated)";
    }

    if (host) {
      if (hostToggleWrapper) hostToggleWrapper.hidden = false;
      if (chatEnableToggle) chatEnableToggle.checked = commentsEnabled;
      if (guestStatusBanner) guestStatusBanner.hidden = true;
      if (chatInput) {
        chatInput.disabled = false;
        chatInput.placeholder = commentsEnabled ? "Share a reflection or prayer..." : "Write a comment (enables live chat for room)...";
      }
      if (chatSendBtn) chatSendBtn.disabled = false;
    } else {
      if (hostToggleWrapper) hostToggleWrapper.hidden = true;
      if (commentsEnabled) {
        if (guestStatusBanner) guestStatusBanner.hidden = true;
        if (chatInput) {
          chatInput.disabled = false;
          chatInput.placeholder = "Share a reflection or prayer...";
        }
        if (chatSendBtn) chatSendBtn.disabled = false;
      } else {
        if (guestStatusBanner) guestStatusBanner.hidden = false;
        if (chatInput) {
          chatInput.disabled = true;
          chatInput.placeholder = "Comments are currently disabled by host...";
        }
        if (chatSendBtn) chatSendBtn.disabled = true;
      }
    }
  }

  function toggleLiveComments(enabled) {
    if (!activeRoom) return;
    activeRoom.commentsEnabled = enabled;
    
    // Save state in catalog
    const idx = roomsCatalog.findIndex(r => r.id === activeRoom.id);
    if (idx >= 0) {
      roomsCatalog[idx].commentsEnabled = enabled;
      window.MWEMeditation?.saveRooms?.(roomsCatalog);
    }

    setupChatModerationUI();

    try {
      roomChannel?.postMessage({ type: "chat_toggle", enabled });
    } catch (e) {}

    showToast(enabled ? "Live comments enabled for all participants" : "Live comments deactivated for room");
  }

  function getRoomChatMessages(roomId) {
    try {
      const raw = localStorage.getItem("mwe.meditation.chat." + roomId);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveRoomChatMessage(roomId, message) {
    try {
      const messages = getRoomChatMessages(roomId);
      messages.push(message);
      localStorage.setItem("mwe.meditation.chat." + roomId, JSON.stringify(messages));
    } catch (e) {}
  }

  function renderChatFeed() {
    if (!activeRoom) return;
    const feed = document.getElementById("chat-messages-feed");
    if (!feed) return;

    const messages = getRoomChatMessages(activeRoom.id);
    if (!messages.length) {
      feed.innerHTML = '<div class="chat-empty-state"><i data-lucide="sparkles"></i><p>No comments yet. When enabled by the room creator, participants can share reflections here.</p></div>';
      window.lucide?.createIcons();
      return;
    }

    feed.innerHTML = messages.map(m => {
      const roleTag = m.isHost ? '<span class="chat-host-tag">Host</span>' : '';
      return '<div class="chat-message-item ' + (m.isHost ? 'is-host-msg' : '') + '">' +
        '<div class="chat-message-meta">' +
          '<strong class="chat-sender-name">' + escape(m.sender) + '</strong>' +
          roleTag +
          '<span class="chat-timestamp">' + escape(m.time || "Just now") + '</span>' +
        '</div>' +
        '<p class="chat-message-text">' + escape(m.text) + '</p>' +
      '</div>';
    }).join("");

    feed.scrollTop = feed.scrollHeight;
    window.lucide?.createIcons();
  }

  function appendChatMessage(message) {
    const feed = document.getElementById("chat-messages-feed");
    if (!feed) return;
    const emptyState = feed.querySelector(".chat-empty-state");
    if (emptyState) emptyState.remove();

    const roleTag = message.isHost ? '<span class="chat-host-tag">Host</span>' : '';
    const item = document.createElement("div");
    item.className = "chat-message-item " + (message.isHost ? "is-host-msg" : "");
    item.innerHTML = '<div class="chat-message-meta">' +
      '<strong class="chat-sender-name">' + escape(message.sender) + '</strong>' +
      roleTag +
      '<span class="chat-timestamp">' + escape(message.time || "Just now") + '</span>' +
    '</div>' +
    '<p class="chat-message-text">' + escape(message.text) + '</p>';
    feed.appendChild(item);
    feed.scrollTop = feed.scrollHeight;
  }

  function updateUnreadBadge() {
    const badge = document.getElementById("chat-unread-badge");
    if (!badge) return;
    if (unreadChatCount > 0) {
      badge.hidden = false;
      badge.textContent = unreadChatCount;
    } else {
      badge.hidden = true;
      badge.textContent = "0";
    }
  }

  function toggleChatDrawer(open) {
    const drawer = document.getElementById("meditation-chat-drawer");
    const toggleBtn = document.getElementById("chat-toggle-btn");
    if (!drawer) return;

    const willOpen = typeof open === "boolean" ? open : drawer.hidden;
    drawer.hidden = !willOpen;
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", String(willOpen));

    if (willOpen) {
      unreadChatCount = 0;
      updateUnreadBadge();
      const feed = document.getElementById("chat-messages-feed");
      if (feed) feed.scrollTop = feed.scrollHeight;
      document.getElementById("chat-input")?.focus();
    }
    window.lucide?.createIcons();
  }

  function sendComment(text) {
    if (!activeRoom || !text.trim()) return;
    const host = isCurrentHost();

    // If host writes a comment while comments are disabled, automatically enable them
    if (host && !activeRoom.commentsEnabled) {
      toggleLiveComments(true);
    }

    const senderName = host ? (activeRoom.ownerName || "Host Creator") : (window.MWECreator?.account?.()?.name || "Fellow Meditator");
    const message = {
      id: "msg_" + Date.now(),
      sender: senderName,
      isHost: host,
      text: text.trim(),
      time: "Just now",
      timestamp: Date.now()
    };

    saveRoomChatMessage(activeRoom.id, message);
    appendChatMessage(message);

    try {
      roomChannel?.postMessage({ type: "chat_message", message });
    } catch (e) {}
  }

  function showToast(message) {
    const toast = document.querySelector(".toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 3200);
  }

  // --- INITIALIZATION ---
  document.addEventListener("DOMContentLoaded", () => {
    renderLobby();

    const params = new URLSearchParams(window.location.search);
    const initialRoom = params.get("room");
    const initialSession = params.get("session");
    if (initialRoom) {
      enterRoom(initialRoom, true, initialSession);
    } else {
      document.body.classList.remove("in-meditation-room");
      const lobby = document.getElementById("meditation-lobby");
      const roomView = document.getElementById("meditation-room-view");
      if (lobby) lobby.hidden = false;
      if (roomView) roomView.hidden = true;
    }

    // Lobby Filter Tabs
    document.getElementById("lobby-filter-tabs")?.addEventListener("click", e => {
      const btn = e.target.closest(".lobby-tab-btn");
      if (!btn) return;
      const filter = btn.dataset.lobbyFilter;
      document.querySelectorAll(".lobby-tab-btn").forEach(b => b.classList.toggle("active", b === btn));

      const secFeatured = document.getElementById("sec-featured");
      const secBooks = document.getElementById("sec-books");
      const secThemes = document.getElementById("sec-themes");
      const secCommunity = document.getElementById("sec-community");

      if (secFeatured) secFeatured.hidden = (filter !== "all" && filter !== "featured");
      if (secBooks) secBooks.hidden = (filter !== "all" && filter !== "bible-books");
      if (secThemes) secThemes.hidden = (filter !== "all" && filter !== "themes");
      if (secCommunity) secCommunity.hidden = (filter !== "all" && filter !== "community");
    });

    // Lobby Search
    document.getElementById("meditation-search")?.addEventListener("input", e => {
      const query = e.target.value.trim().toLowerCase();
      document.querySelectorAll(".sanctuary-room-card").forEach(card => {
        card.hidden = !!query && !card.textContent.toLowerCase().includes(query);
      });
      document.querySelectorAll(".lobby-section").forEach(section => {
        if (query) section.hidden = !section.querySelector(".sanctuary-room-card:not([hidden])");
      });
    });

    // Room Card Click & Navigation
    document.addEventListener("click", e => {
      const card = e.target.closest("[data-enter-room]");
      if (card) {
        e.preventDefault();
        const roomId = card.dataset.enterRoom;
        if (roomId) enterRoom(roomId, true);
        return;
      }

      const exitBtn = e.target.closest("#room-exit-btn, .room-exit-btn");
      if (exitBtn) {
        e.preventDefault();
        exitToLobby();
        return;
      }
    });

    // Sanctuary Media Type Tabs
    document.getElementById("sanctuary-media-tabs")?.addEventListener("click", e => {
      const tab = e.target.closest(".sanctuary-media-tab");
      if (!tab || !tab.dataset.mediaType) return;
      switchMediaType(tab.dataset.mediaType);
    });

    // Core In-Room Controls
    document.getElementById("room-next-verse-btn")?.addEventListener("click", nextVerse);
    document.getElementById("room-fullscreen-btn")?.addEventListener("click", () => toggleFullscreen());
    document.getElementById("bottom-play-btn")?.addEventListener("click", togglePlay);

    // Invite Friend Modal Triggers
    document.getElementById("room-invite-btn")?.addEventListener("click", openInviteFriendModal);
    document.getElementById("btn-close-invite")?.addEventListener("click", () => {
      document.getElementById("modal-invite-friend")?.close?.();
    });
    document.getElementById("btn-copy-invite-url")?.addEventListener("click", () => {
      const urlInput = document.getElementById("invite-share-url");
      const btnText = document.getElementById("copy-btn-text");
      const btnIcon = document.getElementById("copy-btn-icon");
      if (urlInput && navigator.clipboard) {
        navigator.clipboard.writeText(urlInput.value).then(() => {
          showToast("Invite link copied to clipboard!");
          if (btnText) btnText.textContent = "Copied!";
          if (btnIcon) btnIcon.setAttribute("data-lucide", "check");
          window.lucide?.createIcons();
          setTimeout(() => {
            if (btnText) btnText.textContent = "Copy Link";
            if (btnIcon) btnIcon.setAttribute("data-lucide", "copy");
            window.lucide?.createIcons();
          }, 2500);
        }).catch(() => {});
      }
    });

    // Minimized Live Chat Toggle
    document.getElementById("chat-toggle-btn")?.addEventListener("click", () => toggleChatDrawer());
    document.getElementById("chat-close-btn")?.addEventListener("click", () => toggleChatDrawer(false));
    document.getElementById("chat-enable-toggle")?.addEventListener("change", e => {
      toggleLiveComments(e.target.checked);
    });

    // Chat Message Submit
    document.getElementById("chat-input-form")?.addEventListener("submit", e => {
      e.preventDefault();
      const input = document.getElementById("chat-input");
      if (!input || !input.value.trim()) return;
      sendComment(input.value);
      input.value = "";
    });

    // Create Virtual Sanctuary Room Dialog
    const createModal = document.getElementById("modal-create-room");
    document.getElementById("btn-open-create-room")?.addEventListener("click", () => {
      createModal?.showModal?.();
      window.lucide?.createIcons();
    });
    document.getElementById("btn-close-create-room")?.addEventListener("click", () => createModal?.close?.());
    document.getElementById("btn-cancel-create-room")?.addEventListener("click", () => createModal?.close?.());

    document.getElementById("form-create-sanctuary")?.addEventListener("submit", e => {
      e.preventDefault();
      const title = document.getElementById("new-room-title")?.value.trim();
      const category = document.getElementById("new-room-category")?.value || "featured";
      const subtitle = document.getElementById("new-room-subtitle")?.value.trim();
      const theme = document.getElementById("new-room-theme")?.value || "chapel";
      const audio = document.getElementById("new-room-audio")?.value || "bible";
      const rain = Number(document.getElementById("new-amb-rain")?.value || 0);
      const stream = Number(document.getElementById("new-amb-stream")?.value || 0);
      const fire = Number(document.getElementById("new-amb-fire")?.value || 0);
      const breeze = Number(document.getElementById("new-amb-breeze")?.value || 0);
      const topic = document.getElementById("new-scripture-topic")?.value.trim() || "DIVINE PEACE";
      const ref = document.getElementById("new-scripture-ref")?.value.trim() || "— Scripture";
      const text = document.getElementById("new-scripture-text")?.value.trim() || "Peace I leave with you.";
      const comments = !!document.getElementById("new-room-comments")?.checked;

      if (!title || !subtitle || !text) return;

      const newId = "room-custom-" + Date.now();
      const ownerKey = "host_" + Math.random().toString(36).slice(2, 10);
      const creatorName = window.MWECreator?.account?.()?.name || "Host Creator";

      const coverByTheme = {
        chapel: "https://images.unsplash.com/photo-1548625361-195fe578ae14?auto=format&fit=crop&w=800&q=80",
        mountains: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=700&q=80",
        stars: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80",
        stream: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
        deepdark: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80"
      };

      const newRoom = {
        id: newId,
        title,
        subtitle,
        category,
        categoryLabel: category === "bible-books" ? "📖 Bible Book" : (category === "themes" ? "🕊️ Biblical Theme" : "⭐ Favorite Room"),
        icon: "sparkles",
        cover: coverByTheme[theme] || coverByTheme.chapel,
        theme,
        toneFreq: 432,
        selectedAudio: audio,
        ambience: { rain, stream, fire, breeze },
        commentsEnabled: comments,
        ownerName: creatorName,
        ownerKey,
        isLocalHost: true,
        verses: [{ topic, text, ref }],
        audioTracks: {
          bible: { title: "Audio Bible: " + title, cat: "Dramatized Scripture", freq: 432 },
          instrumental: { title: "Soaking Sanctuary Pads", cat: "Instrumental (432Hz)", freq: 432 },
          worship: { title: "Christian Worship Reflection", cat: "Worship Music", freq: 432 },
          sermon: { title: "Sermons & Preaching", cat: "Spiritual Word", freq: 432 },
          silence: { title: "Silence / Ambience Only", cat: "Ambient Atmosphere", freq: 432 }
        }
      };

      // Save ownerKey locally
      try {
        localStorage.setItem("mwe.meditation.owner." + newId, ownerKey);
        sessionStorage.setItem("mwe.meditation.host." + newId, "true");
      } catch (e) {}

      roomsCatalog.unshift(newRoom);
      window.MWEMeditation?.saveRooms?.(roomsCatalog);
      renderLobby();

      createModal?.close?.();
      showToast("Sanctuary room created! You are the host.");
      enterRoom(newId, true);
    });

    // Keyboard Shortcuts
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        if (isFullscreen) toggleFullscreen(false);
        const chatDrawer = document.getElementById("meditation-chat-drawer");
        if (chatDrawer && !chatDrawer.hidden) toggleChatDrawer(false);
      } else if (e.key === "f" || e.key === "F") {
        if (!document.getElementById("meditation-room-view")?.hidden && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          toggleFullscreen();
        }
      }
    });
  });
})();
