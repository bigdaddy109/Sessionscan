/**
 * Pure WebSub helpers for @sessionscan YouTube Atom push (no CF runtime).
 * Free path: Atom RSS topic + Google PubSubHubbub hub — no YouTube Data API.
 */

export const OWNED_CHANNEL_ID = "UCfpCdZdtCdCFNXuEW9xvZcQ";
export const TOPIC_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${OWNED_CHANNEL_ID}`;
/** Alternate topic form some hubs/docs use; treat as equivalent. */
export const TOPIC_URL_ALT = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${OWNED_CHANNEL_ID}`;
export const HUB_SUBSCRIBE_URL = "https://pubsubhubbub.appspot.com/subscribe";
export const DEFAULT_WORKFLOW = "owned-refresh.yml";
export const DEFAULT_REPO = "bigdaddy109/Sessionscan";
export const DEFAULT_REF = "main";
/** Default lease request (~5 days); hub may grant less. */
export const DEFAULT_LEASE_SECONDS = 432000;

/** Normalize hub.topic for comparison (scheme/host/path/query). */
export function normalizeTopic(url) {
  if (!url) return "";
  try {
    const u = new URL(String(url).trim());
    u.protocol = "https:";
    u.hash = "";
    // YouTube sometimes advertises http:// in Atom <link rel="self">.
    let path = u.pathname.replace(/\/+$/, "") || "/";
    if (path === "/xml/feeds/videos.xml") path = "/feeds/videos.xml";
    u.pathname = path;
    const channelId = u.searchParams.get("channel_id") || "";
    u.search = "";
    if (channelId) u.searchParams.set("channel_id", channelId);
    return u.toString();
  } catch {
    return String(url).trim();
  }
}

export function topicMatchesOwned(topic) {
  const n = normalizeTopic(topic);
  return n === normalizeTopic(TOPIC_URL) || n === normalizeTopic(TOPIC_URL_ALT);
}

/** Echo hub.challenge only when mode/topic are expected. */
export function verificationResponse(params) {
  const mode = params.get("hub.mode") || params.get("hub_mode") || "";
  const topic = params.get("hub.topic") || params.get("hub_topic") || "";
  const challenge = params.get("hub.challenge") || params.get("hub_challenge") || "";
  if ((mode === "subscribe" || mode === "unsubscribe") && topicMatchesOwned(topic) && challenge) {
    return { ok: true, body: challenge, status: 200 };
  }
  return { ok: false, body: "invalid verification", status: 404 };
}

/**
 * Parse a YouTube Atom push body. Returns video ids + channel ids found.
 * Does not invent ids — only values present in the XML.
 */
export function parseAtomNotification(xml) {
  const text = String(xml || "");
  const videoIds = [...text.matchAll(/<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>/g)].map(
    (m) => m[1],
  );
  const channelIds = [
    ...text.matchAll(/<yt:channelId>([A-Za-z0-9_-]+)<\/yt:channelId>/g),
  ].map((m) => m[1]);
  const uniqueVideos = [...new Set(videoIds)];
  const uniqueChannels = [...new Set(channelIds)];
  const ownedHit = uniqueChannels.some(
    (id) => id === OWNED_CHANNEL_ID || id === OWNED_CHANNEL_ID.slice(2),
  );
  return {
    videoIds: uniqueVideos,
    channelIds: uniqueChannels,
    ownedChannel: ownedHit || uniqueChannels.length === 0,
  };
}

export function shouldDispatchNotification(parsed) {
  if (!parsed) return false;
  if (!parsed.ownedChannel) return false;
  return (parsed.videoIds || []).length > 0;
}

/** Verify X-Hub-Signature: sha1=<hmac> when a hub secret is configured. */
export async function verifyHubSignature(rawBody, signatureHeader, secret) {
  if (!secret) return true;
  if (!signatureHeader) return false;
  const m = String(signatureHeader).match(/^sha1=([0-9a-fA-F]+)$/);
  if (!m) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.toLowerCase() === m[1].toLowerCase();
}

export function githubDispatchUrl(repo, workflow) {
  const r = repo || DEFAULT_REPO;
  const w = workflow || DEFAULT_WORKFLOW;
  return `https://api.github.com/repos/${r}/actions/workflows/${w}/dispatches`;
}

export function buildSubscribeBody({ callbackUrl, secret, leaseSeconds, mode = "subscribe" }) {
  const params = new URLSearchParams();
  params.set("hub.callback", callbackUrl);
  params.set("hub.mode", mode);
  params.set("hub.topic", TOPIC_URL);
  params.set("hub.verify", "async");
  params.set("hub.lease_seconds", String(leaseSeconds || DEFAULT_LEASE_SECONDS));
  if (secret) params.set("hub.secret", secret);
  return params;
}
