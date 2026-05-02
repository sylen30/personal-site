import { useEffect, useRef, useState } from 'react';
import {
  Ion,
  Viewer as CesiumViewer,
  Cesium3DTileset,
  Cartesian3,
  Cartesian2,
  OpenStreetMapImageryProvider,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  createWorldImageryAsync,
  Math as CesiumMath,
} from 'cesium';
import { Viewer } from 'resium';
import { useLayerStore } from '../store/layers';
import { useClockStore } from './TimeScrubber';
import { FlightsLayer } from '../layers/FlightsLayer';
import { ShipsLayer } from '../layers/ShipsLayer';
import { SatellitesLayer } from '../layers/SatellitesLayer';
import { EarthquakesLayer } from '../layers/EarthquakesLayer';

const ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined;
const GOOGLE_3D_KEY = import.meta.env.VITE_GOOGLE_3D_TILES_KEY as string | undefined;

if (ION_TOKEN) {
  Ion.defaultAccessToken = ION_TOKEN;
}

export function GlobeView() {
  const viewerRef = useRef<{ cesiumElement?: CesiumViewer }>(null);
  const [ready, setReady] = useState(false);
  const clockMultiplier = useClockStore((s) => s.multiplier);
  const clockPaused = useClockStore((s) => s.paused);

  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    viewer.scene.globe.enableLighting = true;
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
    }
    viewer.scene.fog.enabled = true;
    viewer.scene.globe.atmosphereLightIntensity = 8.0;
    viewer.scene.backgroundColor.alpha = 1;

    // Replace whatever the viewer started with. We disabled the default base
    // layer below (baseLayer={false}), so just add our own.
    viewer.imageryLayers.removeAll();
    if (ION_TOKEN) {
      createWorldImageryAsync()
        .then((provider) => {
          viewer.imageryLayers.addImageryProvider(provider);
        })
        .catch((err) => {
          console.warn('[WorldView] Cesium World Imagery failed, using OSM:', err);
          viewer.imageryLayers.addImageryProvider(
            new OpenStreetMapImageryProvider({
              url: 'https://tile.openstreetmap.org/',
            }),
          );
        });

      if (GOOGLE_3D_KEY) {
        Cesium3DTileset.fromUrl(
          `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_3D_KEY}`,
          { showCreditsOnScreen: false },
        )
          .then((tileset) => {
            viewer.scene.primitives.add(tileset);
          })
          .catch((err) => {
            console.warn('[WorldView] Failed to load Google 3D Tiles:', err);
          });
      }
    } else {
      // No Ion token — OpenStreetMap tiles need no auth and work everywhere.
      viewer.imageryLayers.addImageryProvider(
        new OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/',
        }),
      );
    }

    // Camera default — over the equator looking down for a satisfying intro.
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(0, 20, 18_000_000),
      duration: 1.6,
      orientation: {
        heading: 0,
        pitch: CesiumMath.toRadians(-90),
        roll: 0,
      },
    });

    // Picking — left-click anything to push to selected entity store.
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: { position: Cartesian2 }) => {
      const picked = viewer.scene.pick(click.position) as
        | { id?: unknown; primitive?: { id?: unknown } }
        | undefined;
      const fromId =
        picked && picked.id && typeof picked.id === 'object' && 'wvEntity' in picked.id
          ? (picked.id as { wvEntity: ReturnType<typeof useLayerStore.getState>['selected'] }).wvEntity
          : null;
      const fromPrim =
        !fromId &&
        picked &&
        picked.primitive &&
        picked.primitive.id &&
        typeof picked.primitive.id === 'object' &&
        'wvEntity' in picked.primitive.id
          ? (picked.primitive.id as {
              wvEntity: ReturnType<typeof useLayerStore.getState>['selected'];
            }).wvEntity
          : null;
      useLayerStore.getState().setSelected(fromId ?? fromPrim ?? null);
    }, ScreenSpaceEventType.LEFT_CLICK);

    setReady(true);
    return () => {
      handler.destroy();
    };
  }, []);

  // Sync TimeScrubber state to Cesium clock.
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;
    viewer.clock.multiplier = clockMultiplier;
    viewer.clock.shouldAnimate = !clockPaused;
  }, [clockMultiplier, clockPaused, ready]);

  return (
    <div className="absolute inset-0">
      <Viewer
        ref={viewerRef}
        full
        animation={false}
        timeline={false}
        baseLayer={false}
        baseLayerPicker={false}
        geocoder={false}
        homeButton={false}
        sceneModePicker={false}
        navigationHelpButton={false}
        fullscreenButton={false}
        infoBox={false}
        selectionIndicator={false}
        shouldAnimate={true}
      >
        {ready && viewerRef.current?.cesiumElement && (
          <>
            <FlightsLayer viewer={viewerRef.current.cesiumElement} />
            <ShipsLayer viewer={viewerRef.current.cesiumElement} />
            <SatellitesLayer viewer={viewerRef.current.cesiumElement} />
            <EarthquakesLayer viewer={viewerRef.current.cesiumElement} />
          </>
        )}
      </Viewer>
    </div>
  );
}
