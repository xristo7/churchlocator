-- Preview-only demo dataset. Apply to my-way-of-evangelism-preview.
-- All accounts use: DemoMyWayPreview2026!
-- Never apply this file to production.

-- Remove all preview content and accounts while preserving migration metadata.
delete from spotlight_comments;
delete from spotlight_engagements;
delete from spotlight_items;
delete from entitlements;
delete from payment_events;
delete from payment_orders;
delete from private_records;
delete from security_tokens;
delete from auth_attempts;
delete from sessions;
delete from audit_log;
delete from event_registrations;
delete from service_bookings;
delete from ride_followups;
delete from ride_requests;
delete from salvation_decisions;
delete from prayer_requests;
delete from visitor_connections;
delete from volunteer_applications;
delete from foundation_applications;
delete from foundation_projects;
delete from livestream_activations;
delete from church_staff_roles;
delete from service_schedules;
delete from ministries;
delete from church_profiles;
delete from churches;
delete from events;
delete from platform_entities;
delete from tenant_memberships;
delete from tenants where id <> 'platform-system';
delete from platform_roles where user_id <> 'system:platform';
delete from users where id <> 'system:platform';

insert or ignore into users (id,email,password_hash,password_salt,name,is_creator,created_at,email_verified_at)
values ('system:platform','system@platform.invalid','authentication-disabled','','Platform catalog',0,'2026-09-17T08:00:00.000Z','2026-09-17T08:00:00.000Z');
insert or ignore into tenants (id,owner_user_id,name,created_at)
values ('platform-system','system:platform','Platform catalog','2026-09-17T08:00:00.000Z');

-- Demo accounts. They are intentionally verified creators for preview workspace testing.
insert into users (id,email,password_hash,password_salt,name,is_creator,created_at,email_verified_at)
values
 ('local:rivercity@demo.myway.test','rivercity@demo.myway.test','pbkdf2-sha256$100000$NfE+KVczgN5YF7f3IU7SqJ0L9ca7zjnjamNFI+YJ0bY=','wAAQzklE3EJJJpoNQo+wpQ==','River City Fellowship Admin',1,'2026-09-17T08:01:00.000Z','2026-09-17T08:01:00.000Z'),
 ('local:grace@demo.myway.test','grace@demo.myway.test','pbkdf2-sha256$100000$YBnAZw7A4YCydCjvTxW7dOgHJEbxFyfkndc7Cm2GzIU=','Lmd6E+M5YVD1wGmhBvvXAA==','Grace Stories Studio',1,'2026-09-17T08:02:00.000Z','2026-09-17T08:02:00.000Z'),
 ('local:harbor@demo.myway.test','harbor@demo.myway.test','pbkdf2-sha256$100000$kxIOPw4BmnUDHIa5cmMGvQQmUFvJ5ZVPteSZes5U4vI=','4atY9iBHEfrSsMNtPfPZGA==','Harbor Light Ministries',1,'2026-09-17T08:03:00.000Z','2026-09-17T08:03:00.000Z');

insert into tenants (id,owner_user_id,name,created_at)
values
 ('demo-tenant-river-city','local:rivercity@demo.myway.test','River City Fellowship','2026-09-17T08:01:00.000Z'),
 ('demo-tenant-grace-stories','local:grace@demo.myway.test','Grace Stories Studio','2026-09-17T08:02:00.000Z'),
 ('demo-tenant-harbor-light','local:harbor@demo.myway.test','Harbor Light Ministries','2026-09-17T08:03:00.000Z');

insert into tenant_memberships (tenant_id,user_id,role)
values
 ('demo-tenant-river-city','local:rivercity@demo.myway.test','owner'),
 ('demo-tenant-grace-stories','local:grace@demo.myway.test','owner'),
 ('demo-tenant-harbor-light','local:harbor@demo.myway.test','owner');

