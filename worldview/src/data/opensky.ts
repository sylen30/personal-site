import type { Aircraft } from '../types';

const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

type RawState = [
  string, // icao24
  string | null, // callsign
  string, // origin_country
  number | null, // time_position
  number, // last_contact
  number | null, // longitude
  number | null, // latitude
  number | null, // baro_altitude
  boolean, // on_ground
  number | null, // velocity
  number | null, // true_track
  number | null, // vertical_rate
  number[] | null, // sensors
  number | null, // geo_altitude
  string | null, // squawk
  boolean, // spi
  number, // position_source
];

interface OpenSkyResponse {
  time: number;
  states: RawState[] | null;
}

let lastResult: Aircraft[] = [];

export async function fetchAircraftStates(): Promise<Aircraft[]> {
  try {
    const res = await fetch(OPENSKY_URL);
    if (!res.ok) {
      console.error(`OpenSky fetch failed: ${res.status} ${res.statusText}`);
      return lastResult;
    }
    const json = (await res.json()) as OpenSkyResponse;
    const states = json.states ?? [];
    const aircraft: Aircraft[] = [];
    for (const s of states) {
      const longitude = s[5];
      const latitude = s[6];
      if (longitude == null || latitude == null) continue;
      const callsignRaw = s[1];
      const callsign = callsignRaw ? callsignRaw.trim() || null : null;
      aircraft.push({
        icao24: s[0],
        callsign,
        originCountry: s[2],
        longitude,
        latitude,
        baroAltitudeM: s[7],
        velocityMs: s[9],
        trueTrackDeg: s[10],
        verticalRateMs: s[11],
        onGround: s[8],
        lastContactSec: s[4],
      });
    }
    lastResult = aircraft;
    return aircraft;
  } catch (err) {
    console.error('OpenSky fetch error:', err);
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
