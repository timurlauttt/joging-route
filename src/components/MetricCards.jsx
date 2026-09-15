import { Activity, Flame, Gauge, Route, Timer } from 'lucide-react';
import { calculateCalories, calculatePace, formatDistance, formatTime } from '../utils/formatters';

/**
 * Metric Cards Display for Distance, Time, Pace & Calories
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
      {/* Distance Card */}
      <div className="relative overflow-hidden bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800/80 shadow-lg hover:border-emerald-500/40 transition-all group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5 text-emerald-400" />
            Jarak Total
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${
              mode === 'freerun'
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}
          >
            {mode === 'freerun' ? 'GPS Live' : 'OSRM'}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono group-hover:text-emerald-400 transition-colors">
            {distanceMeters > 0 ? formattedDistance.replace(' km', '') : '0.00'}
          </span>
          <span className="text-sm font-medium text-slate-400">km</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          {distanceMeters > 0 ? `${Math.round(distanceMeters).toLocaleString()} m rute jalan` : 'Tandai titik di peta'}
        </p>
      </div>

      {/* Time Card */}
      <div className="relative overflow-hidden bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800/80 shadow-lg hover:border-sky-500/40 transition-all group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-sky-400" />
            Waktu Tempuh
          </span>
          {isRunning && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
          )}
        </div>
        <div className="flex items-baseline">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono group-hover:text-sky-400 transition-colors">
            {formattedTime}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          {isRunning ? 'Stopwatch berjalan...' : timerSeconds > 0 ? 'Stopwatch dijeda' : 'Stopwatch belum mulai'}
        </p>
      </div>

      {/* Pace Card */}
      <div className="relative overflow-hidden bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800/80 shadow-lg hover:border-amber-500/40 transition-all group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            Pace Rata-rata
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono font-medium border border-amber-500/20">
            Realtime
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono group-hover:text-amber-400 transition-colors">
            {formattedPace.split(' ')[0]}
          </span>
          <span className="text-sm font-medium text-slate-400">/km</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          {distanceMeters > 0 && timerSeconds > 0 ? 'Kalkulasi waktu / jarak' : 'Memerlukan rute & waktu'}
        </p>
      </div>

      {/* Calories Card */}
      <div className="relative overflow-hidden bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800/80 shadow-lg hover:border-rose-500/40 transition-all group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            Estimasi Kalori
          </span>
          <Activity className="w-3.5 h-3.5 text-rose-400/60" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono group-hover:text-rose-400 transition-colors">
            {calories}
          </span>
          <span className="text-sm font-medium text-slate-400">kcal</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Berdasarkan ~62 kcal / km
        </p>
      </div>
    </div>
  );
}
