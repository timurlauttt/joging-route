import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import MapRoute from './components/MapRoute';
import MetricCards from './components/MetricCards';
import ControlsBar from './components/ControlsBar';
import ShareModal from './components/ShareModal';
import { fetchWalkingRoute, haversineDistance } from './utils/osrm';
import { Footprints, Radio } from 'lucide-react';

export default function App() {
  // Tracking Mode: 'builder' (manual waypoint snapping) vs 'freerun' (live GPS tracking)
  const [mode, setMode] = useState('builder');

  // Route Builder state
  const [waypoints, setWaypoints] = useState([]);
  const [routeGeojson, setRouteGeojson] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Free Run GPS Live Tracking state
  const [liveCoordinates, setLiveCoordinates] = useState([]);
  const [liveDistanceMeters, setLiveDistanceMeters] = useState(0);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);

  // Stopwatch state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Share Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Refs for background workers & locks
  const watchIdRef = useRef(null);
  const wakeLockRef = useRef(null);

  // Screen Wake Lock API handler
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setIsWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setIsWakeLockActive(false);
          wakeLockRef.current = null;
        });
      } catch (err) {
        console.warn('Screen Wake Lock request failed:', err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        console.warn('Screen Wake Lock release failed:', err);
      }
      wakeLockRef.current = null;
      setIsWakeLockActive(false);
    }
  }, []);

  // Re-acquire wake lock on visibility change if still running
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isRunning && mode === 'freerun') {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning, mode, requestWakeLock]);

  // GPS watchPosition start & stop helpers
  const startGpsTracking = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolokasi tidak didukung oleh browser Anda.');
      return;
    }

    if (watchIdRef.current !== null) return;

    const options = {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000,
    };

    const success = (position) => {
      const newCoord = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };

      setLiveCoordinates((prev) => {
        if (prev.length === 0) {
          return [newCoord];
        }

        const lastCoord = prev[prev.length - 1];
        // Calculate step distance using pure Haversine formula
        const step = haversineDistance(lastCoord, newCoord);

        // Filter out GPS drift noise (< 2.5 meters)
        if (step >= 2.5) {
          setLiveDistanceMeters((d) => d + step);
          return [...prev, newCoord];
        }
        return prev;
      });
    };

    const error = (err) => {
      console.warn('Geolocation watchPosition error:', err.message);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(success, error, options);
  }, []);

  const stopGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Accurate Stopwatch Timer effect
  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  // Unmount cleanup for GPS & Wake Lock
  useEffect(() => {
    return () => {
      stopGpsTracking();
      releaseWakeLock();
    };
  }, [stopGpsTracking, releaseWakeLock]);

  // Route calculation effect with OSRM (Only in 'builder' mode)
  useEffect(() => {
    if (mode !== 'builder') return;

    let isMounted = true;

    if (waypoints.length < 2) {
      const resetTimer = setTimeout(() => {
        if (isMounted) {
          setRouteGeojson(null);
          setDistanceMeters(0);
          setIsLoadingRoute(false);
        }
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(resetTimer);
      };
    }

    const timer = setTimeout(async () => {
      if (!isMounted) return;
      setIsLoadingRoute(true);
      try {
        const result = await fetchWalkingRoute(waypoints);
        if (isMounted) {
          setRouteGeojson(result.geojson);
          setDistanceMeters(result.distance);
        }
      } catch (err) {
        console.error('Failed to compute walking route:', err);
      } finally {
        if (isMounted) {
          setIsLoadingRoute(false);
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [waypoints, mode]);

  // Waypoint manipulation handlers (Route Builder)
  const handleAddWaypoint = useCallback((newPt) => {
    setWaypoints((prev) => [...prev, newPt]);
  }, []);

  const handleUndoWaypoint = useCallback(() => {
    setWaypoints((prev) => {
      const next = prev.slice(0, -1);
      if (next.length < 2) {
        setRouteGeojson(null);
        setDistanceMeters(0);
      }
      return next;
    });
  }, []);

  const handleClearRoute = useCallback(() => {
    if (mode === 'builder') {
      setWaypoints([]);
      setRouteGeojson(null);
      setDistanceMeters(0);
    } else {
      setLiveCoordinates([]);
      setLiveDistanceMeters(0);
    }
  }, [mode]);

  const handleModeChange = useCallback((newMode) => {
    if (newMode === mode) return;
    if (isRunning) {
      setIsRunning(false);
      stopGpsTracking();
      releaseWakeLock();
    }
    setMode(newMode);
  }, [mode, isRunning, stopGpsTracking, releaseWakeLock]);

  // Timer handlers
  const handleStartTimer = useCallback(() => {
    setIsRunning(true);
    if (mode === 'freerun') {
      startGpsTracking();
      requestWakeLock();
    }
  }, [mode, startGpsTracking, requestWakeLock]);

  const handlePauseTimer = useCallback(() => {
    setIsRunning(false);
    if (mode === 'freerun') {
      stopGpsTracking();
      releaseWakeLock();
    }
  }, [mode, stopGpsTracking, releaseWakeLock]);

  const handleResetTimer = useCallback(() => {
    setIsRunning(false);
    setTimerSeconds(0);
    if (mode === 'freerun') {
      stopGpsTracking();
      releaseWakeLock();
      setLiveCoordinates([]);
      setLiveDistanceMeters(0);
    }
  }, [mode, stopGpsTracking, releaseWakeLock]);

  // Active metrics based on mode
  const activeDistance = mode === 'freerun' ? liveDistanceMeters : distanceMeters;
  const activeCoordinates =
    mode === 'freerun'
      ? liveCoordinates.map((c) => [c.lng, c.lat])
      : routeGeojson?.coordinates || [];

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Navigation Bar with Mode Switcher & Wake Lock indicator */}
      <Navbar
        mode={mode}
        setMode={handleModeChange}
        waypointsCount={waypoints.length}
        liveCoordinatesCount={liveCoordinates.length}
        isRunning={isRunning}
        isWakeLockActive={isWakeLockActive}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-4 lg:p-6 flex flex-col gap-2.5 sm:gap-3.5">
        {/* Metric Cards Top Row */}
        <MetricCards
          mode={mode}
          distanceMeters={activeDistance}
          timerSeconds={timerSeconds}
          isRunning={isRunning}
        />

        {/* Map View & Route Canvas */}
        <div className="w-full relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          <MapRoute
            mode={mode}
            waypoints={waypoints}
            routeGeojson={routeGeojson}
            liveCoordinates={liveCoordinates}
            isLiveTracking={isRunning && mode === 'freerun'}
            isLoadingRoute={isLoadingRoute}
            onAddWaypoint={handleAddWaypoint}
          />
        </div>

        {/* Controls Bar (Undo, Reset, Stopwatch, Share) */}
        <ControlsBar
          mode={mode}
          isRunning={isRunning}
          timerSeconds={timerSeconds}
          waypointsCount={waypoints.length}
          liveCoordinatesCount={liveCoordinates.length}
          onStartTimer={handleStartTimer}
          onPauseTimer={handlePauseTimer}
          onResetTimer={handleResetTimer}
          onUndoWaypoint={handleUndoWaypoint}
          onClearRoute={handleClearRoute}
          onOpenShareModal={() => setIsShareModalOpen(true)}
        />

        {/* Quick Instructions & Footnote */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 px-2 py-1 gap-2">
          <div className="flex items-center gap-2">
            {mode === 'builder' ? (
              <>
                <Footprints className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  <b>Mode Route Builder:</b> Klik peta untuk menandai titik rute &bull; OSRM otomatis menyambungkan jalur jalan.
                </span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>
                  <b>Mode Free Run:</b> Klik &quot;Mulai Track GPS&quot; &bull; Jarak dihitung via Haversine &bull; Layar HP otomatis dijaga tetap aktif (Wake Lock).
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <span>100% Client-side</span>
            <span>&bull;</span>
            <span>No backend required</span>
          </div>
        </div>
      </main>

      {/* Strava-Style Share Card Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        distanceMeters={activeDistance}
        timerSeconds={timerSeconds}
        routeCoordinates={activeCoordinates}
      />
    </div>
  );
}
