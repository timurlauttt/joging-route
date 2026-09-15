import { Compass, MapPin, Radio, Sun } from 'lucide-react';

export default function Navbar({
  mode,
  setMode,
  waypointsCount,
  liveCoordinatesCount,
  isRunning,
  isWakeLockActive,
}) {
  return (
    <header className="w-full bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/70 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white text-zinc-950 flex items-center justify-center font-black text-sm tracking-tighter shadow-sm">
            <span>OT</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-bold tracking-tight text-white font-sans">
              OnTrack<span className="text-orange-500">.</span>
            </span>
          </div>
        </div>

        {/* Mode Switcher Tabs (Clean Athletic Segmented Pill) */}
        <div className="flex items-center bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setMode('builder')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'builder'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Builder</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('freerun')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'freerun'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${mode === 'freerun' && isRunning ? 'text-orange-400 animate-pulse' : ''}`} />
            <span>Free Run</span>
          </button>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 shrink-0">
          {isWakeLockActive && (
            <div
              title="Layar HP dijaga tetap aktif"
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] font-medium"
            >
              <Sun className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Layar Aktif</span>
            </div>
          )}

          {isRunning ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
              <span className="hidden sm:inline">Tracking</span>
            </div>
          ) : mode === 'builder' && waypointsCount > 0 ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium">
              <Compass className="w-3.5 h-3.5 text-zinc-400" />
              <span>{waypointsCount} Pt</span>
            </div>
          ) : mode === 'freerun' && liveCoordinatesCount > 0 ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium">
              <Radio className="w-3.5 h-3.5 text-zinc-400" />
              <span>{liveCoordinatesCount} GPS</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              <span>Standby</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
