import { useEffect, useRef, useState } from 'react';
import {
  Ion,
  Viewer as CesiumViewer,
  Cesium3DTileset,
  Cartesian3,
  Cartesian2,
  EllipsoidTerrainProvider,
  ImageryLayer,
  UrlTemplateImageryProvider,
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

if (ION_TOKEN) Ion.defaultAccessToken = ION_TOKEN;

function osmLayer(): ImageryLayer {
  return new ImageryLayer(
    new UrlTemplateImageryProvider({
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      credit: '© OpenStreetMap contributors',
      maximumLevel: 19,
    }),
  );
}

export function GlobeView() {
  const viewerRef = useRef<{ cesiumElement?: CesiumViewer }>(null);
  const [ready, setReady] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const clockMultiplier = useClockStore((s) => s.multiplier);
  const clockPaused = useClockStore((s) => s.paused);

  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    // Surface Cesium render errors on-screen.
    const removeErrorListener = viewer.scene.renderError.addEventListener(
      (_scene: unknown, error: unknown) => {
        const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        console.error('[WorldView] Cesium render error:', error);
        setRenderError(msg);
      },
    );

    // Flat ellipsoid — no Ion token required.
    viewer.terrainProvider = new EllipsoidTerrainProvider();

    // Optional scene enhancements — wrapped so any failure stays non-fatal.
    try {
      viewer.scene.fog.enabled = true;
      if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true;
    } catch {
      // ignore
    }

    // Imagery — use ImageryLayer constructor (addImageryProvider removed in Cesium 1.125+).
    viewer.imageryLayers.removeAll();
    if (ION_TOKEN) {
      createWorldImageryAsync()
        .then((provider) => {
          if (!viewer.isDestroyed()) {
            viewer.imageryLayers.removeAll();
            viewer.imageryLayers.add(new ImageryLayer(provider));
          }
        })
        .catch(() => {
          if (!viewer.isDestroyed()) {
            viewer.imageryLayers.removeAll();
            viewer.imageryLayers.add(osmLayer());
          }
        });
    } else {
      viewer.imageryLayers.add(osmLayer());
    }

    if (GOOGLE_3D_KEY) {
      Cesium3DTileset.fromUrl(
        `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_3D_KEY}`,
        { showCreditsOnScreen: false },
      )
        .then((tileset) => { if (!viewer.isDestroyed()) viewer.scene.primitives.add(tileset); })
        .catch((e) => console.warn('[WorldView] 3D Tiles:', e));
    }

    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(0, 20, 18_000_000),
      duration: 1.6,
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-90), roll: 0 },
    });

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: { position: Cartesian2 }) => {
      const picked = viewer.scene.pick(click.position) as
        | { id?: unknown; primitive?: { id?: unknown } }
        | undefined;
      const fromId =
        picked?.id && typeof picked.id === 'object' && 'wvEntity' in picked.id
          ? (picked.id as { wvEntity: ReturnType<typeof useLayerStore.getState>['selected'] }).wvEntity
          : null;
      const fromPrim =
        !fromId &&
        picked?.primitive?.id &&
        typeof picked.primitive.id === 'object' &&
        'wvEntity' in picked.primitive.id
          ? (picked.primitive.id as { wvEntity: ReturnType<typeof useLayerStore.getState>['selected'] }).wvEntity
          : null;
      useLayerStore.getState().setSelected(fromId ?? fromPrim ?? null);
    }, ScreenSpaceEventType.LEFT_CLICK);

    setReady(true);

    return () => {
      handler.destroy();
      if (typeof removeErrorListener === 'function') removeErrorListener();
    };
  }, []);

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

      {renderError && (
        <div className="absolute inset-x-4 top-24 z-50 rounded-md border border-red-500/60 bg-black/90 p-4 text-xs text-red-300 font-mono">
          <div className="mb-1 text-red-400 uppercase tracking-widest text-[10px]">Cesium Render Error</div>
          <div className="break-all">{renderError}</div>
          <button type="button" onClick={() => setRenderError(null)} className="mt-2 text-red-500 hover:text-red-300">
            dismiss
          </button>
        </div>
      )}
    </div>
  );
}
