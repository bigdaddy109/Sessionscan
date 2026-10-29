/** Phase B home: this-week one-liners, Short pick, countdown to next Thursday update. */

import { youtubeId } from "./cardShare.js";
import { pickOfficialWeekly, snapshotNow } from "./homeExtras.js";
import { localeHome, t } from "./i18n.js";
import {
  isJobInWeek,
  isOwnedShortThisWeek,
  isThisWeekJob,
  isWeeklyUpdateCard,
  previousRockstarWeekStart,
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
  function updateProgress(host) {
    var el = document.getElementById("archiveClaimProgress");
    var clearBtn = document.getElementById("archiveClaimClear");
    if (!host) return;
    var inputs = host.querySelectorAll(".week-bullet-check");
    var total = inputs.length;
    var done = 0;
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].checked) done += 1;
    }
    if (el) {
      var tpl = el.getAttribute("data-progress-template") || "Claimed {done} of {total}";
      el.textContent = tpl.replace("{done}", String(done)).replace("{total}", String(total));
      el.hidden = total === 0;
    }
    if (clearBtn) clearBtn.hidden = !(total > 0 && done > 0);
  }
  function clearAll(host) {
    var key = host.getAttribute("data-claimed-key") || "";
    if (!key || key.indexOf(PREFIX) !== 0) return;
    saveIds(key, []);
    var inputs = host.querySelectorAll(".week-bullet-check");
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = false;
      var row = inputs[i].closest(".week-bullet");
      if (row) row.classList.remove("is-claimed");
    }
    updateProgress(host);
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
    updateProgress(host);
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
      updateProgress(host);
    });
    var clearBtn = document.getElementById("archiveClaimClear");
    if (clearBtn && clearBtn.getAttribute("data-clear-bound") !== "1") {
      clearBtn.setAttribute("data-clear-bound", "1");
      clearBtn.addEventListener("click", function () { clearAll(host); });
    }
    var copyBtn = document.getElementById("archiveTipCopy");
    if (copyBtn && copyBtn.getAttribute("data-copy-bound") !== "1") {
      copyBtn.setAttribute("data-copy-bound", "1");
      copyBtn.addEventListener("click", function () {
        var lang = (document.documentElement.getAttribute("lang") || "en").toLowerCase().indexOf("zh") === 0
          ? "zh" : "en";
        var site = lang === "zh" ? "https://sessionscan.net/zh/" : "https://sessionscan.net/";
        var lines = [];
        var heading = copyBtn.getAttribute("data-tip-heading") || "";
        if (heading) lines.push(heading);
        var rows = host.querySelectorAll(".week-bullet");
        for (var i = 0; i < rows.length; i++) {
          var row = rows[i];
          if (row.classList && row.classList.contains("is-pending")) continue;
          var labelEl = row.querySelector(".week-bullet-label");
          var rewardEl = row.querySelector(".week-bullet-reward");
          var label = labelEl ? String(labelEl.textContent || "").trim() : "";
          var reward = rewardEl ? String(rewardEl.textContent || "").trim() : "";
          if (!label || !reward) continue;
          lines.push("• " + label + ": " + reward);
          var link = row.querySelector("a.week-bullet-how");
          var href = link ? link.getAttribute("href") || "" : "";
          if (href) lines.push("  " + href);
        }
        lines.push("");
        lines.push(site);
        var text = lines.join("\\n");
        var labelCopy = copyBtn.getAttribute("data-i18n-copy") || copyBtn.textContent || "Copy tip";
        var labelCopied = copyBtn.getAttribute("data-i18n-copied") || "Copied";
        function painted() {
          copyBtn.textContent = labelCopied;
          copyBtn.setAttribute("aria-label", labelCopied);
          window.setTimeout(function () {
            copyBtn.textContent = labelCopy;
            copyBtn.setAttribute("aria-label", copyBtn.getAttribute("data-i18n-aria") || labelCopy);
          }, 1600);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(painted).catch(function () {});
        }
      });
    }
  });
})();
</script>`;
}

/** Always-visible copy control for home + tip-freeze claim toolbars. */
export function weekTipCopyButtonHtml(lang = "en", { id = "weekTipCopy" } = {}) {
  const ui = lang === "zh" ? "zh" : "en";
  const label = t("weekTipCopy", {}, ui);
  const aria = t("weekTipCopyAria", {}, ui);
  const copied = t("weekTipCopied", {}, ui);
  const heading = t("weekBulletsKicker", {}, ui);
  return `<button type="button" class="week-tip-copy" id="${escCountdown(id)}" data-i18n="weekTipCopy" data-i18n-aria="weekTipCopyAria" data-i18n-copy="${escCountdown(label)}" data-i18n-copied="${escCountdown(copied)}" data-tip-heading="${escCountdown(heading)}" aria-label="${escCountdown(aria)}">${escCountdown(label)}</button>`;
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
    // "Showrooms & Test Rides" is the GTABase subheading for the podium / prize-ride block.
    re: /podium|prize\s*ride|showroom|展台|展廳|獎勵載具|幸運輪|lucky\s*wheel|podium\s*vehicle/i,
  },
  {
    id: "salvage_cayo",
    labelKey: "weekBulletSalvageCayo",
    re: /salvage|廢車場|cayo|perico|佩里克|打撈|panther|黑豹|chop\s*shop/i,
  },
];

/**
 * Next Rockstar weekly update instant: Thursday 10:00 UTC.
 * Pure UTC — never use local/Taipei weekday (Taipei Thu morning is still
 * Wednesday UTC; a Taipei-based week start would jump a full week early).
 */
export function nextWeeklyUpdateAt(now = new Date()) {
  const t = now instanceof Date ? now : new Date(now);
  const y = t.getUTCFullYear();
  const m = t.getUTCMonth();
  const d = t.getUTCDate();
  const dow = t.getUTCDay(); // 0=Sun … 4=Thu (UTC calendar)
  const sinceThu = (dow + 7 - 4) % 7;
  const thisThu = new Date(Date.UTC(y, m, d - sinceThu, 10, 0, 0, 0));
  if (t.getTime() < thisThu.getTime()) return thisThu;
  const next = new Date(thisThu.getTime());
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

/**
 * Compact week-countdown display (same shape as home client + GTA 6 page).
 * @param {{ days: number, hours: number, minutes: number, seconds: number, totalMs: number }} parts
 * @param {string} [lang]
 */
export function formatWeekCountdown(parts, lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  if (!parts || parts.totalMs <= 0) return t("weekCountdownLive", {}, ui);
  const pad = (n) => String(n).padStart(2, "0");
  return `${parts.days}d ${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
}

