import type { Aircraft } from '../types';

// adsb.fi — free, CORS-enabled, no auth required, global coverage.
// OpenSky blocks anonymous browser requests via CORS on most origins.
const ADSBFI_URL = 'https://api.adsb.fi/v1/flights';

interface AdsbFiAircraft {
  hex: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | 'ground';
  track?: number;
  gs?: number;
  vert_rate?: number;
  seen?: number;
  r?: string;  // registration
  t?: string;  // aircraft type
}

interface AdsbFiResponse {
  aircraft: AdsbFiAircraft[];
}

let lastResult: Aircraft[] = [];

export async function fetchAircraftStates(): Promise<Aircraft[]> {
  try {
    const res = await fetch(ADSBFI_URL);
    if (!res.ok) {
      console.error(`adsb.fi fetch failed: ${res.status} ${res.statusText}`);
      return lastResult;
    }
    const json = (await res.json()) as AdsbFiResponse;
    const aircraft: Aircraft[] = [];
    for (const a of json.aircraft ?? []) {
      if (a.lat == null || a.lon == null) continue;
      const onGround = a.alt_baro === 'ground';
      const altFt = onGround || a.alt_baro == null ? null : (a.alt_baro as number);
      const altM = altFt != null ? altFt * 0.3048 : null;
      const velocityMs = a.gs != null ? a.gs * 0.514444 : null;
      const vertMs = a.vert_rate != null ? a.vert_rate * 0.00508 : null;
      aircraft.push({
        icao24: a.hex,
        callsign: a.flight?.trim() || null,
        originCountry: a.r ?? '',
        longitude: a.lon,
        latitude: a.lat,
        baroAltitudeM: altM,
        velocityMs,
        trueTrackDeg: a.track ?? null,
        verticalRateMs: vertMs,
        onGround,
        lastContactSec: a.seen ?? 0,
      });
    }
    lastResult = aircraft;
    return aircraft;
  } catch (err) {
    console.error('adsb.fi fetch error:', err);
    return lastResult;
  }
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
