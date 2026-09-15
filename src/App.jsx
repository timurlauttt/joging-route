import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import MapRoute from './components/MapRoute';
import MetricCards from './components/MetricCards';
import ControlsBar from './components/ControlsBar';
import ShareModal from './components/ShareModal';
import InfoModal from './components/InfoModal';
import { fetchWalkingRoute, haversineDistance } from './utils/osrm';
import { calculatePace } from './utils/formatters';
import { translations } from './utils/translations';
import { startBackgroundAudio, stopBackgroundAudio } from './utils/backgroundAudio';
import { speakKilometerSplit } from './utils/audioCues';

export default function App() {
  // Localization: 'id' | 'en' (stored in localStorage)
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('ontrack_lang') || 'id';
    } catch {
      return 'id';
    }
  });

  const handleLangChange = useCallback((newLang) => {
    langRef.current = newLang;
    setLang(newLang);
    try {
      localStorage.setItem('ontrack_lang', newLang);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const t = translations[lang] || translations.id;

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

  // Voice Audio Cues state (persisted in localStorage)
  const [isVoiceCueEnabled, setIsVoiceCueEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('ontrack_voice_cues');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleVoiceCue = useCallback(() => {
    setIsVoiceCueEnabled((prev) => {
      const next = !prev;
      isVoiceCueEnabledRef.current = next;
      try {
        localStorage.setItem('ontrack_voice_cues', String(next));
      } catch {
        // Ignore localStorage error
      }
      return next;
    });
  }, []);

  // Kilometer Splits state: [{ km, lapSeconds, paceStr, totalSeconds }]
  const [splits, setSplits] = useState([]);
  const lastSplitKmRef = useRef(0);
  const lastSplitTimeRef = useRef(0);
  const liveDistanceMetersRef = useRef(0);
  const isVoiceCueEnabledRef = useRef(isVoiceCueEnabled);
  const langRef = useRef(lang);

  // Active metrics based on mode
  const activeDistance = mode === 'freerun' ? liveDistanceMeters : distanceMeters;
  const activeCoordinates =
    mode === 'freerun'
      ? liveCoordinates.map((c) => [c.lng, c.lat])
      : routeGeojson?.coordinates || [];

  // Info & Privacy Modal state (automatically shown once on first visit)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(() => {
    try {
      return !localStorage.getItem('ontrack_guide_seen');
    } catch {
      return false;
    }
  });

  const handleCloseInfoModal = useCallback(() => {
    setIsInfoModalOpen(false);
    try {
      localStorage.setItem('ontrack_guide_seen', 'true');
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Refs for background workers & locks
  const watchIdRef = useRef(null);
  const wakeLockRef = useRef(null);

  // Timestamp Delta refs for drift-free stopwatch calculation (survives screen-off / backgrounding)
  const startTimeRef = useRef(null);
  const accumulatedTimeRef = useRef(0);

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

  // Re-acquire wake lock and instantaneously resync stopwatch on visibility change or focus
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isRunning) {
        if (startTimeRef.current) {
          const elapsedMs = accumulatedTimeRef.current + (Date.now() - startTimeRef.current);
          setTimerSeconds(Math.floor(elapsedMs / 1000));
        }
        if (mode === 'freerun') {
          await requestWakeLock();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
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
          const nextDist = liveDistanceMetersRef.current + step;
          liveDistanceMetersRef.current = nextDist;
          setLiveDistanceMeters(nextDist);

          // Milestone splits check & Voice Audio Cues (every completed 1,000m)
          if (nextDist >= 1000) {
            const currentCompletedKm = Math.floor(nextDist / 1000);
            if (currentCompletedKm > lastSplitKmRef.current) {
              const elapsedMs = startTimeRef.current
                ? accumulatedTimeRef.current + (Date.now() - startTimeRef.current)
                : 0;
              const currentSeconds = Math.floor(elapsedMs / 1000);

              const newSplits = [];
              for (let k = lastSplitKmRef.current + 1; k <= currentCompletedKm; k++) {
                const lapSeconds = Math.max(1, currentSeconds - lastSplitTimeRef.current);
                const paceStr = calculatePace(lapSeconds, 1000);
                newSplits.push({
                  km: k,
                  lapSeconds,
                  paceStr,
                  totalSeconds: currentSeconds,
                });
                lastSplitTimeRef.current = currentSeconds;
                lastSplitKmRef.current = k;

                if (isVoiceCueEnabledRef.current) {
                  speakKilometerSplit(k, lapSeconds, langRef.current);
                }
              }

              if (newSplits.length > 0) {
                setSplits((prev) => [...prev, ...newSplits]);
              }
            }
          }

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

  // Drift-Free Stopwatch Timer effect (calculates true elapsed time from timestamp delta)
  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        if (startTimeRef.current) {
          const elapsedMs = accumulatedTimeRef.current + (Date.now() - startTimeRef.current);
          setTimerSeconds(Math.floor(elapsedMs / 1000));
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  // Unmount cleanup for GPS, Wake Lock & Background Audio
  useEffect(() => {
    return () => {
      stopBackgroundAudio();
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
    setSplits([]);
    lastSplitKmRef.current = 0;
    lastSplitTimeRef.current = 0;
    liveDistanceMetersRef.current = 0;
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
      if (startTimeRef.current) {
        accumulatedTimeRef.current += Date.now() - startTimeRef.current;
        startTimeRef.current = null;
      }
      setIsRunning(false);
      stopBackgroundAudio();
      stopGpsTracking();
      releaseWakeLock();
    }
    setMode(newMode);
  }, [mode, isRunning, stopGpsTracking, releaseWakeLock]);

  // Timer handlers
  const handleStartTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setIsRunning(true);
    startBackgroundAudio();
    if (mode === 'freerun') {
      startGpsTracking();
      requestWakeLock();
    }
  }, [mode, startGpsTracking, requestWakeLock]);

  const handlePauseTimer = useCallback(() => {
    if (startTimeRef.current) {
      accumulatedTimeRef.current += Date.now() - startTimeRef.current;
      startTimeRef.current = null;
    }
    setIsRunning(false);
    stopBackgroundAudio();
    if (mode === 'freerun') {
      stopGpsTracking();
      releaseWakeLock();
    }
  }, [mode, stopGpsTracking, releaseWakeLock]);

  const handleResetTimer = useCallback(() => {
    startTimeRef.current = null;
    accumulatedTimeRef.current = 0;
    setIsRunning(false);
    setTimerSeconds(0);
    setSplits([]);
    lastSplitKmRef.current = 0;
    lastSplitTimeRef.current = 0;
    liveDistanceMetersRef.current = 0;
    stopBackgroundAudio();
    if (mode === 'freerun') {
      stopGpsTracking();
      releaseWakeLock();
      setLiveCoordinates([]);
      setLiveDistanceMeters(0);
    }
  }, [mode, stopGpsTracking, releaseWakeLock]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-zinc-800 selection:text-white">
      {/* Top Navigation Bar with Mode Switcher & Wake Lock indicator & Language Toggle */}
      <Navbar
        mode={mode}
        setMode={handleModeChange}
        waypointsCount={waypoints.length}
        liveCoordinatesCount={liveCoordinates.length}
        isRunning={isRunning}
        isWakeLockActive={isWakeLockActive}
        lang={lang}
        setLang={handleLangChange}
        t={t}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-4 lg:p-6 flex flex-col gap-2.5 sm:gap-3.5">
        {/* Metric Cards Top Row */}
        <MetricCards
          mode={mode}
          distanceMeters={activeDistance}
          timerSeconds={timerSeconds}
          isRunning={isRunning}
          t={t}
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
            t={t}
          />
        </div>

        {/* Controls Bar (Undo, Reset, Stopwatch, Share, Voice Cue) */}
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
          isVoiceCueEnabled={isVoiceCueEnabled}
          onToggleVoiceCue={handleToggleVoiceCue}
          t={t}
        />

        {/* Footer: Quick Instructions, Privacy & Guide, Developer Credit */}
        <footer className="flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 px-1 py-1 gap-2.5 border-t border-zinc-900/80 pt-2.5">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span>
              {mode === 'builder' ? t.footer.builderHint : t.footer.freeRunHint}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 text-[11px] text-zinc-500">
            {/* Guide & Privacy Trigger */}
            <button
              type="button"
              onClick={() => setIsInfoModalOpen(true)}
              className="text-zinc-400 hover:text-white transition-colors underline-offset-2 hover:underline cursor-pointer font-medium"
            >
              {t.footer.guideAndPrivacy}
            </button>

            <span className="text-zinc-700">&bull;</span>

            {/* Developer Credit Link to pangestudev.web.id */}
            <div className="flex items-center gap-1 text-zinc-400">
              <span>{t.footer.craftedBy}</span>
              <a
                href="https://pangestudev.web.id"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-zinc-200 hover:text-orange-400 transition-colors underline-offset-2 hover:underline inline-flex items-center gap-0.5"
              >
                <span>{t.footer.developerName}</span>
              </a>
            </div>

            <span className="text-zinc-700">&bull;</span>

            <span className="text-zinc-600">{t.footer.version}</span>
          </div>
        </footer>
      </main>

      {/* OnTrack Share Card Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        distanceMeters={activeDistance}
        timerSeconds={timerSeconds}
        routeCoordinates={activeCoordinates}
        splits={splits}
        lang={lang}
        t={t}
      />

      {/* OnTrack User Guide & Privacy Policy Modal */}
      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={handleCloseInfoModal}
        t={t}
      />
    </div>
  );
}
