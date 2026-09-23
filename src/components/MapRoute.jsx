import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Layers, MapPin, Radio, Navigation, X } from 'lucide-react';
import { playTactileSound } from '../utils/soundEffects';

/**
 * OnTrack Map Component
 * - 100% Free Esri World Dark Gray Canvas (No API Key, No Watermarks)
 * - Clean athletic route polyline without excessive neon glow
 * - Minimalist matte pin markers
 */
export default function MapRoute({
  mode = 'builder',
  waypoints = [],
  routeGeojson = null,
  liveCoordinates = [],
  isLiveTracking = false,
  isLoadingRoute = false,
  onAddWaypoint,
  t,
}) {
  const m = useMemo(
    () =>
      t?.map || {
        promptTitle: 'Fokuskan ke Lokasi Saya?',
        promptSub: 'Nyalakan GPS untuk memusatkan peta',
        promptSeeking: 'Mencari posisi...',
        allowBtn: 'Izinkan',
        seekingBtn: '...',
        deniedNotice: 'Izin lokasi diblokir. Aktifkan izin lokasi di URL browser.',
        timeoutNotice: 'GPS tidak merespons. Pastikan GPS HP aktif.',
        snapping: 'Menyesuaikan rute...',
        emptyBuilderGuide: 'Klik peta untuk menandai rute',
        freeRunTracking: 'GPS Live',
        freeRunIdle: 'Klik "Mulai" untuk merekam GPS',
        locateTitle: 'Fokus ke lokasi saya',
        layerLight: 'Ganti ke Mode Terang',
        layerDark: 'Ganti ke Mode Gelap',
        startMarker: 'Titik Awal (Start)',
        finishMarker: 'Titik Akhir (Finish)',
        waypoint: 'Waypoint',
        myLocation: 'Lokasi Anda',
      },
    [t]
  );

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const liveRouteLayerRef = useRef(null);
  const liveMarkerLayerRef = useRef(null);
  const userLocLayerRef = useRef(null);

  const [activeTile, setActiveTile] = useState('light'); // 'light' | 'osm'
  const [isLocating, setIsLocating] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);
  const [locationNotice, setLocationNotice] = useState('');
  
  const baseTileRef = useRef(null);
  const labelTileRef = useRef(null);

  const onAddWaypointRef = useRef(onAddWaypoint);
  const modeRef = useRef(mode);

  useEffect(() => {
    onAddWaypointRef.current = onAddWaypoint;
  }, [onAddWaypoint]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Attach Tile Layers (Esri Light Gray Canvas & OSM - 100% Keyless, No Watermarks)
  const setTiles = (map, tileType) => {
    if (baseTileRef.current) map.removeLayer(baseTileRef.current);
    if (labelTileRef.current) map.removeLayer(labelTileRef.current);

    if (tileType === 'light') {
      baseTileRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          maxNativeZoom: 16, // Upscale level 16 tiles to prevent 'Map data not yet available'
          attribution: '&copy; Esri, OpenStreetMap contributors',
        }
      ).addTo(map);

      labelTileRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          maxNativeZoom: 16,
          opacity: 0.85,
        }
      ).addTo(map);
    } else {
      baseTileRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          maxNativeZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }
      ).addTo(map);
      labelTileRef.current = null;
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter = [-6.175392, 106.827153];
    const initialZoom = 15;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      maxZoom: 19,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    setTiles(map, 'light');

    markersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    liveRouteLayerRef.current = L.layerGroup().addTo(map);
    liveMarkerLayerRef.current = L.layerGroup().addTo(map);
    userLocLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', (e) => {
      if (modeRef.current === 'builder') {
        const { lat, lng } = e.latlng;
        if (onAddWaypointRef.current) {
          onAddWaypointRef.current({ lat, lng });
        }
      }
    });

    map.on('dragstart', () => {
      if (modeRef.current === 'freerun') {
        setAutoFollow(false);
      }
    });

    mapInstanceRef.current = map;

    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 800);

    let ro = null;
    if (window.ResizeObserver && mapContainerRef.current) {
      ro = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      ro.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (ro) ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Tile Switching
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    setTiles(mapInstanceRef.current, activeTile);
    mapInstanceRef.current.invalidateSize();
  }, [activeTile]);

  // Route Builder: Update Waypoints Markers
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    if (mode !== 'builder') return;

    waypoints.forEach((pt, index) => {
      const isStart = index === 0;
      const isEnd = index === waypoints.length - 1 && waypoints.length > 1;

      let markerClass = 'marker-mid';
      let label = `${index + 1}`;

      if (isStart) {
        markerClass = 'marker-start';
        label = 'S';
      } else if (isEnd) {
        markerClass = 'marker-finish';
        label = 'F';
      }

      const icon = L.divIcon({
        className: 'custom-pin-wrapper',
        html: `
          <div class="custom-pin-marker ${markerClass} w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center font-bold text-xs select-none">
            ${label}
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([pt.lat, pt.lng], { icon });
      marker.bindPopup(
        `<div class="text-xs text-zinc-900 font-sans py-0.5">
          <b>${isStart ? m.startMarker : isEnd ? m.finishMarker : `${m.waypoint} #${index + 1}`}</b>
        </div>`
      );
      markersLayerRef.current.addLayer(marker);
    });
  }, [waypoints, mode, m]);

  // Route Builder: Render clean solid route polyline
  useEffect(() => {
    if (!routeLayerRef.current) return;
    routeLayerRef.current.clearLayers();

    if (mode !== 'builder') return;

    if (routeGeojson && routeGeojson.coordinates && routeGeojson.coordinates.length > 0) {
      // Clean, crisp solid line without neon glare
      const mainLayer = L.geoJSON(routeGeojson, {
        style: {
          color: '#10b981',
          weight: 4.5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        },
      });

      routeLayerRef.current.addLayer(mainLayer);

      if (mapInstanceRef.current && waypoints.length >= 2) {
        const bounds = mainLayer.getBounds();
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 17,
            animate: true,
          });
        }
      }
    }
  }, [routeGeojson, waypoints.length, mode]);

  // Free Run: Render clean live GPS polyline
  useEffect(() => {
    if (!liveRouteLayerRef.current || !liveMarkerLayerRef.current) return;
    liveRouteLayerRef.current.clearLayers();
    liveMarkerLayerRef.current.clearLayers();

    if (mode !== 'freerun') return;

    const latLngs = liveCoordinates.map((c) => [c.lat, c.lng]);

    if (latLngs.length > 0) {
      // Start Marker
      const startCoord = latLngs[0];
      const startIcon = L.divIcon({
        className: 'custom-pin-wrapper',
        html: `
          <div class="custom-pin-marker marker-start w-6 h-6 flex items-center justify-center font-bold text-xs">
            S
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      liveMarkerLayerRef.current.addLayer(L.marker(startCoord, { icon: startIcon }));

      // Clean, crisp GPS track line
      if (latLngs.length >= 2) {
        const line = L.polyline(latLngs, {
          color: '#f97316',
          weight: 4.5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        });
        liveRouteLayerRef.current.addLayer(line);
      }

      // Latest User Position Marker (Clean dot)
      const latestCoord = latLngs[latLngs.length - 1];
      const liveUserIcon = L.divIcon({
        className: 'custom-live-icon',
        html: `
          <div class="marker-live-user">
            <div class="marker-live-pulse"></div>
            <div class="marker-live-dot"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const userMarker = L.marker(latestCoord, { icon: liveUserIcon, zIndexOffset: 1000 });
      liveMarkerLayerRef.current.addLayer(userMarker);

      if (autoFollow && mapInstanceRef.current) {
        mapInstanceRef.current.panTo(latestCoord, { animate: true, duration: 0.5 });
      }
    }
  }, [liveCoordinates, mode, autoFollow]);

  // Request Geolocation
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      alert(m.deniedNotice || 'Geolokasi tidak didukung.');
      setShowLocationPrompt(false);
      return;
    }

    setIsLocating(true);
    setLocationNotice(m.promptSeeking);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setShowLocationPrompt(false);
        setLocationNotice('');

        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([userLat, userLng], 16, { duration: 1.2 });
          mapInstanceRef.current.invalidateSize();

          if (userLocLayerRef.current) {
            userLocLayerRef.current.clearLayers();
            const userIcon = L.divIcon({
              className: 'custom-live-icon',
              html: `
                <div class="marker-live-user">
                  <div class="marker-live-pulse"></div>
                  <div class="marker-live-dot"></div>
                </div>
              `,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            });
            const marker = L.marker([userLat, userLng], { icon: userIcon });
            marker.bindPopup(`<b>${m.myLocation}</b>`);
            userLocLayerRef.current.addLayer(marker);
          }
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);
        if (err.code === 1) {
          setLocationNotice(m.deniedNotice);
        } else {
          setLocationNotice(m.timeoutNotice);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="relative w-full rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-3 border-black shadow-[6px_6px_0_#000000] bg-white flex flex-col">
      {/* Window Bar (Header ala OS / GitHub Terminal) */}
      <div className="bg-slate-100 border-b-2 border-black px-3.5 py-2 flex items-center justify-between text-xs text-slate-700 select-none shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-black shadow-sm" />
          <span className="ml-2 font-mono text-slate-900 text-xs font-black tracking-wide flex items-center gap-1.5">
            <span className="text-sky-700 font-bold">~/ontrack</span>/route-canvas.ts
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="hidden sm:inline px-2 py-0.5 rounded bg-white border-2 border-black text-slate-900 font-black">
            {mode === 'builder' ? 'MODE: ROAD_SNAP' : 'MODE: LIVE_GPS'}
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black animate-pulse" />
        </div>
      </div>

      {/* Map View Canvas Container */}
      <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[500px]">
        <div
          ref={mapContainerRef}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />

        {/* GPS PERMISSION PROMPT BANNER */}
        {showLocationPrompt && (
          <div className="absolute bottom-12 left-2 right-2 sm:left-auto sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-[1000] max-w-sm w-auto bg-amber-100 border-2 border-black rounded-xl p-2.5 sm:p-3 shadow-[4px_4px_0_#000000] flex items-center justify-between gap-2 text-left animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded bg-white border-2 border-black flex items-center justify-center text-sky-700 shrink-0">
                <Navigation className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black font-mono text-slate-950 leading-tight">
                  {m.promptTitle}
                </h4>
                <p className="text-[10px] text-slate-700 font-mono leading-tight truncate">
                  {locationNotice || m.promptSub}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  playTactileSound('action');
                  handleRequestLocation();
                }}
                disabled={isLocating}
                className="px-2.5 py-1 rounded bg-sky-300 hover:bg-sky-200 text-black text-xs font-black font-mono border-2 border-black shadow-[2px_2px_0_#000000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer disabled:opacity-50"
              >
                {isLocating ? m.seekingBtn : m.allowBtn}
              </button>
              <button
                type="button"
                onClick={() => setShowLocationPrompt(false)}
                aria-label="Tutup rekomendasi lokasi"
                className="p-1 text-slate-600 hover:text-black rounded border border-black hover:bg-white transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Route Loading Indicator */}
        {mode === 'builder' && isLoadingRoute && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1.5 bg-white border-2 border-black rounded-lg shadow-[3px_3px_0_#000000] flex items-center gap-2 text-[11px] font-mono font-black text-black">
            <div className="w-3 h-3 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
            <span>{m.snapping}</span>
          </div>
        )}

        {/* Empty Waypoint Guide */}
        {mode === 'builder' && waypoints.length === 0 && !showLocationPrompt && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] pointer-events-none px-3 py-1.5 bg-white border-2 border-black rounded-lg shadow-[3px_3px_0_#000000] flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-800">
            <MapPin className="w-3.5 h-3.5 text-sky-600" />
            <span>{m.emptyBuilderGuide}</span>
          </div>
        )}

        {/* Free Run Banner */}
        {mode === 'freerun' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] px-3 py-1.5 bg-white border-2 border-black rounded-lg shadow-[3px_3px_0_#000000] flex items-center gap-2 text-[11px] font-mono font-bold text-black">
            <Radio className={`w-3.5 h-3.5 ${isLiveTracking ? 'text-orange-600 animate-pulse' : 'text-slate-500'}`} />
            <span>
              {isLiveTracking
                ? `${m.freeRunTracking} (${liveCoordinates.length})`
                : m.freeRunIdle}
            </span>
          </div>
        )}

        {/* Floating Controls Top-Right */}
        <div className="absolute top-3 right-3 z-[999] flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              playTactileSound('click');
              handleRequestLocation();
            }}
            title={m.locateTitle}
            className="p-2 bg-white hover:bg-slate-100 text-black rounded-lg border-2 border-black shadow-[3px_3px_0_#000000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center cursor-pointer"
          >
            <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin text-orange-600' : 'text-sky-700'}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              playTactileSound('click');
              const nextTile = activeTile === 'light' ? 'osm' : 'light';
              setActiveTile(nextTile);
              if (mapInstanceRef.current) setTiles(mapInstanceRef.current, nextTile);
            }}
            title={activeTile === 'light' ? 'Ganti ke OpenStreetMap' : 'Ganti ke Minimalist Canvas'}
            className="p-2 bg-white hover:bg-slate-100 text-black rounded-lg border-2 border-black shadow-[3px_3px_0_#000000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center cursor-pointer"
          >
            <Layers className="w-4 h-4 text-emerald-700" />
          </button>
        </div>

        {/* Mode & Status Badge Bottom-Left */}
        <div className="absolute bottom-2.5 left-2.5 z-[999] px-2.5 py-1 bg-white rounded-lg border-2 border-black text-[10px] text-black font-mono font-black shadow-[2px_2px_0_#000000] flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              mode === 'freerun'
                ? isLiveTracking
                  ? 'bg-orange-500 animate-ping'
                  : 'bg-slate-400'
                : 'bg-emerald-500'
            }`}
          />
          <span>
            {mode === 'freerun'
              ? `${liveCoordinates.length} GPS pts`
              : `${waypoints.length} pt`}
          </span>
        </div>
      </div>
    </div>
  );
}
