import { useState, useRef, useMemo } from 'react';
import { toPng, toBlob } from 'html-to-image';
import {
  X,
  Upload,
  Download,
  Share2,
  Check,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  calculateCalories,
  calculatePace,
  formatDistance,
  formatTime,
} from '../utils/formatters';

/**
 * Convert GeoJSON coordinates into an SVG path string normalized to viewBox [0,0, 100, 100]
 */
function generateRouteSvgPath(coordinates) {
  if (!coordinates || coordinates.length < 2) return '';

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
  const padding = 12; // padding inside 100x100 box
  const usableSize = 100 - padding * 2;

  // Preserve aspect ratio
  const scale = Math.min(usableSize / deltaX, usableSize / deltaY);
  const offsetX = padding + (usableSize - deltaX * scale) / 2;
  const offsetY = padding + (usableSize - deltaY * scale) / 2;

  const points = coordinates.map(([lng, lat]) => {
    const x = offsetX + (lng - minX) * scale;
    // Invert Y because SVG coordinates have Y increasing downwards
    const y = 100 - (offsetY + (lat - minY) * scale);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return `M ${points.join(' L ')}`;
}

export default function ShareModal({
  isOpen,
  onClose,
  distanceMeters,
  timerSeconds,
  routeCoordinates,
}) {
  const [aspectRatio, setAspectRatio] = useState('9:16'); // '9:16' | '1:1'
  const [userImage, setUserImage] = useState(null);
  const [darkOverlayOpacity, setDarkOverlayOpacity] = useState(0.45);
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);

  const formattedDistance = formatDistance(distanceMeters);
  const formattedTime = formatTime(timerSeconds);
  const formattedPace = calculatePace(timerSeconds, distanceMeters);
  const calories = calculateCalories(distanceMeters);

  // SVG route path
  const routeSvgPath = useMemo(() => {
    return generateRouteSvgPath(routeCoordinates);
  }, [routeCoordinates]);

  // Current date for badge
  const currentDateFormatted = useMemo(() => {
    const date = new Date();
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  if (!isOpen) return null;

  // Handle Photo Upload
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

  const showFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3500);
  };

  // Download image as PNG
  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `jog-route-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      showFeedback('Kartu berhasil diunduh!');
    } catch (err) {
      console.error('Error generating image:', err);
      showFeedback('Gagal mengunduh gambar.');
    } finally {
      setIsExporting(false);
    }
  };

  // Share using Web Share API with auto fallback to download
  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);

      // Check if Web Share API is available with file support
      if (navigator.canShare) {
        const blob = await toBlob(cardRef.current, {
          pixelRatio: 2.5,
          cacheBust: true,
        });

        if (blob) {
          const file = new File([blob], `jog-route-${Date.now()}.png`, {
            type: 'image/png',
          });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Jogging Route Tracker',
              text: `🏃 Selesai lari sejauh ${formattedDistance} dalam ${formattedTime} (Pace: ${formattedPace})!`,
            });
            showFeedback('Berhasil dibagikan!');
            setIsExporting(false);
            return;
          }
        }
      }

      // Fallback: direct download
      await handleDownload();
      showFeedback('Membagikan via browser tidak didukung, kartu langsung diunduh!');
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing:', err);
        // Fallback to download on share rejection/error
        await handleDownload();
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl my-auto text-slate-100 flex flex-col md:flex-row gap-6 items-center">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT COLUMN: THE STRAVA-STYLE CARD PREVIEW */}
        <div className="flex flex-col items-center w-full md:w-auto">
          <div
            ref={cardRef}
            className={`relative overflow-hidden rounded-2xl shadow-2xl select-none flex flex-col justify-between transition-all duration-300 border border-slate-700/60 ${
              aspectRatio === '9:16'
                ? 'w-[280px] sm:w-[310px] aspect-[9/16]'
                : 'w-[280px] sm:w-[310px] aspect-square'
            }`}
            style={{
              backgroundColor: '#0a0e17',
            }}
          >
            {/* Background Layer: Custom Photo or Elegant Dark Mesh */}
            {userImage ? (
              <img
                src={userImage}
                alt="Run Background"
                className="absolute inset-0 w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-[#0d1525] to-[#121c2e]">
                {/* Subtle running mesh grid effect */}
                <div
                  className="absolute inset-0 opacity-15"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)',
                    backgroundSize: '24px 24px',
                  }}
                />
                <div className="absolute top-1/4 -right-12 w-48 h-48 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-10 -left-10 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
              </div>
            )}

            {/* Dark Gradient Overlay for Readability */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60 pointer-events-none"
              style={{
                backgroundColor: userImage
                  ? `rgba(0, 0, 0, ${darkOverlayOpacity})`
                  : 'transparent',
              }}
            />

            {/* CARD HEADER */}
            <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-widest uppercase text-white font-sans">
                    JOG TRACKER
                  </h4>
                  <p className="text-[10px] text-slate-300 font-medium">
                    {currentDateFormatted}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider rounded-full bg-white/15 backdrop-blur-md text-white border border-white/20 uppercase">
                STRAVA MODE
              </span>
            </div>

            {/* MIDDLE: ROUTE SVG SHAPE OVERLAY (If exists) */}
            {routeSvgPath && (
              <div className="relative z-10 my-auto px-6 py-2 flex items-center justify-center">
                <svg
                  viewBox="0 0 100 100"
                  className="w-36 h-36 sm:w-44 sm:h-44 drop-shadow-[0_0_12px_rgba(249,115,22,0.8)]"
                >
                  {/* Glow filter */}
                  <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow
                        dx="0"
                        dy="0"
                        stdDeviation="2"
                        floodColor="#f97316"
                      />
                    </filter>
                  </defs>
                  <path
                    d={routeSvgPath}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                  />
                </svg>
              </div>
            )}

            {/* CARD BOTTOM: KEY RUNNING METRICS */}
            <div className="relative z-10 p-4 sm:p-5 bg-gradient-to-t from-black/85 via-black/50 to-transparent">
              {/* Primary Distance Display */}
              <div className="mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
                  Total Jarak
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight leading-none drop-shadow-md">
                    {distanceMeters > 0
                      ? (distanceMeters / 1000).toFixed(2)
                      : '0.00'}
                  </span>
                  <span className="text-lg font-bold text-slate-300">KM</span>
                </div>
              </div>

              {/* Secondary Stats Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/15">
                {/* Time */}
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                    Waktu
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-white font-mono">
                    {formattedTime}
                  </span>
                </div>

                {/* Pace */}
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                    Pace
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-white font-mono">
                    {formattedPace.replace(' ', '')}
                  </span>
                </div>

                {/* Calories */}
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                    Kalori
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-white font-mono">
                    {calories} kcal
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CARD CONTROLS & EXPORT ACTIONS */}
        <div className="flex-1 w-full flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-400" />
              Bagikan Sesi Lari Anda
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ekspor kartu estetis ala Strava untuk Instagram Story atau postingan media sosial.
            </p>
          </div>

          {/* Ratio Switcher */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Format Rasio Kartu:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  aspectRatio === '9:16'
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-800'
                }`}
              >
                9:16 (Story / Reels)
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('1:1')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  aspectRatio === '1:1'
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-800'
                }`}
              >
                1:1 (Square Feed)
              </button>
            </div>
          </div>

          {/* Photo Upload Section */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Foto Latar Belakang:
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
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-all"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>{userImage ? 'Ganti Foto' : 'Unggah Foto Pribadi'}</span>
              </button>

              {userImage && (
                <button
                  type="button"
                  onClick={() => setUserImage(null)}
                  title="Kembalikan ke gradient default"
                  className="p-2.5 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Overlay dimming slider (if custom photo uploaded) */}
          {userImage && (
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Keredupan Foto Latar:</span>
                <span>{Math.round(darkOverlayOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={darkOverlayOpacity}
                onChange={(e) => setDarkOverlayOpacity(parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>
          )}

          {/* Feedback message banner */}
          {feedbackMsg && (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* ACTION BUTTONS: DOWNLOAD & SHARE */}
          <div className="mt-2 flex flex-col gap-2.5">
            <button
              type="button"
              disabled={isExporting}
              onClick={handleShare}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white font-bold text-sm shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span>Bagikan (Share Card)</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownload}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Unduh Gambar (PNG)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
