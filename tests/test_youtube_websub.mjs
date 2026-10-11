/**
 * Why this test matters: WebSub is the only near-real-time path for Jeff's
 * owned @sessionscan uploads. Wrong topic echo, wrong channel accept, or a
 * bad dispatch URL would either fail hub verification or burn Actions runs.
 */
import assert from "node:assert/strict";
import {
  DEFAULT_WORKFLOW,
  OWNED_CHANNEL_ID,
  TOPIC_URL,
  buildSubscribeBody,
  githubDispatchUrl,
  normalizeTopic,
  parseAtomNotification,
  shouldDispatchNotification,
  topicMatchesOwned,
  verificationResponse,
  verifyHubSignature,
} from "../workers/youtube-websub/src/websub.js";

function fail(msg) {
  console.error("FAIL:", msg);
  process.exit(1);
}

// Topic normalization must treat http/https and /xml/feeds vs /feeds as one topic.
if (!topicMatchesOwned(TOPIC_URL)) fail("canonical topic must match");
if (!topicMatchesOwned(TOPIC_URL.replace("https://", "http://"))) fail("http topic");
if (
  !topicMatchesOwned(
    `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${OWNED_CHANNEL_ID}`,
  )
) {
  fail("alternate /xml/feeds topic");
}
if (topicMatchesOwned("https://www.youtube.com/feeds/videos.xml?channel_id=UCotherchannel000000000")) {
  fail("foreign channel must not match");
}
assert.equal(
  normalizeTopic(`http://www.youtube.com/feeds/videos.xml?channel_id=${OWNED_CHANNEL_ID}`),
  normalizeTopic(TOPIC_URL),
);

const okVerify = verificationResponse(
  new URLSearchParams({
    "hub.mode": "subscribe",
    "hub.topic": TOPIC_URL,
    "hub.challenge": "challenge-token-123",
  }),
);
if (!okVerify.ok || okVerify.body !== "challenge-token-123" || okVerify.status !== 200) {
  fail("verification must echo challenge for owned topic");
}

const badVerify = verificationResponse(
  new URLSearchParams({
    "hub.mode": "subscribe",
    "hub.topic": "https://www.youtube.com/feeds/videos.xml?channel_id=UCnotours",
    "hub.challenge": "nope",
  }),
);
if (badVerify.ok || badVerify.status !== 404) fail("foreign topic verification must 404");

const atom = `<?xml version="1.0"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <yt:videoId>ShortOwn01a</yt:videoId>
    <yt:channelId>${OWNED_CHANNEL_ID}</yt:channelId>
    <title>Owned Short</title>
  </entry>
</feed>`;
const parsed = parseAtomNotification(atom);
if (!parsed.videoIds.includes("ShortOwn01a")) fail("parse video id");
if (!parsed.ownedChannel) fail("owned channel flag");
if (!shouldDispatchNotification(parsed)) fail("should dispatch owned notification");

const foreign = parseAtomNotification(`
  <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
    <entry><yt:videoId>ForeignVi01</yt:videoId><yt:channelId>UCforeignchannel00000000</yt:channelId></entry>
  </feed>`);
if (shouldDispatchNotification(foreign)) fail("must not dispatch foreign channel");

const empty = parseAtomNotification("<feed xmlns:yt='http://www.youtube.com/xml/schemas/2015'/>");
if (shouldDispatchNotification(empty)) fail("must not dispatch empty feed");

assert.equal(
  githubDispatchUrl("bigdaddy109/Sessionscan", DEFAULT_WORKFLOW),
  "https://api.github.com/repos/bigdaddy109/Sessionscan/actions/workflows/owned-refresh.yml/dispatches",
);

const sub = buildSubscribeBody({
  callbackUrl: "https://example.workers.dev/",
  secret: "s3cret",
  leaseSeconds: 432000,
});
assert.equal(sub.get("hub.mode"), "subscribe");
assert.equal(sub.get("hub.topic"), TOPIC_URL);
assert.equal(sub.get("hub.secret"), "s3cret");

// HMAC: when secret set, missing/wrong signature fails; correct sha1 passes.
const body = "<feed/>";
if (await verifyHubSignature(body, "", "secret")) fail("missing sig must fail when secret set");
if (await verifyHubSignature(body, "sha1=deadbeef", "secret")) fail("wrong sig must fail");
if (!(await verifyHubSignature(body, "", ""))) fail("no secret → accept");

const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode("secret"),
  { name: "HMAC", hash: "SHA-1" },
  false,
  ["sign"],
);
const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
if (!(await verifyHubSignature(body, `sha1=${hex}`, "secret"))) fail("valid sha1 must pass");

console.log("ok - test_youtube_websub.mjs");
