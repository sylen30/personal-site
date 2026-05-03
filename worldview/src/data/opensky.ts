import type { Aircraft } from '../types';

// If VITE_FLIGHTS_PROXY_URL is set (e.g. a Cloudflare Worker), use it as the
// sole source — the worker handles CORS and upstream fallback server-side.
// Without it, direct API calls are attempted, which only works in local dev
// (all public ADS-B APIs block CORS from github.io).
const PROXY_URL = (import.meta.env.VITE_FLIGHTS_PROXY_URL as string | undefined)?.replace(/\/$/, '');

// In local dev (npm run dev) Vite proxies /api/flights → adsb.lol server-side,
// so the browser never makes a cross-origin request. On static hosts (GH Pages)
// VITE_FLIGHTS_PROXY_URL must point to the deployed Cloudflare Worker.
const SOURCES: string[] = PROXY_URL
  ? [PROXY_URL]
  : ['/api/flights'];

interface AircraftRecord {
  hex: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | 'ground';
  track?: number;
  gs?: number;
  vert_rate?: number;
  seen?: number;
  r?: string;
}

function mapRecord(a: AircraftRecord): Aircraft | null {
  if (a.lat == null || a.lon == null) return null;
  const onGround = a.alt_baro === 'ground';
  const altFt = onGround || a.alt_baro == null ? null : (a.alt_baro as number);
  return {
    icao24: a.hex,
    callsign: a.flight?.trim() || null,
    originCountry: a.r ?? '',
    longitude: a.lon,
    latitude: a.lat,
    baroAltitudeM: altFt != null ? altFt * 0.3048 : null,
    velocityMs: a.gs != null ? a.gs * 0.514444 : null,
    trueTrackDeg: a.track ?? null,
    verticalRateMs: a.vert_rate != null ? a.vert_rate * 0.00508 : null,
    onGround,
    lastContactSec: a.seen ?? 0,
  };
}

let lastResult: Aircraft[] = [];

export async function fetchAircraftStates(): Promise<Aircraft[]> {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) continue;
      const json = (await res.json()) as Record<string, unknown>;
      // Handles "ac" (ADSBX/adsb.lol format) and "aircraft" (adsb.fi legacy)
      const raw = (json['ac'] ?? json['aircraft']) as AircraftRecord[] | undefined;
      if (!Array.isArray(raw) || raw.length === 0) continue;
      const aircraft = raw.flatMap((a) => {
        const mapped = mapRecord(a);
        return mapped ? [mapped] : [];
      });
      if (aircraft.length > 0) {
        lastResult = aircraft;
        return aircraft;
      }
    } catch {
      // network / CORS / timeout — try next source
    }
  }
  console.warn('[flights] All sources failed — returning last known state.');
  if (!PROXY_URL) {
    console.warn('[flights] Tip: for static hosts set VITE_FLIGHTS_PROXY_URL to your Cloudflare Worker URL (worldview/flights-proxy/).');
  }
  return lastResult;
}

export function pollOpenSky(
  onUpdate: (a: Aircraft[]) => void,
  intervalMs = 10_000,
): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const tick = async (): Promise<void> => {
    if (cancelled) return;
    const data = await fetchAircraftStates();
    if (cancelled) return;
    onUpdate(data);
    timer = setTimeout(tick, intervalMs);
  };

  void tick();

  return () => {
    cancelled = true;
    if (timer != null) clearTimeout(timer);
  };
}
