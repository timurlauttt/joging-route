import { Flame, Gauge, Route, Timer } from 'lucide-react';
import { calculateCalories, calculatePace, formatDistance, formatTime } from '../utils/formatters';

/**
 * Metric Cards Display for Distance, Time, Pace & Calories
 * Clean, modern athletic styling without neon or coding clutter
 */
export default function MetricCards({
  mode = 'builder',
  distanceMeters,
  timerSeconds,
  isRunning,
}) {
  const formattedDistance = formatDistance(distanceMeters);
  const formattedTime = formatTime(timerSeconds);
  const formattedPace = calculatePace(timerSeconds, distanceMeters);
  const calories = calculateCalories(distanceMeters);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
      {/* Distance Card */}
      <div className="bg-zinc-900/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-zinc-800/80 shadow-sm transition-colors hover:border-zinc-700">
        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5 text-zinc-400" />
            Jarak
          </span>
          <span className="text-[10px] text-zinc-500 font-medium">
            {mode === 'freerun' ? 'GPS' : 'Rute'}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
            {distanceMeters > 0 ? formattedDistance.replace(' km', '') : '0.00'}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-zinc-400">km</span>
        </div>
        <p className="text-[10px] sm:text-[11px] text-zinc-500 mt-1 truncate">
          {distanceMeters > 0 ? `${Math.round(distanceMeters).toLocaleString()} meter` : 'Belum ada titik'}
        </p>
      </div>

      {/* Time Card */}
      <div className="bg-zinc-900/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-zinc-800/80 shadow-sm transition-colors hover:border-zinc-700">
        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-zinc-400" />
            Waktu
          </span>
          {isRunning && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
          )}
        </div>
        <div className="flex items-baseline">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
            {formattedTime}
          </span>
        </div>
        <p className="text-[10px] sm:text-[11px] text-zinc-500 mt-1 truncate">
          {isRunning ? 'Stopwatch aktif' : timerSeconds > 0 ? 'Dijeda' : '00:00:00'}
        </p>
      </div>

      {/* Pace Card */}
      <div className="bg-zinc-900/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-zinc-800/80 shadow-sm transition-colors hover:border-zinc-700">
        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-zinc-400" />
            Pace Rata-rata
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
            {formattedPace.split(' ')[0]}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-zinc-400">/km</span>
        </div>
        <p className="text-[10px] sm:text-[11px] text-zinc-500 mt-1 truncate">
          {distanceMeters > 0 && timerSeconds > 0 ? 'Kalkulasi realtime' : 'Butuh rute & waktu'}
        </p>
      </div>

      {/* Calories Card */}
      <div className="bg-zinc-900/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-zinc-800/80 shadow-sm transition-colors hover:border-zinc-700">
        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-zinc-400" />
            Estimasi Energi
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
            {calories}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-zinc-400">kcal</span>
        </div>
        <p className="text-[10px] sm:text-[11px] text-zinc-500 mt-1 truncate">
          Kalori terbakar
        </p>
      </div>
    </div>
  );
}
