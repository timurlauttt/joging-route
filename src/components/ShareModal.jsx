import { useState, useRef, useMemo } from 'react';
import { toPng, toBlob } from 'html-to-image';
import {
  X,
  Upload,
  Download,
  Share2,
  Check,
  RefreshCw,
  Edit3,
  ListOrdered,
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

function createTimestampedFilename(slug) {
  const safeSlug = (slug || 'session').toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `ontrack-${safeSlug}-${Date.now()}.png`;
}

export default function ShareModal({
  isOpen,
  onClose,
  distanceMeters,
  timerSeconds,
  routeCoordinates,
  splits = [],
  lang = 'id',
  t,
}) {
  const [showSplits, setShowSplits] = useState(true);
  const s = t?.share || {
    modalTitle: 'Bagikan Sesi Lari',
    modalSubtitle: 'Kustomisasi nama sesi dan ekspor kartu ringkasan estetis ke media sosial.',
    sessionNameLabel: 'Nama Sesi Lari:',
    sessionNamePlaceholder: 'Contoh: Lari Pagi GBK, 5K Tempo, dll.',
    ratioLabel: 'Format Rasio:',
    ratioStory: '9:16 (Story)',
    ratioFeed: '4:5 (Post)',
    photoLabel: 'Foto Latar Belakang:',
    pickPhoto: 'Pilih Foto',
    changePhoto: 'Ganti Foto',
    resetPhotoTitle: 'Kembalikan ke latar default',
    dimmingLabel: 'Keredupan Foto:',
    shareBtn: 'Bagikan Sesi',
    downloadBtn: 'Unduh Gambar',
    toastDownloaded: 'Kartu berhasil diunduh!',
    toastFailedDownload: 'Gagal mengunduh gambar.',
    toastShared: 'Berhasil dibagikan!',
    toastFallbackDownload: 'Kartu otomatis diunduh ke galeri!',
    totalDistance: 'TOTAL JARAK',
    time: 'WAKTU',
    pace: 'PACE',
    calories: 'KALORI',
    defaultTitleMorning: 'Lari Pagi',
    defaultTitleLunch: 'Lari Siang',
    defaultTitleAfternoon: 'Lari Sore',
    defaultTitleNight: 'Lari Malam',
    defaultRun: 'Sesi Lari',
    presets: ['Lari Pagi', 'Jogging Santai', '5K Tempo', 'Long Run', 'Lari Malam', 'Recovery'],
    shareText: '🏃 {title}: {distance} dalam {time} (Pace: {pace}) via OnTrack',
  };

  // Automatically localized default title based on time of day and selected language
  const defaultTitle = useMemo(() => {
    const shareDict = t?.share;
    if (!shareDict) return 'Morning Run';
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
    const locale = t?.locale || (lang === 'en' ? 'en-US' : 'id-ID');
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [lang, t]);

  const currentTimeFormatted = useMemo(() => {
    const date = new Date();
    const locale = t?.locale || (lang === 'en' ? 'en-US' : 'id-ID');
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: lang === 'en',
    });
  }, [lang, t]);

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

      const filename = createTimestampedFilename(sessionTitle);
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();

      showFeedback(s.toastDownloaded);
    } catch (err) {
      console.error('Error generating image:', err);
      showFeedback(s.toastFailedDownload);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);

      const titleToShare = sessionTitle || s.defaultRun;
      const shareMessage = (s.shareText || '🏃 {title}: {distance} ({pace}) via OnTrack')
        .replace('{title}', titleToShare)
        .replace('{distance}', formattedDistance)
        .replace('{time}', formattedTime)
        .replace('{pace}', formattedPace);

      if (navigator.canShare) {
        const blob = await toBlob(cardRef.current, {
          pixelRatio: 2.5,
          cacheBust: true,
        });

        if (blob) {
          const filename = createTimestampedFilename(titleToShare);
          const file = new File([blob], filename, {
            type: 'image/png',
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
      if (err.name !== 'AbortError') {
        console.error('Error sharing:', err);
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

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl my-auto text-zinc-100 flex flex-col md:flex-row gap-5 sm:gap-6 items-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-full transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ONTRACK CARD PREVIEW (Follows current language selection) */}
        <div className="flex flex-col items-center w-full md:w-auto">
          <div
            ref={cardRef}
            className={`relative overflow-hidden rounded-none shadow-2xl select-none flex flex-col justify-between transition-all duration-300 border border-zinc-800 ${
              aspectRatio === '9:16'
                ? 'w-[280px] sm:w-[310px] aspect-[9/16]'
                : 'w-[280px] sm:w-[310px] aspect-[4/5]'
            }`}
            style={{ backgroundColor: '#09090b' }}
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
                      ? 'w-24 h-24 sm:w-28 sm:h-28'
                      : 'w-36 h-36 sm:w-44 sm:h-44'
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
                  <span>{s.splitsHeader || 'SPLITS'}</span>
                  <span>{s.pace || 'PACE'}</span>
                </div>
                <div
                  className={`grid ${
                    displaySplits.length > 3 ? 'grid-cols-2 gap-x-3' : 'grid-cols-1'
                  } gap-y-0.5 text-[10px]`}
                >
                  {displaySplits.slice(0, 6).map((split) => (
                    <div key={split.km} className="flex items-center justify-between">
                      <span className="text-zinc-400 font-semibold">{split.km} km</span>
                      <span className="text-white font-bold">
                        {split.paceStr.replace(' /km', '')}
                      </span>
                    </div>
                  ))}
                </div>
                {displaySplits.length > 6 && (
                  <div className="text-[8px] text-zinc-500 text-center pt-0.5">
                    +{displaySplits.length - 6} {t?.metrics?.splitMore || 'more km'}
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
                      : '0.00'}
                  </span>
                  <span className="text-base font-bold text-zinc-300">KM</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-white/10 text-left">
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
                    {s.pace}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-white font-mono">
                    {formattedPace.replace(' ', '')}
                  </span>
                </div>
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

        {/* CONTROLS & EXPORT ACTIONS */}
        <div className="flex-1 w-full flex flex-col gap-3.5 text-left">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              {s.modalTitle}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {s.modalSubtitle}
            </p>
          </div>

          {/* INPUT NAMA SESI LARI (Fitur Penamaan Sesi) */}
          <div>
            <label className="text-xs font-semibold text-zinc-200 block mb-1 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-orange-400" />
              <span>{s.sessionNameLabel}</span>
            </label>
            <input
              type="text"
              maxLength={36}
              value={sessionTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={s.sessionNamePlaceholder}
              className="w-full py-2 px-3 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 transition-all shadow-inner"
            />

            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {s.presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCustomTitle(preset)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-all cursor-pointer ${
                    sessionTitle === preset
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                      : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Rasio Card */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              {s.ratioLabel}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  aspectRatio === '9:16'
                    ? 'bg-zinc-800 text-white border-zinc-600'
                    : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800/60'
                }`}
              >
                {s.ratioStory}
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('4:5')}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  aspectRatio === '4:5'
                    ? 'bg-zinc-800 text-white border-zinc-600'
                    : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800/60'
                }`}
              >
                {s.ratioFeed}
              </button>
            </div>
          </div>

          {/* Toggle Kilometer Splits on Card */}
          {displaySplits.length > 0 && (
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-zinc-300 cursor-pointer bg-zinc-800/80 hover:bg-zinc-800 p-2.5 rounded-xl border border-zinc-700 transition-colors">
                <span className="flex items-center gap-2">
                  <ListOrdered className="w-3.5 h-3.5 text-orange-400" />
                  <span>{s.toggleSplits || 'Tampilkan Splits per KM di Kartu'}</span>
                </span>
                <input
                  type="checkbox"
                  checked={showSplits}
                  onChange={(e) => setShowSplits(e.target.checked)}
                  className="accent-orange-500 rounded cursor-pointer w-4 h-4"
                />
              </label>
            </div>
          )}

          {/* Foto Background */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
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
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-300" />
                <span>{userImage ? s.changePhoto : s.pickPhoto}</span>
              </button>

              {userImage && (
                <button
                  type="button"
                  onClick={() => setUserImage(null)}
                  title={s.resetPhotoTitle}
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
                <span>{s.dimmingLabel}</span>
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
              <span>{s.shareBtn}</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownload}
              className="w-full py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span>{s.downloadBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
