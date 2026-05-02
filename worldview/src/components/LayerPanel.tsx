import { useLayerStore, type PostFx } from '../store/layers';

type LayerKey = 'flights' | 'ships' | 'satellites' | 'earthquakes';

interface LayerRowMeta {
  key: LayerKey;
  label: string;
  dotClass: string;
}

const LAYERS: LayerRowMeta[] = [
  { key: 'flights', label: 'FLIGHTS', dotClass: 'bg-emerald-400 shadow-[0_0_6px_#34d399]' },
  { key: 'ships', label: 'SHIPS', dotClass: 'bg-cyan-300 shadow-[0_0_6px_#67e8f9]' },
  { key: 'satellites', label: 'SATELLITES', dotClass: 'bg-violet-400 shadow-[0_0_6px_#a78bfa]' },
  { key: 'earthquakes', label: 'EARTHQUAKES', dotClass: 'bg-amber-300 shadow-[0_0_6px_#fcd34d]' },
];

const POSTFX_OPTIONS: { value: PostFx; label: string }[] = [
  { value: 'none', label: 'NONE' },
  { value: 'nightvision', label: 'NIGHT-VIS' },
  { value: 'crt', label: 'CRT' },
];

export function LayerPanel() {
  const flights = useLayerStore((s) => s.flights);
  const ships = useLayerStore((s) => s.ships);
  const satellites = useLayerStore((s) => s.satellites);
  const earthquakes = useLayerStore((s) => s.earthquakes);
  const counts = useLayerStore((s) => s.counts);
  const postFx = useLayerStore((s) => s.postFx);
  const toggle = useLayerStore((s) => s.toggle);
  const setPostFx = useLayerStore((s) => s.setPostFx);

  const enabled: Record<LayerKey, boolean> = {
    flights,
    ships,
    satellites,
    earthquakes,
  };

  return (
    <aside className="pointer-events-auto absolute top-20 left-5 z-30 w-[280px] tactical-panel rounded-md p-3 text-[11px] uppercase tracking-widest text-emerald-300">
      <div className="flex items-center justify-between pb-2">
        <span className="text-emerald-400">LAYERS</span>
        <span className="text-emerald-700">[ 04 ]</span>
      </div>
      <div className="border-t tactical-divider mb-2" />

      <ul className="flex flex-col gap-1.5">
        {LAYERS.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between gap-2 px-1 py-1 rounded-sm hover:bg-emerald-900/10"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`inline-block w-2 h-2 rounded-full ${row.dotClass}`} />
              <span className="text-emerald-200">{row.label}</span>
            </div>
            <span className="font-mono text-emerald-700 text-right tabular-nums w-12">
              {counts[row.key].toLocaleString()}
            </span>
            <input
              type="checkbox"
              className="tactical-switch"
              checked={enabled[row.key]}
              onChange={() => toggle(row.key)}
              aria-label={`Toggle ${row.label}`}
            />
          </li>
        ))}
      </ul>

      <div className="border-t tactical-divider my-3" />

      <div className="flex items-center justify-between pb-2">
        <span className="text-emerald-400">POST-FX</span>
        <span className="text-emerald-700">[ {postFx.toUpperCase()} ]</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {POSTFX_OPTIONS.map((opt) => {
          const active = postFx === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPostFx(opt.value)}
              className={`px-2 py-1.5 rounded-sm text-[10px] tracking-widest transition-colors ${
                active
                  ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400'
                  : 'bg-black/40 text-emerald-700 hover:text-emerald-300 border border-emerald-900/40'
              }`}
              role="radio"
              aria-checked={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="border-t tactical-divider mt-3 pt-2">
        <p className="text-[9px] tracking-[0.2em] text-emerald-700 leading-tight">
          DATA: OPENSKY • USGS • CELESTRAK • AISSTREAM
        </p>
      </div>
    </aside>
  );
}
