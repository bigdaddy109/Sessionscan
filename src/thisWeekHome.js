/** Phase B home: this-week one-liners, Short pick, countdown to next Thursday update. */

import { youtubeId } from "./cardShare.js";
import { pickOfficialWeekly } from "./homeExtras.js";
import { t } from "./i18n.js";
import {
  isOwnedShortThisWeek,
  isThisWeekJob,
  rockstarWeekStart,
  toIsoDate,
} from "./thisWeek.js";

/** localStorage key prefix for home + tip-freeze “claimed” checklist (per Rockstar week). */
export const CLAIMED_STORAGE_PREFIX = "sessionscan:week-claimed:";

/**
 * Inline script for tip `/week/YYYY-MM-DD/` freezes — same key/prefix as home.
 * Static shell pages have no bundled module entry (see moneyCalculatorScript).
 */
export function freezeClaimedChecklistScript() {
  return `<script data-freeze-claimed>
(function () {
  var PREFIX = ${JSON.stringify(CLAIMED_STORAGE_PREFIX)};
  function loadIds(key) {
    var out = [];
    if (!key || !window.localStorage) return out;
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return out;
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return out;
      for (var i = 0; i < parsed.length; i++) {
        if (typeof parsed[i] === "string" && parsed[i]) out.push(parsed[i]);
      }
    } catch (e) { /* corrupt → empty */ }
    return out;
  }
  function saveIds(key, ids) {
    if (!key || !window.localStorage) return;
    var list = [];
    var seen = Object.create(null);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (typeof id !== "string" || !id || seen[id]) continue;
      seen[id] = 1;
      list.push(id);
    }
    list.sort();
    try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) { /* quota */ }
  }
  function toggleId(key, id) {
    var ids = loadIds(key);
    var idx = ids.indexOf(id);
    if (idx >= 0) ids.splice(idx, 1);
    else ids.push(id);
    saveIds(key, ids);
    return ids;
  }
  function hydrate(host) {
    var key = host.getAttribute("data-claimed-key") || "";
    if (!key || key.indexOf(PREFIX) !== 0) return;
    var claimed = loadIds(key);
    var map = Object.create(null);
    for (var i = 0; i < claimed.length; i++) map[claimed[i]] = 1;
    var inputs = host.querySelectorAll(".week-bullet-check");
    for (var j = 0; j < inputs.length; j++) {
      var input = inputs[j];
      var bid = input.getAttribute("data-bullet-id") || "";
      var done = Boolean(map[bid]);
      input.checked = done;
      var row = input.closest(".week-bullet");
      if (row) {
        if (done) row.classList.add("is-claimed");
        else row.classList.remove("is-claimed");
      }
    }
  }
  document.addEventListener("DOMContentLoaded", function () {
    var host = document.getElementById("archiveBulletList");
    if (!host || host.getAttribute("data-claim-bound") === "1") return;
    host.setAttribute("data-claim-bound", "1");
    hydrate(host);
    host.addEventListener("change", function (ev) {
      var t = ev.target;
      if (!t || !t.classList || !t.classList.contains("week-bullet-check")) return;
      var id = t.getAttribute("data-bullet-id") || "";
      var key = host.getAttribute("data-claimed-key") || "";
      if (!id || !key) return;
      toggleId(key, id);
      var row = t.closest(".week-bullet");
      if (row) {
        if (t.checked) row.classList.add("is-claimed");
        else row.classList.remove("is-claimed");
      }
    });
  });
})();
</script>`;
}

/** Fixed verdict slots — always rendered so the home screen has one clear shape. */
export const WEEK_BULLET_CATEGORIES = [
  {
    id: "multipliers",
    labelKey: "weekBulletMultipliers",
    // Explicit Nx / 倍 only — never treat bare "Halloween Series/Event" as a multiplier.
    // Reward line is always the outbound title fragment (oneLineFromTitle), never a fabricated rate.
    re: /(?:\b|[^\w])(\d{1,2})\s*[xX×]|雙倍|三倍|六倍|[2-9]x|\d+x\b|倍獎勵|GTA\$\s*\/\s*RP/i,
  },
  {
    id: "free",
    labelKey: "weekBulletFree",
    // "Freebies" (IGN) must match — `\bfree\b` alone misses it.
    re: /\bfreebies?\b|\bfree\b|limited|限時|限免|贈送|gift|giveaway|試玩|免費/i,
  },
  {
    id: "discounts",
    labelKey: "weekBulletDiscounts",
    re: /discount|折扣|減價|\bsale\b|bonuses?\s*(?:&|and)\s*discounts|獎勵與折扣/i,
  },
  {
    id: "podium",
    labelKey: "weekBulletPodium",
    re: /podium|prize\s*ride|展台|獎勵載具|幸運輪|lucky\s*wheel|podium\s*vehicle/i,
  },
  {
    id: "salvage_cayo",
    labelKey: "weekBulletSalvageCayo",
    re: /salvage|廢車場|cayo|perico|佩里克|打撈|panther|黑豹|chop\s*shop/i,
  },
];

export function nextWeeklyUpdateAt(now = new Date()) {
  const start = rockstarWeekStart(now);
  const next = new Date(start.getTime());
  next.setUTCDate(next.getUTCDate() + 7);
  return next;
}

export function countdownParts(target, now = new Date()) {
  const end = target instanceof Date ? target.getTime() : new Date(target).getTime();
  const start = (now instanceof Date ? now : new Date(now)).getTime();
  let ms = Math.max(0, end - start);
  const totalMs = ms;
  const days = Math.floor(ms / 86400000);
  ms -= days * 86400000;
  const hours = Math.floor(ms / 3600000);
  ms -= hours * 3600000;
  const minutes = Math.floor(ms / 60000);
  ms -= minutes * 60000;
  const seconds = Math.floor(ms / 1000);
  return { days, hours, minutes, seconds, totalMs };
}

