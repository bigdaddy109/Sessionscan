import { defineConfig } from "vite";

const CF_WEB_ANALYTICS =
  "<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{\"token\": \"a2ed116dcca9428aae207121d25629e5\"}'></script><!-- End Cloudflare Web Analytics -->";

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
  plugins: [cloudflareWebAnalytics()],
  server: { host: "127.0.0.1", port: 43173, strictPort: true },
  preview: { host: "127.0.0.1", port: 43173, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
});
