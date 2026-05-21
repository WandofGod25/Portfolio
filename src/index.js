/**
 * Cloudflare Worker entry — serves the portfolio static assets and exposes
 * a tiny /api/geo endpoint that returns the visitor's city, country, and
 * lat/lon from Cloudflare's built-in geolocation (request.cf).
 *
 * Why this matters: the static fallback uses third-party IP-geolocation
 * providers (ipapi.co, ipinfo.io) which are routinely blocked by
 * ad-blockers (EasyPrivacy etc.). Same-origin /api/geo is never blocked,
 * requires no API key, and returns Cloudflare's high-quality geo data.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/geo") {
      const cf = request.cf || {};
      const body = {
        city: cf.city || null,
        region: cf.region || null,
        country: cf.country || null,
        countryName: cf.country || null,
        latitude:
          cf.latitude != null && cf.latitude !== ""
            ? parseFloat(cf.latitude)
            : null,
        longitude:
          cf.longitude != null && cf.longitude !== ""
            ? parseFloat(cf.longitude)
            : null,
        timezone: cf.timezone || null,
      };
      return new Response(JSON.stringify(body), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          // Per-visitor data — never share across users via shared cache.
          "cache-control": "private, no-store, max-age=0",
          // Allow same-origin fetches from the static page.
          "access-control-allow-origin": "*",
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
