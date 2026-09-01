import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('public/meditation.html', 'utf8');
const js = fs.readFileSync('public/meditation.js', 'utf8');
const css = fs.readFileSync('public/styles.css', 'utf8');

test('1. Lobby with Room Cards (Favorites, Bible Books, Scriptural Themes & Filter Bar)', () => {
  assert.match(html, /id="meditation-lobby"/, 'Lobby container exists');
  assert.match(html, /id="sec-featured"/, 'Favorite & Featured section exists');
  assert.match(html, /id="grid-featured"/, 'Featured grid container exists');
  assert.match(html, /id="sec-books"/, 'Books of the Bible section exists');
  assert.match(html, /id="grid-books"/, 'Books grid container exists');
  assert.match(html, /id="sec-themes"/, 'Scriptural Themes section exists');
  assert.match(html, /id="grid-themes"/, 'Themes grid container exists');

  assert.match(html, /data-lobby-filter="all"/, 'All filter exists');
  assert.match(html, /data-lobby-filter="featured"/, 'Featured filter exists');
  assert.match(html, /data-lobby-filter="bible-books"/, 'Bible books filter exists');
  assert.match(html, /data-lobby-filter="themes"/, 'Themes filter exists');

  assert.match(js, /id:\s*"room-peace"/, 'Room peace defined');
  assert.match(js, /id:\s*"room-psalms"/, 'Room psalms defined');
  assert.match(js, /id:\s*"room-faith"/, 'Room faith defined');
  assert.match(js, /id:\s*"room-healing"/, 'Room healing defined');
  assert.match(js, /id:\s*"room-love"/, 'Room love defined');
});

