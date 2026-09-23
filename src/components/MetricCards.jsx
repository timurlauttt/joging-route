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
  t,
}) {
  const m = t?.metrics || {
    distance: 'Jarak',
    distanceRoute: 'Rute',
    distanceGPS: 'GPS',
    noPoints: 'Belum ada titik',
    meterUnit: 'meter',
    time: 'Waktu',
    timerActive: 'Stopwatch aktif',
    timerPaused: 'Dijeda',
    avgPace: 'Pace Rata-rata',
    paceRealtime: 'Kalkulasi realtime',
    paceNeedsData: 'Butuh rute & waktu',
    calories: 'Estimasi Energi',
    caloriesSub: 'Kalori terbakar',
  };

  const formattedDistance = formatDistance(distanceMeters);
  const formattedTime = formatTime(timerSeconds);
  const formattedPace = calculatePace(timerSeconds, distanceMeters);
  const calories = calculateCalories(distanceMeters);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full max-w-full min-w-0">
      {/* Distance Card — Sky Blue Accent */}
      <div className="bg-white rounded-xl p-2.5 sm:p-3.5 border-2 border-black shadow-[4px_4px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000000] transition-all duration-150 min-w-0">
        <div className="flex items-center justify-between mb-1 sm:mb-1.5 min-w-0">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-800 font-mono flex items-center gap-1.5 truncate">
            <Route className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="truncate">{m.distance}</span>
          </span>
          <span className="text-[9px] sm:text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-sky-200 border-2 border-black text-sky-950 shrink-0">
            {mode === 'freerun' ? m.distanceGPS : m.distanceRoute}
          </span>
        </div>
        <div className="flex items-baseline gap-1 min-w-0">
          <span className="text-xl sm:text-3xl font-black tracking-tight text-black font-mono truncate">
            {distanceMeters > 0 ? formattedDistance.replace(' km', '') : '0.00'}
          </span>
          <span className="text-xs sm:text-sm font-black font-mono text-sky-600 shrink-0">km</span>
        </div>
        <p className="text-[10px] text-slate-600 font-mono font-medium mt-1 truncate border-t-2 border-slate-100 pt-1">
          {distanceMeters > 0
            ? `${Math.round(distanceMeters).toLocaleString()} ${m.meterUnit}`
            : m.noPoints}
        </p>
      </div>

      {/* Time Card — Terminal Green Accent */}
      <div className="bg-white rounded-xl p-2.5 sm:p-3.5 border-2 border-black shadow-[4px_4px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000000] transition-all duration-150 min-w-0">
        <div className="flex items-center justify-between mb-1 sm:mb-1.5 min-w-0">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-800 font-mono flex items-center gap-1.5 truncate">
            <Timer className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{m.time}</span>
          </span>
          {isRunning ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-200 border-2 border-black text-rose-950 font-mono text-[9px] font-black shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
              REC
            </span>
          ) : (
            <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 border-2 border-black text-slate-700 shrink-0">
              {timerSeconds > 0 ? 'PAUSE' : 'IDLE'}
            </span>
          )}
        </div>
        <div className="flex items-baseline min-w-0">
          <span className="text-xl sm:text-3xl font-black tracking-tight text-black font-mono truncate">
            {formattedTime}
          </span>
        </div>
        <p className="text-[10px] text-slate-600 font-mono font-medium mt-1 truncate border-t-2 border-slate-100 pt-1">
          {isRunning ? m.timerActive : timerSeconds > 0 ? m.timerPaused : '00:00:00'}
        </p>
      </div>

      {/* Pace Card — Code Peach Accent */}
      <div className="bg-white rounded-xl p-2.5 sm:p-3.5 border-2 border-black shadow-[4px_4px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000000] transition-all duration-150 min-w-0">
        <div className="flex items-center justify-between mb-1 sm:mb-1.5 min-w-0">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-800 font-mono flex items-center gap-1.5 truncate">
            <Gauge className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span className="truncate">{m.avgPace}</span>
          </span>
          <span className="text-[9px] sm:text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-orange-200 border-2 border-black text-orange-950 shrink-0">
            AVG
          </span>
        </div>
        <div className="flex items-baseline gap-1 min-w-0">
          <span className="text-xl sm:text-3xl font-black tracking-tight text-black font-mono truncate">
            {formattedPace.split(' ')[0]}
          </span>
          <span className="text-xs sm:text-sm font-black font-mono text-orange-600 shrink-0">/km</span>
        </div>
        <p className="text-[10px] text-slate-600 font-mono font-medium mt-1 truncate border-t-2 border-slate-100 pt-1">
          {distanceMeters > 0 && timerSeconds > 0 ? m.paceRealtime : m.paceNeedsData}
        </p>
      </div>

      {/* Calories Card — Violet Accent */}
      <div className="bg-white rounded-xl p-2.5 sm:p-3.5 border-2 border-black shadow-[4px_4px_0_#000000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000000] transition-all duration-150 min-w-0">
        <div className="flex items-center justify-between mb-1 sm:mb-1.5 min-w-0">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-800 font-mono flex items-center gap-1.5 truncate">
            <Flame className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="truncate">{m.calories}</span>
          </span>
          <span className="text-[9px] sm:text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-purple-200 border-2 border-black text-purple-950 shrink-0">
            EST
          </span>
        </div>
        <div className="flex items-baseline gap-1 min-w-0">
          <span className="text-xl sm:text-3xl font-black tracking-tight text-black font-mono truncate">
            {calories}
          </span>
          <span className="text-xs sm:text-sm font-black font-mono text-purple-600 shrink-0">kcal</span>
        </div>
        <p className="text-[10px] text-slate-600 font-mono font-medium mt-1 truncate border-t-2 border-slate-100 pt-1">
          {m.caloriesSub}
        </p>
      </div>
    </div>
  );
}
