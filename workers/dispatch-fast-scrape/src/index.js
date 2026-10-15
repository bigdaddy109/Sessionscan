import { dispatchFastScrape, healthPayload } from "./lib.js";

export default {
  /**
   * HTTP entry — `/health` for ops probes. Other paths 404.
   * Cron is still the only dispatch trigger (no public fire endpoint).
   * @param {Request} request
   * @param {object} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health" || url.pathname === "/health/") {
      return Response.json(healthPayload(env), {
        status: 200,
        headers: { "cache-control": "no-store" },
      });
    }
    return new Response("not found", { status: 404 });
  },

  /**
   * Cron entry — Cloudflare Scheduled Event.
   * @param {ScheduledEvent} _controller
   * @param {object} env
   */
  async scheduled(_controller, env) {
    const result = await dispatchFastScrape(env);
    console.log("dispatched fast scrape", result);
  },
};
