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
    <header className="w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black shrink-0">
            <Activity className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>JogRoute</span>
                <span className="text-emerald-400">.io</span>
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 uppercase font-mono tracking-wider">
                Client Only
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden md:block">
              Minimalist Jogging Route Tracker & Free Run GPS
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => setMode('builder')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'builder'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Route Builder</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('freerun')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'freerun'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${mode === 'freerun' && isRunning ? 'animate-pulse text-sky-400' : ''}`} />
            <span>Free Run (GPS)</span>
          </button>
        </div>

        {/* Status Indicators & Wake Lock */}
        <div className="flex items-center gap-2">
          {/* Wake lock badge if active */}
          {isWakeLockActive && (
            <div
              title="Screen Wake Lock aktif: layar HP tidak akan redup atau mati saat Anda berlari"
              className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-semibold"
            >
              <Sun className="w-3 h-3 animate-spin text-amber-400" />
              <span>Wake Lock ON</span>
            </div>
          )}

          {/* Activity State Badge */}
          {isRunning ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span className="hidden sm:inline">Tracking Aktif</span>
            </div>
          ) : mode === 'builder' && waypointsCount > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{waypointsCount} Titik</span>
            </div>
          ) : mode === 'freerun' && liveCoordinatesCount > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold">
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{liveCoordinatesCount} GPS Pts</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              <span className="hidden sm:inline">Standby</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
