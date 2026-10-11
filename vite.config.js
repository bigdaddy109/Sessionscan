import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { ensureCfWebAnalytics } from "./src/cfWebAnalytics.js";
import { injectJobListHtml, renderStaticHomeJobList } from "./src/staticHomeJobs.js";

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
      const cards = renderStaticHomeJobList(loadHubJobs(), { lang: "en" });
      return injectJobListHtml(html, cards);
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

function zhDevAlias() {
  return {
    name: "zh-dev-alias",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        rewriteZhDevRequest(req);
        next();
      });
    },
  };
}

export default defineConfig({
  base: "./",
  publicDir: "public",
  plugins: [injectStaticJobs(), cloudflareWebAnalytics(), zhDevAlias()],
  server: { host: "127.0.0.1", port: 43173, strictPort: true },
  preview: { host: "127.0.0.1", port: 43173, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
});