-- Churches and their directory projections.
insert into churches (id,name,city,country,postal_code,denomination,language,worship_style,website,phone,email,cover_image_url,livestream_enabled,livestream_paid,livestream_url,description,is_verified,created_at)
values
 ('demo-church-river-city','River City Fellowship','Nairobi','KE','00100','Pentecostal','English','Contemporary','https://rivercity.demo.myway.test','+254 700 000 101','hello@rivercity.demo.myway.test','/assets/church-river-city.png',1,0,'https://www.youtube.com/embed/jiSyB8QZzk8','A welcoming Nairobi fellowship centered on scripture, worship, and practical care for neighbors.',1,'2026-09-17T08:10:00.000Z'),
 ('demo-church-grace-community','Grace Community Church','Kampala','UG','25600','Full Gospel','English','Blended','https://gracecommunity.demo.myway.test','+256 700 000 202','hello@gracecommunity.demo.myway.test','/assets/church-grace-house.png',1,0,'https://www.youtube.com/embed/jiSyB8QZzk8','A warm community helping new believers grow through small groups, prayer, and discipleship.',1,'2026-09-17T08:11:00.000Z'),
 ('demo-church-harbor-light','Harbor Light Chapel','Mombasa','KE','80100','Charismatic','Swahili','Contemporary','https://harborlight.demo.myway.test','+254 700 000 303','hello@harborlight.demo.myway.test','/assets/church-light-chapel.png',1,0,'https://www.youtube.com/embed/jiSyB8QZzk8','A coastal church family making room for worship, youth leadership, and community outreach.',1,'2026-09-17T08:12:00.000Z');

insert into church_profiles (church_id,pastor_name,pastor_title,pastor_bio,about,mission,vision,first_visit,parking_information,children_information)
values
 ('demo-church-river-city','Pastor Daniel Mwangi','Lead Pastor','Daniel leads River City with a heart for scripture, prayer, and everyday evangelism.','River City Fellowship is a multi-generational home for people seeking Jesus and meaningful community.','Make room for people to meet Jesus and serve their city.','A healthy, multiplying church in every neighborhood.','Come as you are. Our welcome team will help you find your next step.','Street parking and a guarded lot are available beside the auditorium.','Safe, joyful children groups meet during every Sunday service.'),
 ('demo-church-grace-community','Pastor Miriam Kato','Senior Pastor','Miriam teaches scripture and equips small-group leaders across Kampala.','Grace Community Church helps people build a faithful life through worship, study, and friendship.','Grow disciples who bring hope into homes and workplaces.','A city shaped by humble, faithful followers of Jesus.','Arrive 20 minutes early for a welcome and orientation.','A marked visitor lot is available behind the fellowship hall.','Children join age-based groups after the opening worship set.'),
 ('demo-church-harbor-light','Pastor Elias Wanjala','Lead Pastor','Elias serves families and young leaders along the coast.','Harbor Light Chapel is a joyful coastal church with a strong culture of prayer and service.','Carry the light of Christ into every home and street.','A thriving church family for every generation on the coast.','Our welcome team meets first-time guests at the front gate.','Parking is available across from the chapel and along the side road.','The children ministry includes worship, Bible stories, and games.');

insert into service_schedules (id,church_id,service_type,day_of_week,starts_at,notes)
values
 ('demo-schedule-river-sun','demo-church-river-city','Sunday Worship','Sunday','09:00','Main auditorium and livestream'),
 ('demo-schedule-grace-sun','demo-church-grace-community','Sunday Worship','Sunday','10:30','Family worship and children groups'),
 ('demo-schedule-harbor-sat','demo-church-harbor-light','Saturday Gathering','Saturday','16:00','Coastal worship and prayer');

insert into ministries (id,church_id,name,description,meeting_times,leader,location,contact)
values
 ('demo-ministry-river-youth','demo-church-river-city','River City Youth','A weekly space for honest questions, worship, and service.','Fridays at 18:00','Joy Wambui','Youth hall','youth@rivercity.demo.myway.test'),
 ('demo-ministry-grace-groups','demo-church-grace-community','Grace Groups','Small groups for scripture, prayer, and shared meals.','Tuesdays at 18:30','Samuel Kato','Neighborhood homes','groups@gracecommunity.demo.myway.test'),
 ('demo-ministry-harbor-outreach','demo-church-harbor-light','Harbor Light Outreach','Food support and practical care for families in need.','First Saturday monthly','Amina Salim','Community center','outreach@harborlight.demo.myway.test');

