# WorldView // God's Eye

A browser-based geospatial intelligence dashboard inspired by Bilawal Sidhu's
WorldView. A 3D globe (CesiumJS) overlaid with live OSINT feeds: aircraft,
satellites, ships, and earthquakes — clickable, time-scrubbable, with optional
night-vision and CRT post-FX modes for that tactical command-center vibe.

## Quickstart

```bash
cd worldview
cp .env.example .env       # add a Cesium Ion token (free, optional)
npm install
npm run dev                # http://localhost:5173
```

### View on phone

- **Same Wi-Fi**: `npm run dev` then open `http://<your-laptop-ip>:5173` on
  your phone (Vite already binds to `0.0.0.0`).
- **Public URL via tunnel** (works on cellular too):
  `npx cloudflared tunnel --url http://localhost:5173`
- **Permanent URL**: see Deploy below.

## Deploy

### GitHub Pages (auto on push)

A workflow at `.github/workflows/deploy-worldview.yml` builds and deploys to
GitHub Pages on every push to `main` or this feature branch. After the first
run, your site will be at `https://<user>.github.io/personal-site/`.

One-time setup:
1. Repo → Settings → Pages → Source: **GitHub Actions**.
2. (Optional) Repo → Settings → Secrets → Actions, add:
   - `CESIUM_ION_TOKEN` — better basemap
   - `AISSTREAM_API_KEY` — enables the Ships layer
   - `GOOGLE_3D_TILES_KEY` — Photorealistic 3D Tiles

Without secrets it still builds and runs (free fallback imagery).

### Vercel

Import the repo at https://vercel.com/new, set **Root Directory** to
`worldview`. The included `vercel.json` handles the rest. Add env vars in
Project Settings → Environment Variables (use the `VITE_*` names from
`.env.example`).

### Netlify

Drag `worldview/dist/` to https://app.netlify.com/drop after a local
`npm run build`, or connect the repo — `netlify.toml` already configures
`base = "worldview"`. Add env vars under Site → Configuration →
Environment variables.

## API Keys

All keys are optional — the app degrades gracefully when they're missing.

| Var | What it unlocks | Where to get it |
|---|---|---|
| `VITE_CESIUM_ION_TOKEN` | Cesium World Imagery basemap (much prettier than the offline blue-marble fallback) | https://ion.cesium.com/tokens (free signup) |
| `VITE_AISSTREAM_API_KEY` | Live ship tracking via the AIS WebSocket | https://aisstream.io/authenticate (free) |
| `VITE_GOOGLE_3D_TILES_KEY` | Photorealistic 3D Tiles (the same volumetric city data Google Earth uses) | https://developers.google.com/maps/documentation/tile/get-api-key |

Without any keys you still get: the globe, flights (OpenSky), satellites
(CelesTrak), and earthquakes (USGS).

## Data sources

| Layer | Source | Auth | Update rate |
|---|---|---|---|
| Aircraft | OpenSky Network REST | none (rate-limited) | 10 s |
| Ships (AIS) | AISStream.io WebSocket | API key | streaming |
| Satellites | CelesTrak TLEs + `satellite.js` SGP4 propagation | none | 2 s tick (TLEs cached 24 h) |
| Earthquakes | USGS GeoJSON `all_day` | none | 60 s |
| Basemap | Cesium World Imagery / Google Photorealistic 3D Tiles | Ion / Google key | static |

## Features

- **3D globe** with atmospheric lighting, fog, and a tactical dark theme.
- **Click any contact** for a side panel with details and an external lookup
  link (FlightAware / MarineTraffic / n2yo / USGS).
- **Time scrubber** — pause, 1×/10×/60×/600×, or jump back to real-time.
  Satellites visibly trace orbits at high multipliers.
- **Post-FX overlays** — toggle a CRT scanline overlay or a night-vision tint
  for the Sidhu video aesthetic.
- **Layer counts** show how many contacts are live in each layer.

## Architecture

```
src/
├── components/        Globe, LayerPanel, TimeScrubber, EntityInfoCard, PostFX, StatusBar
├── layers/            FlightsLayer, ShipsLayer, SatellitesLayer, EarthquakesLayer
│                      (each renders Cesium primitives imperatively, returns null)
├── data/              Pure-TS fetchers — opensky, aisstream, celestrak, usgs
├── store/             Zustand store for layer toggles, counts, selected entity
├── types.ts           Aircraft / Ship / Satellite / Earthquake / SelectedEntity
└── styles/app.css     Tailwind v4 + Cesium overrides + tactical-panel utilities
```

Each layer component takes the live `Cesium.Viewer` and a boolean from the
store; on enable it adds a primitive collection to the scene and starts a
poller or WebSocket. On disable / unmount it tears everything down. All
primitives carry an `id = { wvEntity: { kind, data } }` so the central click
handler in `Globe.tsx` can route picks into the selection store.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server, HMR |
| `npm run build` | TypeScript build + Vite production bundle |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Strict TypeScript check, no emit |

## What's NOT included (vs. Sidhu's original)

- **AI agent swarm OSINT collection** — the headline novelty in the Operation
  Epic Fury video. A separate, much larger project.
- **Historical replay from archives** — layers stream live; there's no way to
  scrub back hours/days from cached AIS or OpenSky archives yet.
- **CCTV camera overlay** — region-locked feeds, license-restricted.
- **Mobile** — desktop-first, like the original.

## Credits

- [CesiumJS](https://cesium.com/platform/cesiumjs/) — the 3D globe engine.
- [Resium](https://resium.reearth.io/) — React bindings for Cesium.
- [satellite.js](https://github.com/shashwatak/satellite-js) — SGP4 propagation.
- [OpenSky Network](https://opensky-network.org/), [AISStream](https://aisstream.io/),
  [CelesTrak](https://celestrak.org/), [USGS](https://earthquake.usgs.gov/) —
  the OSINT feeds.
- Concept: [Bilawal Sidhu's WorldView](https://x.com/bilawalsidhu).
