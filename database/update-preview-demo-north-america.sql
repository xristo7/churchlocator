-- Preview-only correction for the initial regional demo catalog.
-- This updates the three explicitly named demo records without deleting
-- any visitor, creator, or other non-demo preview data.

update churches
set city = 'Edmonton', country = 'CA', postal_code = 'T5J 0N3', language = 'English',
    phone = '+1 780 555 0101', description = 'A welcoming Edmonton fellowship centered on scripture, worship, and practical care for neighbors.'
where id = 'demo-church-river-city';

update churches
set city = 'Minneapolis', country = 'US', postal_code = '55401', language = 'English',
    phone = '+1 612 555 0202', description = 'A warm Minneapolis community helping new believers grow through small groups, prayer, and discipleship.'
where id = 'demo-church-grace-community';

update churches
set city = 'Halifax', country = 'CA', postal_code = 'B3H 1Y6', language = 'English',
    phone = '+1 902 555 0303', description = 'A Halifax church family making room for worship, youth leadership, and community outreach.'
where id = 'demo-church-harbor-light';

update church_profiles
set pastor_bio = 'Miriam teaches scripture and equips small-group leaders across Minneapolis.'
where church_id = 'demo-church-grace-community';

update church_profiles
set pastor_bio = 'Elias serves families and young leaders across Halifax.',
    about = 'Harbor Light Chapel is a joyful church with a strong culture of prayer and service.',
    vision = 'A thriving church family for every generation in Halifax.',
    first_visit = 'Our welcome team meets first-time guests at the front entrance.',
    parking_information = 'Parking is available beside the chapel and along the side street.'
where church_id = 'demo-church-harbor-light';

update service_schedules
set notes = 'Community worship and prayer'
where id = 'demo-schedule-harbor-sat';

update platform_entities
set data_json = json_set(data_json,
  '$.city', 'Edmonton', '$.country', 'CA', '$.postal', 'T5J 0N3', '$.phone', '+1 780 555 0101',
  '$.about', 'A welcoming Edmonton fellowship centered on scripture, worship, and practical care for neighbors.', '$.location', 'Edmonton')
where id = 'demo-church-river-city';

update platform_entities
set data_json = json_set(data_json,
  '$.city', 'Minneapolis', '$.country', 'US', '$.postal', '55401', '$.phone', '+1 612 555 0202',
  '$.pastorBio', 'Miriam teaches scripture and equips small-group leaders across Minneapolis.',
  '$.about', 'A warm Minneapolis community helping new believers grow through small groups, prayer, and discipleship.', '$.location', 'Minneapolis')
where id = 'demo-church-grace-community';

update platform_entities
set data_json = json_set(data_json,
  '$.city', 'Halifax', '$.country', 'CA', '$.postal', 'B3H 1Y6', '$.language', 'English', '$.phone', '+1 902 555 0303',
  '$.pastorBio', 'Elias serves families and young leaders across Halifax.',
  '$.about', 'A Halifax church family making room for worship, youth leadership, and community outreach.', '$.location', 'Halifax')
where id = 'demo-church-harbor-light';

update events
set city = 'Edmonton', country = 'CA', currency = 'CAD'
where id = 'demo-event-kingdom-summit';

update events
set city = 'Minneapolis', country = 'US', currency = 'USD',
    description = 'An evening of worship, scripture, and prayer for families across Minneapolis.'
where id = 'demo-event-prayer-night';

update events
set city = 'Halifax', country = 'CA', currency = 'CAD',
    description = 'A live worship gathering connecting churches, homes, and prayer groups across Canada and the United States.'
where id = 'demo-event-global-worship';

update platform_entities
set data_json = json_set(data_json, '$.city', 'Edmonton', '$.country', 'CA', '$.currency', 'CAD')
where id = 'demo-event-kingdom-summit';

update platform_entities
set data_json = json_set(data_json,
  '$.city', 'Minneapolis', '$.country', 'US', '$.currency', 'USD',
  '$.description', 'An evening of worship, scripture, and prayer for families across Minneapolis.')
where id = 'demo-event-prayer-night';

update platform_entities
set data_json = json_set(data_json,
  '$.city', 'Halifax', '$.country', 'CA', '$.currency', 'CAD',
  '$.description', 'A live worship gathering connecting churches, homes, and prayer groups across Canada and the United States.')
where id = 'demo-event-global-worship';
