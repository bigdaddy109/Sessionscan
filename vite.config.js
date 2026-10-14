import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { ensureCfWebAnalytics } from "./src/cfWebAnalytics.js";
import {
  SITE_PAGES,
  injectHomeShell,
  legacyHashRedirectScript,
  localePath,
  renderSitePage,
} from "./src/sitePages.js";
import { injectHomeBusinessGuideLink } from "./src/businessRanking.js";
import { injectHomeGta6Link } from "./src/gta6Page.js";
import { injectStaticHomeFreshness } from "./src/homeExtras.js";
import { injectHomeMoneyGuideLink } from "./src/moneyGuide.js";
import { injectJobListHtml, renderStaticHomeJobList } from "./src/staticHomeJobs.js";
import { injectStaticWeekBullets, injectStaticWeekCountdown } from "./src/thisWeekHome.js";
import {
  injectHomeArchiveIndexLink,
  injectHomeAtomDiscovery,
  latestArchiveWeek,
  matchWeekFreezePath,
  renderArchiveAtomFeed,
  renderArchiveIndexPage,
  renderWeekFreezePage,
} from "./src/weekArchive.js";

function loadHubJobs() {
  const sitePath = resolve("public/data/site.json");
  if (!existsSync(sitePath)) return {};
  try {
    return JSON.parse(readFileSync(sitePath, "utf8"));
  } catch {
    return {};
  }
}

function injectStaticJobs() {
  return {
    name: "inject-static-jobs",
    transformIndexHtml(html) {
      const hub = loadHubJobs();
      const cards = renderStaticHomeJobList(hub, { lang: "en" });
      let out = injectJobListHtml(html, cards);
      out = injectStaticHomeFreshness(out, { lang: "en", data: hub });
      out = injectStaticWeekCountdown(out, { lang: "en" });
      out = injectStaticWeekBullets(out, { lang: "en", data: hub });
      out = injectHomeShell(out, { lang: "en" });
      out = injectHomeArchiveIndexLink(out, { lang: "en" });
      out = injectHomeAtomDiscovery(out, { lang: "en" });
      out = injectHomeMoneyGuideLink(out, { lang: "en" });
      out = injectHomeBusinessGuideLink(out, { lang: "en" });
      out = injectHomeGta6Link(out, { lang: "en" });
      return out;
    },
  };
}

function cloudflareWebAnalytics() {
  return {
    name: "cloudflare-web-analytics",
    apply: "build",
    transformIndexHtml(html) {
      return ensureCfWebAnalytics(html);
    },
  };
}

function rewriteZhDevRequest(req) {
  const url = req.url || "";
  if (url === "/zh" || url === "/zh/" || url.startsWith("/zh/?")) {
    req.url = `/index.html${url.includes("?") ? url.slice(url.indexOf("?")) : ""}`;
  }
}

function matchSitePage(urlPath) {
  const clean = String(urlPath || "").split("?")[0].split("#")[0].replace(/\/index\.html$/, "") || "/";
  const normalized = clean.endsWith("/") || clean === "/" ? clean : `${clean}/`;
  for (const page of SITE_PAGES) {
    for (const lang of ["en", "zh"]) {
      const path = localePath(lang, page.path);
      if (normalized === path || clean === path.replace(/\/$/, "")) {
        return { page, lang, path };
      }
    }
  }
  return null;
}

function sitePagesDev() {
  return {
    name: "site-pages-dev",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathOnly = String(req.url || "").split("?")[0];
        if (pathOnly === "/week/feed.xml" || pathOnly === "/week/feed.xml/") {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/atom+xml; charset=utf-8");
          res.end(renderArchiveAtomFeed(loadHubJobs()));
          return;
        }
        const freeze = matchWeekFreezePath(req.url || "");
        if (freeze) {
          const html = renderWeekFreezePage(loadHubJobs(), freeze.weekIso, {
            lang: freeze.lang,
            cssHref: "/src/style.css",
            faviconHref: "/favicon.svg",
          });
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(html);
          return;
        }
        const hit = matchSitePage(req.url || "");
        if (!hit) return next();
        const hub = loadHubJobs();
        const opts = {
          lang: hit.lang,
          cssHref: "/src/style.css",
          faviconHref: "/favicon.svg",
          tipWeek: latestArchiveWeek(hub)?.week || "",
        };
        const html =
          hit.page.id === "week"
            ? renderArchiveIndexPage(hub, opts)
            : renderSitePage(hit.page, opts);
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
      });
    },
  };
}

function zhDevAlias() {
  return {
    name: "zh-dev-alias",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        rewriteZhDevRequest(req);
        next();
      });
    },
    transformIndexHtml(html) {
      // Ensure hash-redirect script exists even when injectHomeShell already ran.
      if (html.includes("data-legacy-hash-redirect")) return html;
      return html.replace("</head>", `    ${legacyHashRedirectScript().replace("<script>", '<script data-legacy-hash-redirect>')}\n  </head>`);
    },
  };
}

export default defineConfig({
  base: "./",
  publicDir: "public",
  plugins: [injectStaticJobs(), cloudflareWebAnalytics(), sitePagesDev(), zhDevAlias()],
  server: { host: "127.0.0.1", port: 43173, strictPort: true },
  preview: { host: "127.0.0.1", port: 43173, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
});
