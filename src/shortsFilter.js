const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F]/gu;
const HASHTAG_RE = /#\S+/g;
const HANGUL_RE = /[\uac00-\ud7af]/;

export function normalizeShortTitle(title) {
  let t = String(title || "").replace(HASHTAG_RE, " ").replace(EMOJI_RE, " ");
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/[\s.!?,;:…·•\-–—_~]+$/g, "");
  return t.toLowerCase().trim();
}

export function shortTitleIsBait(title) {
  const raw = String(title || "");
  const norm = normalizeShortTitle(raw);
  const tags = raw.match(HASHTAG_RE) || [];
  const words = norm.match(/[A-Za-z0-9\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g) || [];
  if (norm.length < 8) return true;
  if (tags.length && words.join("").length < 8) return true;
  if (tags.length && tags.length >= Math.max(2, words.length)) return true;
  return false;
}

export function filterOtherShorts(items) {
  const staged = [];
  const seenPair = new Set();
  for (const raw of items || []) {
    const it = { ...raw };
    const title = it.title || "";
    if (shortTitleIsBait(title)) continue;
    if (HANGUL_RE.test(title)) it.lang = "ko";
    if (typeof it.views !== "number") it.views = null;
    const key = `${String(it.channel || "").trim().toLowerCase()}::${normalizeShortTitle(title)}`;
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    staged.push(it);
  }
  const prefixSeen = new Set();
  const out = [];
  for (const it of staged) {
    const norm = normalizeShortTitle(it.title || "");
    const orig = String(it.title || "").replace(/\s+/g, " ").trim();
    const prefixes = [];
    if (norm.length >= 20) prefixes.push(norm.slice(0, 20));
    if (orig.length >= 20) prefixes.push(orig.slice(0, 20).toLowerCase());
    if (prefixes.length && prefixes.some((p) => prefixSeen.has(p))) continue;
    for (const p of prefixes) prefixSeen.add(p);
    out.push(it);
  }
  return out;
}