-- Churches, channels, events, stores, products, resources, and meditation rooms in the trusted catalog.
insert into platform_entities (id,kind,tenant_id,created_by,state,data_json,created_at,updated_at)
values
 ('demo-church-river-city','churches','demo-tenant-river-city','local:rivercity@demo.myway.test','published','{"name":"River City Fellowship","city":"Nairobi","country":"KE","postal":"00100","denomination":"Pentecostal","language":"English","worship":"Contemporary","website":"https://rivercity.demo.myway.test","phone":"+254 700 000 101","email":"hello@rivercity.demo.myway.test","photo":"/assets/church-river-city.png","logo":"/assets/logo-river-city.png","pastor":"Pastor Daniel Mwangi","pastorTitle":"Lead Pastor","pastorBio":"Daniel leads River City with a heart for scripture, prayer, and everyday evangelism.","about":"A welcoming Nairobi fellowship centered on scripture, worship, and practical care for neighbors.","location":"Nairobi","sunday":"09:00","midweek":"18:30","ministries":["River City Youth","River City Outreach"],"livestream":{"enabled":true,"paid":false,"url":"https://www.youtube.com/embed/jiSyB8QZzk8"}}','2026-09-17T08:10:00.000Z','2026-09-17T08:10:00.000Z'),
 ('demo-church-grace-community','churches','demo-tenant-grace-stories','local:grace@demo.myway.test','published','{"name":"Grace Community Church","city":"Kampala","country":"UG","postal":"25600","denomination":"Full Gospel","language":"English","worship":"Blended","website":"https://gracecommunity.demo.myway.test","phone":"+256 700 000 202","email":"hello@gracecommunity.demo.myway.test","photo":"/assets/church-grace-house.png","logo":"/assets/logo-grace-house.png","pastor":"Pastor Miriam Kato","pastorTitle":"Senior Pastor","pastorBio":"Miriam teaches scripture and equips small-group leaders across Kampala.","about":"A warm community helping new believers grow through small groups, prayer, and discipleship.","location":"Kampala","sunday":"10:30","midweek":"18:00","ministries":["Grace Groups","Grace Kids"],"livestream":{"enabled":true,"paid":false,"url":"https://www.youtube.com/embed/jiSyB8QZzk8"}}','2026-09-17T08:11:00.000Z','2026-09-17T08:11:00.000Z'),
 ('demo-church-harbor-light','churches','demo-tenant-harbor-light','local:harbor@demo.myway.test','published','{"name":"Harbor Light Chapel","city":"Mombasa","country":"KE","postal":"80100","denomination":"Charismatic","language":"Swahili","worship":"Contemporary","website":"https://harborlight.demo.myway.test","phone":"+254 700 000 303","email":"hello@harborlight.demo.myway.test","photo":"/assets/church-light-chapel.png","logo":"/assets/logo-light-chapel.png","pastor":"Pastor Elias Wanjala","pastorTitle":"Lead Pastor","pastorBio":"Elias serves families and young leaders along the coast.","about":"A coastal church family making room for worship, youth leadership, and community outreach.","location":"Mombasa","sunday":"08:30","midweek":"17:30","ministries":["Harbor Light Outreach","Coastal Youth"],"livestream":{"enabled":true,"paid":false,"url":"https://www.youtube.com/embed/jiSyB8QZzk8"}}','2026-09-17T08:12:00.000Z','2026-09-17T08:12:00.000Z'),

 ('demo-channel-grace-stories','channels','demo-tenant-grace-stories','local:grace@demo.myway.test','published','{"name":"Grace Stories","owner":"Grace Stories Studio","handle":"@gracestories","topic":"Testimonies","description":"Short, honest stories of faith, restoration, and everyday courage.","format":"Video","cover":"/assets/hero-global-church.png","avatar":"/assets/logo-grace-house.png","live":false,"posts":18}','2026-09-17T08:20:00.000Z','2026-09-17T08:20:00.000Z'),
 ('demo-channel-river-word','channels','demo-tenant-river-city','local:rivercity@demo.myway.test','published','{"name":"River Word","owner":"River City Fellowship","handle":"@riverword","topic":"Bible Teaching","description":"Clear Bible teaching for Monday mornings, small groups, and growing leaders.","format":"Podcast","cover":"/assets/church-river-city.png","avatar":"/assets/logo-river-city.png","live":true,"liveUrl":"https://www.youtube.com/embed/jiSyB8QZzk8","posts":32}','2026-09-17T08:21:00.000Z','2026-09-17T08:21:00.000Z'),
 ('demo-channel-harbor-worship','channels','demo-tenant-harbor-light','local:harbor@demo.myway.test','published','{"name":"Harbor Worship","owner":"Harbor Light Ministries","handle":"@harborworship","topic":"Worship","description":"Acoustic worship, prayer moments, and songs from the coast.","format":"Music","cover":"/assets/church-light-chapel.png","avatar":"/assets/logo-light-chapel.png","live":false,"posts":11}','2026-09-17T08:22:00.000Z','2026-09-17T08:22:00.000Z'),

 ('demo-event-kingdom-summit','events','demo-tenant-river-city','local:rivercity@demo.myway.test','published','{"title":"Kingdom Builders Summit","churchId":"demo-church-river-city","eventType":"in-person","startsAt":"2026-10-03T08:00:00.000Z","endsAt":"2026-10-03T16:00:00.000Z","venueName":"River City Auditorium","city":"Nairobi","country":"KE","coverImageUrl":"/assets/community-outreach.png","registrationRequired":true,"ticketPriceCents":0,"currency":"KES","totalTickets":500,"ticketsSold":0,"isFeatured":true,"isPromoted":true,"registrationUrl":"https://rivercity.demo.myway.test/summit","livestreamUrl":"https://www.youtube.com/embed/jiSyB8QZzk8","directionsUrl":"https://maps.google.com","description":"A practical day of Bible teaching, evangelism stories, and ministry workshops.","highlights":["Evangelism lab","Worship night","Leader roundtables"]}','2026-09-17T08:30:00.000Z','2026-09-17T08:30:00.000Z'),
 ('demo-event-prayer-night','events','demo-tenant-grace-stories','local:grace@demo.myway.test','published','{"title":"Citywide Prayer Night","churchId":"demo-church-grace-community","eventType":"in-person","startsAt":"2026-10-09T17:00:00.000Z","endsAt":"2026-10-09T20:00:00.000Z","venueName":"Grace Community Hall","city":"Kampala","country":"UG","coverImageUrl":"/assets/baptism-service.png","registrationRequired":false,"ticketPriceCents":0,"currency":"UGX","totalTickets":0,"ticketsSold":0,"isFeatured":true,"isPromoted":false,"registrationUrl":"","livestreamUrl":"https://www.youtube.com/embed/jiSyB8QZzk8","directionsUrl":"https://maps.google.com","description":"An evening of worship, scripture, and prayer for families across Kampala.","highlights":["Worship","Prayer rooms","Pastoral blessing"]}','2026-09-17T08:31:00.000Z','2026-09-17T08:31:00.000Z'),
 ('demo-event-global-worship','events','demo-tenant-harbor-light','local:harbor@demo.myway.test','published','{"title":"Global Worship Stream","churchId":"demo-church-harbor-light","eventType":"online","startsAt":"2026-10-17T18:00:00.000Z","endsAt":"2026-10-17T20:00:00.000Z","venueName":"Online","city":"Mombasa","country":"KE","coverImageUrl":"/assets/hero-global-church.png","registrationRequired":false,"ticketPriceCents":0,"currency":"KES","totalTickets":0,"ticketsSold":0,"isFeatured":true,"isPromoted":true,"registrationUrl":"","livestreamUrl":"https://www.youtube.com/embed/jiSyB8QZzk8","directionsUrl":"","description":"A live worship gathering connecting churches, homes, and prayer groups across the region.","highlights":["Live worship","Prayer wall","Creator guests"]}','2026-09-17T08:32:00.000Z','2026-09-17T08:32:00.000Z'),

 ('demo-store-river-city','store','demo-tenant-river-city','local:rivercity@demo.myway.test','published','{"name":"River City Store","ownerName":"River City Fellowship","category":"Books & Resources","description":"Study tools, journals, and church supplies from River City Fellowship.","image":"/assets/church-river-city.png","email":"store@rivercity.demo.myway.test","liveUrl":"https://rivercity.demo.myway.test/store","live":true}','2026-09-17T08:40:00.000Z','2026-09-17T08:40:00.000Z'),
 ('demo-store-grace-books','store','demo-tenant-grace-stories','local:grace@demo.myway.test','published','{"name":"Grace Books & Gifts","ownerName":"Grace Stories Studio","category":"Books & Resources","description":"Simple resources for prayer, testimony, and a faithful daily rhythm.","image":"/assets/church-grace-house.png","email":"shop@gracecommunity.demo.myway.test","liveUrl":"https://gracecommunity.demo.myway.test/store","live":true}','2026-09-17T08:41:00.000Z','2026-09-17T08:41:00.000Z'),
 ('demo-store-harbor-light','store','demo-tenant-harbor-light','local:harbor@demo.myway.test','published','{"name":"Harbor Light Market","ownerName":"Harbor Light Ministries","category":"Apparel & Gifts","description":"Worship apparel and simple gifts from Harbor Light Ministries.","image":"/assets/church-light-chapel.png","email":"market@harborlight.demo.myway.test","liveUrl":"https://harborlight.demo.myway.test/store","live":true}','2026-09-17T08:41:30.000Z','2026-09-17T08:41:30.000Z'),

 ('demo-product-study-bible','products','demo-tenant-river-city','local:rivercity@demo.myway.test','published','{"itemType":"product","title":"FaithLink Study Bible","storeId":"demo-store-river-city","seller":"River City Fellowship","sellerType":"Church","category":"Books","description":"A durable study Bible with guided notes, maps, and room for reflection.","price":48,"compareAt":58,"inventory":34,"status":"Active","featured":true,"image":"https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=82"}','2026-09-17T08:42:00.000Z','2026-09-17T08:42:00.000Z'),
 ('demo-product-prayer-journal','products','demo-tenant-grace-stories','local:grace@demo.myway.test','published','{"itemType":"product","title":"90-Day Prayer Journal","storeId":"demo-store-grace-books","seller":"Grace Stories Studio","sellerType":"Channel","category":"Journals","description":"Daily prompts for scripture, gratitude, prayer, and testimony.","price":22,"compareAt":28,"inventory":68,"status":"Active","featured":true,"image":"https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=82"}','2026-09-17T08:43:00.000Z','2026-09-17T08:43:00.000Z'),
 ('demo-product-worship-hoodie','products','demo-tenant-harbor-light','local:harbor@demo.myway.test','published','{"itemType":"product","title":"Worship Is My Response Hoodie","storeId":"demo-store-harbor-light","seller":"Harbor Light Ministries","sellerType":"Church","category":"Apparel","description":"A heavyweight unisex hoodie designed for worship teams and everyday wear.","price":54,"compareAt":64,"inventory":21,"status":"Active","featured":false,"image":"https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=82"}','2026-09-17T08:44:00.000Z','2026-09-17T08:44:00.000Z'),
 ('demo-product-communion-set','products','demo-tenant-grace-stories','local:grace@demo.myway.test','published','{"itemType":"product","title":"Home Communion Set","storeId":"demo-store-grace-books","seller":"Grace Community Church","sellerType":"Church","category":"Church Supplies","description":"A simple reusable communion set for families, groups, and pastoral visits.","price":38,"compareAt":0,"inventory":17,"status":"Active","featured":false,"image":"https://images.unsplash.com/photo-1473177104440-ffee2f376098?auto=format&fit=crop&w=800&q=82"}','2026-09-17T08:45:00.000Z','2026-09-17T08:45:00.000Z'),

 ('demo-resource-romans','resources','demo-tenant-river-city','local:rivercity@demo.myway.test','published','{"title":"Romans: Grace and Righteousness","creator":"River Word","topic":"Bible Study","description":"A chapter-by-chapter study outline with discussion and application questions.","type":"Text","format":"PDF","duration":"42 pages","image":"https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=800&q=82","access":"Free","price":0,"sourceUrl":"https://example.com/demo-romans.pdf","pages":["Introduction","Grace","Righteousness","Mission"]}','2026-09-17T08:50:00.000Z','2026-09-17T08:50:00.000Z'),
 ('demo-resource-prayer','resources','demo-tenant-grace-stories','local:grace@demo.myway.test','published','{"title":"30-Day Guided Prayer Journal","creator":"Grace Stories","topic":"Prayer","description":"Daily scripture, reflection prompts, gratitude, and prayer tracking.","type":"Text","format":"EPUB","duration":"30 days","image":"https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=800&q=82","access":"Paid","price":8,"sourceUrl":"https://example.com/demo-prayer.epub","pages":["Day 1","Day 2","Day 3"]}','2026-09-17T08:51:00.000Z','2026-09-17T08:51:00.000Z'),
 ('demo-resource-gospel-basics','resources','demo-tenant-river-city','local:rivercity@demo.myway.test','published','{"title":"The Gospel: A Clear Foundation","creator":"River City Fellowship","topic":"Discipleship","description":"A clear introduction to salvation, grace, faith, and new life in Christ.","type":"Video","format":"MP4","duration":"48 min","image":"https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=800&q=82","access":"Free","price":0,"sourceUrl":"https://example.com/demo-gospel.mp4","embedUrl":"https://www.youtube.com/embed/jiSyB8QZzk8"}','2026-09-17T08:52:00.000Z','2026-09-17T08:52:00.000Z'),

 ('demo-meditation-peace','meditation','demo-tenant-grace-stories','local:grace@demo.myway.test','published','{"title":"Be Still and Abide","subtitle":"Calm your soul and release every anxious thought into His hands.","category":"featured","categoryLabel":"Featured room","theme":"chapel","template":"timer","toneFreq":432,"cover":"/assets/meditation-chapel.png","selectedAudio":"bible","commentsEnabled":false,"ownerName":"Grace Stories","verses":[{"topic":"Be Still","text":"The Lord is in His holy temple; let all the earth keep silence before Him.","ref":"Habakkuk 2:20"},{"topic":"Perfect Peace","text":"Peace I leave with you; my peace I give you.","ref":"John 14:27"}],"audioTracks":{"bible":{"title":"Audio Bible: Psalms of Peace","cat":"Dramatized Scripture","freq":432},"instrumental":{"title":"Still Waters Harp and Strings","cat":"Soaking Instrumental","freq":432}}}','2026-09-17T08:55:00.000Z','2026-09-17T08:55:00.000Z'),
 ('demo-meditation-forest','meditation','demo-tenant-harbor-light','local:harbor@demo.myway.test','published','{"title":"Quiet Waters for the Journey","subtitle":"A gentle scripture room for reflection, breath, and renewal.","category":"themes","categoryLabel":"Scriptural theme","theme":"forest","template":"nature","toneFreq":528,"cover":"/assets/meditation-forest.png","selectedAudio":"instrumental","commentsEnabled":true,"ownerName":"Harbor Light Ministries","verses":[{"topic":"Quiet Waters","text":"He leads me beside quiet waters; he refreshes my soul.","ref":"Psalm 23:2-3"},{"topic":"Renewal","text":"Those who hope in the Lord will renew their strength.","ref":"Isaiah 40:31"}],"audioTracks":{"instrumental":{"title":"Forest Strings","cat":"Soaking Instrumental","freq":528},"worship":{"title":"Acoustic Renewal","cat":"Christian Worship","freq":528}}}','2026-09-17T08:56:00.000Z','2026-09-17T08:56:00.000Z'),
 ('demo-meditation-stars','meditation','demo-tenant-river-city','local:rivercity@demo.myway.test','published','{"title":"Night Watch Prayer","subtitle":"A quiet room for intercession, surrender, and faithful listening.","category":"bible-books","categoryLabel":"Bible book","theme":"stars","template":"journey","toneFreq":396,"cover":"/assets/meditation-stars.png","selectedAudio":"silence","commentsEnabled":false,"ownerName":"River City Fellowship","verses":[{"topic":"Watch and Pray","text":"Stay awake and pray that you will not fall into temptation.","ref":"Matthew 26:41"},{"topic":"Hope","text":"The Lord is good to those whose hope is in him.","ref":"Lamentations 3:25"}],"audioTracks":{"silence":{"title":"Silence and Ambience Only","cat":"Ambient Atmosphere","freq":396},"sermon":{"title":"Night Watch Reflection","cat":"Pastoral Teaching","freq":396}}}','2026-09-17T08:57:00.000Z','2026-09-17T08:57:00.000Z');

