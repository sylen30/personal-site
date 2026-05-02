import { useEffect } from 'react';
import * as Cesium from 'cesium';
import { useLayerStore } from '../store/layers';
import { pollUSGS } from '../data/usgs';
import type { Earthquake } from '../types';

const NEW_EVENT_WINDOW_MS = 60_000;
const PULSE_DURATION_MS = 1_000;
const PULSE_GROW_FACTOR = 2.5;

function colorForMagnitude(magnitude: number): Cesium.Color {
  const hex =
    magnitude < 3 ? '#a3e635'
    : magnitude < 5 ? '#facc15'
    : magnitude < 7 ? '#fb923c'
    : '#ef4444';
  const c = Cesium.Color.fromCssColorString(hex);
  return c.withAlpha(0.85);
}

function basePixelSize(magnitude: number): number {
  return 4 + Math.max(0, magnitude) * 3;
}

export function EarthquakesLayer({ viewer }: { viewer: Cesium.Viewer }): null {
  const enabled = useLayerStore((s) => s.earthquakes);
  const setCount = useLayerStore((s) => s.setCount);

  useEffect(() => {
    if (!enabled) return;

    const points = viewer.scene.primitives.add(
      new Cesium.PointPrimitiveCollection(),
    ) as Cesium.PointPrimitiveCollection;

    const quakePoints = new Map<string, Cesium.PointPrimitive>();
    const pulsing = new Map<string, number>(); // id -> animation start timestamp
    let rafId: number | null = null;

    const animatePulses = (): void => {
      if (points.isDestroyed()) {
        rafId = null;
        return;
      }
      const now = performance.now();
      let dirty = false;
      for (const [id, startedAt] of pulsing) {
        const point = quakePoints.get(id);
        if (!point) {
          pulsing.delete(id);
          continue;
        }
        const elapsed = now - startedAt;
        const wvEntity = (point.id as { wvEntity: { data: Earthquake } })
          .wvEntity;
        const base = basePixelSize(wvEntity.data.magnitude);
        if (elapsed >= PULSE_DURATION_MS) {
          point.pixelSize = base;
          pulsing.delete(id);
          dirty = true;
          continue;
        }
        const t = elapsed / PULSE_DURATION_MS;
        // grow then settle: peak at t=0.4, ease back to 1.0
        const eased = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6;
        point.pixelSize = base * (1 + (PULSE_GROW_FACTOR - 1) * eased);
        dirty = true;
      }
      if (dirty) viewer.scene.requestRender();
      if (pulsing.size > 0) {
        rafId = requestAnimationFrame(animatePulses);
      } else {
        rafId = null;
      }
    };

    const startPulse = (id: string): void => {
      pulsing.set(id, performance.now());
      if (rafId == null) {
        rafId = requestAnimationFrame(animatePulses);
      }
    };

    const handleUpdate = (quakes: Earthquake[]): void => {
      if (points.isDestroyed()) return;
      const seen = new Set<string>();
      const nowMs = Date.now();

      for (const eq of quakes) {
        seen.add(eq.id);
        const position = Cesium.Cartesian3.fromDegrees(
          eq.longitude,
          eq.latitude,
          0,
        );
        const color = colorForMagnitude(eq.magnitude);
        const size = basePixelSize(eq.magnitude);
        const wvEntity = { wvEntity: { kind: 'earthquake' as const, data: eq } };

        const existing = quakePoints.get(eq.id);
        if (existing) {
          existing.position = position;
          existing.color = color;
          existing.id = wvEntity;
          if (!pulsing.has(eq.id)) existing.pixelSize = size;
        } else {
          const point = points.add({
            position,
            color,
            pixelSize: size,
            id: wvEntity,
          });
          quakePoints.set(eq.id, point);
          if (nowMs - eq.timeMs < NEW_EVENT_WINDOW_MS) {
            startPulse(eq.id);
          }
        }
      }

      // remove quakes that fell out of the feed
      for (const [id, point] of quakePoints) {
        if (!seen.has(id)) {
          points.remove(point);
          quakePoints.delete(id);
          pulsing.delete(id);
        }
      }

      setCount('earthquakes', quakePoints.size);
      viewer.scene.requestRender();
    };

    const stopPolling = pollUSGS(handleUpdate);

    return () => {
      stopPolling();
      if (rafId != null) cancelAnimationFrame(rafId);
      pulsing.clear();
      quakePoints.clear();
      if (!viewer.isDestroyed()) {
        viewer.scene.primitives.remove(points);
      }
      setCount('earthquakes', 0);
    };
  }, [enabled, viewer, setCount]);

  return null;
}
