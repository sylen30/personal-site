/**
 * Cloudflare Worker — CORS proxy for ADS-B flight data.
 *
 * Deploy once (free Cloudflare account):
 *   npm install -g wrangler
 *   wrangler login
 *   wrangler deploy
 *
 * Then set VITE_FLIGHTS_PROXY_URL=https://<worker-name>.<account>.workers.dev
 * in your GitHub repo → Settings → Secrets and variables → Actions, and
 * redeploy the GitHub Pages workflow.
 */

const SOURCES = [
  'https://api.adsb.lol/v2/aircraft',
  'https://globe.adsbexchange.com/re-api/?all',
  'https://opendata.adsb.fi/api/v2/snapshot',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, _env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Serve from cache when available (10-second TTL matches poll interval).
    const cache = caches.default;
    const cacheKey = new Request('https://worldview-flights-cache/v1', request);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    for (const url of SOURCES) {
      try {
        const upstream = await fetch(url, {
          headers: { 'User-Agent': 'WorldView/1.0 (+https://github.com/sylen30/personal-site)' },
          cf: { cacheTtl: 0 },
        });
        if (!upstream.ok) continue;

        const body = await upstream.text();
        // Quick sanity check: must look like JSON with aircraft data
        if (!body.includes('"ac"') && !body.includes('"aircraft"') && !body.includes('"states"')) continue;

        const response = new Response(body, {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=10',
          },
        });

        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
      } catch {
        // Try next source
      }
    }

    return new Response(JSON.stringify({ ac: [], error: 'all_sources_failed' }), {
      status: 503,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  },
};
