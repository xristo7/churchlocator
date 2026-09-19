(async function initMeditationSanctuary() {

  const roomSeeds = [
    // 1. Favorite & Featured
    {
      id: "room-peace",
      title: "Be Still & Abide in Peace",
      subtitle: "Calm your soul and release all anxiety into His hands.",
      category: "featured",
      categoryLabel: "⭐ Favorite Room",
      icon: "heart",
      cover: "https://images.unsplash.com/photo-1548625361-195fe578ae14?auto=format&fit=crop&w=800&q=80",
      theme: "chapel",
      template: "timer", // Template 1: Be Still (Circular Countdown Timer)
      purpose: "prayer",
      timeMode: "timed",
      durationMinutes: 20,
      toneFreq: 432,
      themeColor: "#4a5d3f",
      themeHue: 100,
      mode: "light",
      allowUserNavigation: true,
      autoPlayInterval: 300,
      selectedAudio: "bible",
      ambience: { rain: 20, stream: 25, fire: 0, breeze: 10 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "Be Still", text: "“The Lord is in His holy temple; let all the earth keep silence before Him.”", ref: "— Habakkuk 2:20" },
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
      title: "Jesus, Give Me Peace",
      subtitle: "Breath prayer and promises for physical and spiritual restoration.",
      category: "featured",
      categoryLabel: "⭐ Favorite Room",
      icon: "sparkles",
      cover: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
      theme: "stream",
      template: "ripple", // Template 2: Breath Prayer (Concentric Ripples)
      purpose: "prayer",
      timeMode: "timed",
      durationMinutes: 7,
      inhaleWord: "Jesus",
      exhaleWord: "Give Me Peace",
      toneFreq: 528,
      themeColor: "#2a8f89",
      themeHue: 175,
      mode: "light",
      allowUserNavigation: true,
      autoPlayInterval: 180,
      selectedAudio: "instrumental",
      ambience: { rain: 0, stream: 40, fire: 0, breeze: 15 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "Give Me Peace", text: "“Peace I leave with you; My peace I give you.”", ref: "— John 14:27" },
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
      title: "Teach Me to Pray (Guided Journey)",
      subtitle: "Abiding in the shadow of the Almighty through step-by-step prayer.",
      category: "featured",
      categoryLabel: "⭐ Favorite Room",
      icon: "shield",
      cover: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80",
      theme: "chapel",
      template: "journey", // Template 3: Guided Prayer Journey (Milestones)
      purpose: "prayer",
      timeMode: "timed",
      durationMinutes: 16,
      journeySteps: [
        { name: "Praise", prompt: "What attribute of God fills your heart with gratitude today?", verse: "“Enter his gates with thanksgiving and his courts with praise.”", ref: "— Psalm 100:4" },
        { name: "Surrender", prompt: "What are you ready to place in God’s hands?", verse: "“Your will be done.”", ref: "— Matthew 6:10" },
        { name: "Ask", prompt: "Speak your honest petitions and prayers before His throne of grace.", verse: "“Ask and it will be given to you; seek and you will find.”", ref: "— Matthew 7:7" },
        { name: "Listen", prompt: "Be still in quiet rest and listen to what the Holy Spirit whispers.", verse: "“My sheep listen to my voice; I know them, and they follow me.”", ref: "— John 10:27" }
      ],
      toneFreq: 396,
      themeColor: "#b86b5c",
      themeHue: 15,
      mode: "light",
      allowUserNavigation: true,
      autoPlayInterval: 240,
      selectedAudio: "worship",
      ambience: { rain: 0, stream: 0, fire: 30, breeze: 10 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "The Secret Place", text: "“Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. I will say of the Lord, ‘He is my refuge and my fortress, my God, in whom I trust.’”", ref: "— Psalm 91:1-2" },
        { topic: "Surrender", text: "“Your will be done.”", ref: "— Matthew 6:10" },
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
      title: "Walk With God (Psalms of Peace)",
      subtitle: "150 Sacred Songs of Solace, Deliverance, Praise & Nature.",
      category: "bible-books",
      categoryLabel: "📖 Bible Book",
      icon: "book-open",
      cover: "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=700&q=80",
      theme: "mountains",
      template: "nature", // Template 4: Walk With God (Guided Nature & Audio Teaching)
      purpose: "teaching",
      timeMode: "teaching",
      durationMinutes: 12,
      toneFreq: 432,
      themeColor: "#5b7052",
      themeHue: 110,
      mode: "light",
      allowUserNavigation: true,
      autoPlayInterval: 300,
      selectedAudio: "sermon",
      ambience: { rain: 0, stream: 30, fire: 0, breeze: 20 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "Quiet Waters", text: "“He leads me beside quiet waters.”", ref: "— Psalm 23:2" },
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
      title: "Joy Comes in the Morning",
      subtitle: "Radiant joy, morning light, and rejoicing in His everlasting strength.",
      category: "themes",
      categoryLabel: "🕊️ Biblical Theme",
      icon: "sun",
      cover: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=700&q=80",
      theme: "mountains",
      template: "sunburst", // Template 5: Joy & Praise (Sunburst Art)
      purpose: "motivational",
      timeMode: "timed",
      durationMinutes: 9,
      toneFreq: 528,
      themeColor: "#d97706",
      themeHue: 38,
      mode: "light",
      allowUserNavigation: true,
      autoPlayInterval: 180,
      selectedAudio: "worship",
      ambience: { rain: 0, stream: 0, fire: 0, breeze: 40 },
      commentsEnabled: false,
      ownerName: "My Way",
      verses: [
        { topic: "Joy of the Lord", text: "“The joy of the Lord is your strength.”", ref: "— Nehemiah 8:10" },
        { topic: "Joy in the Morning", text: "“Weeping may stay for the night, but rejoicing comes in the morning.”", ref: "— Psalm 30:5" },
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
    if (!room.template) {
      if (room.id === "room-peace") room.template = "timer";
      else if (room.id === "room-healing") room.template = "ripple";
      else if (room.id === "room-secret-place") room.template = "journey";
      else if (room.id === "room-psalms") room.template = "nature";
      else if (room.id === "room-victory") room.template = "sunburst";
      else room.template = "timer";
    }
    if (!room.timeMode) {
      room.timeMode = room.template === "nature" ? "teaching" : "timed";
    }
    if (!room.durationMinutes) {
      room.durationMinutes = room.id === "room-healing" ? 7 : (room.id === "room-secret-place" ? 16 : (room.id === "room-psalms" ? 12 : (room.id === "room-victory" ? 9 : 20)));
    }
    if (typeof room.allowUserNavigation === "undefined") {
      room.allowUserNavigation = true;
    }
    if (typeof room.autoPlayInterval === "undefined") {
      room.autoPlayInterval = 300;
    }
    if (!room.mode) {
      room.mode = "light";
    }
    if (!room.themeColor) {
      const colorMap = {
        "room-peace": "#4a5d3f",
        "room-healing": "#2a8f89",
        "room-secret-place": "#b86b5c",
        "room-psalms": "#5b7052",
        "room-victory": "#d97706"
      };
      room.themeColor = colorMap[room.id] || "#4a5d3f";
      room.themeHue = ({"room-peace":100,"room-healing":175,"room-secret-place":15,"room-psalms":110,"room-victory":38})[room.id] || 100;
    }
    if (!room.journeySteps || !room.journeySteps.length) {
      room.journeySteps = [
        { name: "Praise", prompt: "What attribute of God fills your heart with gratitude today?", verse: "“Enter his gates with thanksgiving and his courts with praise.”", ref: "— Psalm 100:4" },
        { name: "Surrender", prompt: "What are you ready to place in God’s hands?", verse: "“Your will be done.”", ref: "— Matthew 6:10" },
        { name: "Ask", prompt: "Speak your honest petitions and prayers before His throne of grace.", verse: "“Ask and it will be given to you; seek and you will find.”", ref: "— Matthew 7:7" },
        { name: "Listen", prompt: "Be still in quiet rest and listen to what the Holy Spirit whispers.", verse: "“My sheep listen to my voice; I know them, and they follow me.”", ref: "— John 10:27" }
      ];
    }
    if (!room.inhaleWord) room.inhaleWord = "Jesus";
    if (!room.exhaleWord) room.exhaleWord = "Give Me Peace";
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
  await window.MWEPlatform?.ready;
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
  const roomChat = { messages: [], seen: new Set(), revision: 0, canManage: false, loading: false, error: "", pollTimer: null };

  // New Sanctuary Multi-Mode Timer & Template States
  let sessionTotalSeconds = 20 * 60;
  let sessionRemainingSeconds = 20 * 60;
  let sessionElapsedSeconds = 0;
  let timerTicker = null;
  let intervalBellEnabled = true;
  let lastBellMinute = -1;
  let breathingInterval = null;
  let scriptureAutoPlayTimer = null;
  let currentJourneyStepIndex = 1;

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

  function playIntervalBell(freq = 528) {
    initAudioEngine();
    if (!audioContext) return;
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});

    try {
      const now = audioContext.currentTime;
      const bellGain = audioContext.createGain();
      bellGain.connect(audioContext.destination);

      // Tibetan singing bowl harmonic frequencies
      const oscPrimary = audioContext.createOscillator();
      const oscOvertone = audioContext.createOscillator();

      oscPrimary.type = "sine";
      oscPrimary.frequency.setValueAtTime(freq, now);

      oscOvertone.type = "sine";
      oscOvertone.frequency.setValueAtTime(freq * 2.76, now);

      const bellVol = (Number(document.getElementById("bottom-volume-slider")?.value || 85) / 100) * 0.28;

      bellGain.gain.setValueAtTime(0.0001, now);
      bellGain.gain.exponentialRampToValueAtTime(bellVol, now + 0.05);
      bellGain.gain.exponentialRampToValueAtTime(0.00001, now + 3.2);

      oscPrimary.connect(bellGain);
      oscOvertone.connect(bellGain);

      oscPrimary.start(now);
      oscOvertone.start(now);

      oscPrimary.stop(now + 3.3);
      oscOvertone.stop(now + 3.3);
    } catch (e) {
      console.warn("Could not play interval bell", e);
    }
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
      communityGrid.innerHTML = custom.length ? custom.map(cardHtml).join("") : '<p class="empty-hint">No custom community rooms created yet. Select "Create Room" to start one!</p>';
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

  function applyRoomMode(mode = "light") {
    document.documentElement.setAttribute("data-theme", mode);
    const themeIcon = document.getElementById("theme-toggle-icon");
    if (themeIcon) {
      themeIcon.setAttribute("data-lucide", mode === "dark" ? "moon" : "sun");
      window.lucide?.createIcons();
    }
  }

  function formatTimeDigits(totalSec) {
    if (totalSec === Infinity || isNaN(totalSec)) return "∞";
    const m = Math.floor(Math.max(0, totalSec) / 60);
    const s = Math.floor(Math.max(0, totalSec) % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  function initTimerController(room) {
    stopTimerTicker();
    const mode = room.timeMode || "timed";
    const minutes = Number(room.durationMinutes) || 20;

    if (mode === "loop") {
      sessionTotalSeconds = Infinity;
      sessionRemainingSeconds = 0;
      sessionElapsedSeconds = 0;
    } else {
      sessionTotalSeconds = minutes * 60;
      sessionRemainingSeconds = sessionTotalSeconds;
      sessionElapsedSeconds = 0;
    }
    lastBellMinute = -1;

    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const isLoop = activeRoom?.timeMode === "loop";
    const digitsEl = document.getElementById("timer-countdown-digits");
    const labelEl = document.getElementById("timer-countdown-label");
    const ring = document.getElementById("timer-progress-ring");
    const currentTimeEl = document.getElementById("player-time-current");
    const totalTimeEl = document.getElementById("player-time-total");
    const fillBar = document.getElementById("player-scrubber-fill");

    if (isLoop) {
      if (digitsEl) digitsEl.textContent = formatTimeDigits(sessionElapsedSeconds);
      if (labelEl) labelEl.textContent = "CONTINUOUS MEDITATION";
      if (currentTimeEl) currentTimeEl.textContent = formatTimeDigits(sessionElapsedSeconds);
      if (totalTimeEl) totalTimeEl.textContent = "∞ Loop";
      if (ring) ring.style.strokeDashoffset = "0";
      if (fillBar) fillBar.style.width = "100%";
    } else {
      if (digitsEl) digitsEl.textContent = formatTimeDigits(sessionRemainingSeconds);
      if (labelEl) labelEl.textContent = "TIME REMAINING";
      if (currentTimeEl) currentTimeEl.textContent = formatTimeDigits(sessionElapsedSeconds);
      if (totalTimeEl) totalTimeEl.textContent = formatTimeDigits(sessionTotalSeconds);

      const progress = sessionTotalSeconds > 0 ? (sessionRemainingSeconds / sessionTotalSeconds) : 0;
      const circumference = 691.15; // 2 * PI * 110
      const offset = circumference * (1 - progress);
      if (ring) {
        ring.style.strokeDasharray = `${circumference}`;
        ring.style.strokeDashoffset = `${offset}`;
      }

      if (fillBar) {
        const pct = sessionTotalSeconds > 0 ? (sessionElapsedSeconds / sessionTotalSeconds) * 100 : 0;
        fillBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
      }
    }

    const timeCurrentFormatted = formatTimeDigits(sessionElapsedSeconds);
    const timeTotalFormatted = isLoop ? "∞ Loop" : formatTimeDigits(sessionTotalSeconds);
    const clampedPct = isLoop ? 100 : (sessionTotalSeconds > 0 ? Math.min(100, Math.max(0, (sessionElapsedSeconds / sessionTotalSeconds) * 100)) : 0);

    // Template 2 (Ripple)
    const rippleCurrent = document.getElementById("ripple-time-current");
    const rippleTotal = document.getElementById("ripple-time-total");
    const rippleFill = document.getElementById("ripple-scrubber-fill");
    if (rippleCurrent) rippleCurrent.textContent = timeCurrentFormatted;
    if (rippleTotal) rippleTotal.textContent = timeTotalFormatted;
    if (rippleFill) rippleFill.style.width = clampedPct + "%";

    // Template 3 (Journey)
    const journeyCurrent = document.getElementById("journey-time-current");
    const journeyTotal = document.getElementById("journey-time-total");
    const journeyFill = document.getElementById("journey-scrubber-fill");
    if (journeyCurrent) journeyCurrent.textContent = timeCurrentFormatted;
    if (journeyTotal) journeyTotal.textContent = timeTotalFormatted;
    if (journeyFill) journeyFill.style.width = clampedPct + "%";

    // Template 4 (Nature)
    const natureCurrent = document.getElementById("nature-time-current");
    const natureTotal = document.getElementById("nature-time-total");
    const natureFill = document.getElementById("nature-scrubber-fill");
    if (natureCurrent) natureCurrent.textContent = timeCurrentFormatted;
    if (natureTotal) natureTotal.textContent = timeTotalFormatted;
    if (natureFill) natureFill.style.width = clampedPct + "%";

    // Template 5 (Sunburst)
    const sunburstCurrent = document.getElementById("sunburst-time-current");
    const sunburstTotal = document.getElementById("sunburst-time-total");
    const sunburstFill = document.getElementById("sunburst-scrubber-fill");
    if (sunburstCurrent) sunburstCurrent.textContent = timeCurrentFormatted;
    if (sunburstTotal) sunburstTotal.textContent = timeTotalFormatted;
    if (sunburstFill) sunburstFill.style.width = clampedPct + "%";

    const primaryLabel = document.getElementById("timer-primary-label");
    const primaryIcon = document.getElementById("timer-primary-icon");
    if (primaryLabel) primaryLabel.textContent = isPlaying ? "Pause" : "Resume";
    if (primaryIcon) primaryIcon.setAttribute("data-lucide", isPlaying ? "pause" : "play");
    window.lucide?.createIcons();
  }

  function startTimerTicker() {
    stopTimerTicker();
    timerTicker = setInterval(() => {
      if (!isPlaying || !activeRoom) return;

      const isLoop = activeRoom.timeMode === "loop";
      if (isLoop) {
        sessionElapsedSeconds++;
      } else {
        sessionElapsedSeconds++;
        sessionRemainingSeconds = Math.max(0, sessionRemainingSeconds - 1);

        // Interval Bell Chime every 5 minutes if enabled
        const elapsedMin = Math.floor(sessionElapsedSeconds / 60);
        if (intervalBellEnabled && elapsedMin > 0 && elapsedMin % 5 === 0 && elapsedMin !== lastBellMinute) {
          lastBellMinute = elapsedMin;
          playIntervalBell(528);
        }

        // Session completed
        if (sessionRemainingSeconds <= 0) {
          stopTimerTicker();
          isPlaying = false;
          stopAudioHarmonics();
          updatePlayState();
          playIntervalBell(528);
          showToast("Meditation session complete. Well done!");
        }
      }

      updateTimerDisplay();
    }, 1000);
  }

  function stopTimerTicker() {
    if (timerTicker) {
      clearInterval(timerTicker);
      timerTicker = null;
    }
  }

  function startBreathingGuide(inhaleWord = "Jesus", exhaleWord = "Give Me Peace") {
    if (breathingInterval) {
      clearInterval(breathingInterval);
      breathingInterval = null;
    }
    let isInhale = true;
    const cueEl = document.getElementById("ripple-cue-text");
    const wordEl = document.getElementById("ripple-focus-word");
    const orbGuide = document.getElementById("sacred-breath-guide");

    function updateCycle() {
      if (isInhale) {
        if (cueEl) cueEl.textContent = "BREATHE IN:";
        if (wordEl) wordEl.textContent = inhaleWord;
        if (orbGuide) orbGuide.textContent = "Inhale " + inhaleWord + "...";
      } else {
        if (cueEl) cueEl.textContent = "EXHALE:";
        if (wordEl) wordEl.textContent = exhaleWord;
        if (orbGuide) orbGuide.textContent = "Exhale: " + exhaleWord;
      }
      isInhale = !isInhale;
    }

    updateCycle();
    breathingInterval = setInterval(updateCycle, 4000);
  }

  function setJourneyStep(stepIndex) {
    if (!activeRoom || !activeRoom.journeySteps || !activeRoom.journeySteps.length) return;
    const steps = activeRoom.journeySteps;
    currentJourneyStepIndex = Math.max(0, Math.min(steps.length - 1, stepIndex));
    const currentStep = steps[currentJourneyStepIndex];

    const nodes = document.querySelectorAll(".journey-node");
    nodes.forEach((node, idx) => {
      node.classList.toggle("completed", idx < currentJourneyStepIndex);
      node.classList.toggle("active", idx === currentJourneyStepIndex);
      const circle = node.querySelector(".node-circle");
      if (circle) {
        if (idx < currentJourneyStepIndex) {
          circle.innerHTML = '<i data-lucide="check"></i>';
        } else if (idx === currentJourneyStepIndex) {
          circle.innerHTML = '<span class="node-pulse"></span>';
        } else {
          circle.innerHTML = '';
        }
      }
    });

    const trackFill = document.getElementById("journey-track-fill");
    if (trackFill) {
      const pct = steps.length > 1 ? (currentJourneyStepIndex / (steps.length - 1)) * 100 : 0;
      trackFill.style.width = pct + "%";
    }

    const promptEl = document.getElementById("journey-question-prompt");
    const quoteEl = document.getElementById("journey-quote-text");
    const refEl = document.getElementById("journey-quote-ref");

    if (promptEl && currentStep) promptEl.textContent = currentStep.prompt;
    if (quoteEl && currentStep) quoteEl.textContent = currentStep.verse;
    if (refEl && currentStep) refEl.textContent = currentStep.ref;

    window.lucide?.createIcons();
  }

  function applyRoomTemplate(room) {
    const template = room.template || "timer";
    const stageViews = {
      timer: document.getElementById("stage-template-timer"),
      ripple: document.getElementById("stage-template-ripple"),
      journey: document.getElementById("stage-template-journey"),
      nature: document.getElementById("stage-template-nature"),
      sunburst: document.getElementById("stage-template-sunburst")
    };

    Object.entries(stageViews).forEach(([key, el]) => {
      if (!el) return;
      if (key === template) {
        el.hidden = false;
        el.style.display = "flex";
      } else {
        el.hidden = true;
        el.style.display = "none";
      }
    });

    const purposeLabel = ({
      prayer: "Contemplative Prayer",
      scriptural: "Scriptural Contemplation",
      motivational: "Motivational & Encouraging",
      teaching: "Audio Teaching & Sermon",
      worship: "Christian Worship",
      nature: "Nature Reflection"
    })[room.purpose] || "Sanctuary";

    const durationLabel = room.timeMode === "loop" ? "Endless Loop" : (room.durationMinutes ? `${room.durationMinutes} min` : "20 min");

    if (template === "timer") {
      const titleEl = document.getElementById("timer-title-display");
      const subEl = document.getElementById("timer-subtitle-display");
      if (titleEl) titleEl.textContent = room.title;
      if (subEl) subEl.textContent = `${purposeLabel} • ${durationLabel}`;
    } else if (template === "ripple") {
      const titleEl = document.getElementById("ripple-title-display");
      const subEl = document.getElementById("ripple-subtitle-display");
      if (titleEl) titleEl.textContent = room.title;
      if (subEl) subEl.textContent = `Breath Prayer • ${durationLabel}`;
      startBreathingGuide(room.inhaleWord || "Jesus", room.exhaleWord || "Give Me Peace");
    } else if (template === "journey") {
      const titleEl = document.getElementById("journey-title-display");
      const subEl = document.getElementById("journey-subtitle-display");
      if (titleEl) titleEl.textContent = room.title;
      if (subEl) subEl.textContent = `Guided Prayer Journey • ${durationLabel}`;
      setJourneyStep(currentJourneyStepIndex);
    } else if (template === "nature") {
      const titleEl = document.getElementById("nature-title-display");
      const subEl = document.getElementById("nature-subtitle-display");
      if (titleEl) titleEl.textContent = room.title;
      if (subEl) subEl.textContent = `Guided Nature Meditation • ${durationLabel}`;
    } else if (template === "sunburst") {
      const titleEl = document.getElementById("sunburst-title-display");
      const subEl = document.getElementById("sunburst-subtitle-display");
      if (titleEl) titleEl.textContent = room.title;
      if (subEl) subEl.textContent = `Joy Meditation • ${durationLabel}`;
    }

    const backdrop = document.getElementById("meditation-backdrop");
    if (backdrop) {
      // The template controls layout; the creator's atmosphere controls imagery.
      // Keeping these concerns separate prevents every room of a template from
      // being forced onto the same generic background.
      const allowedAtmospheres = new Set(["chapel", "mountains", "stars", "stream", "deepdark"]);
      const atmosphere = allowedAtmospheres.has(room.theme) ? room.theme : "chapel";
      const isCreatorRoom = String(room.id || "").startsWith("room-custom-");
      backdrop.className = isCreatorRoom
        ? "meditation-backdrop bg-" + atmosphere
        : "meditation-backdrop bg-room-" + template;
    }

    const firstVerse = room.verses?.[0] || { text: "The Lord is in His holy temple; let all the earth keep silence before Him.", ref: "— HABAKKUK 2:20" };
    const timerQuote = document.getElementById("timer-quote-text");
    const timerRef = document.getElementById("timer-quote-ref");
    if (timerQuote) timerQuote.textContent = firstVerse.text;
    if (timerRef) timerRef.textContent = firstVerse.ref;

    const rippleQuote = document.getElementById("ripple-quote-text");
    const rippleRef = document.getElementById("ripple-quote-ref");
    if (rippleQuote) rippleQuote.textContent = firstVerse.text;
    if (rippleRef) rippleRef.textContent = firstVerse.ref;

    const natureQuote = document.getElementById("nature-quote-text");
    const natureRef = document.getElementById("nature-quote-ref");
    if (natureQuote) natureQuote.textContent = firstVerse.text;
    if (natureRef) natureRef.textContent = firstVerse.ref;

    const sunburstQuote = document.getElementById("sunburst-quote-text");
    const sunburstRef = document.getElementById("sunburst-quote-ref");
    if (sunburstQuote) sunburstQuote.textContent = firstVerse.text;
    if (sunburstRef) sunburstRef.textContent = firstVerse.ref;

    const reflectionBtnText = document.getElementById("reflection-btn-text");
    if (reflectionBtnText) {
      reflectionBtnText.textContent = template === "sunburst" ? "Record a Praise / Reflection" : "Write a Reflection Note";
    }
  }

  function initScriptureCarousel(room) {
    if (scriptureAutoPlayTimer) {
      clearInterval(scriptureAutoPlayTimer);
      scriptureAutoPlayTimer = null;
    }

    updateScriptureCarouselNav();

    const intervalSec = Number(room.autoPlayInterval) || 0;
    const autoBadge = document.getElementById("scripture-autoplay-indicator");
    const autoText = document.getElementById("scripture-autoplay-text");

    if (intervalSec > 0 && room.verses && room.verses.length > 1) {
      if (autoBadge) autoBadge.hidden = false;
      if (autoText) autoText.textContent = intervalSec >= 60 ? `Auto (${intervalSec / 60}m)` : `Auto (${intervalSec}s)`;
      
      scriptureAutoPlayTimer = setInterval(() => {
        if (isPlaying && activeRoom && activeRoom.verses && activeRoom.verses.length > 1) {
          nextVerse();
        }
      }, intervalSec * 1000);
    } else {
      if (autoBadge) autoBadge.hidden = true;
    }
  }

  function updateScriptureCarouselNav() {
    if (!activeRoom) return;
    const total = activeRoom.verses?.length || 1;
    const counterEl = document.getElementById("scripture-counter-pill");
    if (counterEl) {
      counterEl.textContent = `${activeVerseIndex + 1} / ${total}`;
    }

    const canNav = activeRoom.allowUserNavigation !== false || isCurrentHost();
    const prevBtn = document.getElementById("scripture-prev-btn");
    const nextBtn = document.getElementById("room-next-verse-btn");

    if (prevBtn) {
      prevBtn.disabled = !canNav;
      prevBtn.style.opacity = canNav ? "1" : "0.5";
      prevBtn.style.pointerEvents = canNav ? "auto" : "none";
    }
    if (nextBtn) {
      nextBtn.disabled = !canNav;
      nextBtn.style.opacity = canNav ? "1" : "0.5";
      nextBtn.style.pointerEvents = canNav ? "auto" : "none";
    }
  }

  function prevScripture() {
    if (!activeRoom) return;
    const len = activeRoom.verses?.length || 1;
    activeVerseIndex = (activeVerseIndex - 1 + len) % len;
    renderActiveMediaContent();
  }

  function isCurrentHost() {
    return !!activeRoom && !!window.MWEPlatform?.canManage('meditation',activeRoom.id);
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

    const ownerEl = document.getElementById("room-badge-owner");
    if (ownerEl) {
      const owner = room.ownerName || room.creator || "My Way";
      ownerEl.textContent = "By " + owner;
    }
    
    const iconEl = document.getElementById("room-badge-icon");
    if (iconEl) iconEl.innerHTML = '<i data-lucide="' + escape(room.icon || "sparkles") + '"></i>';

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

    if (room.themeColor) {
      applyThemeColors(room.themeColor, (typeof room.themeHue !== "undefined") ? room.themeHue : themeInfo.hue);
    }
    const platformMode = document.documentElement.getAttribute("data-theme") || localStorage.getItem("theme") || localStorage.getItem("mwe.theme") || (room.mode || "light");
    applyRoomMode(platformMode);
    applyRoomTemplate(room);
    initTimerController(room);
    initScriptureCarousel(room);

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
      startTimerTicker();
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
      stopTimerTicker();
    }
    updatePlayState();

    switchMediaType("scriptures");

    // Initialize Virtual Co-Meditation Session & Live Chat
    initVirtualRoomSession(room.id, currentSessionId);
    setupChatModerationUI();
    renderChatFeed();
    startRoomChat(room.id);

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
    stopTimerTicker();
    if (breathingInterval) { clearInterval(breathingInterval); breathingInterval = null; }
    if (scriptureAutoPlayTimer) { clearInterval(scriptureAutoPlayTimer); scriptureAutoPlayTimer = null; }
    stopRoomChat();

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
    const v = activeRoom.verses[activeVerseIndex % activeRoom.verses.length];
    const topicEl = document.getElementById("room-scripture-topic");
    const textEl = document.getElementById("room-scripture-text");
    const refEl = document.getElementById("room-scripture-ref");
    if (topicEl) topicEl.textContent = v.topic || "SACRED SCRIPTURE";
    if (textEl) textEl.textContent = v.text;
    if (refEl) refEl.textContent = v.ref;

    // Sync active template quotes
    const timerQuote = document.getElementById("timer-quote-text");
    const timerRef = document.getElementById("timer-quote-ref");
    if (timerQuote) timerQuote.textContent = v.text;
    if (timerRef) timerRef.textContent = v.ref;

    const rippleQuote = document.getElementById("ripple-quote-text");
    const rippleRef = document.getElementById("ripple-quote-ref");
    if (rippleQuote) rippleQuote.textContent = v.text;
    if (rippleRef) rippleRef.textContent = v.ref;

    const natureQuote = document.getElementById("nature-quote-text");
    const natureRef = document.getElementById("nature-quote-ref");
    if (natureQuote) natureQuote.textContent = v.text;
    if (natureRef) natureRef.textContent = v.ref;

    const sunburstQuote = document.getElementById("sunburst-quote-text");
    const sunburstRef = document.getElementById("sunburst-quote-ref");
    if (sunburstQuote) sunburstQuote.textContent = v.text;
    if (sunburstRef) sunburstRef.textContent = v.ref;

    updateScriptureCarouselNav();
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
      startTimerTicker();
    } else {
      stopAudioHarmonics();
      stopTimerTicker();
    }
    updatePlayState();
    updateTimerDisplay();
  }

  function updatePlayState() {
    const playIcon = document.getElementById("bottom-play-icon");
    const indicator = document.getElementById("audio-pulse-indicator");
    if (playIcon) playIcon.setAttribute("data-lucide", isPlaying ? "pause" : "play");
    if (indicator) indicator.classList.toggle("active", isPlaying);

    const primaryLabel = document.getElementById("timer-primary-label");
    const primaryIcon = document.getElementById("timer-primary-icon");
    if (primaryLabel) primaryLabel.textContent = isPlaying ? "Pause" : "Resume";
    if (primaryIcon) primaryIcon.setAttribute("data-lucide", isPlaying ? "pause" : "play");

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

  async function meditationChatRequest(roomId, body, method = body ? "POST" : "GET") {
    if (!window.MWEPlatform?.api) throw new Error("Meditation chat is unavailable.");
    return window.MWEPlatform.api("meditation-chat/" + encodeURIComponent(roomId), body, method);
  }

  function stopRoomChat() {
    if (roomChat.pollTimer) window.clearInterval(roomChat.pollTimer);
    roomChat.pollTimer = null;
    roomChat.loading = false;
  }

  async function loadRoomChatMessages(roomId, initial = false) {
    if (!activeRoom || activeRoom.id !== roomId || roomChat.loading || (!initial && document.hidden)) return;
    roomChat.loading = true;
    try {
      const result = await meditationChatRequest(roomId);
      if (!activeRoom || activeRoom.id !== roomId) return;
      const previousCount = roomChat.messages.length;
      roomChat.messages = result.messages || [];
      roomChat.seen = new Set(roomChat.messages.map(message => message.id));
      roomChat.revision = result.revision;
      roomChat.canManage = result.canManage;
      roomChat.error = "";
      activeRoom.commentsEnabled = result.enabled;
      setupChatModerationUI();
      renderChatFeed();
      const drawer = document.getElementById("meditation-chat-drawer");
      if (!initial && drawer?.hidden && roomChat.messages.length > previousCount) {
        unreadChatCount += roomChat.messages.length - previousCount;
        updateUnreadBadge();
      }
    } catch (error) {
      roomChat.error = error.message || "Meditation chat is unavailable.";
      renderChatFeed();
    } finally {
      roomChat.loading = false;
    }
  }

  function startRoomChat(roomId) {
    stopRoomChat();
    roomChat.messages = [];
    roomChat.seen = new Set();
    roomChat.revision = 0;
    roomChat.canManage = false;
    roomChat.error = "";
    renderChatFeed();
    loadRoomChatMessages(roomId, true);
    roomChat.pollTimer = window.setInterval(() => loadRoomChatMessages(roomId), 3000);
  }

  async function toggleLiveComments(enabled) {
    if (!activeRoom || !isCurrentHost()) return false;
    try {
      const result = await meditationChatRequest(activeRoom.id, { enabled, revision: roomChat.revision }, "PUT");
      activeRoom.commentsEnabled = result.enabled;
      roomChat.revision = result.revision;
      setupChatModerationUI();
      showToast(enabled ? "Live comments enabled for all participants" : "Live comments deactivated for room");
      return true;
    } catch (error) {
      const toggle = document.getElementById("chat-enable-toggle");
      if (toggle) toggle.checked = !!activeRoom.commentsEnabled;
      showToast(error.message || "Comment settings could not be changed.");
      return false;
    }
  }

  function renderChatFeed() {
    if (!activeRoom) return;
    const feed = document.getElementById("chat-messages-feed");
    if (!feed) return;

    const messages = roomChat.messages;
    if (!messages.length) {
      const copy = roomChat.error || (roomChat.loading ? "Loading live comments…" : "No comments yet. When enabled by the room creator, participants can share reflections here.");
      feed.innerHTML = '<div class="chat-empty-state"><i data-lucide="sparkles"></i><p>' + escape(copy) + '</p></div>';
      window.lucide?.createIcons();
      return;
    }

    feed.innerHTML = messages.map(m => {
      const roleTag = m.isHost ? '<span class="chat-host-tag">Host</span>' : '';
      return '<div class="chat-message-item ' + (m.isHost ? 'is-host-msg' : '') + '">' +
        '<div class="chat-message-meta">' +
          '<strong class="chat-sender-name">' + escape(m.name || m.sender || "Meditator") + '</strong>' +
          roleTag +
          '<span class="chat-timestamp">' + escape(m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Just now") + '</span>' +
        '</div>' +
        '<p class="chat-message-text">' + escape(m.body) + '</p>' +
      '</div>';
    }).join("");

    feed.scrollTop = feed.scrollHeight;
    window.lucide?.createIcons();
  }

  function appendChatMessage(message) {
    if (!message?.id || roomChat.seen.has(message.id)) return;
    roomChat.seen.add(message.id);
    roomChat.messages.push(message);
    const feed = document.getElementById("chat-messages-feed");
    if (!feed) return;
    const emptyState = feed.querySelector(".chat-empty-state");
    if (emptyState) emptyState.remove();

    const roleTag = message.isHost ? '<span class="chat-host-tag">Host</span>' : '';
    const item = document.createElement("div");
    item.className = "chat-message-item " + (message.isHost ? "is-host-msg" : "");
    item.innerHTML = '<div class="chat-message-meta">' +
      '<strong class="chat-sender-name">' + escape(message.name || message.sender || "Meditator") + '</strong>' +
      roleTag +
      '<span class="chat-timestamp">' + escape(message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Just now") + '</span>' +
    '</div>' +
    '<p class="chat-message-text">' + escape(message.body) + '</p>';
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

  async function sendComment(text) {
    if (!activeRoom || !text.trim()) return false;
    if (!window.MWEPlatform?.session) {
      window.MWE?.openMemberLogin?.(location.href);
      showToast("Sign in to join this room’s conversation.");
      return false;
    }
    const host = isCurrentHost();

    // If host writes a comment while comments are disabled, automatically enable them
    if (host && !activeRoom.commentsEnabled) {
      if (!await toggleLiveComments(true)) return false;
    }
    try {
      const result = await meditationChatRequest(activeRoom.id, { body: text.trim() });
      appendChatMessage(result.message);
      return true;
    } catch (error) {
      showToast(error.message || "Your comment could not be sent.");
      return false;
    }
  }

  function showToast(message) {
    const toast = document.querySelector(".toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 3200);
  }

  function setupAmbienceDropdown() {
    const btn = document.getElementById("btn-ambience-dropdown");
    const menu = document.getElementById("ambience-dropdown-menu");
    if (!btn || !menu) return;

    btn.addEventListener("click", e => {
      e.stopPropagation();
      const isHidden = menu.hidden;
      menu.hidden = !isHidden;
      btn.setAttribute("aria-expanded", String(isHidden));
    });

    menu.addEventListener("click", e => {
      const opt = e.target.closest(".ambience-option-btn");
      if (!opt) return;
      const type = opt.dataset.ambience;
      menu.querySelectorAll(".ambience-option-btn").forEach(b => b.classList.toggle("active", b === opt));
      menu.hidden = true;
      btn.setAttribute("aria-expanded", "false");

      const labelPreview = document.getElementById("ambience-label-preview");
      const iconPreview = document.getElementById("ambience-icon-preview");
      const iconMap = {
        forest: "trees",
        stream: "waves",
        rain: "cloud-rain",
        fire: "flame",
        breeze: "wind"
      };
      if (labelPreview) labelPreview.textContent = opt.textContent.trim();
      if (iconPreview) iconPreview.setAttribute("data-lucide", iconMap[type] || "trees");

      if (activeRoom) {
        if (!activeRoom.ambience) activeRoom.ambience = { rain: 0, stream: 0, fire: 0, breeze: 0 };
        if (type === "rain") { activeRoom.ambience.rain = 40; activeRoom.ambience.stream = 0; }
        else if (type === "stream") { activeRoom.ambience.stream = 40; activeRoom.ambience.rain = 0; }
        else if (type === "fire") { activeRoom.ambience.fire = 35; activeRoom.ambience.stream = 0; }
        else if (type === "breeze") { activeRoom.ambience.breeze = 35; activeRoom.ambience.rain = 0; }
        else { activeRoom.ambience.breeze = 20; activeRoom.ambience.stream = 20; }
      }

      showToast("Ambience soundscape set to " + opt.textContent.trim());
      window.lucide?.createIcons();
    });

    document.addEventListener("click", () => {
      if (!menu.hidden) {
        menu.hidden = true;
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  function setupReflectionModal() {
    const modal = document.getElementById("modal-reflection-note");
    const openBtn = document.getElementById("btn-open-reflection");
    const closeBtn = document.getElementById("btn-close-reflection");
    const saveBtn = document.getElementById("btn-save-reflection");
    const copyBtn = document.getElementById("btn-copy-reflection");
    const noteText = document.getElementById("reflection-note-text");
    const listEl = document.getElementById("reflection-entries-list");
    const modalTitle = document.getElementById("reflection-modal-title");

    function renderReflectionList() {
      if (!activeRoom || !listEl) return;
      const key = "mwe.meditation.reflections." + activeRoom.id;
      let notes = [];
      try {
        const raw = localStorage.getItem(key);
        if (raw) notes = JSON.parse(raw);
      } catch (e) {}

      if (!notes.length) {
        listEl.innerHTML = '<p class="empty-hint">No reflection notes written yet for this sanctuary session.</p>';
        return;
      }

      listEl.innerHTML = notes.map(n => 
        '<div class="reflection-entry-card">' +
          '<div class="reflection-card-meta">' +
            '<span class="reflection-meta-date">' + escape(n.date || "Today") + '</span>' +
            '<span class="reflection-meta-badge">' + escape(n.template || "Sanctuary") + '</span>' +
          '</div>' +
          '<p class="reflection-card-body serif-font">' + escape(n.text) + '</p>' +
        '</div>'
      ).join("");
    }

    const openBtns = [
      document.getElementById("btn-open-reflection"),
      document.getElementById("btn-ripple-reflection"),
      document.getElementById("btn-journey-reflection"),
      document.getElementById("btn-nature-reflection"),
      document.getElementById("btn-sunburst-reflection")
    ];

    openBtns.forEach(btn => {
      if (!btn) return;
      btn.addEventListener("click", () => {
        if (!activeRoom) return;
        const isJoy = activeRoom.template === "sunburst";
        if (modalTitle) modalTitle.textContent = isJoy ? "Record a Praise / Reflection" : "Write a Reflection Note";
        if (noteText) noteText.placeholder = isJoy ? "What praise or grateful prayer fills your heart?" : "What scripture, prayer, or revelation is speaking to you right now?";
        renderReflectionList();
        modal?.showModal?.();
        window.lucide?.createIcons();
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", () => modal?.close?.());

    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        if (!activeRoom || !noteText || !noteText.value.trim()) return;
        const key = "mwe.meditation.reflections." + activeRoom.id;
        let notes = [];
        try {
          const raw = localStorage.getItem(key);
          if (raw) notes = JSON.parse(raw);
        } catch (e) {}

        notes.unshift({
          text: noteText.value.trim(),
          date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ", " + new Date().toLocaleDateString(),
          template: activeRoom.template || "timer"
        });

        try { await window.MWEPrivate.create("reflection", {...notes[0], entityId:activeRoom.id}); } catch(error) { showToast(error.message); return; }
        noteText.value = "";
        renderReflectionList();
        showToast("Reflection note saved to your sanctuary log!");
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        if (!noteText || !noteText.value.trim()) {
          showToast("Please write a note to copy.");
          return;
        }
        if (navigator.clipboard) {
          navigator.clipboard.writeText(noteText.value).then(() => {
            showToast("Reflection copied to clipboard!");
          }).catch(() => {});
        }
      });
    }
  }

  function setupScrubberControls() {
    const replay15 = document.getElementById("bottom-replay-15-btn");
    const forward15 = document.getElementById("bottom-forward-15-btn");
    const journeyReplay15 = document.getElementById("btn-journey-replay-15");
    const journeyForward15 = document.getElementById("btn-journey-forward-15");

    function skipTime(delta) {
      if (!activeRoom) return;
      if (activeRoom.timeMode === "loop") {
        sessionElapsedSeconds = Math.max(0, sessionElapsedSeconds + delta);
      } else {
        sessionElapsedSeconds = Math.max(0, Math.min(sessionTotalSeconds, sessionElapsedSeconds + delta));
        sessionRemainingSeconds = Math.max(0, sessionTotalSeconds - sessionElapsedSeconds);
      }
      updateTimerDisplay();
    }

    if (replay15) replay15.addEventListener("click", () => skipTime(-15));
    if (forward15) forward15.addEventListener("click", () => skipTime(15));
    if (journeyReplay15) journeyReplay15.addEventListener("click", () => skipTime(-15));
    if (journeyForward15) journeyForward15.addEventListener("click", () => skipTime(15));

    // Scrubbers across all templates
    const allScrubbers = [
      document.getElementById("player-scrubber-track"),
      document.getElementById("ripple-scrubber-track"),
      document.getElementById("journey-scrubber-track"),
      document.getElementById("nature-scrubber-track"),
      document.getElementById("sunburst-scrubber-track")
    ];

    allScrubbers.forEach(track => {
      if (!track) return;
      track.addEventListener("click", e => {
        if (!activeRoom || activeRoom.timeMode === "loop" || !sessionTotalSeconds) return;
        const rect = track.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const fraction = Math.max(0, Math.min(1, clickX / rect.width));
        sessionElapsedSeconds = Math.floor(fraction * sessionTotalSeconds);
        sessionRemainingSeconds = Math.max(0, sessionTotalSeconds - sessionElapsedSeconds);
        updateTimerDisplay();
      });
    });

    // Volume Sliders across all templates
    const allVolumeSliders = [
      document.getElementById("bottom-volume-slider"),
      document.getElementById("ripple-volume-slider"),
      document.getElementById("journey-volume-slider"),
      document.getElementById("nature-volume-slider"),
      document.getElementById("sunburst-volume-slider")
    ];

    allVolumeSliders.forEach(slider => {
      if (!slider) return;
      slider.addEventListener("input", e => {
        const val = Number(e.target.value);
        allVolumeSliders.forEach(s => { if (s && s !== e.target) s.value = val; });
        const sunburstNum = document.getElementById("sunburst-vol-num");
        if (sunburstNum) sunburstNum.textContent = val + "%";

        if (synthGain && audioContext) {
          const gainVal = (val / 100) * 0.12;
          synthGain.gain.setValueAtTime(gainVal, audioContext.currentTime);
        }
      });
    });

    // Play Buttons across all templates
    const allPlayButtons = [
      document.getElementById("bottom-play-btn"),
      document.getElementById("btn-timer-primary-toggle"),
      document.getElementById("btn-ripple-play"),
      document.getElementById("btn-journey-play"),
      document.getElementById("btn-nature-play"),
      document.getElementById("btn-sunburst-play")
    ];

    allPlayButtons.forEach(btn => {
      if (!btn) return;
      btn.addEventListener("click", () => togglePlay());
    });

    // Template 1 Interval Bell & End Session
    const intervalBellBtn = document.getElementById("btn-interval-bell");
    if (intervalBellBtn) {
      intervalBellBtn.addEventListener("click", () => {
        intervalBellEnabled = !intervalBellEnabled;
        const icon = document.getElementById("bell-icon");
        const caption = document.getElementById("bell-text");
        if (intervalBellEnabled) {
          if (icon) icon.setAttribute("data-lucide", "bell");
          if (caption) caption.textContent = "Interval Bell";
          playIntervalBell(528);
          showToast("Interval chime enabled (every 5 minutes)");
        } else {
          if (icon) icon.setAttribute("data-lucide", "bell-off");
          if (caption) caption.textContent = "Chime Off";
          showToast("Interval chime disabled");
        }
        window.lucide?.createIcons();
      });
    }

    const endSessionBtn = document.getElementById("btn-timer-end-session");
    if (endSessionBtn) {
      endSessionBtn.addEventListener("click", () => {
        stopTimerTicker();
        stopAudioHarmonics();
        isPlaying = false;
        updatePlayState();
        exitToLobby();
      });
    }

    // Template 4 Nature Soundscape Dropdown
    const natureAmbBtn = document.getElementById("btn-nature-ambience");
    const natureAmbMenu = document.getElementById("nature-soundscape-menu");
    if (natureAmbBtn && natureAmbMenu) {
      natureAmbBtn.addEventListener("click", e => {
        e.stopPropagation();
        natureAmbMenu.hidden = !natureAmbMenu.hidden;
        natureAmbBtn.setAttribute("aria-expanded", String(!natureAmbMenu.hidden));
      });

      natureAmbMenu.addEventListener("click", e => {
        const opt = e.target.closest(".nature-soundscape-opt");
        if (!opt) return;
        natureAmbMenu.querySelectorAll(".nature-soundscape-opt").forEach(b => b.classList.toggle("active", b === opt));
        natureAmbMenu.hidden = true;
        natureAmbBtn.setAttribute("aria-expanded", "false");

        const nameEl = document.getElementById("nature-amb-name");
        const subEl = document.getElementById("nature-amb-sub");
        const ambType = opt.dataset.ambience;
        const optLabels = {
          forest: { name: "Forest Sounds ▾", sub: "Footsteps in Nature" },
          stream: { name: "Quiet Waters ▾", sub: "Living Stream Reflection" },
          rain: { name: "Soft Rain ▾", sub: "Gentle Refreshing Rain" },
          breeze: { name: "Gentle Breeze ▾", sub: "Mountain Wind & Leaves" }
        };
        const chosen = optLabels[ambType] || { name: opt.textContent.trim() + " ▾", sub: "Nature Soundscape" };
        if (nameEl) nameEl.textContent = chosen.name;
        if (subEl) subEl.textContent = chosen.sub;

        if (activeRoom) {
          if (!activeRoom.ambience) activeRoom.ambience = { rain: 0, stream: 0, fire: 0, breeze: 0 };
          if (ambType === "rain") { activeRoom.ambience.rain = 40; activeRoom.ambience.stream = 0; }
          else if (ambType === "stream") { activeRoom.ambience.stream = 40; activeRoom.ambience.rain = 0; }
          else if (ambType === "breeze") { activeRoom.ambience.breeze = 35; activeRoom.ambience.stream = 0; }
          else { activeRoom.ambience.breeze = 20; activeRoom.ambience.stream = 20; }
        }
        showToast("Nature soundscape: " + chosen.name.replace(" ▾", ""));
      });

      document.addEventListener("click", () => {
        if (!natureAmbMenu.hidden) {
          natureAmbMenu.hidden = true;
          natureAmbBtn.setAttribute("aria-expanded", "false");
        }
      });
    }

    // Journey Step Nodes Interactive Selection
    document.querySelectorAll(".journey-node").forEach((node, idx) => {
      node.addEventListener("click", () => {
        setJourneyStep(idx);
      });
    });
  }

  // --- INITIALIZATION ---
  function initializeMeditation() {
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
    document.getElementById("scripture-prev-btn")?.addEventListener("click", prevScripture);
    document.getElementById("room-fullscreen-btn")?.addEventListener("click", () => toggleFullscreen());
    document.getElementById("bottom-play-btn")?.addEventListener("click", togglePlay);

    // Theme Mode Toggle (Bright / Light vs. Dark Sanctuary)
    document.getElementById("room-theme-toggle-btn")?.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      if (activeRoom) activeRoom.mode = nextTheme;
      applyRoomMode(nextTheme);
      showToast("Switched to " + (nextTheme === "dark" ? "Dark Sanctuary" : "Bright / Light") + " mode");
    });

    // Template In-Room Actions
    const bellBtn = document.getElementById("btn-interval-bell");
    if (bellBtn) {
      bellBtn.addEventListener("click", () => {
        intervalBellEnabled = !intervalBellEnabled;
        const bellText = document.getElementById("bell-text");
        if (bellText) bellText.textContent = intervalBellEnabled ? "Interval Bell" : "Bell Muted";
        bellBtn.classList.toggle("is-active", intervalBellEnabled);
        if (intervalBellEnabled) {
          playIntervalBell(528);
          showToast("Interval bell chime active (every 5 min)");
        } else {
          showToast("Interval bell chime muted");
        }
      });
    }

    document.getElementById("btn-timer-primary-toggle")?.addEventListener("click", () => {
      if (sessionRemainingSeconds <= 0 && activeRoom?.timeMode !== "loop") {
        initTimerController(activeRoom);
      }
      togglePlay();
    });

    document.getElementById("btn-timer-end-session")?.addEventListener("click", () => {
      playIntervalBell(432);
      exitToLobby();
      showToast("Sanctuary session ended.");
    });

    // Journey Step Node Clicks
    document.addEventListener("click", e => {
      const node = e.target.closest(".journey-node");
      if (node && activeRoom?.template === "journey") {
        const step = Number(node.dataset.step);
        if (!isNaN(step)) {
          setJourneyStep(step);
        }
      }
    });

    // Interactive Modules Setup
    setupAmbienceDropdown();
    setupReflectionModal();
    setupScrubberControls();

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
    document.getElementById("chat-input-form")?.addEventListener("submit", async e => {
      e.preventDefault();
      const input = document.getElementById("chat-input");
      if (!input || !input.value.trim()) return;
      const button = document.getElementById("chat-send-btn");
      input.disabled = true;
      if (button) button.disabled = true;
      const sent = await sendComment(input.value);
      if (sent) input.value = "";
      setupChatModerationUI();
      input.focus();
    });

    // Create Virtual Sanctuary Room Dialog Interactive UI
    const createModal = document.getElementById("modal-create-room");
    document.getElementById("btn-open-create-room")?.addEventListener("click", () => {
      createModal?.showModal?.();
      window.lucide?.createIcons();
    });
    document.getElementById("btn-close-create-room")?.addEventListener("click", () => createModal?.close?.());
    document.getElementById("btn-cancel-create-room")?.addEventListener("click", () => createModal?.close?.());

    // Template selection choices
    document.querySelectorAll(".template-choice-card").forEach(card => {
      card.addEventListener("click", () => {
        document.querySelectorAll(".template-choice-card").forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });

    // Palette swatches
    let selectedThemeColor = "#4a5d3f";
    let selectedThemeHue = 100;
    document.querySelectorAll(".swatch-btn").forEach(swatch => {
      swatch.addEventListener("click", () => {
        document.querySelectorAll(".swatch-btn").forEach(s => s.classList.remove("active"));
        swatch.classList.add("active");
        selectedThemeColor = swatch.dataset.color || "#4a5d3f";
        selectedThemeHue = Number(swatch.dataset.hue) || 100;
      });
    });
    document.getElementById("new-room-custom-color")?.addEventListener("input", e => {
      selectedThemeColor = e.target.value;
      document.querySelectorAll(".swatch-btn").forEach(s => s.classList.remove("active"));
    });

    // Appearance mode pills
    document.querySelectorAll(".mode-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(".mode-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        const radio = pill.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });

    // Time controller dropdown
    document.getElementById("new-room-time-mode")?.addEventListener("change", e => {
      const wrapper = document.getElementById("timed-minutes-wrapper");
      if (wrapper) wrapper.hidden = (e.target.value === "loop");
    });

    document.getElementById("form-create-sanctuary")?.addEventListener("submit", async e => {
      e.preventDefault();
      if (!window.MWEPlatform?.session?.isCreator) {
        window.MWE?.openMemberLogin?.(location.href);
        showToast("Sign in with a creator account to create a room.");
        return;
      }
      const submitButton = e.currentTarget.querySelector('[type="submit"]');
      if (submitButton) submitButton.disabled = true;
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

      const template = document.querySelector('input[name="new-room-template"]:checked')?.value || "timer";
      const purpose = document.getElementById("new-room-purpose")?.value || "prayer";
      const mode = document.querySelector('input[name="new-room-mode"]:checked')?.value || "light";
      const timeMode = document.getElementById("new-room-time-mode")?.value || "timed";
      let durationMinutes = 20;
      const durationVal = document.getElementById("new-room-duration-minutes")?.value;
      if (durationVal === "custom") {
        const customPrompt = prompt("Enter session length in minutes:", "25");
        durationMinutes = Math.max(1, parseInt(customPrompt, 10) || 20);
      } else {
        durationMinutes = parseInt(durationVal, 10) || 20;
      }
      const autoPlayInterval = parseInt(document.getElementById("new-scripture-autoplay-interval")?.value, 10) || 0;
      const allowUserNavigation = document.getElementById("new-allow-user-nav") ? !!document.getElementById("new-allow-user-nav").checked : true;

      // Parse scriptures series
      const seriesText = document.getElementById("new-scriptures-series")?.value.trim();
      const allVerses = [{ topic, text, ref }];
      if (seriesText) {
        const parts = seriesText.split(/\n\s*---\s*\n/);
        parts.forEach(part => {
          const trimmed = part.trim();
          if (trimmed) {
            const lastDash = trimmed.lastIndexOf("—");
            let vText = trimmed;
            let vRef = "— Scripture";
            if (lastDash !== -1) {
              vText = trimmed.slice(0, lastDash).trim();
              vRef = trimmed.slice(lastDash).trim();
            }
            allVerses.push({
              topic,
              text: vText,
              ref: vRef
            });
          }
        });
      }

      if (!title || !subtitle || !text) return;

      const creatorName = window.MWEPlatform.session.name || "Host Creator";

      const coverByTheme = {
        chapel: "https://images.unsplash.com/photo-1548625361-195fe578ae14?auto=format&fit=crop&w=800&q=80",
        mountains: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=700&q=80",
        stars: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80",
        stream: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
        deepdark: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80"
      };

      const newRoom = {
        title,
        subtitle,
        category,
        categoryLabel: category === "bible-books" ? "📖 Bible Book" : (category === "themes" ? "🕊️ Biblical Theme" : "⭐ Favorite Room"),
        icon: "sparkles",
        cover: coverByTheme[theme] || coverByTheme.chapel,
        theme,
        template,
        purpose,
        mode,
        timeMode,
        durationMinutes,
        themeColor: selectedThemeColor,
        themeHue: selectedThemeHue,
        autoPlayInterval,
        allowUserNavigation,
        toneFreq: 432,
        selectedAudio: audio,
        ambience: { rain, stream, fire, breeze },
        commentsEnabled: comments,
        ownerName: creatorName,
        verses: allVerses,
        audioTracks: {
          bible: { title: "Audio Bible: " + title, cat: "Dramatized Scripture", freq: 432 },
          instrumental: { title: "Soaking Sanctuary Pads", cat: "Instrumental (432Hz)", freq: 432 },
          worship: { title: "Christian Worship Reflection", cat: "Worship Music", freq: 432 },
          sermon: { title: "Sermons & Preaching", cat: "Spiritual Word", freq: 432 },
          silence: { title: "Silence / Ambience Only", cat: "Ambient Atmosphere", freq: 432 }
        }
      };

      try {
        const savedRoom = await window.MWEPlatform.save("meditation", newRoom);
        roomsCatalog.unshift(enrichRoomWithMedia(savedRoom));
        renderLobby();
        createModal?.close?.();
        showToast("Sanctuary room saved to your creator account.");
        enterRoom(savedRoom.id, true);
      } catch (error) {
        showToast(error.message || "The sanctuary room could not be saved.");
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeMeditation, { once: true });
  } else {
    initializeMeditation();
  }
})();
