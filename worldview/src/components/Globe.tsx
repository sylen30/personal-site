import { useEffect, useRef, useState, useCallback } from 'react';
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
import { Viewer, useCesium } from 'resium';
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

// ─── Inner component: runs inside <Viewer> so useCesium() is always ready ────

interface SetupProps {
  onReady: (v: CesiumViewer) => void;
  onError: (msg: string) => void;
}

function ViewerSetup({ onReady, onError }: SetupProps) {
  // useCesium() gives us the viewer from Resium's context — guaranteed
  // non-null by the time this component's effects run.
  const { viewer } = useCesium();
  const initialized = useRef(false);
  const clockMultiplier = useClockStore((s) => s.multiplier);
  const clockPaused = useClockStore((s) => s.paused);

  useEffect(() => {
    if (!viewer || initialized.current) return;
    initialized.current = true;

    viewer.scene.renderError.addEventListener((_scene: unknown, error: unknown) => {
      const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      console.error('[WorldView] render error:', error);
      onError(msg);
    });

    // Flat ellipsoid terrain — no Ion token required.
    viewer.terrainProvider = new EllipsoidTerrainProvider();

    try {
      viewer.scene.fog.enabled = true;
    } catch { /* ignore */ }

    // Imagery using the current Cesium ImageryLayer API.
    viewer.imageryLayers.removeAll();
    if (ION_TOKEN) {
      createWorldImageryAsync()
        .then((p) => {
          if (!viewer.isDestroyed()) {
            viewer.imageryLayers.removeAll();
            viewer.imageryLayers.add(new ImageryLayer(p));
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
        .then((t) => { if (!viewer.isDestroyed()) viewer.scene.primitives.add(t); })
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

    onReady(viewer);

    return () => {
      handler.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer]);

  // Sync clock multiplier to Cesium viewer.
  useEffect(() => {
    if (!viewer) return;
    viewer.clock.multiplier = clockMultiplier;
    viewer.clock.shouldAnimate = !clockPaused;
  }, [viewer, clockMultiplier, clockPaused]);

  return null;
}

// ─── Outer shell ─────────────────────────────────────────────────────────────

export function GlobeView() {
  const [activeViewer, setActiveViewer] = useState<CesiumViewer | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const handleReady = useCallback((v: CesiumViewer) => setActiveViewer(v), []);
  const handleError = useCallback((msg: string) => setRenderError(msg), []);

  return (
    <div className="absolute inset-0">
      <Viewer
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
        <ViewerSetup onReady={handleReady} onError={handleError} />
        {activeViewer && (
          <>
            <FlightsLayer viewer={activeViewer} />
            <ShipsLayer viewer={activeViewer} />
            <SatellitesLayer viewer={activeViewer} />
            <EarthquakesLayer viewer={activeViewer} />
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
