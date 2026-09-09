import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('public/livestream.html', 'utf8');
const js = fs.readFileSync('public/app.js', 'utf8');
const css = fs.readFileSync('public/styles.css', 'utf8');

test('Task 5.1: Free Direct Viewing & Comments (No Checkout / Payment Required)', () => {
  // Free broadcast indicators in HTML
  assert.match(html, /Free Broadcast/, 'HTML contains Free Broadcast indicator');
  assert.match(html, /100% Free · No Checkout/, 'HTML confirms free viewing with no checkout');
  assert.match(html, /id="main-player-iframe"/, 'Main video player iframe exists');

  // Video plays freely without lock timeout
  assert.doesNotMatch(js, /videoLockTimeout\s*=\s*setTimeout\(/, '10-second inactive lock timeout is removed from app.js');
  assert.match(html, /id="player-chat-input"/, 'Direct chat input exists');
  assert.match(html, /data-live-chat-form/, 'Live chat form exists for free community conversation');
  assert.match(js, /MWE\.submitLiveStreamChat/, 'Direct chat submission function wired');
});

test('Task 5.2: Audience Stage Request (Bible Studies, Q&A, Prayer)', () => {
  assert.match(html, /id="btn-request-stage"/, 'Request Stage button exists in HTML');
  assert.match(js, /MWE\.toggleStageRequest/, 'toggleStageRequest method defined in MWE');
  assert.match(js, /MWE\.stageState/, 'stageState object defined with queue and status');
});

test('Task 5.3: Host Stage Management & Format Switching', () => {
  assert.match(html, /id="host-controls-panel"/, 'Host controls panel container exists in HTML');
  assert.match(html, /id="btn-toggle-host-panel"/, 'Host controls toggle button exists');
  assert.match(html, /id="host-session-format"/, 'Session format selector exists');
  assert.match(html, /Interactive Bible Study/, 'Interactive Bible Study format option exists');
  assert.match(html, /Audience Q&A/, 'Audience Q&A format option exists');

  assert.match(js, /MWE\.toggleHostPanel/, 'toggleHostPanel method defined');
  assert.match(js, /MWE\.changeSessionFormat/, 'changeSessionFormat method defined');
  assert.match(js, /MWE\.renderStageQueue/, 'renderStageQueue method defined');
  assert.match(js, /MWE\.dismissStageRequest/, 'dismissStageRequest method defined');
});

test('Task 5.4: Bring Guest on Stage (Split Screen & Host Moderation)', () => {
  // On-stage guest container
  assert.match(html, /id="stage-guest-container"/, 'Stage guest container exists in HTML');
  assert.match(html, /id="stage-guest-name"/, 'Stage guest name element exists');
  assert.match(html, /id="btn-mute-guest"/, 'Mute guest button exists');
  assert.match(html, /id="btn-remove-guest"/, 'Remove guest button exists');

  // CSS for multi-speaker stage & split layout
  assert.match(css, /\.modern-video-wrapper\.has-guest-on-stage/, 'Split-screen multi-speaker CSS defined');
  assert.match(css, /\.stage-guest-container/, 'Stage guest container styles defined');
  assert.match(css, /\.stage-audio-waves/, 'Live audio wave indicators styled in CSS');

  // JS handlers for bringing guest to stage & moderating
  assert.match(js, /MWE\.bringGuestToStage/, 'bringGuestToStage method defined');
  assert.match(js, /MWE\.removeGuestFromStage/, 'removeGuestFromStage method defined');
  assert.match(js, /MWE\.toggleGuestMute/, 'toggleGuestMute method defined');
  assert.match(js, /MWE\.postSystemChatAnnouncement/, 'postSystemChatAnnouncement method defined');
});
