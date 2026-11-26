import { useState, useRef, useMemo } from "react";
import { toPng, toBlob } from "html-to-image";
import {
  X,
  Upload,
  Download,
  Share2,
  Check,
  RefreshCw,
  Edit3,
  ListOrdered,
  FileDown,
} from "lucide-react";
import {
  calculateCalories,
  calculatePace,
  formatDistance,
  formatSpeed,
  formatTime,
} from "../utils/formatters";
import { downloadRouteGpx } from "../utils/gpx";
import { playTactileSound } from "../utils/soundEffects";

function generateRouteSvgPath(coordinates) {
  if (!coordinates || coordinates.length < 2) return "";

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  coordinates.forEach(([lng, lat]) => {
    if (lng < minX) minX = lng;
    if (lng > maxX) maxX = lng;
    if (lat < minY) minY = lat;
    if (lat > maxY) maxY = lat;
  });

  const deltaX = maxX - minX || 0.0001;
  const deltaY = maxY - minY || 0.0001;
  const padding = 12;
  const usableSize = 100 - padding * 2;

  const scale = Math.min(usableSize / deltaX, usableSize / deltaY);
  const offsetX = padding + (usableSize - deltaX * scale) / 2;
  const offsetY = padding + (usableSize - deltaY * scale) / 2;

  const points = coordinates.map(([lng, lat]) => {
    const x = offsetX + (lng - minX) * scale;
    const y = 100 - (offsetY + (lat - minY) * scale);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return `M ${points.join(" L ")}`;
}

function createTimestampedFilename(slug) {
  const safeSlug = (slug || "session").toLowerCase().replace(/[^a-z0-9]/g, "-");
  return `ontrack-${safeSlug}-${Date.now()}.png`;
}

export default function ShareModal({
  isOpen,
  onClose,
  activity = "run",
  distanceMeters,
  timerSeconds,
  routeCoordinates,
  splits = [],
  elevationData = null,
  lang = "id",
  t,
}) {
  const [showSplits, setShowSplits] = useState(true);
  const s = t?.share || {
    modalTitle: "Bagikan Sesi Lari",
    windowTitle: "Bagikan Hasil OnTrack",
    modalSubtitle:
      "Kustomisasi nama sesi dan ekspor kartu ringkasan estetis ke media sosial.",
    sessionNameLabel: "Nama Sesi Lari:",
    sessionNamePlaceholder: "Contoh: Lari Pagi GBK, 5K Tempo, dll.",
    ratioLabel: "Format Rasio:",
    ratioStory: "9:16 (Story)",
    ratioFeed: "4:5 (Post)",
    photoLabel: "Foto Latar Belakang:",
    pickPhoto: "Pilih Foto",
    changePhoto: "Ganti Foto",
    resetPhotoTitle: "Kembalikan ke latar default",
    dimmingLabel: "Keredupan Foto:",
    shareBtn: "Bagikan Sesi",
    downloadBtn: "Unduh Gambar",
    toastDownloaded: "Kartu berhasil diunduh!",
    toastFailedDownload: "Gagal mengunduh gambar.",
    toastShared: "Berhasil dibagikan!",
    toastFallbackDownload: "Kartu otomatis diunduh ke galeri!",
    totalDistance: "TOTAL JARAK",
    time: "WAKTU",
    pace: "PACE",
    speed: "KECEPATAN",
    avgSpeed: "KECEPATAN RATA-RATA",
    elevation: "ELEVASI",
    calories: "KALORI",
    defaultTitleMorning: "Lari Pagi",
    defaultTitleLunch: "Lari Siang",
    defaultTitleAfternoon: "Lari Sore",
    defaultTitleNight: "Lari Malam",
    defaultRun: "Sesi Lari",
    presets: [
      "Lari Pagi",
      "Jogging Santai",
      "5K Tempo",
      "Long Run",
      "Lari Malam",
      "Recovery",
    ],
    shareText: "🏃 {title}: {distance} dalam {time} (Pace: {pace}) via OnTrack",
    shareTextRide:
      "🚴 {title}: {distance} dalam {time} (Kecepatan rata-rata: {pace}) via OnTrack",
  };

  // Automatically localized default title based on time of day and selected language
  const defaultTitle = useMemo(() => {
    const shareDict = t?.share;
    if (!shareDict) return "Morning Run";
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return shareDict.defaultTitleMorning;
    if (hour >= 11 && hour < 15) return shareDict.defaultTitleLunch;
    if (hour >= 15 && hour < 18) return shareDict.defaultTitleAfternoon;
    return shareDict.defaultTitleNight;
  }, [t]);

  // Compute splits for card display (using recorded splits or auto-generating for runs >= 1km)
  const displaySplits = useMemo(() => {
    if (splits && splits.length > 0) return splits;
    if (distanceMeters < 1000) return [];

    const totalKm = Math.floor(distanceMeters / 1000);
    const avgLapSeconds =
      timerSeconds > 0 && totalKm > 0
        ? Math.round(timerSeconds / (distanceMeters / 1000))
        : 300;

    const generated = [];
    for (let k = 1; k <= totalKm; k++) {
      generated.push({
        km: k,
        lapSeconds: avgLapSeconds,
        paceStr: calculatePace(avgLapSeconds, 1000),
        totalSeconds: avgLapSeconds * k,
      });
    }
    return generated;
  }, [splits, distanceMeters, timerSeconds]);

  const [customTitle, setCustomTitle] = useState(null);
  const sessionTitle = customTitle !== null ? customTitle : defaultTitle;

  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [userImage, setUserImage] = useState(null);
  const [darkOverlayOpacity, setDarkOverlayOpacity] = useState(0.4);
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);

  const isRide = activity === "ride";
  const formattedDistance = formatDistance(distanceMeters);
  const formattedTime = formatTime(timerSeconds);
  const formattedPace = calculatePace(timerSeconds, distanceMeters);
  const formattedSpeed = formatSpeed(timerSeconds, distanceMeters);
  const calories = calculateCalories(distanceMeters, activity);
  const showElevation =
    isRide && !!elevationData && (elevationData.points?.length ?? 0) > 1;

  const routeSvgPath = useMemo(() => {
    return generateRouteSvgPath(routeCoordinates);
  }, [routeCoordinates]);

  const currentDateFormatted = useMemo(() => {
    const date = new Date();
    const locale = t?.locale || (lang === "en" ? "en-US" : "id-ID");
    return date.toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [lang, t]);

  const currentTimeFormatted = useMemo(() => {
    const date = new Date();
    const locale = t?.locale || (lang === "en" ? "en-US" : "id-ID");
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: lang === "en",
    });
  }, [lang, t]);

  const showFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(""), 3500);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
      });

      const filename = createTimestampedFilename(sessionTitle);
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();

      showFeedback(s.toastDownloaded);
    } catch (err) {
      console.error("Error generating image:", err);
      showFeedback(s.toastFailedDownload);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadGpx = () => {
    playTactileSound("action");
    const ok = downloadRouteGpx({
      name: sessionTitle,
      coordinates: routeCoordinates,
      elevationData,
    });
    showFeedback(ok ? s.gpxToast : s.gpxFailed);
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);

      const titleToShare = sessionTitle || s.defaultRun;
      const template = isRide
        ? s.shareTextRide || "🚴 {title}: {distance} ({pace}) via OnTrack"
        : s.shareText || "🏃 {title}: {distance} ({pace}) via OnTrack";
      let shareMessage = template
        .replace("{title}", titleToShare)
        .replace("{distance}", formattedDistance)
        .replace("{time}", formattedTime)
        .replace("{pace}", isRide ? `${formattedSpeed} km/h` : formattedPace);

      if (showElevation) {
        shareMessage += ` • ${s.elevation || "ELEVATION"}: ${elevationData.gain} m`;
      }

      if (navigator.canShare) {
        const blob = await toBlob(cardRef.current, {
          pixelRatio: 2.5,
          cacheBust: true,
        });

        if (blob) {
          const filename = createTimestampedFilename(titleToShare);
          const file = new File([blob], filename, {
            type: "image/png",
          });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: titleToShare,
              text: shareMessage,
            });
            showFeedback(s.toastShared);
            setIsExporting(false);
            return;
          }
        }
      }

      await handleDownload();
      showFeedback(s.toastFallbackDownload);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error sharing:", err);
        await handleDownload();
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUserImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClose = () => {
    playTactileSound("click");
    onClose();
  };

  const handleAspectChange = (ratio) => {
    playTactileSound("switch");
    setAspectRatio(ratio);
  };

  const handlePresetClick = (preset) => {
    playTactileSound("click");
    setCustomTitle(preset);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto overflow-x-hidden w-full max-w-full animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white border-3 border-black rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[8px_8px_0_#000000] my-auto text-slate-900 flex flex-col gap-4 min-w-0">
        {/* Retro Window Chrome Top Bar */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3 -mx-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-black inline-block" />
            <span className="ml-2 font-mono text-[11px] font-bold text-slate-800">
              {s.windowTitle}
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup"
            className="p-1 text-slate-800 hover:text-black bg-slate-100 hover:bg-slate-200 border-2 border-black rounded-md shadow-[2px_2px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Card Preview on Left, Settings Panel on Right */}
        <div className="flex flex-col md:flex-row gap-5 sm:gap-6 items-center md:items-start min-w-0">
          {/* ONTRACK CARD PREVIEW (Follows current language selection) */}
          <div className="flex flex-col items-center w-full md:w-auto shrink-0">
            <div
              ref={cardRef}
              className={`relative overflow-hidden rounded-none shadow-[6px_6px_0_#000000] select-none flex flex-col justify-between transition-all duration-300 border-2 border-black ${
                aspectRatio === "9:16"
                  ? "w-[270px] sm:w-[300px] aspect-[9/16]"
                  : "w-[270px] sm:w-[300px] aspect-[4/5]"
              }`}
              style={{ backgroundColor: "#09090b" }}
            >
              {/* Background Layer: Foto Pribadi atau Gradient Matte */}
              {userImage ? (
                <img
                  src={userImage}
                  alt="Run Background"
                  className="absolute inset-0 w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
                      backgroundSize: "24px 24px",
                    }}
                  />
                </div>
              )}

              <div
                className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60 pointer-events-none"
                style={{
                  backgroundColor: userImage
                    ? `rgba(0, 0, 0, ${darkOverlayOpacity})`
                    : "transparent",
                }}
              />

              {/* HEADER KARTU: Logo & Info */}
              <div className="relative z-10 p-4 sm:p-5 pb-0 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xs font-black tracking-widest text-white font-sans">
                      ONTRACK
                    </span>
                  </div>
                </div>

                {/* NAMA SESI LARI, Tanggal & Jam */}
                <div className="text-left mt-1">
                  <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate drop-shadow-sm">
                    {sessionTitle || s.defaultRun}
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-medium">
                    {currentDateFormatted}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-medium font-mono">
                    {currentTimeFormatted}
                  </p>
                </div>
              </div>

              {/* ROUTE SILHOUETTE (Clean solid athletic line) */}
              {routeSvgPath && (
                <div className="relative z-10 my-auto px-6 py-2 flex items-center justify-center">
                  <svg
                    viewBox="0 0 100 100"
                    className={`drop-shadow-md ${
                      showSplits && displaySplits.length > 0
                        ? "w-24 h-24 sm:w-28 sm:h-28"
                        : "w-36 h-36 sm:w-44 sm:h-44"
                    }`}
                  >
                    <path
                      d={routeSvgPath}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}

              {/* KILOMETER SPLITS OVERLAY (Athletic clean splits table) */}
              {showSplits && displaySplits.length > 0 && (
                <div className="relative z-10 mx-4 my-1 p-2 bg-black/70 backdrop-blur-md rounded-xl border border-white/10 text-left font-mono">
                  <div className="flex items-center justify-between text-[9px] font-bold text-orange-400 uppercase tracking-wider pb-1 mb-1 border-b border-white/10">
                    <span>{s.splitsHeader || "SPLITS"}</span>
                    <span>
                      {isRide ? s.speed || "SPEED" : s.pace || "PACE"}
                    </span>
                  </div>
                  <div
                    className={`grid ${
                      displaySplits.length > 3
                        ? "grid-cols-2 gap-x-3"
                        : "grid-cols-1"
                    } gap-y-0.5 text-[10px]`}
                  >
                    {displaySplits.slice(0, 6).map((split) => (
                      <div
                        key={split.km}
                        className="flex items-center justify-between"
                      >
                        <span className="text-zinc-400 font-semibold">
                          {split.km} km
                        </span>
                        <span className="text-white font-bold">
                          {isRide
                            ? (3600 / Math.max(1, split.lapSeconds)).toFixed(1)
                            : split.paceStr.replace(" /km", "")}
                        </span>
                      </div>
                    ))}
                  </div>
                  {displaySplits.length > 6 && (
                    <div className="text-[8px] text-zinc-500 text-center pt-0.5">
                      +{displaySplits.length - 6}{" "}
                      {t?.metrics?.splitMore || "more km"}
                    </div>
                  )}
                </div>
              )}

              {/* OVERLAY METRIK LARI (Localized labels) */}
              <div className="relative z-10 p-4 sm:p-5 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                <div className="mb-3 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                    {s.totalDistance}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl sm:text-5xl font-extrabold text-white font-mono tracking-tight leading-none">
                      {distanceMeters > 0
                        ? (distanceMeters / 1000).toFixed(2)
                        : "0.00"}
                    </span>
                    <span className="text-base font-bold text-zinc-300">
                      KM
                    </span>
                  </div>
                </div>

                <div
                  className={`grid ${
                    showElevation ? "grid-cols-2" : "grid-cols-3"
                  } gap-2 pt-2.5 border-t border-white/10 text-left`}
                >
                  <div>
                    <span className="text-[10px] font-medium text-zinc-400 block uppercase">
                      {s.time}
                    </span>
                    <span className="text-sm sm:text-base font-bold text-white font-mono">
                      {formattedTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-zinc-400 block uppercase">
                      {isRide ? s.avgSpeed || "AVG SPEED" : s.pace}
                    </span>
                    <span className="text-sm sm:text-base font-bold text-white font-mono">
                      {isRide
                        ? `${formattedSpeed} km/h`
                        : formattedPace.replace(" ", "")}
                    </span>
                  </div>
                  {showElevation && (
                    <div>
                      <span className="text-[10px] font-medium text-zinc-400 block uppercase">
                        {s.elevation || "ELEVATION"}
                      </span>
                      <span className="text-sm sm:text-base font-bold text-white font-mono">
                        {elevationData.gain} m
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-medium text-zinc-400 block uppercase">
                      {s.calories}
                    </span>
                    <span className="text-sm sm:text-base font-bold text-white font-mono">
                      {calories} kcal
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: CONTROLS & EXPORT ACTIONS */}
          <div className="flex-1 w-full flex flex-col gap-3 text-left">
            <div>
              <h2 className="text-base sm:text-lg font-mono font-black text-slate-900">
                {s.modalTitle}
              </h2>
              <p className="text-xs font-mono text-slate-600 mt-0.5">
                {s.modalSubtitle}
              </p>
            </div>

            {/* INPUT NAMA SESI LARI */}
            <div>
              <label className="text-xs font-mono font-bold text-slate-800 block mb-1 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-orange-500" />
                <span>{s.sessionNameLabel}</span>
              </label>
              <input
                type="text"
                maxLength={36}
                value={sessionTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={s.sessionNamePlaceholder}
                className="w-full py-2 px-3 rounded-lg bg-slate-50 border-2 border-black text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 shadow-[3px_3px_0_#000000] focus:outline-none transition-all"
              />

              {/* Quick preset chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {s.presets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border-2 transition-all cursor-pointer ${
                      sessionTitle === preset
                        ? "bg-amber-300 text-black border-black shadow-[2px_2px_0_#000000]"
                        : "bg-white hover:bg-slate-100 text-slate-800 border-black shadow-[2px_2px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Rasio Card */}
            <div>
              <label className="text-xs font-mono font-bold text-slate-800 block mb-1">
                {s.ratioLabel}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleAspectChange("9:16")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-mono font-bold border-2 transition-all cursor-pointer ${
                    aspectRatio === "9:16"
                      ? "bg-sky-300 text-black border-black shadow-[3px_3px_0_#000000]"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-black shadow-[3px_3px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  }`}
                >
                  {s.ratioStory}
                </button>
                <button
                  type="button"
                  onClick={() => handleAspectChange("4:5")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-mono font-bold border-2 transition-all cursor-pointer ${
                    aspectRatio === "4:5"
                      ? "bg-sky-300 text-black border-black shadow-[3px_3px_0_#000000]"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-black shadow-[3px_3px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  }`}
                >
                  {s.ratioFeed}
                </button>
              </div>
            </div>

            {/* Toggle Kilometer Splits on Card */}
            {displaySplits.length > 0 && (
              <div>
                <label className="flex items-center justify-between text-xs font-mono font-bold text-slate-800 cursor-pointer bg-slate-50 p-2.5 rounded-lg border-2 border-black shadow-[3px_3px_0_#000000] transition-all">
                  <span className="flex items-center gap-2">
                    <ListOrdered className="w-3.5 h-3.5 text-orange-500" />
                    <span>
                      {s.toggleSplits || "Tampilkan Splits per KM di Kartu"}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showSplits}
                    onChange={(e) => {
                      playTactileSound("switch");
                      setShowSplits(e.target.checked);
                    }}
                    className="accent-orange-500 rounded cursor-pointer w-4 h-4 border-2 border-black"
                  />
                </label>
              </div>
            )}

            {/* Foto Background */}
            <div>
              <label className="text-xs font-mono font-bold text-slate-800 block mb-1">
                {s.photoLabel}
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playTactileSound("click");
                    fileInputRef.current?.click();
                  }}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 border-2 border-black shadow-[3px_3px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-xs font-mono font-bold text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{userImage ? s.changePhoto : s.pickPhoto}</span>
                </button>

                {userImage && (
                  <button
                    type="button"
                    onClick={() => {
                      playTactileSound("click");
                      setUserImage(null);
                    }}
                    title={s.resetPhotoTitle}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border-2 border-black shadow-[3px_3px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {userImage && (
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-600 mb-1">
                  <span>{s.dimmingLabel}</span>
                  <span className="font-bold">
                    {Math.round(darkOverlayOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={darkOverlayOpacity}
                  onChange={(e) =>
                    setDarkOverlayOpacity(parseFloat(e.target.value))
                  }
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>
            )}

            {feedbackMsg && (
              <div className="px-3.5 py-2 rounded-lg bg-emerald-100 border-2 border-black text-emerald-950 text-xs font-mono font-bold flex items-center gap-2 shadow-[3px_3px_0_#000000]">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feedbackMsg}</span>
              </div>
            )}

            <div className="mt-1 flex flex-col gap-2">
              <button
                type="button"
                disabled={isExporting}
                onClick={() => {
                  playTactileSound("action");
                  handleShare();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-orange-400 hover:bg-orange-300 text-black border-2 border-black shadow-[4px_4px_0_#000000] font-mono font-black text-sm flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 transition-all cursor-pointer"
              >
                {isExporting ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span>{s.shareBtn}</span>
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={() => {
                  playTactileSound("action");
                  handleDownload();
                }}
                className="w-full py-2 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 border-2 border-black shadow-[3px_3px_0_#000000] font-mono font-bold text-xs flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-700" />
                <span>{s.downloadBtn}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadGpx}
                disabled={(routeCoordinates?.length ?? 0) < 2}
                className="w-full py-2 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 border-2 border-black shadow-[3px_3px_0_#000000] font-mono font-bold text-xs flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 transition-all cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-700" />
                <span>{s.exportGpx || "Download GPX"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
