export type EntityKind = 'aircraft' | 'ship' | 'satellite' | 'earthquake';

export interface Aircraft {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  longitude: number;
  latitude: number;
  baroAltitudeM: number | null;
  velocityMs: number | null;
  trueTrackDeg: number | null;
  verticalRateMs: number | null;
  onGround: boolean;
  lastContactSec: number;
}

export interface Ship {
  mmsi: string;
  name: string | null;
  shipType: number | null;
  longitude: number;
  latitude: number;
  cogDeg: number | null;
  sogKnots: number | null;
  headingDeg: number | null;
  destination: string | null;
  updatedAt: number;
}

export interface Satellite {
  noradId: string;
  name: string;
  tle1: string;
  tle2: string;
  group: SatelliteGroup;
}

export type SatelliteGroup = 'stations' | 'starlink' | 'gps' | 'military' | 'weather';

export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  longitude: number;
  latitude: number;
  depthKm: number;
  timeMs: number;
  url: string;
}

export type SelectedEntity =
  | { kind: 'aircraft'; data: Aircraft }
  | { kind: 'ship'; data: Ship }
  | { kind: 'satellite'; data: Satellite & { longitude: number; latitude: number; altitudeKm: number } }
  | { kind: 'earthquake'; data: Earthquake };
