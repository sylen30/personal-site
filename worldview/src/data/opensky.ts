import type { Aircraft } from '../types';

// adsb.lol — CORS-open community ADS-B feed, ADSBExchange v2-compatible format.
// Falls back to opendata.adsb.fi snapshot (also CORS-open, refreshed every 30s).
// Both return {"ac": [...]} with the same field names our mapper already handles.
const ADSBX_URL = 'https://api.adsb.lol/v2/all';
const ADSBFI_URL = 'https://opendata.adsb.fi/api/v2/snapshot';

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
  // Try ADS-B Exchange first (denser coverage), fall back to adsb.fi.
  for (const url of [ADSBX_URL, ADSBFI_URL]) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) continue;
      const json = (await res.json()) as Record<string, unknown>;
      // ADSBX uses "ac", adsb.fi uses "aircraft"
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
  console.warn('[flights] All sources failed, returning last known state');
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
