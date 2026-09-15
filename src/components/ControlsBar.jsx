import { Play, Pause, RotateCcw, Undo2, Trash2, Sparkles, Radio } from 'lucide-react';

/**
 * Bottom Control Bar for Route actions, Stopwatch controls & Share trigger
 * Responsive single-line layout on mobile and desktop
 */
export default function ControlsBar({
  mode = 'builder',
  isRunning,
  timerSeconds,
  waypointsCount,
  liveCoordinatesCount = 0,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  onUndoWaypoint,
  onClearRoute,
  onOpenShareModal,
}) {
  const hasRouteData = mode === 'builder' ? waypointsCount > 0 : liveCoordinatesCount > 0;

  return (
    <div className="w-full bg-slate-900/95 backdrop-blur-xl border border-slate-800/90 rounded-xl sm:rounded-2xl p-2 sm:p-3.5 shadow-xl flex items-center justify-between gap-1.5 sm:gap-3">
      {/* Route editing actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {mode === 'builder' ? (
          <>
            <button
              type="button"
              onClick={onUndoWaypoint}
              disabled={waypointsCount === 0}
              title="Hapus titik terakhir (Undo)"
              className="p-2 sm:px-3 sm:py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 border border-slate-700/60 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Undo</span>
            </button>

            <button
              type="button"
              onClick={onClearRoute}
              disabled={waypointsCount === 0}
              title="Hapus semua rute"
              className="p-2 sm:px-3 sm:py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 text-slate-400 disabled:opacity-30 border border-slate-700/60 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onClearRoute}
            disabled={liveCoordinatesCount === 0 && timerSeconds === 0}
            title="Reset jalur GPS"
            className="p-2 sm:px-3 sm:py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 text-slate-400 disabled:opacity-30 border border-slate-700/60 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Reset GPS</span>
          </button>
        )}
      </div>

      {/* Stopwatch Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-950/80 p-1 sm:p-1.5 rounded-xl border border-slate-800/80">
        {!isRunning ? (
          <button
            type="button"
            onClick={onStartTimer}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer ${
              mode === 'freerun'
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 text-slate-950 shadow-sky-500/20'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {mode === 'freerun' ? (
              <Radio className="w-3.5 h-3.5 animate-pulse" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Mulai</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onPauseTimer}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Jeda</span>
          </button>
        )}

        <button
          type="button"
          onClick={onResetTimer}
          disabled={timerSeconds === 0 && !isRunning}
          title="Reset Stopwatch"
          className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 transition-all active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Strava Share Modal Button */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenShareModal}
          disabled={!hasRouteData && timerSeconds === 0}
          title="Buka Share Card"
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 hover:from-orange-400 text-white font-bold text-xs shadow-lg shadow-rose-500/20 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Share</span>
          <span className="hidden sm:inline">Run</span>
        </button>
      </div>
    </div>
  );
}
