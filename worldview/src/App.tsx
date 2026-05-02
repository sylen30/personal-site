import { GlobeView } from './components/Globe';
import { LayerPanel } from './components/LayerPanel';
import { TimeScrubber } from './components/TimeScrubber';
import { EntityInfoCard } from './components/EntityInfoCard';
import { PostFX } from './components/PostFX';
import { StatusBar } from './components/StatusBar';

export default function App() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-emerald-300">
      <GlobeView />
      <PostFX />

      <header className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-4">
        <div className="pointer-events-auto tactical-panel rounded-md px-3 py-2 text-xs uppercase tracking-[0.4em]">
          <span className="text-emerald-400">WORLDVIEW</span>
          <span className="mx-2 text-emerald-700">//</span>
          <span className="text-emerald-200">GOD&apos;S EYE</span>
        </div>
        <StatusBar />
      </header>

      <LayerPanel />
      <EntityInfoCard />
      <TimeScrubber />
    </div>
  );
}
