import { Play, Pause, RotateCcw, Undo2, Trash2, Share2, Radio, Volume2, VolumeX } from 'lucide-react';

/**
 * Bottom Control Bar for Route actions, Stopwatch controls & Share trigger
 * Clean athletic styling without neon or coding clutter
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
  isVoiceCueEnabled = true,
  onToggleVoiceCue,
  t,
}) {
  const c = t?.controls || {
    undo: 'Undo',
    undoTitle: 'Hapus titik terakhir',
    reset: 'Reset',
    resetTitle: 'Hapus semua rute',
    resetGps: 'Reset GPS',
    start: 'Mulai',
    pause: 'Jeda',
    resetTimerTitle: 'Reset Stopwatch',
    share: 'Share',
    shareTitle: 'Bagikan hasil lari',
  };

  const hasRouteData = mode === 'builder' ? waypointsCount > 0 : liveCoordinatesCount > 0;

  return (
    <div className="w-full bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-md flex items-center justify-between gap-1.5 sm:gap-3">
      {/* Route editing actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {mode === 'builder' ? (
          <>
            <button
              type="button"
              onClick={onUndoWaypoint}
              disabled={waypointsCount === 0}
              title={c.undoTitle}
              className="p-2 sm:px-3 sm:py-2 text-xs font-medium rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white disabled:opacity-30 border border-zinc-700/60 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{c.undo}</span>
            </button>

            <button
              type="button"
              onClick={onClearRoute}
              disabled={waypointsCount === 0}
              title={c.resetTitle}
              className="p-2 sm:px-3 sm:py-2 text-xs font-medium rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-rose-300 disabled:opacity-30 border border-zinc-700/60 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{c.reset}</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onClearRoute}
            disabled={liveCoordinatesCount === 0 && timerSeconds === 0}
            title={c.resetGps}
            className="p-2 sm:px-3 sm:py-2 text-xs font-medium rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 disabled:opacity-30 border border-zinc-700/60 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{c.resetGps}</span>
          </button>
        )}
      </div>

      {/* Stopwatch Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
        {!isRunning ? (
          <button
            type="button"
            onClick={onStartTimer}
            className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-xs transition-all active:scale-95 cursor-pointer ${
              mode === 'freerun'
                ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-sm'
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-sm'
            }`}
          >
            {mode === 'freerun' ? (
              <Radio className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{c.start}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onPauseTimer}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 font-bold text-xs transition-all active:scale-95 cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>{c.pause}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onResetTimer}
          disabled={timerSeconds === 0 && !isRunning}
          title={c.resetTimerTitle}
          className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-20 transition-all active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Voice Cue Toggle & Clean Simple Share Button */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onToggleVoiceCue}
          title={isVoiceCueEnabled ? c.voiceCueTitleOn : c.voiceCueTitleOff}
          className={`p-2 sm:px-2.5 sm:py-2 text-xs font-medium rounded-xl border transition-all active:scale-95 cursor-pointer flex items-center gap-1 ${
            isVoiceCueEnabled
              ? 'bg-zinc-800 text-orange-400 border-orange-500/30 hover:bg-zinc-700'
              : 'bg-zinc-800/60 text-zinc-500 border-zinc-700 hover:text-zinc-300'
          }`}
        >
          {isVoiceCueEnabled ? (
            <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          )}
        </button>

        <button
          type="button"
          onClick={onOpenShareModal}
          disabled={!hasRouteData && timerSeconds === 0}
          title={c.shareTitle}
          className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <Share2 className="w-3.5 h-3.5 text-zinc-300" />
          <span>{c.share}</span>
        </button>
      </div>
    </div>
  );
}
