import { useEffect } from 'react';
import * as Cesium from 'cesium';
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLong,
  degreesLat,
  type SatRec,
} from 'satellite.js';
import { useLayerStore } from '../store/layers';
import { fetchAllGroups } from '../data/celestrak';
import type { Satellite, SatelliteGroup } from '../types';

const TICK_INTERVAL_MS = 2_000;
const GROUPS: SatelliteGroup[] = ['stations', 'starlink', 'gps'];

const GROUP_COLORS: Record<SatelliteGroup, Cesium.Color> = {
  stations: Cesium.Color.fromCssColorString('#fde047'),
  starlink: Cesium.Color.fromCssColorString('#a78bfa'),
  gps: Cesium.Color.fromCssColorString('#60a5fa'),
  military: Cesium.Color.fromCssColorString('#f87171'),
  weather: Cesium.Color.fromCssColorString('#34d399'),
};

interface SatRecord {
  sat: Satellite;
  satrec: SatRec;
  point: Cesium.PointPrimitive;
  data: Satellite & { longitude: number; latitude: number; altitudeKm: number };
}

export function SatellitesLayer({ viewer }: { viewer: Cesium.Viewer }): null {
  const enabled = useLayerStore((s) => s.satellites);
  const setCount = useLayerStore((s) => s.setCount);

  useEffect(() => {
    if (!enabled) return;

    const points = viewer.scene.primitives.add(
      new Cesium.PointPrimitiveCollection(),
    ) as Cesium.PointPrimitiveCollection;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const records: SatRecord[] = [];

    const propagateAll = (): void => {
      if (points.isDestroyed()) return;
      const now = new Date();
      const gmst = gstime(now);
      for (const rec of records) {
        const pv = propagate(rec.satrec, now);
        if (!pv || typeof pv.position === 'boolean' || !pv.position) continue;
        const geo = eciToGeodetic(pv.position, gmst);
        const longitude = degreesLong(geo.longitude);
        const latitude = degreesLat(geo.latitude);
        const altitudeKm = geo.height;
        if (
          !Number.isFinite(longitude) ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(altitudeKm)
        ) {
          continue;
        }
        rec.point.position = Cesium.Cartesian3.fromDegrees(
          longitude,
          latitude,
          altitudeKm * 1000,
        );
        rec.data.longitude = longitude;
        rec.data.latitude = latitude;
        rec.data.altitudeKm = altitudeKm;
      }
      viewer.scene.requestRender();
    };

    void (async (): Promise<void> => {
      let sats: Satellite[];
      try {
        sats = await fetchAllGroups(GROUPS);
      } catch (err) {
        console.error('[SatellitesLayer] fetchAllGroups failed:', err);
        return;
      }
      if (cancelled || points.isDestroyed()) return;

      for (const sat of sats) {
        let satrec: SatRec;
        try {
          satrec = twoline2satrec(sat.tle1, sat.tle2);
        } catch {
          continue;
        }
        const color = GROUP_COLORS[sat.group] ?? Cesium.Color.WHITE;
        const data = { ...sat, longitude: 0, latitude: 0, altitudeKm: 0 };
        const id = { wvEntity: { kind: 'satellite' as const, data } };
        const point = points.add({
          position: Cesium.Cartesian3.fromDegrees(0, 0, 0),
          color,
          pixelSize: 3,
          id,
        });
        records.push({ sat, satrec, point, data });
      }

      setCount('satellites', records.length);
      propagateAll();
      intervalId = setInterval(propagateAll, TICK_INTERVAL_MS);
    })();

    return () => {
      cancelled = true;
      if (intervalId != null) clearInterval(intervalId);
      records.length = 0;
      if (!viewer.isDestroyed()) {
        viewer.scene.primitives.remove(points);
      }
      setCount('satellites', 0);
    };
  }, [enabled, viewer, setCount]);

  return null;
}
