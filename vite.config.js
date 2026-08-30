import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const CF_WEB_ANALYTICS =
  "<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{\"token\": \"a2ed116dcca9428aae207121d25629e5\"}'></script><!-- End Cloudflare Web Analytics -->";

function escHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function loadHubJobs() {
  const sitePath = resolve("public/data/site.json");
  const samplePath = resolve("public/data/sample.json");
  const path = existsSync(sitePath) ? sitePath : samplePath;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}

function staticJobCards() {
  const data = loadHubJobs();
  const pools = [data.jobs_gtabase || [], data.jobs_ign || [], data.jobs_wiki || []];
  const jobs = [];
  for (const pool of pools) {
    for (const item of pool) {
      if (item?.title && item?.url) jobs.push(item);
      if (jobs.length >= 3) break;
    }
    if (jobs.length >= 3) break;
  }
  return jobs
    .map((j, i) => {
      const date = j.updated ? `<span>⏱ ${escHtml(j.updated)}</span>` : "";
      return `<article class="job-card" data-static-job data-card>
      <div class="rank">${escHtml(j.rank ?? i + 1)}</div>
      <h3><a href="${escHtml(j.url)}" target="_blank" rel="noopener noreferrer">${escHtml(j.title)}</a></h3>
      <div class="card-meta"><span class="tag">${escHtml(j.source || "")}</span>${date}</div>
    </article>`;
    })
    .join("");
}

function injectStaticJobs() {
  return {
    name: "inject-static-jobs",
    transformIndexHtml(html) {
      const cards = staticJobCards();
      if (!cards) return html;
      return html.replace(
        /<div class="job-list" id="jobList"><\/div>/,
        `<div class="job-list" id="jobList">${cards}</div>`,
      );
    },
  };
}

function cloudflareWebAnalytics() {
  return {
    name: "cloudflare-web-analytics",
    apply: "build",
    transformIndexHtml(html) {
      if (html.includes("static.cloudflareinsights.com/beacon.min.js")) return html;
      return html.replace("</body>", `${CF_WEB_ANALYTICS}\n  </body>`);
    },
  };
}

export default defineConfig({
  base: "./",
  publicDir: "public",
  plugins: [injectStaticJobs(), cloudflareWebAnalytics()],
  server: { host: "127.0.0.1", port: 43173, strictPort: true },
  preview: { host: "127.0.0.1", port: 43173, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
});
