import { useState, useRef, useMemo } from 'react';
import { toPng, toBlob } from 'html-to-image';
import {
  X,
  Upload,
  Download,
  Share2,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  calculateCalories,
  calculatePace,
  formatDistance,
  formatTime,
} from '../utils/formatters';

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

  return `M ${points.join(' L ')}`;
}

export default function ShareModal({
  isOpen,
  onClose,
  distanceMeters,
  timerSeconds,
  routeCoordinates,
}) {
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [userImage, setUserImage] = useState(null);
  const [darkOverlayOpacity, setDarkOverlayOpacity] = useState(0.4);
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);

  const formattedDistance = formatDistance(distanceMeters);
  const formattedTime = formatTime(timerSeconds);
  const formattedPace = calculatePace(timerSeconds, distanceMeters);
  const calories = calculateCalories(distanceMeters);

  const routeSvgPath = useMemo(() => {
    return generateRouteSvgPath(routeCoordinates);
  }, [routeCoordinates]);

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

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `ontrack-session-${Date.now()}.png`;
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

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);

      if (navigator.canShare) {
        const blob = await toBlob(cardRef.current, {
          pixelRatio: 2.5,
          cacheBust: true,
        });

        if (blob) {
          const file = new File([blob], `ontrack-session-${Date.now()}.png`, {
            type: 'image/png',
          });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'OnTrack Session',
              text: `🏃 Sesi Lari: ${formattedDistance} dalam ${formattedTime} (Pace: ${formattedPace}) via OnTrack`,
            });
            showFeedback('Berhasil dibagikan!');
            setIsExporting(false);
            return;
          }
        }
      }

      await handleDownload();
      showFeedback('Kartu otomatis diunduh ke galeri!');
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing:', err);
        await handleDownload();
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl my-auto text-zinc-100 flex flex-col md:flex-row gap-5 sm:gap-6 items-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-full transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ONTRACK CARD PREVIEW */}
        <div className="flex flex-col items-center w-full md:w-auto">
          <div
            ref={cardRef}
            className={`relative overflow-hidden rounded-2xl shadow-2xl select-none flex flex-col justify-between transition-all duration-300 border border-zinc-800 ${
              aspectRatio === '9:16'
                ? 'w-[280px] sm:w-[310px] aspect-[9/16]'
                : 'w-[280px] sm:w-[310px] aspect-square'
            }`}
            style={{ backgroundColor: '#09090b' }}
          >
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
                      'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
                    backgroundSize: '24px 24px',
                  }}
                />
              </div>
            )}

            <div
              className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60 pointer-events-none"
              style={{
                backgroundColor: userImage
                  ? `rgba(0, 0, 0, ${darkOverlayOpacity})`
                  : 'transparent',
              }}
            />

            {/* HEADER KARTU */}
            <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-black text-xs">
                  OT
                </div>
                <div>
                  <h4 className="text-xs font-bold tracking-wider text-white font-sans">
                    ONTRACK
                  </h4>
                  <p className="text-[10px] text-zinc-400 font-medium">
                    {currentDateFormatted}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider rounded-md bg-white/10 text-zinc-200 border border-white/15 uppercase">
                SESSION
              </span>
            </div>

            {/* ROUTE SILHOUETTE (Clean solid line) */}
            {routeSvgPath && (
              <div className="relative z-10 my-auto px-6 py-2 flex items-center justify-center">
                <svg
                  viewBox="0 0 100 100"
                  className="w-36 h-36 sm:w-44 sm:h-44 drop-shadow-md"
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

            {/* OVERLAY METRIK LARI */}
            <div className="relative z-10 p-4 sm:p-5 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
              <div className="mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                  Total Jarak
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl sm:text-5xl font-extrabold text-white font-mono tracking-tight leading-none">
                    {distanceMeters > 0
                      ? (distanceMeters / 1000).toFixed(2)
                      : '0.00'}
                  </span>
                  <span className="text-base font-bold text-zinc-300">KM</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-white/10">
                <div>
                  <span className="text-[10px] font-medium text-zinc-400 block uppercase">
                    Waktu
                  </span>
                  <span className="text-sm sm:text-base font-bold text-white font-mono">
                    {formattedTime}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-zinc-400 block uppercase">
                    Pace
                  </span>
                  <span className="text-sm sm:text-base font-bold text-white font-mono">
                    {formattedPace.replace(' ', '')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-zinc-400 block uppercase">
                    Kalori
                  </span>
                  <span className="text-sm sm:text-base font-bold text-white font-mono">
                    {calories} kcal
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLS & EXPORT ACTIONS */}
        <div className="flex-1 w-full flex flex-col gap-3.5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Bagikan Sesi Lari
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ekspor kartu estetis untuk Instagram Story atau postingan media sosial.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1.5">
              Format Rasio:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  aspectRatio === '9:16'
                    ? 'bg-zinc-800 text-white border-zinc-600'
                    : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800/60'
                }`}
              >
                9:16 (Story)
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('1:1')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  aspectRatio === '1:1'
                    ? 'bg-zinc-800 text-white border-zinc-600'
                    : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800/60'
                }`}
              >
                1:1 (Feed)
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1.5">
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
                className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-300" />
                <span>{userImage ? 'Ganti Foto' : 'Pilih Foto'}</span>
              </button>

              {userImage && (
                <button
                  type="button"
                  onClick={() => setUserImage(null)}
                  title="Kembalikan ke latar default"
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl border border-zinc-700 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {userImage && (
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Keredupan Foto:</span>
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

          {feedbackMsg && (
            <div className="px-3.5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          <div className="mt-1 flex flex-col gap-2">
            <button
              type="button"
              disabled={isExporting}
              onClick={handleShare}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span>Bagikan Sesi</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownload}
              className="w-full py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span>Unduh Gambar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
