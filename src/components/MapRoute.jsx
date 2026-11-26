import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Crosshair,
  Layers,
  MapPin,
  Radio,
  Navigation,
  X,
  Check,
  Loader2,
  Landmark,
  Bike,
  Mountain,
} from "lucide-react";
import { playTactileSound } from "../utils/soundEffects";
import {
  fetchNearbyPOIs,
  POI_CATEGORIES,
  POI_MIN_ZOOM,
  getCategory,
} from "../utils/pois";
import { buildElevationPath } from "../utils/elevation";

/**
 * Keyless, free base-map catalogue. Esri World Street Map is the closest free
 * look-alike to Google Maps; CyclOSM is a cycling-optimised render that riders
 * rely on. Every provider here is free and watermark-free. (CARTO's voyager
 * tiles now require an API key and render an "API Key Required" watermark, so
 * they are intentionally not used.)
 */
const BASE_LAYERS = [
  {
    id: "road",
    nameKey: "baseRoad",
    emoji: "🗺️",
    // Esri World Street Map — keyless, Google-Maps-style street rendering.
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      '&copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    maxNativeZoom: 19,
  },
  {
    id: "osm",
    nameKey: "baseOsm",
    emoji: "🌍",
    // OpenStreetMap standard — the always-keyless, dependency-free fallback.
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    maxNativeZoom: 19,
  },
  {
    id: "cycling",
    nameKey: "baseCycling",
    emoji: "🚴",
    url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
    subdomains: "abc",
    attribution:
      '&copy; <a href="https://www.cyclosm.org">CyclOSM</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
    maxNativeZoom: 19,
  },
  {
    id: "satellite",
    nameKey: "baseSatellite",
    emoji: "🛰️",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
    maxNativeZoom: 17,
  },
  {
    id: "terrain",
    nameKey: "baseTerrain",
    emoji: "⛰️",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    subdomains: "abc",
    attribution:
      '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
    maxNativeZoom: 17,
  },
  {
    id: "light",
    nameKey: "baseLight",
    emoji: "⬜",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    labelUrl:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, OpenStreetMap contributors",
    maxZoom: 19,
    maxNativeZoom: 16,
  },
  {
    id: "dark",
    nameKey: "baseDark",
    emoji: "⬛",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    labelUrl:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, OpenStreetMap contributors",
    maxZoom: 19,
    maxNativeZoom: 16,
  },
];

/** Strava-orange for rides, emerald for runs. */
const ROUTE_COLOR = { ride: "#fc4c02", default: "#10b981" };
const TRACK_COLOR = { ride: "#fc4c02", default: "#f97316" };

/** Escape untrusted OSM names before injecting them into a popup. */
function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

/**
 * OnTrack Map Component
 * - 100% free, keyless base maps (Esri World Street Map, CyclOSM, OSM, ...)
 *   — no API keys, no watermarks (see BASE_LAYERS below)
 * - Strategic-place (POI) overlay via the keyless Overpass API
 * - Clean athletic route polyline without excessive neon glow
 * - Minimalist matte pin markers
 */