-- Legacy event projections keep the older public pages populated too.
insert into events (id,church_id,title,event_type,starts_at,ends_at,venue_name,city,country,cover_image_url,registration_required,ticket_price_cents,currency,total_tickets,tickets_sold,is_featured,is_promoted,registration_url,livestream_url,directions_url,description)
values
 ('demo-event-kingdom-summit','demo-church-river-city','Kingdom Builders Summit','in-person','2026-10-03T08:00:00.000Z','2026-10-03T16:00:00.000Z','River City Auditorium','Nairobi','KE','/assets/community-outreach.png',1,0,'KES',500,0,1,1,'https://rivercity.demo.myway.test/summit','https://www.youtube.com/embed/jiSyB8QZzk8','https://maps.google.com','A practical day of Bible teaching, evangelism stories, and ministry workshops.'),
 ('demo-event-prayer-night','demo-church-grace-community','Citywide Prayer Night','in-person','2026-10-09T17:00:00.000Z','2026-10-09T20:00:00.000Z','Grace Community Hall','Kampala','UG','/assets/baptism-service.png',0,0,'UGX',0,0,1,0,'','https://www.youtube.com/embed/jiSyB8QZzk8','https://maps.google.com','An evening of worship, scripture, and prayer for families across Kampala.'),
 ('demo-event-global-worship','demo-church-harbor-light','Global Worship Stream','streamed','2026-10-17T18:00:00.000Z','2026-10-17T20:00:00.000Z','Online','Mombasa','KE','/assets/hero-global-church.png',0,0,'KES',0,0,1,1,'','https://www.youtube.com/embed/jiSyB8QZzk8','','A live worship gathering connecting churches, homes, and prayer groups across the region.');

