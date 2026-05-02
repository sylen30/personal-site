import { useEffect } from 'react';
import * as Cesium from 'cesium';
import { useLayerStore } from '../store/layers';
import { connectAISStream } from '../data/aisstream';
import type { Ship } from '../types';

export function ShipsLayer({ viewer }: { viewer: Cesium.Viewer }): null {
  const enabled = useLayerStore((s) => s.ships);
  const setCount = useLayerStore((s) => s.setCount);

  useEffect(() => {
    if (!enabled) return;

    const apiKey = import.meta.env.VITE_AISSTREAM_API_KEY;
    if (!apiKey) {
      console.warn(
        '[ShipsLayer] VITE_AISSTREAM_API_KEY is not set; ships layer disabled. ' +
          'Get a free key at https://aisstream.io/.',
      );
      return;
    }

    const points = viewer.scene.primitives.add(
      new Cesium.PointPrimitiveCollection(),
    ) as Cesium.PointPrimitiveCollection;

    const shipPoints = new Map<string, Cesium.PointPrimitive>();
    const shipColor = Cesium.Color.fromCssColorString('#22d3ee');
    const outlineColor = Cesium.Color.WHITE;

    const handleShip = (ship: Ship): void => {
      if (points.isDestroyed()) return;
      const position = Cesium.Cartesian3.fromDegrees(
        ship.longitude,
        ship.latitude,
        0,
      );
      const id = { wvEntity: { kind: 'ship' as const, data: ship } };

      const existing = shipPoints.get(ship.mmsi);
      if (existing) {
        existing.position = position;
        existing.id = id;
      } else {
        const point = points.add({
          position,
          color: shipColor,
          pixelSize: 6,
          outlineColor,
          outlineWidth: 1,
          id,
        });
        shipPoints.set(ship.mmsi, point);
      }

      setCount('ships', shipPoints.size);
      viewer.scene.requestRender();
    };

    const disconnect = connectAISStream(apiKey, handleShip);

    return () => {
      disconnect();
      shipPoints.clear();
      if (!viewer.isDestroyed()) {
        viewer.scene.primitives.remove(points);
      }
      setCount('ships', 0);
    };
  }, [enabled, viewer, setCount]);

  return null;
}
