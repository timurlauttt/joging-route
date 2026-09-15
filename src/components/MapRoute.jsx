import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Layers, MapPin, Radio, Navigation, X } from 'lucide-react';

/**
 * Interactive Leaflet Map Component
 * - 100% FREE Tiles (NO API KEY REQUIRED, NO WATERMARK)
 * - Dark Mode: Esri World Dark Gray Canvas (Base + Labels)
 * - Light/Street Mode: OpenStreetMap Humanitarian (HOT)
 * - Ultra-responsive layout for Mobile & Desktop
 * - Explicit User-Gesture GPS Permission Banner
 */
export default function MapRoute({
  mode = 'builder',
  waypoints = [],
  routeGeojson = null,
  liveCoordinates = [],
  isLiveTracking = false,
  isLoadingRoute = false,
  onAddWaypoint,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const liveRouteLayerRef = useRef(null);
  const liveMarkerLayerRef = useRef(null);
  const userLocLayerRef = useRef(null);

  const [activeTile, setActiveTile] = useState('dark'); // 'dark' | 'osm'
  const [isLocating, setIsLocating] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);
  const [locationNotice, setLocationNotice] = useState('');
  
  // Layer refs for multi-layer tiles
  const baseTileRef = useRef(null);
  const labelTileRef = useRef(null);

  // Keep latest callbacks and mode in refs
  const onAddWaypointRef = useRef(onAddWaypoint);
  const modeRef = useRef(mode);

  useEffect(() => {
    onAddWaypointRef.current = onAddWaypoint;
  }, [onAddWaypoint]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Helper to attach tile layers (NO API KEY REQUIRED)
  const setTiles = (map, tileType) => {
    if (baseTileRef.current) map.removeLayer(baseTileRef.current);
    if (labelTileRef.current) map.removeLayer(labelTileRef.current);

    if (tileType === 'dark') {
      // Esri World Dark Gray Base (Clean, high-speed, NO API KEY, NO WATERMARK)
      baseTileRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap contributors',
        }
      ).addTo(map);

      // Esri World Dark Gray Reference (Clean labels & street names)
      labelTileRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          opacity: 0.85,
        }
      ).addTo(map);
    } else {
      // OpenStreetMap HOT (Clean street map, NO API KEY)
      baseTileRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors, Humanitarian map style',
        }
      ).addTo(map);
      labelTileRef.current = null;
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // StrictMode safeguard

    const initialCenter = [-6.175392, 106.827153]; // Jakarta Monas
    const initialZoom = 15;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial tile layers (NO API KEY)
    setTiles(map, 'dark');

    // Feature Layers
    markersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    liveRouteLayerRef.current = L.layerGroup().addTo(map);
    liveMarkerLayerRef.current = L.layerGroup().addTo(map);
    userLocLayerRef.current = L.layerGroup().addTo(map);

    // Map click event
    map.on('click', (e) => {
      if (modeRef.current === 'builder') {
        const { lat, lng } = e.latlng;
        if (onAddWaypointRef.current) {
          onAddWaypointRef.current({ lat, lng });
        }
      }
    });

    // Detect user manual dragging
    map.on('dragstart', () => {
      if (modeRef.current === 'freerun') {
        setAutoFollow(false);
      }
    });

    mapInstanceRef.current = map;

    // Force Leaflet to recalculate container dimensions immediately
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
          <div class="custom-pin-marker ${markerClass} w-7 h-7 shadow-lg flex items-center justify-center font-bold text-xs cursor-pointer select-none">
            ${label}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([pt.lat, pt.lng], { icon });
      marker.bindPopup(
        `<div class="text-xs text-slate-800 font-sans py-1">
          <b>${isStart ? 'Titik Awal (Start)' : isEnd ? 'Titik Akhir (Finish)' : `Waypoint #${index + 1}`}</b><br/>
          Lat: ${pt.lat.toFixed(5)}, Lng: ${pt.lng.toFixed(5)}
        </div>`
      );
      markersLayerRef.current.addLayer(marker);
    });
  }, [waypoints, mode]);

  // Route Builder: Update OSRM Route GeoJSON
  useEffect(() => {
    if (!routeLayerRef.current) return;
    routeLayerRef.current.clearLayers();

    if (mode !== 'builder') return;

    if (routeGeojson && routeGeojson.coordinates && routeGeojson.coordinates.length > 0) {
      const glowLayer = L.geoJSON(routeGeojson, {
        style: {
          color: '#10b981',
          weight: 8,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        },
      });

      const mainLayer = L.geoJSON(routeGeojson, {
        style: {
          color: '#34d399',
          weight: 4.5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        },
      });

      routeLayerRef.current.addLayer(glowLayer);
      routeLayerRef.current.addLayer(mainLayer);

      if (mapInstanceRef.current && waypoints.length >= 2) {
        const bounds = glowLayer.getBounds();
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

  // Free Run: Update Live GPS Tracking Polyline & Live User Marker
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
          <div class="custom-pin-marker marker-start w-7 h-7 shadow-lg flex items-center justify-center font-bold text-xs cursor-pointer select-none">
            S
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const startMarker = L.marker(startCoord, { icon: startIcon });
      liveMarkerLayerRef.current.addLayer(startMarker);

      // Live polyline
      if (latLngs.length >= 2) {
        const glowPolyline = L.polyline(latLngs, {
          color: '#06b6d4',
          weight: 9,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        });

        const sharpPolyline = L.polyline(latLngs, {
          color: '#38bdf8',
          weight: 4.5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        });

        liveRouteLayerRef.current.addLayer(glowPolyline);
        liveRouteLayerRef.current.addLayer(sharpPolyline);
      }

      // Latest User Position Marker (Pulsing Dot)
      const latestCoord = latLngs[latLngs.length - 1];
      const liveUserIcon = L.divIcon({
        className: 'custom-live-icon',
        html: `
          <div class="marker-live-user">
            <div class="marker-live-pulse"></div>
            <div class="marker-live-dot"></div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const userMarker = L.marker(latestCoord, { icon: liveUserIcon, zIndexOffset: 1000 });
      liveMarkerLayerRef.current.addLayer(userMarker);

      if (autoFollow && mapInstanceRef.current) {
        mapInstanceRef.current.panTo(latestCoord, { animate: true, duration: 0.5 });
      }
    }
  }, [liveCoordinates, mode, autoFollow]);

  // Request Geolocation on user explicit click
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolokasi tidak didukung oleh browser ini.');
      setShowLocationPrompt(false);
      return;
    }

    setIsLocating(true);
    setLocationNotice('Meminta izin GPS...');

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
              iconSize: [38, 38],
              iconAnchor: [19, 19],
            });
            const marker = L.marker([userLat, userLng], { icon: userIcon });
            marker.bindPopup('<b>Lokasi Anda Saat Ini</b>');
            userLocLayerRef.current.addLayer(marker);
          }
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);

        if (err.code === 1) {
          setLocationNotice(
            'Izin lokasi diblokir di browser. Ubah izin Lokasi di setelan URL browser.'
          );
        } else {
          setLocationNotice('GPS HP tidak merespons. Pastikan GPS aktif.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="relative w-full h-[400px] sm:h-[480px] lg:h-[540px] rounded-xl sm:rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl bg-[#090e17]">
      {/* Container Leaflet dengan height eksplisit 100% */}
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />

      {/* GPS PERMISSION PROMPT BANNER (Responsive for Mobile) */}
      {showLocationPrompt && (
        <div className="absolute bottom-12 left-2 right-2 sm:left-auto sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-[1000] max-w-sm w-auto bg-slate-900/95 backdrop-blur-xl border border-sky-500/50 rounded-xl p-2.5 sm:p-3 shadow-2xl flex items-center justify-between gap-2 text-left animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
              <Navigation className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white leading-tight">
                Fokus ke Lokasi Saya?
              </h4>
              <p className="text-[10px] text-slate-300 leading-tight truncate">
                {locationNotice || 'Klik untuk menyalakan GPS'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleRequestLocation}
              disabled={isLocating}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 text-xs font-bold shadow transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isLocating ? '...' : 'Izinkan'}
            </button>
            <button
              type="button"
              onClick={() => setShowLocationPrompt(false)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Route Loading Overlay in Builder mode */}
      {mode === 'builder' && isLoadingRoute && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1.5 bg-slate-900/90 backdrop-blur-md border border-emerald-500/40 rounded-full shadow-xl flex items-center gap-2 text-[11px] font-medium text-emerald-300">
          <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span>Menghubungkan jalan (OSRM)...</span>
        </div>
      )}

      {/* Guide Banner for Route Builder */}
      {mode === 'builder' && waypoints.length === 0 && !showLocationPrompt && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] pointer-events-none px-3 py-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-lg flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
          <span>Klik peta untuk menandai rute lari</span>
        </div>
      )}

      {/* Status Banner for Free Run Mode */}
      {mode === 'freerun' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] px-3 py-1.5 bg-slate-900/90 backdrop-blur-md border border-sky-500/40 rounded-xl shadow-lg flex items-center gap-2 text-[11px] font-semibold text-sky-300">
          <Radio className={`w-3 h-3 ${isLiveTracking ? 'text-sky-400 animate-pulse' : 'text-slate-400'}`} />
          <span>
            {isLiveTracking
              ? `GPS Live (${liveCoordinates.length} pts)`
              : 'Klik "Mulai" untuk lacak GPS'}
          </span>
        </div>
      )}

      {/* Floating Controls Top-Right */}
      <div className="absolute top-3 right-3 z-[999] flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleRequestLocation}
          title="Fokus ke lokasi saya"
          className={`p-2 backdrop-blur-md rounded-xl border shadow-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
            mode === 'freerun' && autoFollow
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/60'
              : 'bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border-slate-700/70'
          }`}
        >
          <Crosshair className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLocating ? 'animate-spin text-emerald-400' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => setActiveTile(activeTile === 'dark' ? 'osm' : 'dark')}
          title={activeTile === 'dark' ? 'Ganti ke OpenStreetMap' : 'Ganti ke Dark Mode'}
          className="p-2 bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 backdrop-blur-md rounded-xl border border-slate-700/70 shadow-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Mode & Stats badge bottom-left */}
      <div className="absolute bottom-2 left-2 z-[999] px-2.5 py-1 bg-slate-950/85 backdrop-blur-md rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            mode === 'freerun'
              ? isLiveTracking
                ? 'bg-sky-400 animate-ping'
                : 'bg-amber-400'
              : 'bg-emerald-400 animate-pulse'
          }`}
        />
        <span>
          {mode === 'freerun'
            ? `${liveCoordinates.length} GPS pts`
            : `${waypoints.length} titik`}
        </span>
      </div>
    </div>
  );
}
