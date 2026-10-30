/**
 * Cloudflare Web Analytics beacon — single source for every built HTML page.
 * Token is the sessionscan.net Web Analytics siteTag from the Cloudflare
 * dashboard (site 052857ab…; JS snippet — Automatic injection does not appear
 * in the GitHub Pages HTML, so the build embeds the official module snippet).
 * Official manual embed uses type="module" (excludes EOL browsers).
 */

export const CF_WEB_ANALYTICS_TOKEN = "052857ab26394650992918ef9cfad883";
export const CF_WEB_ANALYTICS_SCRIPT_SRC = "https://static.cloudflareinsights.com/beacon.min.js";

/** Marker substring used to detect an already-injected beacon. */
export const CF_WEB_ANALYTICS_MARKER = "static.cloudflareinsights.com/beacon.min.js";

export function cfWebAnalyticsHtml() {
  const payload = JSON.stringify({ token: CF_WEB_ANALYTICS_TOKEN });
  return (
    `<!-- Cloudflare Web Analytics -->` +
    `<script type="module" src="${CF_WEB_ANALYTICS_SCRIPT_SRC}" data-cf-beacon='${payload}'></script>` +
    `<!-- End Cloudflare Web Analytics -->`
  );
}

export function hasCfWebAnalytics(html) {
  return String(html || "").includes(CF_WEB_ANALYTICS_MARKER);
}

/** Inject the beacon before </body> when missing. Idempotent. */
export function ensureCfWebAnalytics(html) {
  const text = String(html || "");
  if (!text || hasCfWebAnalytics(text)) return text;
  if (!/<\/body>/i.test(text)) {
    return `${text}\n${cfWebAnalyticsHtml()}\n`;
  }
  return text.replace(/<\/body>/i, `${cfWebAnalyticsHtml()}\n  </body>`);
}
