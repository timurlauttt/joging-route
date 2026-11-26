import {
  Bike,
  Compass,
  Footprints,
  Languages,
  MapPin,
  Radio,
  Sun,
} from "lucide-react";
import { playTactileSound } from "../utils/soundEffects";

export default function Navbar({
  mode,
  setMode,
  activity = "run",
  setActivity,
  waypointsCount,
  liveCoordinatesCount,
  isRunning,
  isWakeLockActive,
  lang = "id",
  setLang,
  t,
}) {
  const nav = t?.nav || {
    builder: "Buat Rute",
    freeRun: "Rekam GPS",
    wakeLock: "Layar Aktif",
    tracking: "Pelacakan",
    points: "titik",
    gps: "GPS",
    standby: "Standby",
    activity: "Aktivitas",
    run: "Run",
    ride: "Ride",
  };

  return (
    <header className="w-full max-w-full bg-white border-b-2 sm:border-b-3 border-black sticky top-0 z-40 overflow-x-hidden shadow-[0_4px_0_#000000]">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4 overflow-x-hidden min-w-0">
        {/* Brand Logo & Name: Retro Dev-Centric Monospace in Light Mode */}
        <div className="flex items-center shrink-0">
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded bg-amber-300 border-2 border-black shadow-[2px_2px_0_#000000]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black shrink-0" />
            <h1 className="text-xs sm:text-sm font-black font-mono tracking-tight text-black m-0 p-0 leading-none">
              &lt;OnTrack /&gt;
            </h1>
          </div>
        </div>

        {/* Activity Switcher (Run / Ride) + Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {/* Activity: Run / Ride — drives routing profile & metrics */}
          <div
            title={nav.activity}
            className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded border-2 border-black shadow-[2px_2px_0_#000000] shrink-0"
          >
            <button
              type="button"
              onClick={() => {
                playTactileSound("switch");
                setActivity("run");
              }}
              aria-label={nav.run}
              aria-pressed={activity === "run"}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-black font-mono transition-all duration-150 cursor-pointer ${
                activity === "run"
                  ? "bg-emerald-300 text-black border-2 border-black shadow-[1px_1px_0_#000000]"
                  : "text-slate-700 hover:text-black hover:bg-slate-200 border-2 border-transparent"
              }`}
            >
              <Footprints className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">{nav.run}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTactileSound("switch");
                setActivity("ride");
              }}
              aria-label={nav.ride}
              aria-pressed={activity === "ride"}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-black font-mono transition-all duration-150 cursor-pointer ${
                activity === "ride"
                  ? "bg-orange-300 text-black border-2 border-black shadow-[1px_1px_0_#000000]"
                  : "text-slate-700 hover:text-black hover:bg-slate-200 border-2 border-transparent"
              }`}
            >
              <Bike className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">{nav.ride}</span>
            </button>
          </div>

          {/* Mode Switcher Tabs (Neo-Brutalist Segmented Tabs with Hard Shadow) */}
          <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded border-2 border-black shadow-[2px_2px_0_#000000] shrink-0">
            <button
              type="button"
              onClick={() => {
                playTactileSound("switch");
                setMode("builder");
              }}
              aria-label={nav.builder}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded text-[11px] sm:text-xs font-black font-mono transition-all duration-150 cursor-pointer ${
                mode === "builder"
                  ? "bg-sky-300 text-black border-2 border-black shadow-[1px_1px_0_#000000]"
                  : "text-slate-700 hover:text-black hover:bg-slate-200 border-2 border-transparent"
              }`}
            >
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">{nav.builder}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTactileSound("switch");
                setMode("freerun");
              }}
              aria-label={nav.freeRun}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded text-[11px] sm:text-xs font-black font-mono transition-all duration-150 cursor-pointer ${
                mode === "freerun"
                  ? "bg-orange-300 text-black border-2 border-black shadow-[1px_1px_0_#000000]"
                  : "text-slate-700 hover:text-black hover:bg-slate-200 border-2 border-transparent"
              }`}
            >
              <Radio
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                  mode === "freerun" && isRunning
                    ? "text-black animate-pulse"
                    : ""
                }`}
              />
              <span className="hidden sm:inline">{nav.freeRun}</span>
            </button>
          </div>
        </div>

        {/* Right Section: Language Toggle & Status Indicators */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Language Toggle Switch [ ID | EN ] */}
          <div className="flex items-center gap-1 bg-white pl-1.5 sm:pl-2 pr-1 py-1 rounded border-2 border-black shadow-[2px_2px_0_#000000]">
            <Languages className="w-3.5 h-3.5 text-slate-700 shrink-0 hidden md:inline" />
            <div className="flex items-center bg-slate-100 p-0.5 rounded border border-black">
              <button
                type="button"
                onClick={() => {
                  playTactileSound("click");
                  setLang("id");
                }}
                aria-label="Bahasa Indonesia"
                className={`min-w-[26px] min-h-[24px] px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-black font-mono transition-all cursor-pointer flex items-center justify-center ${
                  lang === "id"
                    ? "bg-amber-300 text-black border border-black shadow-sm"
                    : "text-slate-700 hover:text-black"
                }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => {
                  playTactileSound("click");
                  setLang("en");
                }}
                aria-label="English"
                className={`min-w-[26px] min-h-[24px] px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-black font-mono transition-all cursor-pointer flex items-center justify-center ${
                  lang === "en"
                    ? "bg-amber-300 text-black border border-black shadow-sm"
                    : "text-slate-700 hover:text-black"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {isWakeLockActive && (
            <div
              title={
                lang === "en"
                  ? "Screen kept awake"
                  : "Layar HP dijaga tetap aktif"
              }
              className="flex items-center gap-1 p-1 sm:px-2 sm:py-1 rounded bg-amber-100 border-2 border-black text-amber-950 text-[11px] font-mono font-bold shadow-[2px_2px_0_#000000]"
            >
              <Sun className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="hidden md:inline">{nav.wakeLock}</span>
            </div>
          )}

          {isRunning ? (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-orange-100 border-2 border-black text-orange-950 text-xs font-mono font-black shadow-[2px_2px_0_#000000]">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              <span>{nav.tracking}</span>
            </div>
          ) : mode === "builder" && waypointsCount > 0 ? (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded bg-sky-100 border-2 border-black text-sky-950 text-xs font-mono font-bold shadow-[2px_2px_0_#000000]">
              <Compass className="w-3.5 h-3.5 text-sky-700" />
              <span>
                {waypointsCount} {nav.points}
              </span>
            </div>
          ) : mode === "freerun" && liveCoordinatesCount > 0 ? (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 border-2 border-black text-emerald-950 text-xs font-mono font-bold shadow-[2px_2px_0_#000000]">
              <Radio className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                {liveCoordinatesCount} {nav.gps}
              </span>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border-2 border-black text-slate-700 text-xs font-mono font-bold shadow-[2px_2px_0_#000000]">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>{nav.standby}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
