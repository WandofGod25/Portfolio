/**
 * Cloudflare Pages Function — /api/geo
 *
 * Returns the visitor's city / country / lat / lon from Cloudflare's
 * built-in geolocation (request.cf). Same-origin, never blocked by
 * ad-blockers, no API key, no quotas. This is the most reliable source
 * by a wide margin because the answer comes from the edge that already
 * handled the request.
 *
 * If Cloudflare didn't determine a city for this visitor (rare), we
 * return 204 No Content so the client can fall through to ipapi.co /
 * ipinfo.io as backups.
 */
export async function onRequest(context) {
  const { request } = context;
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

  if (!city) {
    return new Response(null, { status: 204 });
  }

  const body = {
    city,
    region: cf.region || null,
    country: cf.country || null,
    countryName: cf.country || null,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lon) ? lon : null,
    timezone: cf.timezone || null,
  };

  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Per-visitor data — never share between users via any CDN cache.
      "cache-control": "private, no-store, max-age=0",
      "access-control-allow-origin": "*",
    },
  });
}
