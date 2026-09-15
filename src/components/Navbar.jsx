import { Activity, Compass, MapPin, Radio, Sun } from 'lucide-react';

export default function Navbar({
  mode,
  setMode,
  waypointsCount,
  liveCoordinatesCount,
  isRunning,
  isWakeLockActive,
}) {
  return (
    <header className="w-full bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-500/20 text-slate-950 shrink-0">
            <Activity className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-white">
              JogRoute<span className="text-emerald-400">.io</span>
            </span>
            <span className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-mono">
              Free GPS
            </span>
          </div>
        </div>

        {/* Mode Switcher Tabs (Ultra-responsive for mobile) */}
        <div className="flex items-center bg-slate-900/95 p-1 rounded-xl border border-slate-800 shrink-0 shadow-inner">
          <button
            type="button"
            onClick={() => setMode('builder')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'builder'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Builder</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('freerun')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'freerun'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${mode === 'freerun' && isRunning ? 'animate-pulse text-sky-400' : ''}`} />
            <span>Free Run</span>
          </button>
        </div>

        {/* Status Indicators & Wake Lock */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Wake Lock Indicator */}
          {isWakeLockActive && (
            <div
              title="Layar HP dijaga tetap menyala"
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-semibold"
            >
              <Sun className="w-3 h-3 text-amber-400 animate-spin" />
              <span className="hidden sm:inline">Wake Lock</span>
            </div>
          )}

          {/* Running State Badge */}
          {isRunning ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[11px] font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span className="hidden sm:inline">Aktif</span>
            </div>
          ) : mode === 'builder' && waypointsCount > 0 ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
              <Compass className="w-3 h-3" />
              <span>{waypointsCount} Pt</span>
            </div>
          ) : mode === 'freerun' && liveCoordinatesCount > 0 ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[10px] font-semibold">
              <Radio className="w-3 h-3" />
              <span>{liveCoordinatesCount} GPS</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              <span>Siap</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
