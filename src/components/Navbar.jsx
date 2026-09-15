import { Compass, Languages, MapPin, Radio, Sun } from 'lucide-react';

export default function Navbar({
  mode,
  setMode,
  waypointsCount,
  liveCoordinatesCount,
  isRunning,
  isWakeLockActive,
  lang = 'id',
  setLang,
  t,
}) {
  const nav = t?.nav || {
    builder: 'Builder',
    freeRun: 'Free Run',
    wakeLock: 'Layar Aktif',
    tracking: 'Tracking',
    points: 'Pt',
    gps: 'GPS',
    standby: 'Standby',
  };

  return (
    <header className="w-full max-w-full bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/70 sticky top-0 z-40 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4 overflow-x-hidden min-w-0">
        {/* Brand Logo & Name */}
        <div className="flex items-center shrink-0">
          <h1 className="text-sm sm:text-lg font-black tracking-tight text-white font-sans m-0 p-0 leading-none">
            OnTrack<span className="text-orange-500">.</span>
          </h1>
        </div>

        {/* Mode Switcher Tabs (Clean Athletic Segmented Pill) */}
        <div className="flex items-center bg-zinc-900/90 p-0.5 sm:p-1 rounded-xl border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => setMode('builder')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
              mode === 'builder'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{nav.builder}</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('freerun')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
              mode === 'freerun'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                mode === 'freerun' && isRunning ? 'text-orange-400 animate-pulse' : ''
              }`}
            />
            <span>{nav.freeRun}</span>
          </button>
        </div>

        {/* Right Section: Language Toggle & Status Indicators */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Language Toggle Switch [ ID | EN ] */}
          <div className="flex items-center gap-1 bg-zinc-900/90 pl-1.5 sm:pl-2 pr-1 py-1 rounded-xl border border-zinc-800">
            <Languages className="w-3.5 h-3.5 text-zinc-400 shrink-0 hidden md:inline" />
            <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setLang('id')}
                aria-label="Bahasa Indonesia"
                className={`min-w-[26px] min-h-[26px] px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center ${
                  lang === 'id'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                aria-label="English"
                className={`min-w-[26px] min-h-[26px] px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center ${
                  lang === 'en'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {isWakeLockActive && (
            <div
              title={lang === 'en' ? 'Screen kept awake' : 'Layar HP dijaga tetap aktif'}
              className="flex items-center gap-1 p-1 sm:px-2 sm:py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] font-medium"
            >
              <Sun className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="hidden md:inline">{nav.wakeLock}</span>
            </div>
          )}

          {isRunning ? (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
              <span>{nav.tracking}</span>
            </div>
          ) : mode === 'builder' && waypointsCount > 0 ? (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium">
              <Compass className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {waypointsCount} {nav.points}
              </span>
            </div>
          ) : mode === 'freerun' && liveCoordinatesCount > 0 ? (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium">
              <Radio className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {liveCoordinatesCount} {nav.gps}
              </span>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              <span>{nav.standby}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
