(function initializeFaithLinkModules() {
  const keys = {
    channels: "faithlink.channels.v1",
    products: "faithlink.store.products.v1",
    cart: "faithlink.store.cart.v1",
    resources: "faithlink.resources.v1",
    messages: "faithlink.messages.v1",
    messageSettings: "faithlink.messages.settings.v1"
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
    { id: "study-bible", title: "FaithLink Study Bible", seller: "River City Church", sellerType: "Church", category: "Books", price: 48, compareAt: 58, inventory: 34, rating: 4.9, status: "Active", featured: true, image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=82", description: "Premium study Bible with guided notes, maps, and space for reflection." },
    { id: "prayer-journal", title: "90-Day Prayer Journal", seller: "Daily Word with Amara", sellerType: "Channel", category: "Journals", price: 22, compareAt: 0, inventory: 68, rating: 4.8, status: "Active", featured: true, image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=82", description: "A structured daily journal for prayer, gratitude, scripture, and testimony." },
    { id: "worship-hoodie", title: "Worship Is My Response Hoodie", seller: "The Worship Room", sellerType: "Channel", category: "Apparel", price: 54, compareAt: 64, inventory: 21, rating: 4.7, status: "Active", featured: false, image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=82", description: "Heavyweight unisex hoodie designed for worship teams and everyday wear." },
    { id: "communion-set", title: "Home Communion Set", seller: "Grace Community Church", sellerType: "Church", category: "Church Supplies", price: 38, compareAt: 0, inventory: 17, rating: 4.6, status: "Active", featured: false, image: "https://images.unsplash.com/photo-1473177104440-ffee2f376098?auto=format&fit=crop&w=800&q=82", description: "A simple reusable communion set for families, groups, and pastoral visits." },
    { id: "sermon-notes", title: "Sermon Notes Binder", seller: "Scripture Study Lab", sellerType: "Channel", category: "Study Tools", price: 26, compareAt: 32, inventory: 42, rating: 4.9, status: "Active", featured: true, image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=82", description: "Refillable binder with sermon, study, prayer, and application templates." },
    { id: "kids-cards", title: "Bible Memory Cards for Kids", seller: "Beulah Alliance Church", sellerType: "Church", category: "Kids", price: 18, compareAt: 0, inventory: 55, rating: 4.8, status: "Active", featured: false, image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=800&q=82", description: "Illustrated scripture memory cards with family discussion prompts." },
    { id: "worship-vinyl", title: "Songs of Renewal Vinyl", seller: "The Worship Room", sellerType: "Channel", category: "Music", price: 32, compareAt: 0, inventory: 12, rating: 4.9, status: "Active", featured: true, image: "https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?auto=format&fit=crop&w=800&q=82", description: "Limited vinyl edition of twelve original worship songs." },
    { id: "cross-necklace", title: "Minimal Cross Necklace", seller: "Faith & Family Table", sellerType: "Channel", category: "Gifts", price: 29, compareAt: 35, inventory: 29, rating: 4.6, status: "Active", featured: false, image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=82", description: "A subtle stainless-steel cross necklace with gift packaging." }
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
      if (Array.isArray(value)) return value;
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
