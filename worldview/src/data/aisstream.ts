import type { Ship } from '../types';

const AIS_URL = 'wss://stream.aisstream.io/v0/stream';
const MAX_BACKOFF_MS = 30_000;

interface PositionReportMsg {
  MessageType: 'PositionReport';
  MetaData: { ShipName?: string; time_utc?: string; MMSI?: number };
  Message: {
    PositionReport: {
      UserID: number;
      Latitude: number;
      Longitude: number;
      Cog?: number;
      Sog?: number;
      TrueHeading?: number;
    };
  };
}

interface ShipStaticDataMsg {
  MessageType: 'ShipStaticData';
  MetaData: { ShipName?: string; time_utc?: string; MMSI?: number };
  Message: {
    ShipStaticData: {
      UserID: number;
      Name?: string;
      Destination?: string;
      Type?: number;
    };
  };
}

type AISMessage = PositionReportMsg | ShipStaticDataMsg | { MessageType: string };

function parseTimeUtc(s: string | undefined): number {
  if (!s) return Date.now();
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : Date.now();
}

export function connectAISStream(
  apiKey: string,
  onShip: (s: Ship) => void,
): () => void {
  const ships = new Map<string, Ship>();
  let ws: WebSocket | null = null;
  let closed = false;
  let backoff = 1_000;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = (): void => {
    if (closed) return;
    try {
      ws = new WebSocket(AIS_URL);
    } catch (err) {
      console.error('AIS WebSocket construction error:', err);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      backoff = 1_000;
      const sub = {
        APIKey: apiKey,
        BoundingBoxes: [[[-90, -180], [90, 180]]],
        FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
      };
      ws?.send(JSON.stringify(sub));
    };

    ws.onmessage = (ev: MessageEvent<string>) => {
      let msg: AISMessage;
      try {
        msg = JSON.parse(ev.data) as AISMessage;
      } catch {
        return;
      }
      if (msg.MessageType === 'PositionReport') {
        const m = msg as PositionReportMsg;
        const pr = m.Message.PositionReport;
        const mmsi = String(pr.UserID);
        const prev = ships.get(mmsi);
        const merged: Ship = {
          mmsi,
          name: prev?.name ?? m.MetaData.ShipName?.trim() ?? null,
          shipType: prev?.shipType ?? null,
          longitude: pr.Longitude,
          latitude: pr.Latitude,
          cogDeg: pr.Cog ?? null,
          sogKnots: pr.Sog ?? null,
          headingDeg: pr.TrueHeading ?? null,
          destination: prev?.destination ?? null,
          updatedAt: parseTimeUtc(m.MetaData.time_utc),
        };
        ships.set(mmsi, merged);
        onShip(merged);
      } else if (msg.MessageType === 'ShipStaticData') {
        const m = msg as ShipStaticDataMsg;
        const sd = m.Message.ShipStaticData;
        const mmsi = String(sd.UserID);
        const prev = ships.get(mmsi);
        const merged: Ship = {
          mmsi,
          name: sd.Name?.trim() ?? m.MetaData.ShipName?.trim() ?? prev?.name ?? null,
          shipType: sd.Type ?? prev?.shipType ?? null,
          longitude: prev?.longitude ?? 0,
          latitude: prev?.latitude ?? 0,
          cogDeg: prev?.cogDeg ?? null,
          sogKnots: prev?.sogKnots ?? null,
          headingDeg: prev?.headingDeg ?? null,
          destination: sd.Destination?.trim() ?? prev?.destination ?? null,
          updatedAt: parseTimeUtc(m.MetaData.time_utc),
        };
        ships.set(mmsi, merged);
        if (prev) onShip(merged);
      }
    };

    ws.onerror = (ev) => {
      console.error('AIS WebSocket error:', ev);
    };

    ws.onclose = () => {
      if (closed) return;
      scheduleReconnect();
    };
  };

  const scheduleReconnect = (): void => {
    if (closed) return;
    const delay = backoff;
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    reconnectTimer = setTimeout(connect, delay);
  };

  connect();

  return () => {
    closed = true;
    if (reconnectTimer != null) clearTimeout(reconnectTimer);
    if (ws) {
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
  };
}
