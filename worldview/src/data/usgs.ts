import type { Earthquake } from '../types';

const USGS_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

interface USGSFeature {
  id: string;
  properties: {
    mag: number | null;
    place: string | null;
    time: number;
    url: string;
  };
  geometry: {
    coordinates: [number, number, number];
  };
}

interface USGSResponse {
  features: USGSFeature[];
}

let lastResult: Earthquake[] = [];

export async function fetchEarthquakes(): Promise<Earthquake[]> {
  try {
    const res = await fetch(USGS_URL);
    if (!res.ok) {
      console.error(`USGS fetch failed: ${res.status} ${res.statusText}`);
      return lastResult;
    }
    const json = (await res.json()) as USGSResponse;
    const quakes: Earthquake[] = [];
    for (const f of json.features) {
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 3) continue;
      const [longitude, latitude, depthKm] = coords;
      if (longitude == null || latitude == null) continue;
      quakes.push({
        id: f.id,
        magnitude: f.properties.mag ?? 0,
        place: f.properties.place ?? '',
        longitude,
        latitude,
        depthKm: depthKm ?? 0,
        timeMs: f.properties.time,
        url: f.properties.url,
      });
    }
    lastResult = quakes;
    return quakes;
  } catch (err) {
    console.error('USGS fetch error:', err);
    return lastResult;
  }
}

export function pollUSGS(
  onUpdate: (q: Earthquake[]) => void,
  intervalMs = 60_000,
): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const tick = async (): Promise<void> => {
    if (cancelled) return;
    const data = await fetchEarthquakes();
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