-- Curated Spotlight items owned by the demo creators.
insert into spotlight_items (id,tenant_id,created_by,channel_entity_id,subject_entity_id,content_type,title,caption,creator_name,creator_handle,creator_avatar_url,media_url,poster_url,full_content_url,preview_source,preview_start_seconds,preview_end_seconds,duration_seconds,cta_label,cta_url,status,placement_kind,priority,published_at,created_at,updated_at)
values
 ('demo-spotlight-grace','demo-tenant-grace-stories','local:grace@demo.myway.test','demo-channel-grace-stories','demo-church-grace-community','long-preview','A new beginning in faith','Grace shares how one faithful conversation helped her begin again.','Grace Stories','@gracestories','/assets/logo-grace-house.png','','/assets/spotlight/grace-testimony.webp','app.html?view=channels','creator',42,87,1920,'Watch full video','app.html?view=channels','live','editorial',100,'2026-09-17T09:00:00.000Z','2026-09-17T08:58:00.000Z','2026-09-17T09:00:00.000Z'),
 ('demo-spotlight-river','demo-tenant-river-city','local:rivercity@demo.myway.test','demo-channel-river-word','demo-church-river-city','short','Faith moves when we step out','Pastor Daniel shares what God taught him while serving his city.','River Word','@riverword','/assets/logo-river-city.png','','/assets/spotlight/pastor-marcus.webp','app.html?view=channels','automatic',0,60,80,'Open Channel','app.html?view=channels','live','organic',90,'2026-09-17T09:00:00.000Z','2026-09-17T08:59:00.000Z','2026-09-17T09:00:00.000Z'),
 ('demo-spotlight-harbor','demo-tenant-harbor-light','local:harbor@demo.myway.test','demo-channel-harbor-worship','demo-church-harbor-light','church','Harbor Light Chapel','A coastal church family making room for worship, youth leadership, and community outreach.','Harbor Light Chapel','@harborlight','/assets/logo-light-chapel.png','','/assets/church-light-chapel.png','app.html?view=directory','creator',0,null,null,'View Church','app.html?view=directory','live','editorial',80,'2026-09-17T09:00:00.000Z','2026-09-17T09:00:00.000Z','2026-09-17T09:00:00.000Z');

insert into spotlight_comments (id,item_id,user_id,body,status,created_at)
values
 ('demo-comment-grace-1','demo-spotlight-grace','local:rivercity@demo.myway.test','This is exactly the encouragement I needed today.','visible','2026-09-17T09:10:00.000Z'),
 ('demo-comment-grace-2','demo-spotlight-grace','local:harbor@demo.myway.test','Thank you for sharing a story of hope.','visible','2026-09-17T09:11:00.000Z'),
 ('demo-comment-river-1','demo-spotlight-river','local:grace@demo.myway.test','Faith really does move us into action.','visible','2026-09-17T09:12:00.000Z');

insert into spotlight_engagements (item_id,user_id,action,created_at)
values
 ('demo-spotlight-grace','local:rivercity@demo.myway.test','like','2026-09-17T09:10:00.000Z'),
 ('demo-spotlight-grace','local:harbor@demo.myway.test','save','2026-09-17T09:11:00.000Z'),
 ('demo-spotlight-river','local:grace@demo.myway.test','like','2026-09-17T09:12:00.000Z'),
 ('demo-spotlight-harbor','local:rivercity@demo.myway.test','like','2026-09-17T09:13:00.000Z');
