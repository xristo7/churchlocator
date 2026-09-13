(function initializeFaithLinkModules() {
  const keys = {
    channels: "faithlink.channels.v1",
    products: "faithlink.store.products.v1",
    cart: "faithlink.store.cart.v1",
    resources: "faithlink.resources.v1",
    messages: "faithlink.messages.v1",
    messageSettings: "faithlink.messages.settings.v1",
    serviceBookings: "faithlink.services.bookings.v1"
  };

  const channelSeeds = [
    { id: "daily-word", name: "Daily Word with Amara", handle: "@dailyword", owner: "Amara Okafor", topic: "Bible Teaching", format: "Podcast", followers: 18400, items: 126, live: false, verified: true, description: "Short, practical Bible teaching for everyday Christian living.", cover: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=900&q=82", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=160&q=82" },
    { id: "worship-room", name: "The Worship Room", handle: "@worshiproom", owner: "Daniel Mensah", topic: "Worship", format: "Livestream", followers: 32100, items: 84, live: true, verified: true, description: "Live worship sessions, acoustic praise, and conversations with worship leaders.", cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=82", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=160&q=82" },
    { id: "faith-family", name: "Faith & Family Table", handle: "@faithfamilytable", owner: "Rachel and Mark", topic: "Family", format: "Video", followers: 12600, items: 58, live: false, verified: false, description: "Honest conversations about marriage, parenting, prayer, and building a Christ-centered home.", cover: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=82", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=facearea&facepad=2&w=160&q=82" },
    { id: "gospel-business", name: "Gospel & Business", handle: "@gospelbusiness", owner: "Michael Chen", topic: "Leadership", format: "Podcast", followers: 9800, items: 73, live: false, verified: true, description: "Christian entrepreneurship, ethical leadership, stewardship, and marketplace ministry.", cover: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=82", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=160&q=82" },
    { id: "youth-revival", name: "Youth Revival Network", handle: "@youthrevival", owner: "Grace Thomas", topic: "Youth", format: "Livestream", followers: 24700, items: 92, live: true, verified: true, description: "Youth-led prayer, testimony, music, and Gospel conversations from around the world.", cover: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=82", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=160&q=82" },
    { id: "scripture-lab", name: "Scripture Study Lab", handle: "@scripturelab", owner: "Dr. Peter Cole", topic: "Bible Study", format: "Video", followers: 15100, items: 110, live: false, verified: true, description: "Verse-by-verse studies, historical context, sermon outlines, and guided reading plans.", cover: "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=900&q=82", avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=facearea&facepad=2&w=160&q=82" }
  ];

  const productSeeds = [
    { id: "study-bible", itemType: "product", title: "FaithLink Study Bible", seller: "River City Church", sellerType: "Church", category: "Books", price: 48, compareAt: 58, inventory: 34, rating: 4.9, status: "Active", featured: true, image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=82", description: "Premium study Bible with guided notes, maps, and space for reflection." },
    { id: "prayer-journal", itemType: "product", title: "90-Day Prayer Journal", seller: "Daily Word with Amara", sellerType: "Channel", category: "Journals", price: 22, compareAt: 0, inventory: 68, rating: 4.8, status: "Active", featured: true, image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=82", description: "A structured daily journal for prayer, gratitude, scripture, and testimony." },
    { id: "worship-hoodie", itemType: "product", title: "Worship Is My Response Hoodie", seller: "The Worship Room", sellerType: "Channel", category: "Apparel", price: 54, compareAt: 64, inventory: 21, rating: 4.7, status: "Active", featured: false, image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=82", description: "Heavyweight unisex hoodie designed for worship teams and everyday wear." },
    { id: "communion-set", itemType: "product", title: "Home Communion Set", seller: "Grace Community Church", sellerType: "Church", category: "Church Supplies", price: 38, compareAt: 0, inventory: 17, rating: 4.6, status: "Active", featured: false, image: "https://images.unsplash.com/photo-1473177104440-ffee2f376098?auto=format&fit=crop&w=800&q=82", description: "A simple reusable communion set for families, groups, and pastoral visits." },
    { id: "sermon-notes", itemType: "product", title: "Sermon Notes Binder", seller: "Scripture Study Lab", sellerType: "Channel", category: "Study Tools", price: 26, compareAt: 32, inventory: 42, rating: 4.9, status: "Active", featured: true, image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=82", description: "Refillable binder with sermon, study, prayer, and application templates." },
    { id: "kids-cards", itemType: "product", title: "Bible Memory Cards for Kids", seller: "Beulah Alliance Church", sellerType: "Church", category: "Kids", price: 18, compareAt: 0, inventory: 55, rating: 4.8, status: "Active", featured: false, image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=800&q=82", description: "Illustrated scripture memory cards with family discussion prompts." },
    { id: "worship-vinyl", itemType: "product", title: "Songs of Renewal Vinyl", seller: "The Worship Room", sellerType: "Channel", category: "Music", price: 32, compareAt: 0, inventory: 12, rating: 4.9, status: "Active", featured: true, image: "https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?auto=format&fit=crop&w=800&q=82", description: "Limited vinyl edition of twelve original worship songs." },
    { id: "cross-necklace", itemType: "product", title: "Minimal Cross Necklace", seller: "Faith & Family Table", sellerType: "Channel", category: "Gifts", price: 29, compareAt: 35, inventory: 29, rating: 4.6, status: "Active", featured: false, image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=82", description: "A subtle stainless-steel cross necklace with gift packaging." },

    // --- Specialized Church & Channel Services ---
    {
      id: "service-worship-singing",
      itemType: "service",
      serviceType: "singing",
      title: "Live Event Singing & Acoustic Worship Leading",
      seller: "The Worship Room",
      sellerType: "Channel",
      category: "Worship & Music",
      price: 180,
      compareAt: 220,
      pricingUnit: "per session",
      inventory: 99,
      rating: 4.98,
      status: "Active",
      featured: true,
      image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=82",
      description: "Book dedicated Christian vocalists and acoustic worship leaders for Sunday services, revivals, church conferences, weddings, youth nights, and prayer gatherings.",
      audioSample: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      audioTitle: "Acoustic Praise & Reflection Sample",
      tiers: [
        { id: "tier-solo", name: "Solo Acoustic Vocalist", price: 180, duration: "Up to 2 Hours", highlights: ["1 Lead Vocalist + Acoustic Guitar/Piano", "Pre-event setlist consultation", "Soundcheck 1h prior"] },
        { id: "tier-duo", name: "Praise & Harmony Duo", price: 320, duration: "Up to 4 Hours", highlights: ["2 Lead Vocalists + Keys & Acoustic", "Custom choral harmonies & backing", "Full service or concert block"] },
        { id: "tier-team", name: "Full Worship Ministry Team", price: 650, duration: "Full Day / Multi-Service", highlights: ["4-piece team (Vocals, Keys, Guitar, Cajon)", "Leads congregational praise & prayer", "Sound equipment assistance"] }
      ],
      repertoire: ["Contemporary Praise", "Traditional Hymns & Gospel", "Acoustic Soaking Worship", "Special Anthem Requests"],
      deliverables: ["Personalized consultation call", "Custom setlist aligned with sermon scripture", "Professional soundcheck", "Ministry-first heart and prayerful preparation"]
    },
    {
      id: "service-venue-hall",
      itemType: "service",
      serviceType: "venue",
      title: "Sanctuary & Community Fellowship Hall Rental",
      seller: "River City Church",
      sellerType: "Church",
      category: "Venues & Facilities",
      price: 95,
      compareAt: 120,
      pricingUnit: "per hour",
      inventory: 99,
      rating: 4.95,
      status: "Active",
      featured: true,
      image: "https://images.unsplash.com/photo-1548625361-195973c1f0b0?auto=format&fit=crop&w=1200&q=82",
      description: "Host your church conference, wedding ceremony, seminar, worship night, or community fellowship banquet in our climate-controlled, tech-equipped sanctuary and hall.",
      capacity: "350 Sanctuary / 180 Banquet Hall",
      amenities: ["4K Dual Projectors & LED Screens", "Digital 32-Channel Audio Console", "Wireless Microphones & Stage Lighting", "Fully Equipped Kitchenette", "Free On-Site Parking (85 Stalls)", "Wheelchair Accessible Entrance & Restrooms"],
      tiers: [
        { id: "tier-rehearsal", name: "Rehearsal / Small Gathering", price: 95, duration: "Hourly (Min 2h)", highlights: ["Full hall or sanctuary access", "Standard house lighting & 2 mics", "On-site facility steward"] },
        { id: "tier-halfday", name: "Half-Day Seminar / Workshop", price: 420, duration: "Up to 5 Hours", highlights: ["Sanctuary + Fellowship Hall", "Full A/V technician on duty", "Tables & chairs setup included"] },
        { id: "tier-fullday", name: "Full-Day Conference / Celebration", price: 780, duration: "Full Day (8am - 10pm)", highlights: ["Complete facility exclusive access", "Kitchenette + A/V + Livestream setup", "Pre-event walk-through & planning session"] }
      ],
      guidelines: "Alcohol-free, smoke-free facility aligned with Christian ministry values. Sound curfew 10:30 PM."
    },
    {
      id: "service-church-van",
      itemType: "service",
      serviceType: "van",
      title: "15-Passenger Church Shuttle Van & Driver Hire",
      seller: "Beulah Alliance Church",
      sellerType: "Church",
      category: "Transportation",
      price: 140,
      compareAt: 175,
      pricingUnit: "per day",
      inventory: 99,
      rating: 4.88,
      status: "Active",
      featured: false,
      image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1200&q=82",
      description: "Reliable, fully insured 15-passenger high-roof church van available for ministry retreats, youth mission trips, choir tours, and Sunday elder/senior transportation.",
      vehicleSpecs: ["15 Passenger High-Roof Sprinter", "Spacious Rear Luggage Cargo Bay", "Dual-Zone Climate Control A/C", "Full Commercial & Ministry Insurance", "Equipped with First-Aid & Emergency Kit"],
      tiers: [
        { id: "tier-day", name: "Single-Day Local Shuttle", price: 140, duration: "1 Day (Local)", highlights: ["Up to 150 km included", "Clean & sanitized vehicle", "Ministry self-drive (valid license required)"] },
        { id: "tier-driver", name: "Single-Day with Dedicated Driver", price: 260, duration: "1 Day (With Driver)", highlights: ["Church-vetted certified driver provided", "Fuel card option available", "Stress-free group travel"] },
        { id: "tier-weekend", name: "Weekend Retreat Package", price: 450, duration: "Friday - Sunday", highlights: ["Unlimited regional mileage", "Emergency roadside coverage 24/7", "Flexible return schedule"] }
      ],
      requirements: "Valid driver's license with clean driving record for self-drive option."
    },
    {
      id: "service-photo-video",
      itemType: "service",
      serviceType: "media",
      title: "Christian Event Photography & Cinematic Video Production",
      seller: "Faith & Family Table",
      sellerType: "Channel",
      category: "Media & Production",
      price: 240,
      compareAt: 300,
      pricingUnit: "per event",
      inventory: 99,
      rating: 4.96,
      status: "Active",
      featured: true,
      image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=82",
      description: "Capture God's work in your church with cinematic clarity. Professional photo and video storytelling for baptisms, ordination services, outreach crusades, and conferences.",
      equipmentSpecs: ["Dual Cinema Cameras (4K 60fps)", "Professional Wireless Lavalier & Shotgun Audio", "Licensed Drone 4K Aerial Videography", "Studio Grade Color Grading & Sound Master"],
      tiers: [
        { id: "tier-photo", name: "Essential Photography Package", price: 240, duration: "Up to 3 Hours", highlights: ["100+ High-Resolution Edited Photos", "Online Private Client Gallery", "48-Hour Highlight Preview"] },
        { id: "tier-cinema", name: "Cinematic Highlight Film + Photos", price: 480, duration: "Up to 6 Hours", highlights: ["3-5 Minute Cinematic Highlight Film", "Full sermon / key address recording", "150+ Edited Event Photos"] },
        { id: "tier-fullmedia", name: "Complete Documentary & Broadcast", price: 850, duration: "Full Day / Multi-Camera", highlights: ["2 Videographers + Drone Pilot", "Full 4K Multicam Video + Highlights", "Social Media Reel Cuts (Vertical 9:16)", "RAW footage archive delivered on SSD"] }
      ],
      turnaround: "Highlights within 48 hours; final mastered deliverables within 7 business days."
    },
    {
      id: "service-graphic-design",
      itemType: "service",
      serviceType: "design",
      title: "Sermon Series Branding & Church Visual Design Kit",
      seller: "Scripture Study Lab",
      sellerType: "Channel",
      category: "Creative & Design",
      price: 90,
      compareAt: 125,
      pricingUnit: "per kit",
      inventory: 99,
      rating: 4.92,
      status: "Active",
      featured: false,
      image: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=1200&q=82",
      description: "Elevate your church visual identity with custom, scripture-inspired sermon series art, Sunday slide decks, social media promotional packages, and bulletin layouts.",
      deliverables: ["4K Ultra-HD Title & Scripture Slides (16:9)", "Blank Background Slides & Lower Thirds", "Instagram / Facebook Post & Story Templates", "Print-Ready Bulletin Cover (300 DPI PDF)", "Editable Figma & Canva Project Files"],
      tiers: [
        { id: "tier-single", name: "Single Sermon Graphics Package", price: 90, duration: "2-3 Days Turnaround", highlights: ["1 Main Title Graphic (16:9 + 9:16)", "3 Background & Scripture Slide Templates", "2 Social Media Promo Graphics", "2 Rounds of Revisions"] },
        { id: "tier-series", name: "4-Week Sermon Series Complete Kit", price: 195, duration: "4-5 Days Turnaround", highlights: ["Full Series Visual Identity & Typography", "Weekly scripture & sermon point slide deck", "Countdown video loop background", "Editable Canva & PSD assets", "Unlimited revisions during design phase"] },
        { id: "tier-identity", name: "Annual Church Branding & Theme Package", price: 420, duration: "7-10 Days Turnaround", highlights: ["Annual church vision theme branding", "Ministry logo suite & brand guidelines", "Quarterly sermon series templates (4 kits)", "Custom vector merchandise / bulletin art"] }
      ],
      turnaround: "First draft delivered within 48-72 hours. All source files included upon final approval."
    }
  ];

  const resourceSeeds = [
    { id: "romans-outline", title: "Romans: Grace and Righteousness", creator: "Scripture Study Lab", topic: "Bible Study", type: "Text", format: "PDF", access: "Free", price: 0, duration: "42 pages", rating: 4.9, image: "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=800&q=82", description: "A chapter-by-chapter study outline with discussion and application questions." },
    { id: "prayer-journal-digital", title: "30-Day Guided Prayer Journal", creator: "Daily Word with Amara", topic: "Prayer", type: "Text", format: "EPUB", access: "Paid", price: 8, duration: "30 days", rating: 4.8, image: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=800&q=82", description: "Daily scripture, reflection prompts, gratitude, and prayer tracking." },
    { id: "gospel-basics", title: "The Gospel: A Clear Foundation", creator: "River City Church", topic: "Discipleship", type: "Video", format: "MP4", access: "Free", price: 0, duration: "48 min", rating: 4.9, image: "https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=800&q=82", description: "A clear introduction to salvation, grace, faith, and the new life in Christ." },
    { id: "worship-leading", title: "Leading Worship with Purpose", creator: "The Worship Room", topic: "Worship", type: "Video", format: "MP4", access: "Paid", price: 14, duration: "1h 36m", rating: 4.7, image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=82", description: "Practical training for worship leaders, vocalists, and ministry teams." },
    { id: "psalms-audio", title: "Psalms for Rest and Reflection", creator: "Grace Audio Collective", topic: "Devotional", type: "Audio", format: "MP3", access: "Free", price: 0, duration: "2h 10m", rating: 4.8, image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=82", description: "Peaceful scripture readings with soft instrumental soundscapes." },
    { id: "marriage-workbook", title: "Covenant Marriage Workbook", creator: "Faith & Family Table", topic: "Marriage", type: "Text", format: "DOC", access: "Paid", price: 11, duration: "64 pages", rating: 4.7, image: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=800&q=82", description: "Eight guided sessions for communication, prayer, conflict, and shared purpose." },
    { id: "sermon-planning", title: "Annual Sermon Planning Kit", creator: "Pastor Leadership Network", topic: "Ministry", type: "Text", format: "PDF", access: "Paid", price: 18, duration: "96 pages", rating: 4.9, image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=800&q=82", description: "Planning calendars, series maps, message templates, and team review sheets." },
    { id: "youth-questions", title: "Hard Questions Young Christians Ask", creator: "Youth Revival Network", topic: "Youth", type: "Audio", format: "AAC", access: "Free", price: 0, duration: "58 min", rating: 4.6, image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=82", description: "Honest Gospel-centered answers about identity, purpose, doubt, and relationships." },
    { id: "acts-course", title: "Acts and the Mission of the Church", creator: "Dr. Peter Cole", topic: "Bible Study", type: "Video", format: "FLV", access: "Paid", price: 20, duration: "6 lessons", rating: 4.8, image: "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=800&q=82", description: "A six-part course on the Spirit, witness, church growth, and mission." },
    { id: "small-group-guide", title: "Small Group Leader Field Guide", creator: "Beulah Alliance Church", topic: "Leadership", type: "Text", format: "TXT", access: "Free", price: 0, duration: "18 pages", rating: 4.5, image: "https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=800&q=82", description: "Simple guidance for healthy discussion, prayer, care, and multiplication." },
    { id: "morning-devotions", title: "Morning Devotions for Busy People", creator: "Daily Word with Amara", topic: "Devotional", type: "Audio", format: "MP3", access: "Paid", price: 9, duration: "21 episodes", rating: 4.8, image: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=800&q=82", description: "Twenty-one focused audio devotions designed for the start of your day." },
    { id: "new-believer", title: "New Believer Foundations", creator: "Christ Embassy Edmonton", topic: "Discipleship", type: "Text", format: "EPUB", access: "Free", price: 0, duration: "52 pages", rating: 4.9, image: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=800&q=82", description: "Essential teaching on prayer, scripture, fellowship, identity, and sharing faith." }
  ];

  const messageSeeds = [
    { id: "message-worship-room", threadId: "channel-worship-room", participantId: "worship-room", participant: "The Worship Room", participantType: "Channel", avatar: channelSeeds[1].avatar, subject: "Welcome to The Worship Room", body: "Thanks for connecting with us. Let us know how we can pray with you or help you find a worship resource.", direction: "received", createdAt: "2026-08-19T17:20:00.000Z", read: false },
    { id: "message-river-city", threadId: "church-river-city", participantId: "river-city", participant: "River City Church", participantType: "Church", avatar: "https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=160&q=82", subject: "Your Sunday visit", body: "We would be delighted to welcome you this Sunday. Reply if you have questions about parking, children’s ministry, or accessibility.", direction: "received", createdAt: "2026-08-18T14:05:00.000Z", read: true }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      if (Array.isArray(value)) {
        if (key === keys.products) {
          const existingIds = new Set(value.map(item => item.id));
          const missingSeeds = fallback.filter(item => !existingIds.has(item.id));
          if (missingSeeds.length > 0) {
            const merged = [...value, ...missingSeeds];
            localStorage.setItem(key, JSON.stringify(merged));
            return merged;
          }
        }
        return value;
      }
    } catch {}
    const seeded = clone(fallback);
    localStorage.setItem(key, JSON.stringify(seeded));
    return seeded;
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function makeId(prefix, title) {
    const slug = String(title || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42);
    return `${prefix}-${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function money(value) {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(Number(value) || 0);
  }

  const api = {
    keys,
    escapeHtml,
    money,
    getChannels: () => read(keys.channels, channelSeeds),
    saveChannels: channels => write(keys.channels, channels),
    addChannel(channel) {
      const channels = api.getChannels();
      const saved = { ...channel, id: makeId("channel", channel.name), followers: 0, items: 0, live: false, verified: false };
      channels.unshift(saved);
      api.saveChannels(channels);
      return saved;
    },
    getProducts: () => read(keys.products, productSeeds),
    saveProducts: products => write(keys.products, products),
    getServices: () => api.getProducts().filter(item => item.itemType === "service"),
    getPhysicalProducts: () => api.getProducts().filter(item => item.itemType !== "service"),
    getStoreItems: () => api.getProducts(),
    getItemById: id => api.getProducts().find(item => item.id === id),
    getServiceBookings: () => read(keys.serviceBookings, []),
    async bookService(payload) {
      let remoteData = null;
      try {
        const response = await fetch("/api/services/book", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          remoteData = await response.json();
        }
      } catch {
        // Fall back to local state
      }

      const localBookings = read(keys.serviceBookings, []);
      const localRecord = remoteData?.booking || {
        id: `bk_${Date.now()}`,
        bookingRef: `SRV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        serviceId: payload.serviceId,
        serviceTitle: payload.serviceTitle,
        serviceType: payload.serviceType,
        providerName: payload.providerName,
        packageTier: payload.packageTier,
        requestedDate: payload.requestedDate,
        requestedTime: payload.requestedTime,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        createdAt: new Date().toISOString()
      };
      localBookings.unshift(localRecord);
      write(keys.serviceBookings, localBookings);

      return remoteData || { ok: true, id: localRecord.id, bookingRef: localRecord.bookingRef, status: "inquiry_received", booking: localRecord };
    },
    upsertProduct(product) {
      const products = api.getProducts();
      const saved = { ...product, id: product.id || makeId("product", product.title), rating: Number(product.rating || 0) };
      const index = products.findIndex(item => item.id === saved.id);
      if (index >= 0) products[index] = saved;
      else products.unshift(saved);
      api.saveProducts(products);
      return saved;
    },
    removeProduct(id) {
      api.saveProducts(api.getProducts().filter(product => product.id !== id));
    },
    getCart: () => read(keys.cart, []),
    saveCart: cart => write(keys.cart, cart),
    addToCart(id) {
      const cart = api.getCart();
      const row = cart.find(item => item.id === id);
      if (row) row.quantity += 1;
      else cart.push({ id, quantity: 1 });
      api.saveCart(cart);
      return cart;
    },
    setCartQuantity(id, quantity) {
      const cart = api.getCart().map(item => item.id === id ? { ...item, quantity: Math.max(0, Number(quantity) || 0) } : item).filter(item => item.quantity > 0);
      return api.saveCart(cart);
    },
    getResources: () => read(keys.resources, resourceSeeds),
    saveResources: resources => write(keys.resources, resources),
    addResource(resource) {
      const resources = api.getResources();
      const saved = { ...resource, id: makeId("resource", resource.title), creator: resource.creator || "My Channel", rating: 5, image: resource.image || "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=900&q=82" };
      resources.unshift(saved); api.saveResources(resources); return saved;
    },
    getMessages: () => read(keys.messages, messageSeeds),
    saveMessages: messages => write(keys.messages, messages),
    sendMessage(message) {
      const messages = api.getMessages();
      const saved = { ...message, id: makeId("message", message.subject || message.participant), direction: "sent", createdAt: new Date().toISOString(), read: true };
      messages.unshift(saved);
      api.saveMessages(messages);
      return saved;
    },
    getMessageSettings() {
      try { return JSON.parse(localStorage.getItem(keys.messageSettings) || "null") || { forwardingEnabled: false, forwardingEmail: "" }; } catch { return { forwardingEnabled: false, forwardingEmail: "" }; }
    },
    saveMessageSettings(settings) { localStorage.setItem(keys.messageSettings, JSON.stringify(settings)); return settings; }
  };

  window.FaithLinkModules = api;
})();