export default function MapRoute({
  mode = "builder",
  activity = "run",
  waypoints = [],
  routeGeojson = null,
  liveCoordinates = [],
  isLiveTracking = false,
  isLoadingRoute = false,
  elevationData = null,
  onAddWaypoint,
  onMoveWaypoint,
  bikePrefs = null,
  onChangeBikePrefs,
  viaPoint = null,
  onSetVia,
  onClearVia,
  t,
}) {
  const m = useMemo(
    () =>
      t?.map || {
        promptTitle: "Fokuskan ke Lokasi Saya?",
        promptSub: "Nyalakan GPS untuk memusatkan peta",
        promptSeeking: "Mencari posisi...",
        allowBtn: "Izinkan",
        seekingBtn: "...",
        deniedNotice:
          "Izin lokasi diblokir. Aktifkan izin lokasi di URL browser.",
        timeoutNotice: "GPS tidak merespons. Pastikan GPS HP aktif.",
        snapping: "Menyesuaikan rute...",
        emptyBuilderGuide: "Klik peta untuk menandai rute",
        freeRunTracking: "GPS Live",
        freeRunIdle: 'Klik "Mulai" untuk merekam GPS',
        locateTitle: "Fokus ke lokasi saya",
        layerLight: "Ganti ke Mode Terang",
        layerDark: "Ganti ke Mode Gelap",
        startMarker: "Titik Awal (Start)",
        finishMarker: "Titik Akhir (Finish)",
        waypoint: "Titik",
        myLocation: "Lokasi Anda",
        layersTitle: "Lapisan Peta",
        baseRoad: "Peta Jalan",
        baseOsm: "OpenStreetMap",
        baseCycling: "Rute Sepeda",
        baseSatellite: "Satelit",
        baseTerrain: "Topografi",
        baseLight: "Minimalis Terang",
        baseDark: "Mode Gelap",
        elevationTitle: "Profil Elevasi",
        elevationGain: "Naik",
        elevationLoss: "Turun",
        poiTitle: "Tempat Strategis",
        poiToggleOn: "Tampilkan tempat strategis",
        poiToggleOff: "Sembunyikan tempat strategis",
        poiHint: "Hotel, alun-alun, transportasi & lainnya",
        poiLoading: "Memuat tempat...",
        poiZoomHint: "Perbesar peta untuk melihat tempat strategis",
        poiEmpty: "Tidak ada tempat di area ini",
        poiAll: "Semua",
        poiCount: "tempat",
        catLodging: "Hotel & Penginapan",
        catSquare: "Alun-alun & Kota",
        catTransit: "Transportasi",
        catFood: "Kuliner",
        catShopping: "Belanja",
        catHealth: "Kesehatan",
        catSport: "Olahraga & Taman",
        catAttraction: "Wisata & Landmark",
        bikePrefsTitle: "Preferensi Sepeda",
        avoidHills: "Hindari tanjakan",
        avoidHillsHint: "Utamakan jalan datar",
        surfaceLabel: "Permukaan",
        surfaceAny: "Bebas",
        surfacePaved: "Aspal",
        viaTitle: "Lewat titik ini",
        viaSet: "Lewat sini",
        viaClear: "Hapus via",
        viaActive: "Loop akan lewat titik ini",
        dragHint:
          "Geser penanda untuk memindah titik — otomatis menempel ke jalan",
        windowTitle: "Peta Rute OnTrack",
        modeRoadRun: "Rute Jalan",
        modeBikeRoute: "Rute Sepeda",
        modeLiveGps: "GPS Langsung",
        modeLiveRide: "Sepeda Langsung",
        pointsUnit: "titik",
        gpsPointsUnit: "titik GPS",
      },
    [t],
  );

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const liveRouteLayerRef = useRef(null);
  const liveMarkerLayerRef = useRef(null);
  const userLocLayerRef = useRef(null);
  const poiLayerRef = useRef(null);
  const viaLayerRef = useRef(null);
  const layersWrapRef = useRef(null);
  const poiAbortRef = useRef(null);
  const poiDebounceRef = useRef(null);

  const [manualBase, setManualBase] = useState(null);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isBikePrefsOpen, setIsBikePrefsOpen] = useState(false);
  const [showPOI, setShowPOI] = useState(false);
  const [activePoiCats, setActivePoiCats] = useState(() =>
    POI_CATEGORIES.map((c) => c.id),
  );
  const [pois, setPois] = useState([]);
  const [isLoadingPois, setIsLoadingPois] = useState(false);
  const [poiMessage, setPoiMessage] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);
  const [locationNotice, setLocationNotice] = useState("");

  const baseTileRef = useRef(null);
  const labelTileRef = useRef(null);
  // Rides default to the cycling render; the user can override from the panel.
  const baseLayer = manualBase || (activity === "ride" ? "cycling" : "road");

  const onAddWaypointRef = useRef(onAddWaypoint);
  const modeRef = useRef(mode);

  useEffect(() => {
    onAddWaypointRef.current = onAddWaypoint;
  }, [onAddWaypoint]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Attach the selected keyless base map (Street / CyclOSM / Satellite / ...)
  const applyBaseLayer = (map, layerId) => {
    if (!map) return;

    if (baseTileRef.current) {
      map.removeLayer(baseTileRef.current);
      baseTileRef.current = null;
    }
    if (labelTileRef.current) {
      map.removeLayer(labelTileRef.current);
      labelTileRef.current = null;
    }

    const cfg = BASE_LAYERS.find((b) => b.id === layerId) || BASE_LAYERS[0];

    baseTileRef.current = L.tileLayer(cfg.url, {
      maxZoom: cfg.maxZoom,
      maxNativeZoom: cfg.maxNativeZoom,
      subdomains: cfg.subdomains || "abc",
      attribution: cfg.attribution,
      crossOrigin: true,
    }).addTo(map);

    if (cfg.labelUrl) {
      labelTileRef.current = L.tileLayer(cfg.labelUrl, {
        maxZoom: cfg.maxZoom,
        maxNativeZoom: cfg.maxNativeZoom,
        opacity: 0.9,
        crossOrigin: true,
      }).addTo(map);
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
      maxZoom: 20,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    liveRouteLayerRef.current = L.layerGroup().addTo(map);
    liveMarkerLayerRef.current = L.layerGroup().addTo(map);
    userLocLayerRef.current = L.layerGroup().addTo(map);
    poiLayerRef.current = L.layerGroup().addTo(map);
    viaLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (e) => {
      if (modeRef.current === "builder") {
        const { lat, lng } = e.latlng;
        if (onAddWaypointRef.current) {
          onAddWaypointRef.current({ lat, lng });
        }
      }
    });

    map.on("dragstart", () => {
      if (modeRef.current === "freerun") {
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
      baseTileRef.current = null;
      labelTileRef.current = null;
      poiLayerRef.current = null;
    };
  }, []);

  // Apply the selected base layer whenever it changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    applyBaseLayer(mapInstanceRef.current, baseLayer);
    mapInstanceRef.current.invalidateSize();
  }, [baseLayer]);

  // Close the layers panel when clicking outside of it
  useEffect(() => {
    if (!isLayersOpen) return undefined;
    const onDocClick = (e) => {
      if (layersWrapRef.current && !layersWrapRef.current.contains(e.target)) {
        setIsLayersOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isLayersOpen]);

  // Fetch strategic places (POI) for the visible viewport
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return undefined;

    if (!showPOI) {
      if (poiLayerRef.current) poiLayerRef.current.clearLayers();
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      if (map.getZoom() < POI_MIN_ZOOM) {
        if (poiLayerRef.current) poiLayerRef.current.clearLayers();
        setPois([]);
        setPoiMessage(m.poiZoomHint);
        return;
      }

      const b = map.getBounds();
      const bounds = {
        south: b.getSouth(),
        west: b.getWest(),
        north: b.getNorth(),
        east: b.getEast(),
      };

      if (poiAbortRef.current) poiAbortRef.current.abort();
      const controller = new AbortController();
      poiAbortRef.current = controller;

      setIsLoadingPois(true);
      try {
        const results = await fetchNearbyPOIs(bounds, controller.signal);
        if (cancelled || controller.signal.aborted) return;
        setPois(results);
        setPoiMessage(results.length === 0 ? m.poiEmpty : "");
      } catch (err) {
        if (err.name === "AbortError") return;
        console.warn("POI fetch failed:", err.message);
        if (!cancelled) setPoiMessage(m.poiEmpty);
      } finally {
        if (!cancelled && !controller.signal.aborted) setIsLoadingPois(false);
      }
    };

    const schedule = () => {
      if (poiDebounceRef.current) clearTimeout(poiDebounceRef.current);
      poiDebounceRef.current = setTimeout(load, 700);
    };

    schedule();
    map.on("moveend", schedule);

    return () => {
      cancelled = true;
      map.off("moveend", schedule);
      if (poiDebounceRef.current) clearTimeout(poiDebounceRef.current);
      if (poiAbortRef.current) poiAbortRef.current.abort();
    };
  }, [showPOI, m]);

  // Render the fetched strategic places, filtered by category
  useEffect(() => {
    if (!poiLayerRef.current) return;
    poiLayerRef.current.clearLayers();
    if (!showPOI || pois.length === 0) return;

    const active = new Set(activePoiCats);
    pois
      .filter((poi) => active.has(poi.category))
      .forEach((poi) => {
        const cat = getCategory(poi.category);
        const label = poi.name || m[cat.labelKey] || cat.id;
        const icon = L.divIcon({
          className: "custom-poi-wrapper",
          html: `<div class="custom-poi-marker" style="background:${cat.color}">${cat.emoji}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          popupAnchor: [0, -12],
        });
        const marker = L.marker([poi.lat, poi.lon], { icon, title: label });
        marker.bindPopup(
          `<div class="text-xs text-zinc-900 font-sans py-0.5"><b>${escapeHtml(label)}</b><div class="text-[10px] text-slate-500">${cat.emoji} ${escapeHtml(
            m[cat.labelKey] || "",
          )}</div>${
            mode === "builder"
              ? `<button type="button" class="poi-via-btn mt-1 w-full px-2 py-1 rounded border-2 border-black bg-amber-300 font-black text-[10px] shadow-[2px_2px_0_#000] cursor-pointer">★ ${escapeHtml(
                  m.viaSet,
                )}</button>`
              : ""
          }</div>`,
        );
        marker.on("popupopen", (e) => {
          const btn = e.popup.getElement()?.querySelector(".poi-via-btn");
          if (btn && onSetVia) {
            btn.onclick = (ev) => {
              ev.preventDefault();
              playTactileSound("action");
              onSetVia({ lat: poi.lat, lng: poi.lon, name: poi.name });
              marker.closePopup();
            };
          }
        });
        poiLayerRef.current.addLayer(marker);
      });
  }, [pois, activePoiCats, showPOI, m, mode, onSetVia]);

  // Route Builder: Update Waypoints Markers
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    if (mode !== "builder") return;

    waypoints.forEach((pt, index) => {
      const isStart = index === 0;
      const isEnd = index === waypoints.length - 1 && waypoints.length > 1;

      let markerClass = "marker-mid";
      let label = `${index + 1}`;

      if (isStart) {
        markerClass = "marker-start";
        label = "S";
      } else if (isEnd) {
        markerClass = "marker-finish";
        label = "F";
      }

      const icon = L.divIcon({
        className: "custom-pin-wrapper",
        html: `
          <div class="custom-pin-marker ${markerClass} w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center font-bold text-xs select-none">
            ${label}
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([pt.lat, pt.lng], { icon, draggable: true });
      marker.on("dragend", (e) => {
        const ll = e.target.getLatLng();
        playTactileSound("action");
        onMoveWaypoint?.(index, { lat: ll.lat, lng: ll.lng });
      });
      marker.bindPopup(
        `<div class="text-xs text-zinc-900 font-sans py-0.5">
          <b>${isStart ? m.startMarker : isEnd ? m.finishMarker : `${m.waypoint} #${index + 1}`}</b>
          <div class="text-[10px] text-slate-500">${m.dragHint}</div>
        </div>`,
      );
      markersLayerRef.current.addLayer(marker);
    });
  }, [waypoints, mode, m, onMoveWaypoint]);

  // Route Builder: render the optional "must pass through" via-point marker.
  useEffect(() => {
    if (!viaLayerRef.current) return;
    viaLayerRef.current.clearLayers();
    if (mode !== "builder" || !viaPoint) return;

    const viaIcon = L.divIcon({
      className: "custom-pin-wrapper",
      html: `<div style="width:28px;height:28px;border-radius:9999px;background:#f59e0b;border:2px solid #000;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;box-shadow:2px 2px 0 #000">★</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    const marker = L.marker([viaPoint.lat, viaPoint.lng], {
      icon: viaIcon,
      zIndexOffset: 600,
    });
    marker.bindPopup(
      `<div class="text-xs text-zinc-900 font-sans py-0.5"><b>${escapeHtml(
        viaPoint.name || m.viaTitle,
      )}</b><div class="text-[10px] text-slate-500">${escapeHtml(
        m.viaActive,
      )}</div></div>`,
    );
    viaLayerRef.current.addLayer(marker);
  }, [viaPoint, mode, m]);

  // Route Builder: Render clean solid route polyline
  useEffect(() => {
    if (!routeLayerRef.current) return;
    routeLayerRef.current.clearLayers();

    if (mode !== "builder") return;

    if (
      routeGeojson &&
      routeGeojson.coordinates &&
      routeGeojson.coordinates.length > 0
    ) {
      // Clean, crisp solid line without neon glare
      const mainLayer = L.geoJSON(routeGeojson, {
        style: {
          color: activity === "ride" ? ROUTE_COLOR.ride : ROUTE_COLOR.default,
          weight: 4.5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
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
  }, [routeGeojson, waypoints.length, mode, activity]);

  // Free Run: Render clean live GPS polyline
  useEffect(() => {
    if (!liveRouteLayerRef.current || !liveMarkerLayerRef.current) return;
    liveRouteLayerRef.current.clearLayers();
    liveMarkerLayerRef.current.clearLayers();

    if (mode !== "freerun") return;

    const latLngs = liveCoordinates.map((c) => [c.lat, c.lng]);

    if (latLngs.length > 0) {
      // Start Marker
      const startCoord = latLngs[0];
      const startIcon = L.divIcon({
        className: "custom-pin-wrapper",
        html: `
          <div class="custom-pin-marker marker-start w-6 h-6 flex items-center justify-center font-bold text-xs">
            S
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      liveMarkerLayerRef.current.addLayer(
        L.marker(startCoord, { icon: startIcon }),
      );

      // Clean, crisp GPS track line
      if (latLngs.length >= 2) {
        const line = L.polyline(latLngs, {
          color: activity === "ride" ? TRACK_COLOR.ride : TRACK_COLOR.default,
          weight: 4.5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        });
        liveRouteLayerRef.current.addLayer(line);
      }

      // Latest User Position Marker (Clean dot)
      const latestCoord = latLngs[latLngs.length - 1];
      const liveUserIcon = L.divIcon({
        className: "custom-live-icon",
        html: `
          <div class="marker-live-user">
            <div class="marker-live-pulse"></div>
            <div class="marker-live-dot"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const userMarker = L.marker(latestCoord, {
        icon: liveUserIcon,
        zIndexOffset: 1000,
      });
      liveMarkerLayerRef.current.addLayer(userMarker);

      if (autoFollow && mapInstanceRef.current) {
        mapInstanceRef.current.panTo(latestCoord, {
          animate: true,
          duration: 0.5,
        });
      }
    }
  }, [liveCoordinates, mode, autoFollow, activity]);

  // Request Geolocation
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      alert(m.deniedNotice || "Geolokasi tidak didukung.");
      setShowLocationPrompt(false);
      return;
    }

    setIsLocating(true);
    setLocationNotice(m.promptSeeking);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setShowLocationPrompt(false);
        setLocationNotice("");

        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([userLat, userLng], 16, {
            duration: 1.2,
          });
          mapInstanceRef.current.invalidateSize();

          if (userLocLayerRef.current) {
            userLocLayerRef.current.clearLayers();
            const userIcon = L.divIcon({
              className: "custom-live-icon",
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
        console.warn("Geolocation error:", err.message);
        if (err.code === 1) {
          setLocationNotice(m.deniedNotice);
        } else {
          setLocationNotice(m.timeoutNotice);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const modeBadge =
    mode === "builder"
      ? activity === "ride"
        ? m.modeBikeRoute
        : m.modeRoadRun
      : activity === "ride"
        ? m.modeLiveRide
        : m.modeLiveGps;

  const visiblePoiCount = activePoiCats.length
    ? pois.reduce((n, p) => (activePoiCats.includes(p.category) ? n + 1 : n), 0)
    : 0;

  const selectBaseLayer = (id) => {
    playTactileSound("click");
    setManualBase(id);
  };

  const togglePoi = () => {
    playTactileSound("switch");
    const next = !showPOI;
    setShowPOI(next);
    if (!next) {
      setPois([]);
      setPoiMessage("");
    }
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
            <span className="text-sky-700 font-bold">{m.windowTitle}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border-2 border-black text-slate-900 font-black">
            {activity === "ride" && (
              <Bike className="w-3 h-3 text-orange-600" />
            )}
            {modeBadge}
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black animate-pulse" />
        </div>
      </div>

      {/* Map View Canvas Container */}
      <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[500px]">
        <div
          ref={mapContainerRef}
          className="w-full h-full"
          style={{ width: "100%", height: "100%" }}
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
                  playTactileSound("action");
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
        {mode === "builder" && isLoadingRoute && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1.5 bg-white border-2 border-black rounded-lg shadow-[3px_3px_0_#000000] flex items-center gap-2 text-[11px] font-mono font-black text-black">
            <div className="w-3 h-3 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
            <span>{m.snapping}</span>
          </div>
        )}

        {/* Empty Waypoint Guide */}
        {mode === "builder" &&
          waypoints.length === 0 &&
          !showLocationPrompt && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] pointer-events-none px-3 py-1.5 bg-white border-2 border-black rounded-lg shadow-[3px_3px_0_#000000] flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-800">
              <MapPin className="w-3.5 h-3.5 text-sky-600" />
              <span>{m.emptyBuilderGuide}</span>
            </div>
          )}

        {/* Free Run Banner */}
        {mode === "freerun" && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] px-3 py-1.5 bg-white border-2 border-black rounded-lg shadow-[3px_3px_0_#000000] flex items-center gap-2 text-[11px] font-mono font-bold text-black">
            <Radio
              className={`w-3.5 h-3.5 ${isLiveTracking ? "text-orange-600 animate-pulse" : "text-slate-500"}`}
            />
            <span>
              {isLiveTracking
                ? `${m.freeRunTracking} (${liveCoordinates.length})`
                : m.freeRunIdle}
            </span>
          </div>
        )}

        {/* POI status pill */}
        {showPOI && (isLoadingPois || poiMessage) && (
          <div className="absolute top-12 left-3 z-[999] max-w-[60%] px-2.5 py-1 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0_#000000] flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-800">
            {isLoadingPois ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-emerald-700 shrink-0" />
                <span className="truncate">{m.poiLoading}</span>
              </>
            ) : (
              <>
                <Landmark className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate">{poiMessage}</span>
              </>
            )}
          </div>
        )}

        {/* Floating Controls Top-Right */}
        <div
          ref={layersWrapRef}
          className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2"
        >
          <button
            type="button"
            onClick={() => {
              playTactileSound("click");
              handleRequestLocation();
            }}
            title={m.locateTitle}
            className="p-2 bg-white hover:bg-slate-100 text-black rounded-lg border-2 border-black shadow-[3px_3px_0_#000000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center cursor-pointer"
          >
            <Crosshair
              className={`w-4 h-4 ${isLocating ? "animate-spin text-orange-600" : "text-sky-700"}`}
            />
          </button>

          {mode === "builder" && activity === "ride" && (
            <button
              type="button"
              onClick={() => {
                playTactileSound("click");
                setIsBikePrefsOpen((v) => !v);
              }}
              title={m.bikePrefsTitle}
              className={`p-2 rounded-lg border-2 border-black shadow-[3px_3px_0_#000000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center cursor-pointer ${
                isBikePrefsOpen
                  ? "bg-orange-300"
                  : "bg-white hover:bg-slate-100"
              }`}
            >
              <Mountain className="w-4 h-4 text-orange-700" />
            </button>
          )}

          {mode === "builder" && viaPoint && (
            <button
              type="button"
              onClick={() => {
                playTactileSound("click");
                onClearVia?.();
              }}
              title={m.viaClear}
              className="p-2 rounded-lg border-2 border-black bg-amber-300 shadow-[3px_3px_0_#000000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center cursor-pointer"
            >
              <span className="text-sm leading-none font-black">★</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              playTactileSound("click");
              setIsLayersOpen((v) => !v);
            }}
            title={m.layersTitle}
            className={`p-2 rounded-lg border-2 border-black shadow-[3px_3px_0_#000000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center cursor-pointer ${
              isLayersOpen ? "bg-amber-200" : "bg-white hover:bg-slate-100"
            }`}
          >
            <Layers className="w-4 h-4 text-sky-700" />
          </button>

          <button
            type="button"
            onClick={togglePoi}
            title={showPOI ? m.poiToggleOff : m.poiToggleOn}
            className={`p-2 rounded-lg border-2 border-black shadow-[3px_3px_0_#000000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center cursor-pointer ${
              showPOI ? "bg-emerald-300" : "bg-white hover:bg-slate-100"
            }`}
          >
            {isLoadingPois ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-800" />
            ) : (
              <Landmark
                className={`w-4 h-4 ${showPOI ? "text-emerald-900" : "text-emerald-700"}`}
              />
            )}
          </button>

          {/* Layers & Places Panel */}
          {isLayersOpen && (
            <div className="w-[min(19rem,calc(100vw-1.5rem))] max-h-[300px] sm:max-h-[360px] overflow-y-auto bg-white border-2 border-black rounded-xl shadow-[4px_4px_0_#000000] p-3 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-black text-xs text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-700" />
                  {m.layersTitle}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playTactileSound("click");
                    setIsLayersOpen(false);
                  }}
                  aria-label="Tutup"
                  className="p-1 text-slate-600 hover:text-black rounded border border-black hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Base map styles */}
              <div className="flex flex-col gap-1">
                {BASE_LAYERS.map((cfg) => {
                  const selected = baseLayer === cfg.id;
                  return (
                    <button
                      key={cfg.id}
                      type="button"
                      onClick={() => selectBaseLayer(cfg.id)}
                      className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border-2 text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        selected
                          ? "bg-sky-200 border-black text-black shadow-[2px_2px_0_#000000]"
                          : "bg-white border-slate-300 text-slate-700 hover:border-black"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm leading-none">
                          {cfg.emoji}
                        </span>
                        <span className="truncate">{m[cfg.nameKey]}</span>
                      </span>
                      {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="border-t-2 border-slate-200 my-2.5" />

              {/* Strategic places (POI) */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-black text-xs text-slate-900 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-emerald-700" />
                  {m.poiTitle}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showPOI}
                  onClick={togglePoi}
                  className={`relative w-10 h-5 rounded-full border-2 border-black transition-colors cursor-pointer shrink-0 ${
                    showPOI ? "bg-emerald-400" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3.5 h-3.5 bg-white border border-black rounded-full transition-all ${
                      showPOI ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {m.poiHint}
              </p>

              {showPOI && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1">
                    {activePoiCats.length < POI_CATEGORIES.length && (
                      <button
                        type="button"
                        onClick={() => {
                          playTactileSound("click");
                          setActivePoiCats(POI_CATEGORIES.map((c) => c.id));
                        }}
                        className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border-2 border-black bg-white hover:bg-slate-100 shadow-[1px_1px_0_#000000] cursor-pointer"
                      >
                        {m.poiAll}
                      </button>
                    )}
                    {POI_CATEGORIES.map((cat) => {
                      const active = activePoiCats.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            playTactileSound("click");
                            setActivePoiCats((prev) =>
                              prev.includes(cat.id)
                                ? prev.filter((c) => c !== cat.id)
                                : [...prev, cat.id],
                            );
                          }}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border-2 transition-all cursor-pointer flex items-center gap-1 ${
                            active
                              ? "bg-amber-200 border-black text-black shadow-[1px_1px_0_#000000]"
                              : "bg-slate-100 border-slate-300 text-slate-500"
                          }`}
                        >
                          <span>{cat.emoji}</span>
                          <span>{m[cat.labelKey]}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-1.5 text-[10px] font-mono text-slate-600">
                    {isLoadingPois
                      ? m.poiLoading
                      : poiMessage
                        ? poiMessage
                        : `${visiblePoiCount} ${m.poiCount}`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bike Preferences Popover (rides only) */}
          {isBikePrefsOpen && mode === "builder" && activity === "ride" && (
            <div className="w-[min(17rem,calc(100vw-1.5rem))] bg-white border-2 border-black rounded-xl shadow-[4px_4px_0_#000000] p-3 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-black text-xs text-slate-900 flex items-center gap-1.5">
                  <Mountain className="w-3.5 h-3.5 text-orange-700" />
                  {m.bikePrefsTitle}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playTactileSound("click");
                    setIsBikePrefsOpen(false);
                  }}
                  aria-label="Tutup"
                  className="p-1 text-slate-600 hover:text-black rounded border border-black hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Avoid hills */}
              <div className="flex items-center justify-between gap-2">
                <span className="flex flex-col min-w-0">
                  <span className="font-mono font-bold text-[11px] text-slate-800">
                    {m.avoidHills}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    {m.avoidHillsHint}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!bikePrefs?.avoidHills}
                  onClick={() => {
                    playTactileSound("switch");
                    onChangeBikePrefs?.({
                      ...bikePrefs,
                      avoidHills: !bikePrefs?.avoidHills,
                    });
                  }}
                  className={`relative w-10 h-5 rounded-full border-2 border-black transition-colors cursor-pointer shrink-0 ${
                    bikePrefs?.avoidHills ? "bg-orange-400" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3.5 h-3.5 bg-white border border-black rounded-full transition-all ${
                      bikePrefs?.avoidHills ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="border-t-2 border-slate-200 my-2.5" />

              {/* Surface preference */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-[11px] text-slate-800">
                  {m.surfaceLabel}
                </span>
                <div className="flex gap-1">
                  {[
                    { id: "any", label: m.surfaceAny },
                    { id: "paved", label: m.surfacePaved },
                  ].map((s) => {
                    const active = (bikePrefs?.surface || "any") === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          playTactileSound("click");
                          onChangeBikePrefs?.({ ...bikePrefs, surface: s.id });
                        }}
                        className={`px-2 py-1 rounded-md border-2 text-[10px] font-mono font-black transition-all cursor-pointer ${
                          active
                            ? "bg-orange-200 border-black shadow-[2px_2px_0_#000000]"
                            : "bg-white border-slate-300 text-slate-600 hover:border-black"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Elevation Profile (rides only) */}
        {activity === "ride" &&
          !showLocationPrompt &&
          elevationData &&
          elevationData.points &&
          elevationData.points.length > 1 && (
            <div className="absolute bottom-11 left-2.5 z-[990] w-[232px] max-w-[70%] pointer-events-none bg-white border-2 border-black rounded-lg shadow-[3px_3px_0_#000000] px-2 pt-1.5 pb-1.5">
              <div className="flex items-center justify-between text-[9px] font-mono font-black text-slate-700 mb-0.5">
                <span className="flex items-center gap-1">
                  <Mountain className="w-3 h-3 text-emerald-700" />
                  {m.elevationTitle}
                </span>
                <span className="text-slate-500">
                  {elevationData.min}–{elevationData.max} m
                </span>
              </div>
              <svg
                viewBox="0 0 100 30"
                preserveAspectRatio="none"
                className="w-full h-8 block"
              >
                <path
                  d={`${buildElevationPath(elevationData.points, 100, 30)} L100,30 L0,30 Z`}
                  fill="#a7f3d0"
                  stroke="none"
                />
                <path
                  d={buildElevationPath(elevationData.points, 100, 30)}
                  fill="none"
                  stroke="#047857"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="flex items-center justify-between text-[8px] font-mono font-bold mt-0.5">
                <span className="text-emerald-700">
                  {m.elevationGain} +{elevationData.gain} m
                </span>
                <span className="text-slate-500">
                  {m.elevationLoss} −{elevationData.loss} m
                </span>
              </div>
            </div>
          )}

        {/* Mode & Status Badge Bottom-Left */}
        <div className="absolute bottom-2.5 left-2.5 z-[999] px-2.5 py-1 bg-white rounded-lg border-2 border-black text-[10px] text-black font-mono font-black shadow-[2px_2px_0_#000000] flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              mode === "freerun"
                ? isLiveTracking
                  ? "bg-orange-500 animate-ping"
                  : "bg-slate-400"
                : "bg-emerald-500"
            }`}
          />
          {activity === "ride" && (
            <span className="flex items-center gap-1 text-orange-700">
              <Bike className="w-3 h-3" />
              <span>RIDE</span>
            </span>
          )}
          <span>
            {mode === "freerun"
              ? `${liveCoordinates.length} ${m.gpsPointsUnit}`
              : `${waypoints.length} ${m.pointsUnit}`}
          </span>
          {showPOI && visiblePoiCount > 0 && (
            <>
              <span className="w-px h-3 bg-slate-300" />
              <span className="text-emerald-700">
                {visiblePoiCount} {m.poiCount}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
