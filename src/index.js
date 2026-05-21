/**
 * Cloudflare Worker entry — serves the portfolio static assets and exposes
 * a /api/geo endpoint that returns the visitor's city / country / lat / lon
 * from Cloudflare's built-in geolocation (request.cf).
 *
 * Why this matters: third-party IP-geolocation services (ipapi.co, ipinfo.io)
 * are routinely blocked by ad-blockers (EasyPrivacy etc.). Same-origin
 * /api/geo is never blocked, requires no API key, and returns Cloudflare's
 * high-quality geo data directly from the edge that's already handling the
 * request.
 */

/** Build a JSON response with same-origin cache disabled. */
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Per-visitor data — never share between users via shared cache.
      "cache-control": "private, no-store, max-age=0",
      "access-control-allow-origin": "*",
    },
  });
}

/** Wrap an asset response so HTML is never served from a stale browser
 *  cache. Static assets (CSS / JS / images) keep their default caching. */
async function withFreshHtml(response, request) {
  const url = new URL(request.url);
  // Treat the bare path and anything ending in .html as HTML responses.
  const isHtml =
    url.pathname === "/" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/");
  if (!isHtml) return response;
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("pragma", "no-cache");
  headers.set("expires", "0");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/geo") {
      const cf = request.cf || {};
      const lat =
        cf.latitude != null && cf.latitude !== ""
          ? parseFloat(cf.latitude)
          : null;
      const lon =
        cf.longitude != null && cf.longitude !== ""
          ? parseFloat(cf.longitude)
          : null;
      const city = cf.city || null;
      // If Cloudflare didn't give us a city, return 204 so the client falls
      // through to the external IP-geolocation providers.
      if (!city) return new Response(null, { status: 204 });
      return jsonResponse({
        city,
        region: cf.region || null,
        country: cf.country || null,
        countryName: cf.country || null,
        latitude: Number.isFinite(lat) ? lat : null,
        longitude: Number.isFinite(lon) ? lon : null,
        timezone: cf.timezone || null,
      });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    return withFreshHtml(assetResponse, request);
  },
};
