// Canonical ministry list (server copy). Keep in sync with public/ministries.js (tests enforce it).
const MINISTRIES = [
 {
  "slug": "children",
  "label": "Children's Ministry",
  "description": "Bible lessons and activities for children"
 },
 {
  "slug": "youth",
  "label": "Youth Ministry",
  "description": "Faith, mentorship, and fellowship for teenagers"
 },
 {
  "slug": "young-adults",
  "label": "Young Adults Ministry",
  "description": "Fellowship and guidance for young adults"
 },
 {
  "slug": "men",
  "label": "Men's Ministry",
  "description": "Spiritual growth and support for men"
 },
 {
  "slug": "women",
  "label": "Women's Ministry",
  "description": "Spiritual growth and support for women"
 },
 {
  "slug": "marriage-family",
  "label": "Marriage & Family Ministry",
  "description": "Supporting couples, parents, and families"
 },
 {
  "slug": "singles",
  "label": "Singles Ministry",
  "description": "Fellowship and spiritual support for single adults"
 },
 {
  "slug": "seniors",
  "label": "Seniors Ministry",
  "description": "Fellowship and care for older adults"
 },
 {
  "slug": "prayer",
  "label": "Prayer Ministry",
  "description": "Prayer meetings and intercession"
 },
 {
  "slug": "worship-music",
  "label": "Worship & Music Ministry",
  "description": "Choir, musicians, and worship teams"
 },
 {
  "slug": "bible-study",
  "label": "Bible Study & Discipleship",
  "description": "Learning Scripture and growing in faith"
 },
 {
  "slug": "new-believers",
  "label": "New Believers Ministry",
  "description": "Helping new Christians understand their faith"
 },
 {
  "slug": "evangelism-outreach",
  "label": "Evangelism & Outreach",
  "description": "Sharing the gospel and welcoming others"
 },
 {
  "slug": "missions",
  "label": "Missions Ministry",
  "description": "Supporting local and international mission work"
 },
 {
  "slug": "small-groups",
  "label": "Small Groups & Home Fellowships",
  "description": "Building relationships through smaller gatherings"
 },
 {
  "slug": "pastoral-care",
  "label": "Pastoral Care & Counseling",
  "description": "Spiritual guidance and emotional support"
 },
 {
  "slug": "community-care",
  "label": "Community Care & Benevolence",
  "description": "Food, clothing, and practical assistance"
 },
 {
  "slug": "visitation",
  "label": "Hospital & Home Visitation",
  "description": "Visiting people who are sick or housebound"
 },
 {
  "slug": "grief-support",
  "label": "Grief & Bereavement Support",
  "description": "Supporting people experiencing loss"
 },
 {
  "slug": "disability-access",
  "label": "Disability & Accessibility Ministry",
  "description": "Helping people with disabilities participate fully"
 },
 {
  "slug": "hospitality",
  "label": "Hospitality & Welcome Ministry",
  "description": "Welcoming visitors and helping them settle in"
 },
 {
  "slug": "ushering",
  "label": "Ushering Ministry",
  "description": "Seating, guidance, and service coordination"
 },
 {
  "slug": "media-production",
  "label": "Media & Production Ministry",
  "description": "Sound, projection, photography, and livestreaming"
 },
 {
  "slug": "transportation",
  "label": "Transportation Ministry",
  "description": "Helping people travel to church"
 },
 {
  "slug": "prison",
  "label": "Prison Ministry",
  "description": "Spiritual support for incarcerated people"
 },
 {
  "slug": "campus",
  "label": "Campus Ministry",
  "description": "Reaching and supporting college students"
 }
];

// Legacy / free-text values mapped onto canonical slugs so existing church data keeps matching.
const MINISTRY_ALIASES = {
 "kids": "children",
 "kids & children": "children",
 "children": "children",
 "children's ministry": "children",
 "sunday school": "children",
 "youth": "youth",
 "youth & students": "youth",
 "youth ministry": "youth",
 "students": "youth",
 "student ministry": "youth",
 "teens": "youth",
 "young adults": "young-adults",
 "men": "men",
 "women": "women",
 "families": "marriage-family",
 "family": "marriage-family",
 "marriage": "marriage-family",
 "singles": "singles",
 "seniors": "seniors",
 "prayer": "prayer",
 "prayer groups": "prayer",
 "intercession": "prayer",
 "worship": "worship-music",
 "worship team": "worship-music",
 "music": "worship-music",
 "choir": "worship-music",
 "arts": "worship-music",
 "bible study": "bible-study",
 "discipleship": "bible-study",
 "alpha": "new-believers",
 "new believers": "new-believers",
 "evangelism": "evangelism-outreach",
 "outreach": "evangelism-outreach",
 "love your neighbour": "community-care",
 "missions": "missions",
 "groups": "small-groups",
 "small groups": "small-groups",
 "community": "small-groups",
 "home fellowships": "small-groups",
 "cell groups": "small-groups",
 "care": "pastoral-care",
 "counseling": "pastoral-care",
 "counselling": "pastoral-care",
 "foodbank": "community-care",
 "food bank": "community-care",
 "benevolence": "community-care",
 "visitation": "visitation",
 "grief": "grief-support",
 "bereavement": "grief-support",
 "disability": "disability-access",
 "accessibility": "disability-access",
 "hospitality": "hospitality",
 "welcome": "hospitality",
 "ushering": "ushering",
 "ushers": "ushering",
 "media": "media-production",
 "production": "media-production",
 "transportation": "transportation",
 "free sunday transportation": "transportation",
 "rides": "transportation",
 "ride": "transportation",
 "prison": "prison",
 "campus": "campus",
 "college": "campus"
};

function normalizeMinistry(value) {
  const raw = String(value == null ? "" : value).trim();
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/\s+/g, " ");
  if (MINISTRIES.some(m => m.slug === key)) return key;
  const byLabel = MINISTRIES.find(m => m.label.toLowerCase() === key);
  if (byLabel) return byLabel.slug;
  if (MINISTRY_ALIASES[key]) return MINISTRY_ALIASES[key];
  const trimmed = key.replace(/\s+ministry$/, "").replace(/\s+ministries$/, "");
  return MINISTRY_ALIASES[trimmed] || null;
}

function ministryLabel(value) {
  const slug = normalizeMinistry(value);
  const hit = slug && MINISTRIES.find(m => m.slug === slug);
  return hit ? hit.label : String(value || "");
}

function ministrySlugs(values) {
  const list = Array.isArray(values) ? values : String(values || "").split(",");
  return [...new Set(list.map(normalizeMinistry).filter(Boolean))];
}

export { MINISTRIES, MINISTRY_ALIASES, normalizeMinistry, ministryLabel, ministrySlugs };
