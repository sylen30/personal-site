import type { Satellite, SatelliteGroup } from '../types';

const BASE_URL = 'https://celestrak.org/NORAD/elements/gp.php';
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PER_GROUP = 200;

const GROUP_PARAM: Record<SatelliteGroup, string> = {
  stations: 'stations',
  starlink: 'starlink',
  gps: 'gps-ops',
  military: 'military',
  weather: 'weather',
};

interface CacheEntry {
  ts: number;
  data: Satellite[];
}

function cacheKey(group: SatelliteGroup): string {
  return `wv:tle:${group}`;
}

function readCache(group: SatelliteGroup): Satellite[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(group));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.ts > TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(group: SatelliteGroup, data: Satellite[]): void {
  try {
    const entry: CacheEntry = { ts: Date.now(), data };
    localStorage.setItem(cacheKey(group), JSON.stringify(entry));
  } catch {
    // quota or unavailable; ignore
  }
}

function parseTLE(text: string, group: SatelliteGroup): Satellite[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const sats: Satellite[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i].trim();
    const tle1 = lines[i + 1];
    const tle2 = lines[i + 2];
    if (!tle1.startsWith('1 ') || !tle2.startsWith('2 ')) continue;
    const noradId = tle1.substring(2, 7).trim();
    if (!noradId) continue;
    sats.push({ noradId, name, tle1, tle2, group });
    if (sats.length >= MAX_PER_GROUP) break;
  }
  return sats;
}

export async function fetchTLEGroup(group: SatelliteGroup): Promise<Satellite[]> {
  const cached = readCache(group);
  if (cached) return cached;
  try {
    const url = `${BASE_URL}?GROUP=${encodeURIComponent(GROUP_PARAM[group])}&FORMAT=tle`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Celestrak fetch failed (${group}): ${res.status}`);
      return [];
    }
    const text = await res.text();
    const sats = parseTLE(text, group);
    writeCache(group, sats);
    return sats;
  } catch (err) {
    console.error(`Celestrak fetch error (${group}):`, err);
    return [];
  }
}

export async function fetchAllGroups(
  groups: SatelliteGroup[],
): Promise<Satellite[]> {
  const results = await Promise.all(groups.map((g) => fetchTLEGroup(g)));
  return results.flat();
}
