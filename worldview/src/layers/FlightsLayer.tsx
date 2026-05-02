import { useEffect } from 'react';
import * as Cesium from 'cesium';
import { useLayerStore } from '../store/layers';
import { pollOpenSky } from '../data/opensky';
import type { Aircraft } from '../types';

const LABEL_ALTITUDE_THRESHOLD_M = 3_000_000;

function aircraftIcon(heading: number, color = '#22ff88'): string {
  const rot = Number.isFinite(heading) ? heading : 0;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-12 -12 24 24">` +
    `<g transform="rotate(${rot.toFixed(2)})">` +
    `<path d="M0 -10 L2 -2 L10 2 L10 4 L2 2 L1 8 L4 10 L4 11 L0 10 L-4 11 L-4 10 L-1 8 L-2 2 L-10 4 L-10 2 L-2 -2 Z" ` +
    `fill="${color}" stroke="#0a0a0a" stroke-width="0.6" stroke-linejoin="round"/>` +
    `</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function FlightsLayer({ viewer }: { viewer: Cesium.Viewer }): null {
  const enabled = useLayerStore((s) => s.flights);
  const setCount = useLayerStore((s) => s.setCount);

  useEffect(() => {
    if (!enabled) return;

    const billboards = viewer.scene.primitives.add(
      new Cesium.BillboardCollection({ scene: viewer.scene }),
    ) as Cesium.BillboardCollection;
    const labels = viewer.scene.primitives.add(
      new Cesium.LabelCollection({ scene: viewer.scene }),
    ) as Cesium.LabelCollection;

    const handleUpdate = (aircraft: Aircraft[]): void => {
      if (billboards.isDestroyed() || labels.isDestroyed()) return;
      billboards.removeAll();
      labels.removeAll();

      const cameraHeight = viewer.camera.positionCartographic.height;
      const showLabels = cameraHeight < LABEL_ALTITUDE_THRESHOLD_M;

      for (const ac of aircraft) {
        const altitude = ac.baroAltitudeM ?? 0;
        const position = Cesium.Cartesian3.fromDegrees(
          ac.longitude,
          ac.latitude,
          altitude,
        );
        const heading = ac.trueTrackDeg ?? 0;
        billboards.add({
          position,
          image: aircraftIcon(heading),
          width: 24,
          height: 24,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          id: { wvEntity: { kind: 'aircraft', data: ac } },
        });

        if (showLabels && ac.callsign) {
          labels.add({
            position,
            text: ac.callsign,
            font: '11px monospace',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(12, 0),
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            id: { wvEntity: { kind: 'aircraft', data: ac } },
          });
        }
      }

      setCount('flights', aircraft.length);
      viewer.scene.requestRender();
    };

    const stopPolling = pollOpenSky(handleUpdate);

    return () => {
      stopPolling();
      if (!viewer.isDestroyed()) {
        viewer.scene.primitives.remove(billboards);
        viewer.scene.primitives.remove(labels);
      }
      setCount('flights', 0);
    };
  }, [enabled, viewer, setCount]);

  return null;
}
