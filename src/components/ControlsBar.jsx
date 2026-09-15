import { Play, Pause, RotateCcw, Undo2, Trash2, Share2, Sparkles, Radio } from 'lucide-react';

/**
 * Bottom Control Bar for Route actions, Stopwatch controls & Share trigger
 * Adapts contextually based on mode ('builder' vs 'freerun')
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
    <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3">
      {/* Route editing actions */}
      <div className="flex items-center gap-2">
        {mode === 'builder' ? (
          <>
            <button
              type="button"
              onClick={onUndoWaypoint}
              disabled={waypointsCount === 0}
              title="Hapus titik terakhir (Undo)"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-40 disabled:pointer-events-none text-slate-300 hover:text-white border border-slate-700/60 transition-all active:scale-95 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Undo Titik</span>
            </button>

            <button
              type="button"
              onClick={onClearRoute}
              disabled={waypointsCount === 0}
              title="Hapus semua titik dan rute (Reset)"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-800/80 hover:bg-rose-950/40 hover:text-rose-300 disabled:opacity-40 disabled:pointer-events-none text-slate-400 border border-slate-700/60 hover:border-rose-800/50 transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Rute</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onClearRoute}
            disabled={liveCoordinatesCount === 0 && timerSeconds === 0}
            title="Reset Jalur GPS Free Run"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-800/80 hover:bg-rose-950/40 hover:text-rose-300 disabled:opacity-40 disabled:pointer-events-none text-slate-400 border border-slate-700/60 hover:border-rose-800/50 transition-all active:scale-95 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Track GPS</span>
          </button>
        )}
      </div>

      {/* Stopwatch Controls */}
      <div className="flex items-center gap-2 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800/80">
        {!isRunning ? (
          <button
            type="button"
            onClick={onStartTimer}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer ${
              mode === 'freerun'
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 shadow-sky-500/20'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {mode === 'freerun' ? (
              <Radio className="w-3.5 h-3.5 animate-pulse" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{mode === 'freerun' ? 'Mulai Track GPS' : 'Mulai'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onPauseTimer}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Jeda</span>
          </button>
        )}

        <button
          type="button"
          onClick={onResetTimer}
          disabled={timerSeconds === 0 && !isRunning}
          title="Reset Stopwatch ke 00:00:00"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Strava Share Modal Button */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={onOpenShareModal}
          disabled={!hasRouteData && timerSeconds === 0}
          title={!hasRouteData && timerSeconds === 0 ? 'Buat rute atau mulai lari untuk membagikan kartu' : 'Buka Share Card'}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 hover:from-orange-400 hover:via-rose-400 hover:to-pink-400 text-white font-bold text-xs shadow-xl shadow-rose-500/20 disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <Share2 className="w-3.5 h-3.5" />
          <span>Share Run</span>
        </button>
      </div>
    </div>
  );
}
