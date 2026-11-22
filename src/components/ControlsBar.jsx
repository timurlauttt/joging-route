import {
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Trash2,
  Share2,
  Radio,
  Bike,
  Volume2,
  VolumeX,
} from "lucide-react";
import { playTactileSound } from "../utils/soundEffects";

/**
 * Bottom Control Bar for Route actions, Stopwatch controls & Share trigger
 * Modern Neo-Brutalism (Dev-Centric) styling with tactile physics and zero-blur hard shadows
 */
export default function ControlsBar({
  mode = "builder",
  activity = "run",
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
    undo: "Undo",
    undoTitle: "Hapus titik terakhir",
    reset: "Reset",
    resetTitle: "Hapus semua rute",
    resetGps: "Reset GPS",
    start: "Mulai",
    pause: "Jeda",
    resetTimerTitle: "Reset Stopwatch",
    share: "Share",
    shareTitle: "Bagikan hasil lari",
    voiceCueTitleOn: "Matikan audio arahan suara",
    voiceCueTitleOff: "Nyalakan audio arahan suara",
  };

  const hasRouteData =
    mode === "builder" ? waypointsCount > 0 : liveCoordinatesCount > 0;

  const handleAction = (cb, soundType = "click") => {
    return (e) => {
      playTactileSound(soundType);
      if (cb) cb(e);
    };
  };

  return (
    <div className="w-full max-w-full bg-white border-2 border-black rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-[6px_6px_0_#000000] flex items-center justify-between gap-1.5 sm:gap-3 overflow-x-hidden min-w-0 transition-colors">
      {/* Route editing actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {mode === "builder" ? (
          <>
            <button
              type="button"
              onClick={handleAction(onUndoWaypoint, "click")}
              disabled={waypointsCount === 0}
              title={c.undoTitle}
              className="p-1.5 sm:px-3 sm:py-2 text-xs font-mono font-black rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 border-2 border-black shadow-[3px_3px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{c.undo}</span>
            </button>

            <button
              type="button"
              onClick={handleAction(onClearRoute, "action")}
              disabled={waypointsCount === 0}
              title={c.resetTitle}
              className="p-1.5 sm:px-3 sm:py-2 text-xs font-mono font-black rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-900 hover:text-rose-600 border-2 border-black shadow-[3px_3px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{c.reset}</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleAction(onClearRoute, "action")}
            disabled={liveCoordinatesCount === 0 && timerSeconds === 0}
            title={c.resetGps}
            className="p-1.5 sm:px-3 sm:py-2 text-xs font-mono font-black rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-900 hover:text-rose-600 border-2 border-black shadow-[3px_3px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{c.resetGps}</span>
          </button>
        )}
      </div>

      {/* Stopwatch Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 p-1 rounded-xl border-2 border-black shadow-[3px_3px_0_#000000] shrink-0">
        {!isRunning ? (
          <button
            type="button"
            onClick={handleAction(onStartTimer, "action")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-mono font-black text-xs border-2 border-black shadow-[3px_3px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
              mode === "freerun"
                ? "bg-sky-300 hover:bg-sky-200 text-black"
                : "bg-emerald-400 hover:bg-emerald-300 text-black"
            }`}
          >
            {mode === "freerun" ? (
              activity === "ride" ? (
                <Bike className="w-3.5 h-3.5 animate-pulse" />
              ) : (
                <Radio className="w-3.5 h-3.5 animate-pulse" />
              )
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{c.start}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAction(onPauseTimer, "action")}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-black border-2 border-black font-mono font-black text-xs shadow-[3px_3px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>{c.pause}</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleAction(onResetTimer, "click")}
          disabled={timerSeconds === 0 && !isRunning}
          title={c.resetTimerTitle}
          className="p-1.5 sm:p-2 rounded-lg text-slate-800 hover:text-black hover:bg-slate-200 border border-transparent hover:border-black disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Voice Cue Toggle & Neo-Brutalist Share Button */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={handleAction(onToggleVoiceCue, "switch")}
          title={isVoiceCueEnabled ? c.voiceCueTitleOn : c.voiceCueTitleOff}
          className={`p-1.5 sm:px-2.5 sm:py-2 text-xs font-mono font-black rounded-lg border-2 border-black shadow-[3px_3px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center gap-1 ${
            isVoiceCueEnabled
              ? "bg-amber-300 text-black"
              : "bg-slate-100 text-slate-500"
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
          onClick={handleAction(onOpenShareModal, "action")}
          disabled={!hasRouteData && timerSeconds === 0}
          title={c.shareTitle}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-orange-400 hover:bg-orange-300 text-black border-2 border-black text-xs font-mono font-black shadow-[3px_3px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{c.share}</span>
        </button>
      </div>
    </div>
  );
}
