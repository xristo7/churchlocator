# Part 7: Separate Church Live and Channel Live

## Church Live: broadcast

One church publishes a service to an audience. Audience members can watch and chat;
they do not join the video feed. Keep church broadcasts separate from channel stages.

Two source modes:

1. External source: paste a supported provider URL. Normalize it into the provider's
   official embedded player. Support YouTube and Vimeo live-event formats, plus public
   Facebook/X content where an official embed is available and permits playback. Do
   not iframe arbitrary social pages. Provide an honest watch-on-provider fallback
   when a provider disables embedding or requires its own login.
2. Managed broadcast: create a stream through a provider API, expose the publishing
   endpoint and stream key only to authorized church managers, and serve its viewer
   playback URL in the church player. Accept compatible HTTPS HLS playback sources
   from other providers, with native HLS or a tested browser player as appropriate.

RTMP/RTMPS are publishing inputs, not browser playback URLs. Direct-stream support
must distinguish an input/stream key from the HLS or embedded player output. Signed
URLs, CORS, codecs, allowed domains, and provider embed restrictions still apply.

Recommended first managed provider: Cloudflare Stream, because hosting already uses
Cloudflare. Cloudinary documents RTMP input, HLS output, and API-managed live streams.
Vimeo supports embedded live events subject to the account's live-event entitlement.
Bunny.net is the likely name intended by "Web Bunny"; its current FAQ says RTMP is
not supported. Accept a compatible Bunny-delivered playback source if supplied, but
do not present Bunny as a verified RTMP live-ingestion provider.

## Channel Live: host and guest stage

The channel owner hosts an interactive live show. Guests can request or be invited
to join; the host approves them before their audio/video is published. Viewers watch
without publishing a camera or microphone. The host can mute/remove guests and end
the show. Show host and guest videos together in a responsive stage layout.

Recommended first implementation: Cloudflare RealtimeKit's webinar/stage model. Its
documented presenter/viewer presets support stage requests and approval. LiveKit is
an alternative if the user already has that infrastructure. This is a WebRTC media
service integration, not a Zoom/social-media page embedded in an iframe.

For a large audience, assess distributing a composed host/guest broadcast through
a CDN while only on-camera participants use the interactive media room. Provider
support for composition/egress and latency must be confirmed before choosing that
path. The simpler webinar model bills viewers as audio/video participants, so the
expected audience size affects the infrastructure choice.

## Repository findings

- Churches and channels currently share a URL-based broadcast player.
- The current player recognizes YouTube and simple Vimeo video links, then falls
  back to a profile link for other sources.
- There is no channel room, guest invitation, stage approval, or participant media
  infrastructure in that shared player.
- Legacy livestream markup includes a fixed sample-video fallback. Replace this
  with accurate configured/offline/error states as part of the broadcast work.

## Implementation order

1. Separate broadcast configuration and routes from channel-stage sessions. Preserve
   existing church links during migration. Give each its own directory labels and
   creator setup flow.
2. Introduce a shared, validated broadcast source resolver/player. Cover YouTube live,
   Vimeo live events, supported public social embeds, HTTPS HLS, and explicit offline
   or unavailable states. Verify browser policies rather than claiming every URL can
   be embedded.
3. Connect the selected broadcast provider API for stream creation, publishing details,
   start/end status, webhooks, and optional recordings. Keep provider credentials and
   stream keys server-side and out of public catalog responses.
4. Connect the selected interactive provider. Create channel-bound sessions; issue
   per-member tokens with host, guest, or viewer rights derived on the server. Build
   camera/microphone preview, stage requests, admission, moderation, and termination.
5. Connect live discovery, channel/church profile entry points, chat, and follower
   notifications. Include reconnect and offline states, and responsive mobile views.
6. Test with separate host, approved guest, and viewer sessions; confirm that viewers
   cannot publish or promote themselves, and that ending a session prevents re-entry.
   Verify actual live ingestion and playback with the connected provider accounts.
7. Publish after the full media flow is verified. Do not label a local-camera mockup
   or disconnected provider UI as a working live feature.

## Decisions needed before provider integration

- Use the recommended Cloudflare pair or existing provider accounts?
- Expected simultaneous viewers and on-camera participants?
- Selected accounts must have the required product access and server-side credentials.
  Do not ask for secrets in ordinary chat.