function signalBlob(item) {
  return `${item?.title || ""} ${item?.title_en || ""} ${item?.text || ""} ${item?.blurb || ""}`;
}

/** Titles we may mine for one-liners (outbound only — no guide copy). */
export function weekSignalItems(data, now = new Date()) {
  const out = [];
  const seen = new Set();
  const push = (item, kind) => {
    if (!item) return;
    const title = String(item.title || item.title_en || "").trim();
    if (!title) return;
    const key = `${kind}:${title}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      kind,
      title,
      url: String(item.url || "").trim(),
      source: String(item.source || item.channel || "").trim(),
      updated: String(item.updated || item.date || "").trim(),
      blob: signalBlob(item),
    });
  };

  // Only the weekly that belongs to `now`'s Rockstar week — keeps archive freezes honest.
  const weekly = pickOfficialWeekly(data || {});
  if (weekly && isThisWeekJob(weekly, now)) push(weekly, "official");

  for (const key of ["jobs_gtabase", "jobs_ign", "jobs_wiki"]) {
    for (const job of data?.[key] || []) {
      if (isThisWeekJob(job, now)) push(job, "job");
    }
  }

  const short = data?.sessionscan_slot?.short;
  if (short && isOwnedShortThisWeek(short, now)) {
    push(
      {
        title: short.title,
        title_en: short.title_en,
        url: short.url || (short.video_id ? `https://www.youtube.com/shorts/${short.video_id}` : ""),
        channel: short.channel || "SessionScan",
        date: short.date,
      },
      "short",
    );
  }

  return out;
}

function oneLineFromTitle(title, lang) {
  const raw = String(title || "").trim();
  if (!raw) return "";
  // Prefer the clause after the weekly date colon when present.
  const colon = raw.match(/:\s*(.+)$/);
  let line = (colon ? colon[1] : raw).replace(/\s+/g, " ").trim();
  if (line.length > 140) line = `${line.slice(0, 137).trim()}…`;
  if (lang === "zh" && !/[\u4e00-\u9fff]/.test(line)) {
    // Keep English title fragment; UI label is already zh.
    return line;
  }
  return line;
}

export function buildWeekBullets(data, now = new Date(), lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const signals = weekSignalItems(data, now);
  // Prefer this week's own outbound URL — never fall back to a newer week's article.
  const weekOfficial =
    signals.find((s) => s.kind === "official" && s.url) ||
    signals.find((s) => s.kind === "job" && s.url) ||
    null;
  const fallbackUrl = weekOfficial?.url || "";

  return WEEK_BULLET_CATEGORIES.map((cat) => {
    const hit = signals.find((s) => cat.re.test(s.blob));
    if (hit) {
      return {
        id: cat.id,
        label: t(cat.labelKey, {}, ui),
        reward: oneLineFromTitle(hit.title, ui),
        how: t("weekBulletHowSource", {}, ui),
        url: hit.url || fallbackUrl,
        pending: false,
      };
    }
    return {
      id: cat.id,
      label: t(cat.labelKey, {}, ui),
      reward: t("weekBulletPending", {}, ui),
      how: fallbackUrl ? t("weekBulletHowWeekly", {}, ui) : t("weekBulletHowNone", {}, ui),
      url: fallbackUrl,
      pending: true,
    };
  });
}

/**
 * Storage key for claimed bullet ids in the current Rockstar week.
 * Resets automatically when Thursday rolls — no login, local only.
 * @param {Date|string} [now]
 */
export function claimedStorageKey(now = new Date()) {
  const weekIso = toIsoDate(rockstarWeekStart(now));
  return `${CLAIMED_STORAGE_PREFIX}${weekIso}`;
}

/**
 * @param {string} weekKey full localStorage key
 * @param {Storage} [store]
 * @returns {Set<string>}
 */
export function loadClaimedIds(weekKey, store = globalThis.localStorage) {
  const out = new Set();
  if (!weekKey || !store) return out;
  try {
    const raw = store.getItem(weekKey);
    if (!raw) return out;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return out;
    for (const id of parsed) {
      if (typeof id === "string" && id) out.add(id);
    }
  } catch {
    /* corrupt → empty */
  }
  return out;
}

/**
 * @param {string} weekKey
 * @param {Iterable<string>} ids
 * @param {Storage} [store]
 */
export function saveClaimedIds(weekKey, ids, store = globalThis.localStorage) {
  if (!weekKey || !store) return;
  const list = [...new Set([...ids].filter((id) => typeof id === "string" && id))].sort();
  try {
    store.setItem(weekKey, JSON.stringify(list));
  } catch {
    /* quota / private mode — ignore */
  }
}

/**
 * Toggle one bullet id; returns the new claimed set.
 * @param {string} weekKey
 * @param {string} bulletId
 * @param {Storage} [store]
 */
export function toggleClaimedId(weekKey, bulletId, store = globalThis.localStorage) {
  const set = loadClaimedIds(weekKey, store);
  if (!bulletId) return set;
  if (set.has(bulletId)) set.delete(bulletId);
  else set.add(bulletId);
  saveClaimedIds(weekKey, set, store);
  return set;
}

/** Owned Short only — never invent a video when the slot is empty. */
export function pickHomeShort(data, now = new Date()) {
  const short = data?.sessionscan_slot?.short;
  if (!short) return null;
  const id = youtubeId(short) || String(short.video_id || short.id || "").trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  if (!isOwnedShortThisWeek(short, now)) return null;
  return {
    ...short,
    video_id: id,
    owned: true,
    url: short.url || `https://www.youtube.com/shorts/${id}`,
  };
}
