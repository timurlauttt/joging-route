import { useState } from "react";
import {
  X,
  Route,
  MapPin,
  Navigation,
  Loader2,
  Footprints,
  Bike,
  RefreshCw,
  Check,
  Clock,
  Flame,
} from "lucide-react";
import { playTactileSound } from "../utils/soundEffects";
import { DISTANCE_PRESETS_KM, DIRECTION_OFFROAD } from "../utils/autoRoute";
import {
  formatDistance,
  formatTime,
  estimateDurationSeconds,
  calculateCalories,
} from "../utils/formatters";

const FALLBACK = {
  modalTitle: "Buat Rute Otomatis",
  windowTitle: "Rute Otomatis OnTrack",
  modalSubtitle:
    "Pilih jarak target, rute loop dibuat otomatis mengikuti ruas jalan.",
  presetsLabel: "Template Jarak",
  customLabel: "Jarak Kustom (km)",
  customPlaceholder: "mis. 7.5",
  startLabel: "Titik Mulai",
  startMyLocation: "Lokasi Saya (GPS)",
  startFirstPoint: "Titik Pertama Rute",
  generateBtn: "Buat Rute",
  generatingBtn: "Membuat rute...",
  progress: "Menyesuaikan rute {step}/{total}...",
  hint: "Rute membentuk loop dari titik mulai dan menempel ke jalan nyata. Jarak akhir menyesuaikan kondisi jaringan jalan.",
  errorFailed: "Gagal membuat rute. Coba lagi.",
  errorLocation:
    "Izin lokasi ditolak. Tandai satu titik di peta atau aktifkan GPS.",
  close: "Tutup",
  activityRun: "Mode Lari",
  activityRide: "Mode Sepeda",
  directionLabel: "Arah Rute",
  directionAuto: "Auto",
  directionHint:
    "Pilih arah loop, atau biarkan Auto memilih arah paling ramah jalan.",
  errorOffroad: "Arah itu tidak ada jalan (laut/off-road). Pilih arah lain.",
  optionsTitle: "Pilih Rute",
  optionsHint:
    "Pilih salah satu loop di bawah ini, atau buat ulang untuk variasi baru.",
  regenerateBtn: "Buat Ulang",
  useBtn: "Pakai Rute Ini",
  estTime: "Estimasi",
  bestBadge: "Terbaik",
  dirN: "U",
  dirNE: "TL",
  dirE: "T",
  dirSE: "TG",
  dirS: "S",
  dirSW: "BD",
  dirW: "B",
  dirNW: "BL",
};

/** 3x3 compass: the centre button (Auto) lets the solver pick the direction. */
const COMPASS = [
  { id: "nw", bearing: 315, key: "dirNW" },
  { id: "n", bearing: 0, key: "dirN" },
  { id: "ne", bearing: 45, key: "dirNE" },
  { id: "w", bearing: 270, key: "dirW" },
  { id: "auto", bearing: null, key: "directionAuto" },
  { id: "e", bearing: 90, key: "dirE" },
  { id: "sw", bearing: 225, key: "dirSW" },
  { id: "s", bearing: 180, key: "dirS" },
  { id: "se", bearing: 135, key: "dirSE" },
];

