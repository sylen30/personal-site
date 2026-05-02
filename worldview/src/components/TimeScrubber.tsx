import { create } from 'zustand';

interface ClockState {
  multiplier: number;
  paused: boolean;
  setMultiplier: (n: number) => void;
  setPaused: (b: boolean) => void;
}

export const useClockStore = create<ClockState>((set) => ({
  multiplier: 1,
  paused: false,
  setMultiplier: (n) => set({ multiplier: n, paused: false }),
  setPaused: (b) => set({ paused: b }),
}));

const SPEEDS: { label: string; value: number }[] = [
  { label: '1×', value: 1 },
  { label: '10×', value: 10 },
  { label: '60×', value: 60 },
  { label: '600×', value: 600 },
];

export function TimeScrubber() {
  const multiplier = useClockStore((s) => s.multiplier);
  const paused = useClockStore((s) => s.paused);
  const setMultiplier = useClockStore((s) => s.setMultiplier);
  const setPaused = useClockStore((s) => s.setPaused);

  return (
    <div className="pointer-events-auto absolute bottom-5 left-1/2 -translate-x-1/2 z-30 tactical-panel rounded-full px-4 py-2 flex gap-3 items-center text-[10px] uppercase tracking-widest text-emerald-300">
      <button
        type="button"
        onClick={() => setPaused(!paused)}
        className={`w-7 h-7 flex items-center justify-center rounded-full border transition-colors ${
          paused
            ? 'bg-amber-500/20 text-amber-300 border-amber-400'
            : 'bg-emerald-500/15 text-emerald-200 border-emerald-400/60 hover:bg-emerald-500/25'
        }`}
        aria-label={paused ? 'Play' : 'Pause'}
      >
        {paused ? '▶' : '⏸'}
      </button>

      <div className="w-px h-5 bg-emerald-900/60" />

      {SPEEDS.map((s) => {
        const active = !paused && multiplier === s.value;
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => setMultiplier(s.value)}
            className={`px-2 py-1 rounded-sm tabular-nums transition-colors ${
              active
                ? 'bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400'
                : 'text-emerald-700 hover:text-emerald-300'
            }`}
          >
            {s.label}
          </button>
        );
      })}

      <div className="w-px h-5 bg-emerald-900/60" />

      <button
        type="button"
        onClick={() => {
          setMultiplier(1);
          setPaused(false);
        }}
        className="px-2 py-1 rounded-sm text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10 transition-colors"
      >
        ⊕ REAL-TIME
      </button>
    </div>
  );
}
