import { useEffect, useState } from 'react';
import { useLayerStore } from '../store/layers';

export function StatusBar() {
  const counts = useLayerStore((s) => s.counts);
  const [fps, setFps] = useState(0);
  const [time, setTime] = useState(() => new Date().toUTCString().slice(17, 25));

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toUTCString().slice(17, 25));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const total =
    counts.flights + counts.ships + counts.satellites + counts.earthquakes;

  return (
    <div className="pointer-events-auto tactical-panel rounded-md px-3 py-2 text-[10px] uppercase tracking-widest flex items-center gap-4">
      <span>
        <span className="text-emerald-700">UTC</span>{' '}
        <span className="text-emerald-200">{time}</span>
      </span>
      <span>
        <span className="text-emerald-700">FPS</span>{' '}
        <span className="text-emerald-200">{fps}</span>
      </span>
      <span>
        <span className="text-emerald-700">CONTACTS</span>{' '}
        <span className="text-emerald-200">{total.toLocaleString()}</span>
      </span>
    </div>
  );
}
