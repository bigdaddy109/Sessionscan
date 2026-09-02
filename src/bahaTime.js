const TAIPEI_MS = 8 * 60 * 60 * 1000;

export const HOT_STALE_MS = 12 * 60 * 60 * 1000;
export const HOT_STALE_HINT = "熱門影片來源這輪未更新，仍顯示上次成功快照";

export function parseSnapshotNow(stamp) {
  const ms = metaStampMs(stamp);
  return ms == null ? new Date() : new Date(ms);
}

/** Taipei wall-clock stamp → epoch ms. Null if unparseable (does not fall back to now). */
export function metaStampMs(stamp) {
  const m = String(stamp || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const hh = Number(m[4] || 0);
  const mi = Number(m[5] || 0);
  const ss = Number(m[6] || 0);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hh, mi, ss) - TAIPEI_MS;
}

/**
 * CH-02 videos_hot_* is stale when its snapshot is ~12h+ older than this run
 * (_last_run or jobs). yt-dlp failure keeps yesterday's hot file.
 */
export function isHotSnapshotStale(meta = {}, lang) {
  const hotStamp = (lang && meta[`videos_hot_${lang}`]) || meta.hot;
  const hotMs = metaStampMs(hotStamp);
  const refs = ["_last_run", "jobs"].map((k) => metaStampMs(meta[k])).filter((n) => n != null);
  if (hotMs == null || !refs.length) return false;
  return Math.max(...refs) - hotMs >= HOT_STALE_MS;
}

function formatTaipei(d, withTime) {
  const t = new Date(d.getTime() + TAIPEI_MS);
  const y = t.getUTCFullYear();
  const mo = String(t.getUTCMonth() + 1).padStart(2, "0");
  const da = String(t.getUTCDate()).padStart(2, "0");
  if (!withTime) return `${y}-${mo}-${da}`;
  const hh = String(t.getUTCHours()).padStart(2, "0");
  const mi = String(t.getUTCMinutes()).padStart(2, "0");
  return `${y}-${mo}-${da} ${hh}:${mi}`;
}

export function isRelativeForumTime(t) {
  return /(?:\d+\s*(?:秒|分|分鐘|小時|小时|天)前|刚刚|剛剛)/.test(String(t || ""));
}

export function bahaAbsTime(raw, now = new Date()) {
  const s = String(raw || "").replace(/\s+/g, " ").trim();
  if (!s) return { text: "", relative: false };
  let m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?$/);
  if (m) return { text: m[2] ? `${m[1]} ${m[2]}` : m[1], relative: false };
  m = s.match(/^(\d+)\s*(秒|分鐘?|小时|小時|天)前$/);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2];
    const dt = new Date(now.getTime());
    if (unit === "秒") dt.setSeconds(dt.getSeconds() - n);
    else if (unit.startsWith("分")) dt.setMinutes(dt.getMinutes() - n);
    else if (unit.includes("時") || unit.includes("时")) dt.setHours(dt.getHours() - n);
    else {
      dt.setDate(dt.getDate() - n);
      return { text: formatTaipei(dt, false), relative: false };
    }
    return { text: formatTaipei(dt, true), relative: false };
  }
  m = s.match(/^(今天|昨天|前天)\s*(\d{1,2}:\d{2})$/);
  if (m) {
    const days = { 今天: 0, 昨天: 1, 前天: 2 }[m[1]];
    const [hh, mi] = m[2].split(":").map(Number);
    const dt = new Date(now.getTime());
    dt.setDate(dt.getDate() - days);
    const wall = new Date(dt.getTime() + TAIPEI_MS);
    const abs = new Date(
      Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate(), hh, mi) - TAIPEI_MS,
    );
    return { text: formatTaipei(abs, true), relative: false };
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}:\d{2}))?$/);
  if (m) {
    const wall = new Date(now.getTime() + TAIPEI_MS);
    let y = wall.getUTCFullYear();
    const month = Number(m[1]);
    const day = Number(m[2]);
    const probe = new Date(Date.UTC(y, month - 1, day));
    if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
      return { text: s, relative: true };
    }
    const todayYmd = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate());
    const probeYmd = Date.UTC(y, month - 1, day);
    if (probeYmd > todayYmd) y -= 1;
    if (m[3]) {
      const [hh, mi] = m[3].split(":").map(Number);
      const abs = new Date(Date.UTC(y, month - 1, day, hh, mi) - TAIPEI_MS);
      return { text: formatTaipei(abs, true), relative: false };
    }
    const abs = new Date(Date.UTC(y, month - 1, day, 0, 0) - TAIPEI_MS);
    return { text: formatTaipei(abs, false), relative: false };
  }
  return { text: s, relative: true };
}