/** Build-time / injectable countdown text for `#weekCountdownDisplay`. */
export function staticWeekCountdownText(now = new Date(), lang = "en") {
  const target = nextWeeklyUpdateAt(now);
  return formatWeekCountdown(countdownParts(target, now), lang);
}

function escCountdown(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Progressive enhancement: stamp home week countdown before JS ticks.
 * Users see a real timer on first paint instead of an em dash placeholder.
 */
export function injectStaticWeekCountdown(html, { lang = "en", now = new Date() } = {}) {
  let out = String(html || "");
  const text = staticWeekCountdownText(now, lang);
  out = out.replace(
    /(<p class="week-countdown-display" id="weekCountdownDisplay">)[\s\S]*?(<\/p>)/,
    `$1${escCountdown(text)}$2`,
  );
  return out;
}

/**
 * Shared `<li>` rows for home + tip-freeze checklists (claimable optional).
 * Single HTML source so static home and archive freezes cannot drift.
 */
export function weekBulletItemsHtml(bullets, { claimable = false, lang = "en", claimed = null } = {}) {
  const ui = lang === "zh" ? "zh" : "en";
  const doneSet = claimed instanceof Set ? claimed : null;
  return (bullets || [])
    .map((b) => {
      const done = Boolean(doneSet && b?.id && doneSet.has(b.id));
      const access = b.url
        ? `<a class="week-bullet-how" href="${escCountdown(b.url)}" target="_blank" rel="noopener noreferrer">${escCountdown(b.how)}</a>`
        : `<span class="week-bullet-how is-muted">${escCountdown(b.how)}</span>`;
      const claim = claimable
        ? `<label class="week-bullet-claim">
          <input type="checkbox" class="week-bullet-check" data-bullet-id="${escCountdown(b.id)}"${done ? " checked" : ""} />
          <span class="week-bullet-claim-text">${escCountdown(t("weekBulletClaim", { label: b.label }, ui))}</span>
        </label>`
        : "";
      return `<li class="week-bullet${b.pending ? " is-pending" : ""}${done ? " is-claimed" : ""}" data-bullet="${escCountdown(b.id)}">
        ${claim}
        <span class="week-bullet-label">${escCountdown(b.label)}</span>
        <span class="week-bullet-reward">${escCountdown(b.reward)}</span>
        ${access}
      </li>`;
    })
    .join("");
}

/**
 * Full `<ul>` for archive freezes (and any host that needs a self-contained list).
 */
export function weekBulletsListHtml(
  bullets,
  {
    claimable = false,
    lang = "en",
    weekIso = "",
    listId = "",
    extraClass = "",
    claimed = null,
  } = {},
) {
  const ui = lang === "zh" ? "zh" : "en";
  const ref = weekIso ? new Date(`${weekIso}T12:00:00Z`) : null;
  const weekKey = claimable && ref && !Number.isNaN(ref.getTime()) ? claimedStorageKey(ref) : "";
  const idAttr = listId ? ` id="${escCountdown(listId)}"` : "";
  const classAttr = extraClass ? ` ${escCountdown(extraClass)}` : "";
  const keyAttr = claimable && weekKey ? ` data-claimed-key="${escCountdown(weekKey)}"` : "";
  const items = weekBulletItemsHtml(bullets, { claimable, lang: ui, claimed });
  return `<ul class="week-bullet-list${classAttr}"${idAttr}${keyAttr}>
    ${items}
  </ul>`;
}

/**
 * Build-time inner HTML for home `#weekBulletList` (claimable checkboxes, unchecked).
 * Why: home's product answer is these five one-liners — empty until JS is a content gap.
 */
export function staticWeekBulletsInnerHtml(data, { lang = "en", now = null } = {}) {
  if (!data || typeof data !== "object") return "";
  const ui = lang === "zh" ? "zh" : "en";
  const ref = now instanceof Date ? now : snapshotNow(data.meta || {}) || new Date();
  const bullets = buildWeekBullets(data, ref, ui, { carryPreviousWeek: true });
  return weekBulletItemsHtml(bullets, { claimable: true, lang: ui });
}

/**
 * Stamp home `#weekBulletList` + claim progress from hub data (EN + `/zh/`).
 * Freeze pages already ship bullets in HTML; home must match that content floor.
 */
export function injectStaticWeekBullets(html, { data = null, lang = "en", now = null } = {}) {
  if (!data || typeof data !== "object") return String(html || "");
  let out = String(html || "");
  const ui = lang === "zh" ? "zh" : "en";
  const ref = now instanceof Date ? now : snapshotNow(data.meta || {}) || new Date();
  const bullets = buildWeekBullets(data, ref, ui, { carryPreviousWeek: true });
  const weekKey = claimedStorageKey(ref);
  const items = weekBulletItemsHtml(bullets, { claimable: true, lang: ui });
  const progress = formatClaimedProgress(0, bullets.length, ui);

  out = out.replace(
    /(<ul class="week-bullet-list" id="weekBulletList")([^>]*)>([\s\S]*?)(<\/ul>)/,
    (_m, open, attrs, _inner, close) => {
      let nextAttrs = String(attrs || "");
      if (/\bdata-claimed-key=/.test(nextAttrs)) {
        nextAttrs = nextAttrs.replace(/\s*data-claimed-key="[^"]*"/, "");
      }
      return `${open}${nextAttrs} data-claimed-key="${escCountdown(weekKey)}">${items}${close}`;
    },
  );

  out = out.replace(
    /(<p class="week-claim-progress" id="weekClaimProgress")([^>]*)>([\s\S]*?)(<\/p>)/,
    (_m, open, attrs, _inner, close) => {
      let nextAttrs = String(attrs || "").replace(/\s*\bhidden\b/g, "");
      return `${open}${nextAttrs}>${escCountdown(progress)}${close}`;
    },
  );

  return out;
}

function signalBlob(item) {
  return `${item?.title || ""} ${item?.title_en || ""} ${item?.text || ""} ${item?.blurb || ""}`;
}

/** Title-level event lines stored on a job (no prices, no article body). */
export function jobEventTitles(item) {
  const raw = item?.events;
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const ev of raw) {
    const title = String(typeof ev === "string" ? ev : ev?.title || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(title);
  }
  return out;
}

/** Titles we may mine for one-liners (outbound only — no guide copy). */
export function weekSignalItems(data, now = new Date(), { carryPreviousWeek = false } = {}) {
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

  const pushWithEvents = (item, kind) => {
    push(item, kind);
    const url = String(item?.url || "").trim();
    const source = String(item?.source || item?.channel || "").trim();
    const updated = String(item?.updated || item?.date || "").trim();
    for (const title of jobEventTitles(item)) {
      push({ title, url, source, updated }, "event");
    }
  };

  const pools = ["jobs_gtabase", "jobs_ign", "jobs_wiki"].flatMap((key) => data?.[key] || []);
  const currentJobs = pools.filter((job) => isThisWeekJob(job, now));
  // Home only: Thursday before the new post still has last week's article.
  // Archive freezes pass carryPreviousWeek false so an empty week stays empty.
  const carried =
    !currentJobs.length && carryPreviousWeek
      ? pools.filter(
          (job) => isJobInWeek(job, previousRockstarWeekStart(now)) && isWeeklyUpdateCard(job),
        )
      : [];
  const activeJobs = currentJobs.length ? currentJobs : carried;

  const weekly = pickOfficialWeekly(data || {});
  if (weekly && activeJobs.some((job) => job === weekly || (job.url && job.url === weekly.url))) {
    pushWithEvents(weekly, "official");
  } else if (weekly && isThisWeekJob(weekly, now)) {
    pushWithEvents(weekly, "official");
  }

  for (const job of activeJobs) {
    pushWithEvents(job, "job");
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

function rewardFromSignal(hit, lang) {
  // Event lines already are the subheading. Don't strip at ":" or "Robbery: Virtue" collapses.
  if (hit?.kind === "event") {
    let line = String(hit.title || "").replace(/\s+/g, " ").trim();
    if (line.length > 140) line = `${line.slice(0, 137).trim()}…`;
    return line;
  }
  return oneLineFromTitle(hit?.title, lang);
}

export function buildWeekBullets(data, now = new Date(), lang = "en", { carryPreviousWeek = false } = {}) {
  const ui = lang === "zh" ? "zh" : "en";
  const signals = weekSignalItems(data, now, { carryPreviousWeek });
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
        reward: rewardFromSignal(hit, ui),
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
 * Clear all claimed ids for one Rockstar-week key (home + tip freeze share it).
 * @param {string} weekKey
 * @param {Storage} [store]
 * @returns {Set<string>} empty set
 */
export function clearClaimedIds(weekKey, store = globalThis.localStorage) {
  saveClaimedIds(weekKey, [], store);
  return new Set();
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

/**
 * Count claimed slots among the fixed weekly bullet ids (always 5 categories).
 * @param {Iterable<{id?: string}>} bullets
 * @param {Set<string>} claimed
 */
export function countClaimedProgress(bullets, claimed) {
  const list = [...(bullets || [])];
  const total = list.length;
  let done = 0;
  const set = claimed instanceof Set ? claimed : new Set();
  for (const b of list) {
    const id = b?.id;
    if (id && set.has(id)) done += 1;
  }
  return { done, total };
}

/** Localized “Claimed X of Y” — single source for home + tip freeze. */
export function formatClaimedProgress(done, total, lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const d = Number.isFinite(Number(done)) ? Math.max(0, Math.round(Number(done))) : 0;
  const tTotal = Number.isFinite(Number(total)) ? Math.max(0, Math.round(Number(total))) : 0;
  return t("weekClaimProgress", { done: String(d), total: String(tTotal) }, ui);
}

/**
 * Plain-text week tip for clipboard / Discord / LINE share.
 * Skips pending slots (no invented rewards); ends with the locale home URL.
 */
export function formatWeekTipPlainText(bullets, { lang = "en", siteUrl = "" } = {}) {
  const ui = lang === "zh" ? "zh" : "en";
  const lines = [t("weekBulletsKicker", {}, ui)];
  for (const b of bullets || []) {
    if (!b || b.pending) continue;
    const label = String(b.label || "").trim();
    const reward = String(b.reward || "").trim();
    if (!label || !reward) continue;
    lines.push(`• ${label}: ${reward}`);
    const url = String(b.url || "").trim();
    if (url) lines.push(`  ${url}`);
  }
  lines.push("");
  lines.push(siteUrl || localeHome(ui));
  return lines.join("\n");
}

/**
 * Build tip text from a rendered bullet list (freeze pages have no module bundle).
 * Skips `.is-pending` rows so share text stays honest.
 */
export function weekTipTextFromListEl(host, { lang = "en", siteUrl = "" } = {}) {
  if (!host || !host.querySelectorAll) {
    return formatWeekTipPlainText([], { lang, siteUrl });
  }
  const bullets = [];
  const rows = host.querySelectorAll(".week-bullet");
  for (const row of rows) {
    const pending = row.classList?.contains("is-pending");
    const label = row.querySelector(".week-bullet-label")?.textContent?.trim() || "";
    const reward = row.querySelector(".week-bullet-reward")?.textContent?.trim() || "";
    const link = row.querySelector("a.week-bullet-how");
    const url = link?.getAttribute("href") || "";
    bullets.push({ label, reward, url, pending: Boolean(pending) });
  }
  return formatWeekTipPlainText(bullets, { lang, siteUrl });
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