test('2. Distraction-Free In-Room Sanctuary View (Pulsing Orb + Scripture + Fullscreen)', () => {
  assert.match(html, /id="meditation-room-view"/, 'Room view exists');
  assert.match(html, /id="sacred-orb-container"/, 'Sacred orb container exists');
  assert.match(html, /id="sacred-pulsing-orb"/, 'Pulsing orb element exists');
  assert.match(html, /id="sacred-breath-guide"/, 'Breath guide text exists');
  assert.match(css, /@keyframes sacredBreathPulse/, 'Breathing pulse animation defined in CSS');

  assert.match(html, /id="room-scripture-display"/, 'Scripture display container exists');
  assert.match(html, /id="room-scripture-topic"/, 'Scripture topic tag exists');
  assert.match(html, /id="room-scripture-text"/, 'Scripture text blockquote exists');
  assert.match(html, /id="room-scripture-ref"/, 'Scripture cite reference exists');
  assert.match(html, /id="room-next-verse-btn"/, 'Next scripture button exists');

  assert.match(html, /id="room-fullscreen-btn"/, 'Fullscreen button exists');
  assert.match(js, /function toggleFullscreen\(/, 'toggleFullscreen function wired in JS');
});

test('3. Audio Selection In-Room Only (No audio before entering room)', () => {
  assert.match(js, /let isPlaying\s*=\s*false;/, 'Audio starts paused/inactive');
  assert.match(js, /function selectInRoomAudio\(/, 'In-room audio selection function exists');
  assert.match(html, /data-audio-type="bible"/, 'Audio Bible track option exists');
  assert.match(html, /data-audio-type="instrumental"/, 'Instrumental track option exists');
  assert.match(html, /data-audio-type="worship"/, 'Worship track option exists');
  assert.match(html, /data-audio-type="sermon"/, 'Sermon track option exists');
  assert.match(html, /data-audio-type="silence"/, 'Silence / Ambience option exists');
});

test('4. Platform Theme UI Compliance (Light & Dark Mode rules)', () => {
  assert.match(css, /html\[data-theme="light"\] \.meditation-room-view[\s\S]*?background:\s*#f8fafc/i, 'Light mode uses bright #f8fafc background');
  assert.match(css, /html\[data-theme="light"\] \.meditation-room-sidebar[\s\S]*?background:\s*rgba\(255,\s*255,\s*255/i, 'Light mode uses bright white sidebar');
  assert.match(css, /html\[data-theme="light"\] \.room-scripture-display blockquote[\s\S]*?color:\s*#0f172a/i, 'Light mode scripture text is high-contrast dark #0f172a');
  assert.match(css, /html\[data-theme="light"\] \.room-bottom-player[\s\S]*?background:\s*var\(--surface\)/i, 'Light mode bottom player uses surface background');

  assert.match(css, /html\[data-theme="dark"\] \.meditation-room-view[\s\S]*?background:\s*#030712/i, 'Dark mode uses dark #030712 background');
  assert.match(css, /html\[data-theme="dark"\] \.meditation-room-sidebar[\s\S]*?background:\s*rgba\(8,\s*12,\s*24/i, 'Dark mode uses dark sidebar');
  assert.match(css, /html\[data-theme="dark"\] \.room-scripture-display blockquote[\s\S]*?color:\s*#ffffff/i, 'Dark mode scripture text is bright #ffffff');
});

test('5. 2-Column Layout with Left-Side Navigation & Collapsible Accordion Subitems', () => {
  assert.match(css, /\.meditation-room-view:not\(\[hidden\]\)[\s\S]*?display:\s*flex !important;\s*flex-direction:\s*row !important;/, 'Room view is flex row 2-column');
  
  assert.match(html, /<aside class="meditation-room-sidebar" id="meditation-room-sidebar">/, 'Sidebar is an aside tag');
  assert.match(html, /id="room-exit-btn"/, 'Sidebar exit button exists');
  assert.match(html, /id="room-badge-title"/, 'Sidebar room badge title exists');
  
  assert.match(html, /id="audio-select-trigger"/, 'Audio accordion trigger exists');
  assert.match(html, /id="room-switch-trigger"/, 'Room switch accordion trigger exists');
  assert.match(html, /id="theme-select-trigger"/, 'Atmosphere accordion trigger exists');
  assert.match(html, /id="ambient-trigger"/, 'Ambient mixer accordion trigger exists');
  assert.match(html, /id="timer-trigger"/, 'Timer accordion trigger exists');

  assert.match(html, /id="audio-select-menu"/, 'Audio menu panel exists');
  assert.match(html, /id="room-switch-menu"/, 'Room switch menu panel exists');
  assert.match(html, /id="theme-select-menu"/, 'Theme menu panel exists');
  assert.match(html, /id="ambient-menu"/, 'Ambient menu panel exists');
  assert.match(html, /id="timer-menu"/, 'Timer menu panel exists');

  assert.match(js, /aria-expanded/, 'Manages aria-expanded attribute on triggers');
  assert.match(js, /function closeAllDropdowns\(/, 'Closes open accordions for mutual exclusivity');
});

test('6. Single-Viewport Responsive Fit (100vh No Overflow & Docked Audio Player without Overlap)', () => {
  assert.match(css, /\.meditation-room-main[\s\S]*?height:\s*100vh !important;/i, 'Right column main has 100vh height');
  assert.match(css, /\.meditation-room-main[\s\S]*?overflow:\s*hidden !important;/i, 'Right column main has overflow:hidden');
  assert.match(css, /\.meditation-room-main[\s\S]*?justify-content:\s*space-between !important;/i, 'Right column uses vertical space-between flexbox');

  assert.match(css, /\.meditation-room-view \.room-bottom-player[\s\S]*?position:\s*relative !important;/i, 'Bottom player is positioned relatively inside right column');
  assert.match(css, /\.meditation-room-view \.room-bottom-player[\s\S]*?bottom:\s*auto !important;/i, 'Bottom player bottom offset is cleared');
  assert.match(css, /\.meditation-room-view \.room-bottom-player[\s\S]*?transform:\s*none !important;/i, 'Bottom player transform is cleared');
});

test('7. Dynamic Theme-Colored Orb Pulse & Accent Adaptation', () => {
  assert.match(js, /function applyThemeColors\(color,\s*hue\)/, 'applyThemeColors exists');
  assert.match(js, /--room-color/, 'Sets --room-color CSS property');
  assert.match(js, /--room-hue/, 'Sets --room-hue CSS property');
  assert.match(js, /--room-glow/, 'Sets --room-glow CSS property');
  
  assert.match(js, /"room-peace":\s*\{\s*"color":\s*"#3b82f6"/, 'Room peace has sky blue color');
  assert.match(js, /"room-healing":\s*\{\s*"color":\s*"#10b981"/, 'Room healing has emerald restoration color');
  assert.match(js, /"room-psalms":\s*\{\s*"color":\s*"#f59e0b"/, 'Room psalms has amber gold color');
});

test('8. Room Entry & Exit Navigation (Opens on card click, returns on All Rooms)', () => {
  assert.match(html, /<div class="meditation-room-view" id="meditation-room-view" hidden>/, 'Room view is hidden by default in HTML');
  assert.match(css, /\.meditation-room-view\[hidden\][\s\S]*?display:\s*none !important;/, 'Hidden room view is display:none');
  
  assert.match(js, /function enterRoom\(roomId/, 'enterRoom function defined');
  assert.match(js, /data-enter-room/, 'Cards contain data-enter-room attributes');
  assert.match(js, /function exitToLobby\(/, 'exitToLobby function defined');
});
