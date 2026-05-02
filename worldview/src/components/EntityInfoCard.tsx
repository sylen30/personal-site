import type { ReactNode } from 'react';
import { useLayerStore } from '../store/layers';
import type { Aircraft, Earthquake, Satellite, Ship, SelectedEntity } from '../types';

interface RowProps {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

function Row({ label, value, mono = false }: RowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-emerald-900/30 last:border-b-0">
      <span className="text-[10px] uppercase tracking-widest text-emerald-700">{label}</span>
      <span
        className={`text-xs text-emerald-200 text-right truncate ${mono ? 'font-mono tabular-nums' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}

function fmtLat(lat: number): string {
  const dir = lat >= 0 ? 'N' : 'S';
  return `${Math.abs(lat).toFixed(3)} ${dir}`;
}

function fmtLon(lon: number): string {
  const dir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lon).toFixed(3)} ${dir}`;
}

function magColor(mag: number): string {
  if (mag >= 6) return 'text-red-400';
  if (mag >= 5) return 'text-amber-300';
  if (mag >= 4) return 'text-yellow-300';
  return 'text-emerald-300';
}

function kindLabel(kind: SelectedEntity['kind']): string {
  switch (kind) {
    case 'aircraft':
      return 'AIRCRAFT';
    case 'ship':
      return 'SHIP';
    case 'satellite':
      return 'SATELLITE';
    case 'earthquake':
      return 'EARTHQUAKE';
  }
}

function ExternalButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="mt-3 block w-full text-center px-2 py-1.5 rounded-sm text-[10px] tracking-widest uppercase border border-emerald-400/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 hover:text-emerald-100 transition-colors"
    >
      {children} <span className="text-emerald-400">↗</span>
    </a>
  );
}

function AircraftBody({ data }: { data: Aircraft }) {
  const altM = data.baroAltitudeM;
  const altFt = altM != null ? Math.round(altM * 3.28084) : null;
  const vMs = data.velocityMs;
  const vKt = vMs != null ? Math.round(vMs * 1.94384) : null;
  const lookup = (data.callsign?.trim() || data.icao24).trim();
  return (
    <>
      <Row label="Callsign" value={data.callsign?.trim() || '—'} mono />
      <Row label="ICAO24" value={data.icao24.toUpperCase()} mono />
      <Row label="Country" value={data.originCountry || '—'} />
      <Row label="Lat" value={fmtLat(data.latitude)} mono />
      <Row label="Lon" value={fmtLon(data.longitude)} mono />
      <Row
        label="Altitude"
        value={altM != null ? `${Math.round(altM)} m / ${altFt?.toLocaleString()} ft` : '—'}
        mono
      />
      <Row
        label="Velocity"
        value={vMs != null ? `${Math.round(vMs)} m/s / ${vKt} kt` : '—'}
        mono
      />
      <Row
        label="Heading"
        value={data.trueTrackDeg != null ? `${data.trueTrackDeg.toFixed(0)}°` : '—'}
        mono
      />
      <Row
        label="Status"
        value={
          <span className={data.onGround ? 'text-amber-300' : 'text-emerald-300'}>
            {data.onGround ? 'ON GROUND' : 'AIRBORNE'}
          </span>
        }
      />
      <ExternalButton href={`https://flightaware.com/live/flight/${encodeURIComponent(lookup)}`}>
        Lookup on FlightAware
      </ExternalButton>
    </>
  );
}

function ShipBody({ data }: { data: Ship }) {
  return (
    <>
      <Row label="Name" value={data.name?.trim() || '—'} />
      <Row label="MMSI" value={data.mmsi} mono />
      <Row label="Lat" value={fmtLat(data.latitude)} mono />
      <Row label="Lon" value={fmtLon(data.longitude)} mono />
      <Row
        label="Course"
        value={data.cogDeg != null ? `${data.cogDeg.toFixed(0)}°` : '—'}
        mono
      />
      <Row
        label="Speed"
        value={data.sogKnots != null ? `${data.sogKnots.toFixed(1)} kt` : '—'}
        mono
      />
      <Row
        label="Heading"
        value={data.headingDeg != null ? `${data.headingDeg.toFixed(0)}°` : '—'}
        mono
      />
      <Row label="Destination" value={data.destination?.trim() || '—'} />
      <ExternalButton
        href={`https://www.marinetraffic.com/en/ais/details/ships/mmsi:${encodeURIComponent(data.mmsi)}`}
      >
        Lookup on MarineTraffic
      </ExternalButton>
    </>
  );
}

function SatelliteBody({
  data,
}: {
  data: Satellite & { longitude: number; latitude: number; altitudeKm: number };
}) {
  return (
    <>
      <Row label="Name" value={data.name} />
      <Row label="NORAD ID" value={data.noradId} mono />
      <Row label="Group" value={data.group.toUpperCase()} />
      <Row label="Lat" value={fmtLat(data.latitude)} mono />
      <Row label="Lon" value={fmtLon(data.longitude)} mono />
      <Row label="Altitude" value={`${data.altitudeKm.toFixed(1)} km`} mono />
      <ExternalButton href={`https://www.n2yo.com/satellite/?s=${encodeURIComponent(data.noradId)}`}>
        Track on n2yo
      </ExternalButton>
    </>
  );
}

function EarthquakeBody({ data }: { data: Earthquake }) {
  return (
    <>
      <div className="flex items-center justify-between py-2 border-b border-emerald-900/30">
        <span className="text-[10px] uppercase tracking-widest text-emerald-700">Magnitude</span>
        <span className={`text-3xl font-bold tabular-nums ${magColor(data.magnitude)}`}>
          {data.magnitude.toFixed(1)}
        </span>
      </div>
      <Row label="Place" value={data.place} />
      <Row label="Depth" value={`${data.depthKm.toFixed(1)} km`} mono />
      <Row label="Lat" value={fmtLat(data.latitude)} mono />
      <Row label="Lon" value={fmtLon(data.longitude)} mono />
      <Row label="Time" value={new Date(data.timeMs).toLocaleString()} />
      <ExternalButton href={data.url}>Open USGS</ExternalButton>
    </>
  );
}

export function EntityInfoCard() {
  const selected = useLayerStore((s) => s.selected);
  const setSelected = useLayerStore((s) => s.setSelected);

  if (!selected) return null;

  return (
    <aside className="pointer-events-auto absolute top-20 right-5 w-80 z-30 tactical-panel rounded-md p-4 text-emerald-300">
      <div className="flex items-center justify-between pb-2">
        <span className="text-sm uppercase tracking-[0.3em] text-emerald-400">
          {kindLabel(selected.kind)}
        </span>
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="w-6 h-6 flex items-center justify-center rounded-sm text-emerald-400 hover:text-emerald-100 hover:bg-emerald-500/15 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="border-t tactical-divider mb-2" />
      <div className="flex flex-col">
        {selected.kind === 'aircraft' && <AircraftBody data={selected.data} />}
        {selected.kind === 'ship' && <ShipBody data={selected.data} />}
        {selected.kind === 'satellite' && <SatelliteBody data={selected.data} />}
        {selected.kind === 'earthquake' && <EarthquakeBody data={selected.data} />}
      </div>
    </aside>
  );
}