export default function AutoRouteModal({
  onClose,
  activity = "run",
  hasWaypoints = false,
  t,
  onGenerate,
  onApply,
}) {
  const a = t?.autoRoute || FALLBACK;
  const [selectedKm, setSelectedKm] = useState(5);
  const [customKm, setCustomKm] = useState("");
  const [bearingId, setBearingId] = useState("auto");
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [total, setTotal] = useState(3);
  const [error, setError] = useState("");
  const [options, setOptions] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const hasCustom = customKm.trim() !== "";
  const effectiveKm = hasCustom ? Number(customKm) : selectedKm;
  const isValid = Number.isFinite(effectiveKm) && effectiveKm > 0;
  const isRide = activity === "ride";

  const bearing = COMPASS.find((c) => c.id === bearingId)?.bearing ?? null;

  const handleSelectPreset = (km) => {
    playTactileSound("click");
    setSelectedKm(km);
    setCustomKm("");
    setError("");
    setOptions(null);
  };

  const handlePickDirection = (id) => {
    playTactileSound("click");
    setBearingId(id);
    setError("");
    setOptions(null);
  };

  const runGenerate = async (nextAttempt) => {
    if (!isValid || isGenerating) return;
    playTactileSound("action");
    setIsGenerating(true);
    setError("");
    setOptions(null);
    setStep(0);
    setAttempt(nextAttempt);
    try {
      const result = await onGenerate(
        effectiveKm * 1000,
        (s, tt) => {
          setStep(s);
          setTotal(tt);
        },
        { bearing, attempt: nextAttempt },
      );
      setOptions(result?.options || []);
    } catch (err) {
      const msg =
        err?.code === 1
          ? a.errorLocation
          : err?.code === DIRECTION_OFFROAD
            ? a.errorOffroad
            : err?.message || a.errorFailed;
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => runGenerate(0);

  const handleRegenerate = () => runGenerate(attempt + 1);

  const handleUse = (option) => {
    playTactileSound("action");
    onApply?.(option);
    onClose();
  };

  const progressText =
    step > 0
      ? a.progress
          .replace("{step}", String(Math.min(step, total)))
          .replace("{total}", String(total))
      : "";

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto overflow-x-hidden w-full max-w-full animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white border-3 border-black rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[8px_8px_0_#000000] my-auto text-slate-900 flex flex-col gap-4 min-w-0">
        {/* Retro window chrome */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3 -mx-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-black inline-block" />
            <span className="ml-2 font-mono text-[11px] font-bold text-slate-800">
              {a.windowTitle}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              playTactileSound("click");
              onClose();
            }}
            aria-label={a.close}
            className="p-1 text-slate-800 hover:text-black bg-slate-100 hover:bg-slate-200 border-2 border-black rounded-md shadow-[2px_2px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title + activity badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black font-mono text-slate-950 flex items-center gap-2">
              <Route className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 shrink-0" />
              {a.modalTitle}
            </h2>
            <p className="text-[11px] text-slate-600 font-mono mt-0.5 leading-snug">
              {a.modalSubtitle}
            </p>
          </div>
          <span
            className={`flex items-center gap-1 px-2 py-1 rounded border-2 border-black text-[10px] font-black font-mono shadow-[2px_2px_0_#000000] shrink-0 ${
              isRide ? "bg-orange-300 text-black" : "bg-emerald-300 text-black"
            }`}
          >
            {isRide ? (
              <Bike className="w-3 h-3" />
            ) : (
              <Footprints className="w-3 h-3" />
            )}
            {isRide ? a.activityRide : a.activityRun}
          </span>
        </div>

        {/* Distance presets */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-black font-mono text-slate-700 uppercase tracking-wide">
            {a.presetsLabel}
          </span>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {DISTANCE_PRESETS_KM.map((km) => {
              const active = !hasCustom && selectedKm === km;
              return (
                <button
                  key={km}
                  type="button"
                  onClick={() => handleSelectPreset(km)}
                  disabled={isGenerating}
                  className={`py-2 rounded-lg border-2 border-black text-xs font-black font-mono shadow-[2px_2px_0_#000000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer disabled:opacity-40 ${
                    active
                      ? "bg-violet-300 text-black"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                  }`}
                >
                  {km} km
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom distance */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="auto-route-custom"
            className="text-[11px] font-black font-mono text-slate-700 uppercase tracking-wide"
          >
            {a.customLabel}
          </label>
          <input
            id="auto-route-custom"
            type="number"
            min="0.5"
            step="0.5"
            inputMode="decimal"
            value={customKm}
            onChange={(e) => {
              setCustomKm(e.target.value);
              setError("");
              setOptions(null);
            }}
            disabled={isGenerating}
            placeholder={a.customPlaceholder}
            className="w-full px-3 py-2 rounded-lg border-2 border-black bg-white text-sm font-mono font-bold text-slate-900 shadow-[2px_2px_0_#000000] focus:outline-none focus:bg-violet-50 disabled:opacity-50"
          />
        </div>

        {/* Direction compass */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-black font-mono text-slate-700 uppercase tracking-wide">
            {a.directionLabel}
          </span>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-[190px] mx-auto">
            {COMPASS.map((dir) => {
              const active = bearingId === dir.id;
              const isAuto = dir.id === "auto";
              return (
                <button
                  key={dir.id}
                  type="button"
                  onClick={() => handlePickDirection(dir.id)}
                  disabled={isGenerating}
                  title={isAuto ? a.directionHint : a[dir.key]}
                  className={`py-2 rounded-lg border-2 border-black text-[11px] font-black font-mono shadow-[2px_2px_0_#000000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer disabled:opacity-40 ${
                    active
                      ? isAuto
                        ? "bg-amber-300 text-black"
                        : "bg-sky-300 text-black"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                  }`}
                >
                  {isAuto ? (
                    <span className="flex items-center justify-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      {a.directionAuto}
                    </span>
                  ) : (
                    <span dir="ltr">{a[dir.key]}</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-500 font-mono leading-snug text-center">
            {a.directionHint}
          </p>
        </div>

        {/* Start point info */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-black bg-slate-50 shadow-[2px_2px_0_#000000]">
          <div className="w-7 h-7 rounded bg-white border-2 border-black flex items-center justify-center text-sky-700 shrink-0">
            {hasWaypoints ? (
              <MapPin className="w-3.5 h-3.5" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-black font-mono text-slate-500 uppercase">
              {a.startLabel}
            </span>
            <span className="block text-xs font-bold font-mono text-slate-900 truncate">
              {hasWaypoints ? a.startFirstPoint : a.startMyLocation}
            </span>
          </div>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg border-2 border-black bg-rose-100 text-rose-800 text-[11px] font-bold font-mono shadow-[2px_2px_0_#000000]">
            {error}
          </div>
        )}

        {/* Generate action */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!isValid || isGenerating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-violet-400 hover:bg-violet-300 text-black border-2 border-black text-sm font-black font-mono shadow-[4px_4px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{progressText || a.generatingBtn}</span>
            </>
          ) : (
            <>
              <Route className="w-4 h-4" />
              <span>
                {a.generateBtn} {isValid ? `• ${effectiveKm} km` : ""}
              </span>
            </>
          )}
        </button>

        {/* Generated loop options */}
        {options && options.length > 0 && (
          <div className="flex flex-col gap-2 border-t-2 border-slate-200 pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black font-mono text-slate-700 uppercase tracking-wide">
                {a.optionsTitle}
              </span>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-black text-[10px] font-black font-mono shadow-[2px_2px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                {a.regenerateBtn}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-mono leading-snug -mt-1">
              {a.optionsHint}
            </p>

            <div className="flex flex-col gap-2">
              {options.map((opt, i) => {
                const estSeconds = estimateDurationSeconds(
                  opt.distance,
                  activity,
                );
                const kcal = calculateCalories(opt.distance, activity);
                return (
                  <div
                    key={`${opt.distance}-${i}`}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg border-2 border-black bg-slate-50 shadow-[3px_3px_0_#000000]"
                  >
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm font-black font-mono text-slate-950">
                          {formatDistance(opt.distance)}
                        </span>
                        {i === 0 && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-300 border border-black text-[9px] font-black">
                            <Check className="w-2.5 h-2.5" />
                            {a.bestBadge}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-3 text-[10px] font-mono font-bold text-slate-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(estSeconds)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-600" />
                          {kcal} kcal
                        </span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUse(opt)}
                      className="shrink-0 px-3 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-black border-2 border-black text-[11px] font-black font-mono shadow-[3px_3px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                    >
                      {a.useBtn}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-[10px] text-slate-500 font-mono leading-snug">
          {a.hint}
        </p>
      </div>
    </div>
  );
}
