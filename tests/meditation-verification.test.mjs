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

test('4. Platform Theme UI Compliance (Light & Dark Mode rules & Visible Backdrop)', () => {
  assert.match(css, /html\[data-theme="light"\] \.meditation-room-view[\s\S]*?background:\s*#f8fafc/i, 'Light mode uses bright #f8fafc background');
  assert.match(css, /html\[data-theme="light"\] \.meditation-room-sidebar[\s\S]*?background:\s*rgba\(255,\s*255,\s*255/i, 'Light mode uses bright white sidebar');
  assert.match(css, /html\[data-theme="light"\] \.room-scripture-display blockquote[\s\S]*?color:\s*#0f172a/i, 'Light mode scripture text is high-contrast dark #0f172a');
  assert.match(css, /html\[data-theme="light"\] \.meditation-backdrop[\s\S]*?opacity:\s*0.88/i, 'Light mode backdrop has high visibility opacity');

  assert.match(css, /html\[data-theme="dark"\] \.meditation-room-view[\s\S]*?background:\s*#030712/i, 'Dark mode uses dark #030712 background');
  assert.match(css, /html\[data-theme="dark"\] \.meditation-room-sidebar[\s\S]*?background:\s*rgba\(8,\s*12,\s*24/i, 'Dark mode uses dark sidebar');
  assert.match(css, /html\[data-theme="dark"\] \.room-scripture-display blockquote[\s\S]*?color:\s*#ffffff/i, 'Dark mode scripture text is bright #ffffff');
});

test('5. Distraction-Free Sidebar-Free Sanctuary with Creator Settings, Invite Links & Live Chat', () => {
  assert.ok(!html.includes('<aside class="meditation-room-sidebar"'), 'Sanctuary room view has no sidebar');
  assert.match(html, /class="sanctuary-top-bar"/, 'Sanctuary top bar exists');
  assert.match(html, /id="room-exit-btn"/, 'Room exit button exists');
  assert.match(html, /id="room-badge-title"/, 'Room badge title exists');
  assert.match(html, /id="room-invite-btn"/, 'Invite friend button exists');
  assert.match(html, /id="modal-invite-friend"/, 'Invite modal dialog exists');
  assert.match(html, /id="modal-create-room"/, 'Create virtual room modal dialog exists');

  assert.match(html, /id="chat-toggle-btn"/, 'Minimized live chat toggle pill exists');
  assert.match(html, /id="meditation-chat-drawer"/, 'Chat drawer panel exists');
  assert.match(html, /id="chat-enable-toggle"/, 'Host comment moderation toggle exists');
  assert.match(html, /id="chat-messages-feed"/, 'Live messages feed exists');

  assert.match(js, /function openInviteFriendModal\(/, 'Invite friend modal opener exists');
  assert.match(js, /function toggleLiveComments\(/, 'Host comment toggle function exists');
  assert.match(js, /function sendComment\(/, 'Send comment function exists');
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

test('9. Task 4 Requirements: Dynamic Background Music on Entry, 5 Media Types & Friend Invite', () => {
  // Background music starts and adapts on room entry
  assert.match(js, /enterRoom\(roomId,\s*autoStartAudio\s*=\s*true/, 'enterRoom defaults autoStartAudio to true for automatic playback on entry');
  assert.match(js, /startAudioHarmonics\(room\.toneFreq\s*\|\|\s*432\)/, 'Audio harmonics frequency adapts to room tone');

  // 5 Media Types: Pictures, Teachings, Prayers, Worship Audio, Scriptures
  assert.match(html, /id="sanctuary-media-tabs"/, 'Sanctuary media tabs container exists in HTML');
  assert.match(html, /data-media-type="scriptures"/, 'Scriptures media type tab exists');
  assert.match(html, /data-media-type="pictures"/, 'Pictures media type tab exists');
  assert.match(html, /data-media-type="prayers"/, 'Prayers media type tab exists');
  assert.match(html, /data-media-type="teachings"/, 'Teachings media type tab exists');
  assert.match(html, /data-media-type="worship"/, 'Worship media type tab exists');
  assert.match(html, /id="room-picture-display"/, 'Picture visualizer container exists');

  assert.match(js, /function switchMediaType\(/, 'switchMediaType function defined in JS');
  assert.match(js, /function renderActiveMediaContent\(/, 'renderActiveMediaContent function defined in JS');

  // Invite Friend with SMS and Social Sharing
  assert.match(html, /id="share-sms"/, 'SMS Text share button exists in invite dialog');
  assert.match(js, /share-sms/, 'SMS share URL wired in JS');
});

test('10. 5 Sanctuary Design Templates (Timer, Ripple, Journey, Nature, Sunburst)', () => {
  // Template 1: Be Still (Circular Countdown Timer)
  assert.match(html, /id="stage-template-timer"/, 'Template 1: Timer stage exists');
  assert.match(html, /id="timer-progress-ring"/, 'Timer SVG progress ring exists');
  assert.match(html, /id="timer-countdown-digits"/, 'Timer digital countdown digits exist');
  assert.match(html, /id="btn-interval-bell"/, 'Interval bell toggle button exists');
  assert.match(html, /id="btn-timer-primary-toggle"/, 'Primary timer play/pause button exists');
  assert.match(html, /id="btn-timer-end-session"/, 'End session button exists');

  // Template 2: Breath Prayer (Concentric Ripples)
  assert.match(html, /id="stage-template-ripple"/, 'Template 2: Ripple stage exists');
  assert.match(html, /class="concentric-wave wave-1"/, 'Concentric ripple waves exist');
  assert.match(html, /id="ripple-cue-text"/, 'Ripple inhale/exhale cue text exists');
  assert.match(html, /id="ripple-focus-word"/, 'Ripple focus word element exists');

  // Template 3: Guided Prayer Journey (Milestones)
  assert.match(html, /id="stage-template-journey"/, 'Template 3: Journey stage exists');
  assert.match(html, /id="journey-track-fill"/, 'Journey track fill element exists');
  assert.match(html, /class="journey-node/, 'Journey step nodes exist');
  assert.match(html, /id="journey-question-prompt"/, 'Journey reflective question prompt exists');

  // Template 4: Nature & Audio Teaching
  assert.match(html, /id="stage-template-nature"/, 'Template 4: Nature stage exists');
  assert.match(html, /class="nature-scripture-card"/, 'Nature card exists');
  assert.match(html, /class="nature-leaf-badge"/, 'Nature leaf badge exists');

  // Template 5: Joy & Praise (Sunburst)
  assert.match(html, /id="stage-template-sunburst"/, 'Template 5: Sunburst stage exists');
  assert.match(html, /class="sunburst-calligraphy-text"/, 'Sunburst calligraphy element exists');

  // JS Template Switcher & Breathing Controller
  assert.match(js, /function applyRoomTemplate\(/, 'applyRoomTemplate function defined in JS');
  assert.match(js, /function startBreathingGuide\(/, 'startBreathingGuide function defined in JS');
  assert.match(js, /function setJourneyStep\(/, 'setJourneyStep function defined in JS');
});

test('11. Multi-Mode Time Controllers & Web Audio Bell Chime', () => {
  assert.match(js, /function initTimerController\(/, 'initTimerController function defined in JS');
  assert.match(js, /function startTimerTicker\(/, 'startTimerTicker function defined in JS');
  assert.match(js, /function playIntervalBell\(/, 'playIntervalBell Web Audio synthesizer defined in JS');
  assert.match(js, /function formatTimeDigits\(/, 'formatTimeDigits function defined in JS');

  // Create Room modal duration & timeMode options
  assert.match(html, /id="new-room-time-mode"/, 'Time mode select exists in create modal');
  assert.match(html, /value="timed"/, 'Timed session mode exists');
  assert.match(html, /value="loop"/, 'Continuous loop mode exists');
  assert.match(html, /value="teaching"/, 'Teaching duration mode exists');
  assert.match(html, /id="new-room-duration-minutes"/, 'Duration minutes dropdown exists');
});

test('12. Theme Color Palette Swatches & Bright/Dark Mode Compliance', () => {
  // Color palette in create room modal
  assert.match(html, /id="color-palette-swatches"/, 'Color palette container exists in create modal');
  assert.match(html, /data-color="#4a5d3f"/, 'Forest Olive color swatch exists');
  assert.match(html, /data-color="#b86b5c"/, 'Terracotta Rust swatch exists');
  assert.match(html, /data-color="#d97706"/, 'Sunrise Amber swatch exists');
  assert.match(html, /data-color="#2a8f89"/, 'Mist Cyan swatch exists');
  assert.match(html, /id="new-room-custom-color"/, 'Custom color hex picker exists');

  // In-room mode toggle
  assert.match(html, /id="room-theme-toggle-btn"/, 'Room theme mode toggle button exists in header');
  assert.match(js, /function applyRoomMode\(/, 'applyRoomMode function defined in JS');
});

test('13. Scripture Carousel, Multi-Verse Series & Configurable Auto-Play', () => {
  assert.match(html, /id="room-scripture-carousel-bar"/, 'Scripture carousel bar exists');
  assert.match(html, /id="scripture-prev-btn"/, 'Scripture prev button exists');
  assert.match(html, /id="scripture-counter-pill"/, 'Scripture counter pill exists');
  assert.match(html, /id="scripture-autoplay-indicator"/, 'Scripture auto-play indicator exists');

  assert.match(js, /function initScriptureCarousel\(/, 'initScriptureCarousel function defined in JS');
  assert.match(js, /function prevScripture\(/, 'prevScripture function defined in JS');

  // Create room modal auto-play and navigation permission inputs
  assert.match(html, /id="new-scriptures-series"/, 'Additional scripture series textarea exists in create modal');
  assert.match(html, /id="new-scripture-autoplay-interval"/, 'Scripture auto-play interval selector exists');
  assert.match(html, /id="new-allow-user-nav"/, 'Participant navigation permission checkbox exists');
});

test('14. Reflection Notes Modal, Audio Scrubber & Ambient Soundscapes', () => {
  // Reflection Notes Modal
  assert.match(html, /id="btn-open-reflection"/, 'Open reflection button exists');
  assert.match(html, /id="modal-reflection-note"/, 'Reflection note dialog exists');
  assert.match(html, /id="reflection-note-text"/, 'Reflection textarea exists');
  assert.match(html, /id="btn-save-reflection"/, 'Save reflection button exists');
  assert.match(js, /function setupReflectionModal\(/, 'setupReflectionModal wired in JS');

  // Timeline scrubber & 15s replay/skip
  assert.match(html, /id="player-scrubber-track"/, 'Player scrubber track exists');
  assert.match(html, /id="bottom-replay-15-btn"/, '15s replay button exists');
  assert.match(html, /id="bottom-forward-15-btn"/, '15s forward button exists');
  assert.match(js, /function setupScrubberControls\(/, 'setupScrubberControls wired in JS');

  // Ambience soundscape selector
  assert.match(html, /id="btn-ambience-dropdown"/, 'Ambience dropdown button exists');
  assert.match(html, /id="ambience-dropdown-menu"/, 'Ambience dropdown menu exists');
  assert.match(js, /function setupAmbienceDropdown\(/, 'setupAmbienceDropdown wired in JS');
});