## Sources checked

- https://developers.cloudflare.com/stream/stream-live/
- https://developers.cloudflare.com/realtime/realtimekit/webinar/
- https://docs.livekit.io/intro/basics/rooms-participants-tracks/
- https://cloudinary.com/documentation/live_streaming
- https://help.vimeo.com/hc/en-us/articles/12426942285841-How-to-embed-my-live-event-on-my-website
- https://bunny.net/faq/

## Implementation and activation (7 October 2026)

The user selected Cloudflare Stream and RealtimeKit. Migration 0015 separates
church source settings, channel sessions, participant admission, provider settings,
and follower notifications. Church playback and interactive channel stages now use
different pages. Live setup is available from both management workspaces.

The protected setup flow is ready for provider activation; the media integration
has not yet been verified against a connected account. Deployment of this setup
flow does not mean that managed broadcasting or channel stages are operational.
Unconnected managed requests return a setup error; offline channels show no room.

### Owner connection

1. Enable Cloudflare Stream and RealtimeKit in the existing hosting account
   `17e900e2ac8567adf3e60c83fc64589e`.
2. Create an account-scoped API token with **Stream Edit** and **Realtime Admin**.
3. Sign into the platform as the verified owner with MFA. Open **Live setup**, enter
   the token in its password field, and select **Connect streaming**. Never send
   tokens in chat or commit them to the repository. The server verifies product
   access and webinar preset permissions, then encrypts the token at rest.
4. Leave app ID blank to reuse or create **My Way Channel Live**. Its presenter
   and viewer presets must use the webinar stage model; viewers request audio/video
   access and cannot admit themselves. The ordinary deployment OAuth token does
   not have the required media service scopes.

### Church flow

External playback supports YouTube, Vimeo video/live events, public Facebook video,
public X video posts through the official post widget, Cloudflare/Bunny/Cloudinary
player URLs, and compatible HTTPS HLS/video outputs. Provider restrictions apply.
X broadcast-only URLs and unknown providers receive an explicit external link.
There is no claim of API integration with every CDN: **Cloudflare Stream** is the
managed publishing provider; other integrations accept their playback outputs.

Create a managed broadcast in Live setup, reveal the private publishing details,
and enter its RTMPS endpoint/key in OBS or another encoder. Enable the source for
viewers and open its church broadcast page. Disabling viewer availability hides
the source; stop the encoder to stop sending video. Source availability is a
management setting, not independent proof that the provider is currently on air.
Cloudflare's input uses automatic recordings. Webhook-based broadcast status and
a recording management interface are not included in this initial release.

### Channel flow

Start a stage from the channel's setup panel; open the stage and join as its host.
The SDK setup screen lets the host choose devices. Invitations contain only the
channel/session identifiers. Signed-in guests join with viewer permissions, then
request stage access; presenters approve and moderate through the provider UI.
The server computes roles and gates private tokens, publishing details, removal,
and ending. Ending deactivates the provider meeting and removes its participants.
In-app follower notices honor existing notification preferences and deduplicate.

Sessions expire after two hours; cron closes expired rooms. This first version
uses the webinar model, including viewers as billed media participants. CDN
distribution of a composed stage for large audiences and session recordings are
not implemented. Provider moderation controls and reconnect behavior still need
actual host, guest, and viewer verification after connection.

### Verification

- Existing application suite plus eight SQLite-backed live integration tests pass
  (179 total), alongside three database security checks, syntax checks and the
  Worker dry-run build. Dependency audit reports no advisories.
- Browser checks confirm a configured church embeds its player, an offline channel
  shows its offline state, and anonymous Live setup access requires sign-in.
- Live API tests use explicit provider mocks. They cover encrypted credentials,
  private keys, role forgery/revocation, removal, expiry, provider failure, duplicate
  room creation, ended access and follower notice deduplication.
- **Pending:** real RTMPS ingestion/HLS playback; host/guest device setup, request,
  admission, moderation and termination across distinct browser sessions. Provider
  connection is required before calling these media flows verified.

Build bundled browser dependencies with `npm run build:live-assets` after changing
SDK versions. The checked-in assets match the pinned dependency versions and the
security overrides in both package.json and pnpm-workspace.yaml.
