import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Layers, MapPin, Radio } from 'lucide-react';

/**
 * Interactive Leaflet Map Component supporting:
 * 1. "Route Builder Mode": manual click waypoints + OSRM route snapping
 * 2. "Free Run Mode": live GPS tracking polyline + live user position pulse marker
 */
export default function MapRoute({
  mode = 'builder', // 'builder' | 'freerun'
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

  const [activeTile, setActiveTile] = useState('dark'); // 'dark' | 'osm'
  const [isLocating, setIsLocating] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const tileLayerRef = useRef(null);

  // Keep latest onAddWaypoint and mode in refs
  const onAddWaypointRef = useRef(onAddWaypoint);
  const modeRef = useRef(mode);

  useEffect(() => {
    onAddWaypointRef.current = onAddWaypoint;
  }, [onAddWaypoint]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

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
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileUrl =
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const tileLayer = L.tileLayer(tileUrl, {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Separate Layer Groups
    markersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    liveRouteLayerRef.current = L.layerGroup().addTo(map);
    liveMarkerLayerRef.current = L.layerGroup().addTo(map);

    // Map click event
    map.on('click', (e) => {
      if (modeRef.current === 'builder') {
        const { lat, lng } = e.latlng;
        if (onAddWaypointRef.current) {
          onAddWaypointRef.current({ lat, lng });
        }
      }
    });

    // Detect user pan dragging to disable autoFollow temporarily
    map.on('dragstart', () => {
      if (modeRef.current === 'freerun') {
        setAutoFollow(false);
      }
    });

    mapInstanceRef.current = map;

    // Detect initial position
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView(
              [pos.coords.latitude, pos.coords.longitude],
              15
            );
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Tile Switching
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    let newTileLayer;
    if (activeTile === 'dark') {
      newTileLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          subdomains: 'abcd',
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
      );
    } else {
      newTileLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }
      );
    }

    newTileLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newTileLayer;
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
          weight: 9,
          opacity: 0.3,
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
            padding: [45, 45],
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
      // Start Marker (initial position in Free Run)
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

      // If at least 2 points, render live polyline
      if (latLngs.length >= 2) {
        const glowPolyline = L.polyline(latLngs, {
          color: '#06b6d4',
          weight: 10,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        });

        const sharpPolyline = L.polyline(latLngs, {
          color: '#38bdf8',
          weight: 5,
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

      // Auto follow map view
      if (autoFollow && mapInstanceRef.current) {
        mapInstanceRef.current.panTo(latestCoord, { animate: true, duration: 0.5 });
      }
    }
  }, [liveCoordinates, mode, autoFollow]);

  // Locate User GPS manually
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolokasi tidak didukung oleh browser Anda.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(
            [pos.coords.latitude, pos.coords.longitude],
            16,
            { duration: 1.2 }
          );
          if (mode === 'freerun') {
            setAutoFollow(true);
          }
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);
        alert('Gagal mendapatkan lokasi GPS Anda. Pastikan izin lokasi aktif.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Route Loading Overlay in Builder mode */}
      {mode === 'builder' && isLoadingRoute && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 bg-slate-900/90 backdrop-blur-md border border-emerald-500/40 rounded-full shadow-xl flex items-center gap-2.5 text-xs font-medium text-emerald-300">
          <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span>Menghubungkan rute jalan (OSRM)...</span>
        </div>
      )}

      {/* Guide Banner for Route Builder */}
      {mode === 'builder' && waypoints.length === 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[999] pointer-events-none px-4 py-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-lg flex items-center gap-2 text-xs font-medium text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
          <span>Klik di peta untuk menandai titik rute lari</span>
        </div>
      )}

      {/* Status Banner for Free Run Mode */}
      {mode === 'freerun' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[999] px-4 py-2 bg-slate-900/90 backdrop-blur-md border border-sky-500/40 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold text-sky-300">
          <Radio className={`w-3.5 h-3.5 ${isLiveTracking ? 'text-sky-400 animate-pulse' : 'text-slate-400'}`} />
          <span>
            {isLiveTracking
              ? `Melacak GPS Live (${liveCoordinates.length} titik tercatat)`
              : 'Klik "Mulai" untuk mengaktifkan live tracking GPS'}
          </span>
        </div>
      )}

      {/* Floating Controls Top-Right */}
      <div className="absolute top-4 right-4 z-[999] flex flex-col gap-2">
        {/* GPS Locate / Follow Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          title={mode === 'freerun' ? 'Fokus & ikuti posisi saya' : 'Fokus ke lokasi saya'}
          className={`p-2.5 backdrop-blur-md rounded-xl border shadow-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
            mode === 'freerun' && autoFollow
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/60'
              : 'bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border-slate-700/70'
          }`}
        >
          <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin text-emerald-400' : ''}`} />
        </button>

        {/* Tile Layer Switcher */}
        <button
          type="button"
          onClick={() => setActiveTile(activeTile === 'dark' ? 'osm' : 'dark')}
          title={activeTile === 'dark' ? 'Ganti ke OpenStreetMap' : 'Ganti ke Dark Matter'}
          className="p-2.5 bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 backdrop-blur-md rounded-xl border border-slate-700/70 shadow-lg transition-all active:scale-95 flex items-center justify-center cursor-pointer"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Mode & Stats badge bottom-left */}
      <div className="absolute bottom-3 left-3 z-[999] px-3 py-1.5 bg-slate-950/85 backdrop-blur-md rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            mode === 'freerun'
              ? isLiveTracking
                ? 'bg-sky-400 animate-ping'
                : 'bg-amber-400'
              : 'bg-emerald-400 animate-pulse'
          }`}
        />
        <span>
          {mode === 'freerun'
            ? `Free Run: ${liveCoordinates.length} GPS pts`
            : `Builder: ${waypoints.length} titik`}
        </span>
      </div>
    </div>
  );
}
