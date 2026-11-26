/**
 * Keyless, zero-cost routing service.
 *
 * Primary  : Valhalla (valhalla1.openstreetmap.de) — the public OSM Valhalla
 *            instance. It supports real `pedestrian` and `bicycle` costing, so
 *            a run and a ride between the same points produce genuinely
 *            different routes. (The OSRM demo server only serves car routes,
 *            regardless of the profile name in the URL.)
 * Fallback : OSRM demo server (car profile) when Valhalla is unreachable.
 * Last try : straight-line (Haversine) connection between the waypoints.
 *
 * No API keys, no watermarks, no tracking.
 */

const VALHALLA_URL = "https://valhalla1.openstreetmap.de/route";
const VALHALLA_LOCATE_URL = "https://valhalla1.openstreetmap.de/locate";
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const REQUEST_TIMEOUT_MS = 12000;

/** Map a UI activity to a Valhalla costing model. */
export const ACTIVITY_COSTING = {
  run: "pedestrian",
  walk: "pedestrian",
  ride: "bicycle",
};

/**
 * Decode an encoded polyline as returned by Valhalla (precision 6 by default).
 * @param {string} encoded
 * @param {number} precision
 * @returns {Array<[number, number]>} [[lng, lat], ...]
 */
export function decodePolyline(encoded, precision = 6) {
  const coordinates = [];
  const factor = Math.pow(10, precision);
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let byte;
    let shift = 0;
    let result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push([lng / factor, lat / factor]);
  }

  return coordinates;
}

/** Append coordinates, skipping a duplicated junction point between legs. */
function appendUnique(target, coords) {
  for (let i = 0; i < coords.length; i++) {
    const c = coords[i];
    const last = target[target.length - 1];
    if (last && last[0] === c[0] && last[1] === c[1]) continue;
    target.push([c[0], c[1]]);
  }
}

/** Straight-line (Haversine) route used when every router is unavailable. */
function buildStraightLine(waypoints, error) {
  const coords = waypoints.map((p) => [p.lng, p.lat]);
  let distance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    distance += haversineDistance(waypoints[i], waypoints[i + 1]);
  }
  return {
    geojson: { type: "LineString", coordinates: coords },
    distance,
    coordinates: coords,
    isSnapped: false,
    error,
  };
}

/**
 * Build Valhalla `costing_options` for an activity. For bicycles we honour the
 * user's ride preferences: avoiding hills lowers `use_hills` (0 = avoid climbs,
 * 1 = allow), and preferring paved surfaces raises `avoid_bad_surfaces`
 * (0 = allow everything, 1 = avoid unpaved as much as possible). Ferries are
 * always disabled.
 */
function buildCostingOptions(costing, prefs = null) {
  const opts = { use_ferry: 0 };
  if (costing === "bicycle" && prefs) {
    if (typeof prefs.avoidHills === "boolean") {
      opts.use_hills = prefs.avoidHills ? 0.15 : 0.5;
    }
    if (prefs.surface === "paved") opts.avoid_bad_surfaces = 0.8;
    else if (prefs.surface === "any") opts.avoid_bad_surfaces = 0;
    if (prefs.bicycleType) opts.bicycle_type = prefs.bicycleType;
  }
  return opts;
}

/** Valhalla routing with a real pedestrian / bicycle / auto costing model. */
async function fetchValhallaRoute(waypoints, activity, prefs = null) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const costing = ACTIVITY_COSTING[activity] || "pedestrian";
  const payload = {
    locations: waypoints.map((p) => ({ lat: p.lat, lon: p.lng })),
    costing,
    // Ferries are almost never what a runner/cyclist wants and they turn an
    // off-road (e.g. water) waypoint into a nonsensical sea detour.
    costing_options: { [costing]: buildCostingOptions(costing, prefs) },
    directions_options: { units: "kilometers" },
  };

  const url = `${VALHALLA_URL}?json=${encodeURIComponent(JSON.stringify(payload))}`;

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Valhalla HTTP ${response.status}`);

    const data = await response.json();
    const trip = data?.trip;
    if (!trip || !Array.isArray(trip.legs) || trip.legs.length === 0) {
      throw new Error(data?.error || "Valhalla returned no route");
    }

    const coordinates = [];
    for (const leg of trip.legs) {
      if (leg.shape) appendUnique(coordinates, decodePolyline(leg.shape, 6));
    }
    if (coordinates.length < 2)
      throw new Error("Valhalla route geometry was empty");

    return {
      geojson: { type: "LineString", coordinates },
      distance: (trip.summary?.length || 0) * 1000, // km -> meters
      coordinates,
      isSnapped: true,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** OSRM demo-server fallback (car profile) — used only if Valhalla fails. */
async function fetchOsrmRoute(waypoints) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const coordsQuery = waypoints
    .map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`)
    .join(";");
  const url = `${OSRM_URL}/${coordsQuery}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);

    const data = await response.json();
    if (data.code !== "Ok" || !data.routes?.length) {
      throw new Error(data.message || "OSRM returned no route");
    }

    const best = data.routes[0];
    return {
      geojson: best.geometry,
      distance: best.distance,
      coordinates: best.geometry.coordinates,
      isSnapped: true,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch a road-snapped route for the given activity.
 * @param {Array<{lat: number, lng: number}>} waypoints
 * @param {'run'|'walk'|'ride'} activity
 * @param {{avoidHills?: boolean, surface?: 'any'|'paved', bicycleType?: string}} [prefs]
 * @returns {Promise<{geojson: any, distance: number, coordinates: [number, number][], isSnapped: boolean, error?: string}>}
 */
export async function fetchRoute(waypoints, activity = "run", prefs = null) {
  if (!waypoints || waypoints.length < 2) {
    return { geojson: null, distance: 0, coordinates: [], isSnapped: false };
  }

  try {
    return await fetchValhallaRoute(waypoints, activity, prefs);
  } catch (err) {
    console.warn(
      "Valhalla routing unavailable, trying OSRM fallback:",
      err.message,
    );
  }

  try {
    return await fetchOsrmRoute(waypoints);
  } catch (err) {
    console.warn(
      "OSRM routing unavailable, drawing straight connection:",
      err.message,
    );
    return buildStraightLine(waypoints, err.message);
  }
}

/**
 * Haversine formula to compute distance in meters between two lat/lng points.
 */
export function haversineDistance(p1, p2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
  const dLng = (p2.lng - p1.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * (Math.PI / 180)) *
      Math.cos(p2.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Snap locations onto the nearest road using Valhalla's `/locate` action.
 * Returns one `{ lat, lng }` per input (or `null` when no edge was found),
 * preserving order. The auto-route generator uses this so planned waypoints
 * never sit in water or off the network.
 */
export async function snapLocations(locations, activity = "run") {
  if (!locations || locations.length === 0) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const payload = {
    locations: locations.map((p) => ({ lat: p.lat, lon: p.lng })),
    costing: ACTIVITY_COSTING[activity] || "pedestrian",
  };
  const url = `${VALHALLA_LOCATE_URL}?json=${encodeURIComponent(JSON.stringify(payload))}`;

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok)
      throw new Error(`Valhalla locate HTTP ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data))
      throw new Error("Valhalla locate returned no data");

    return data.map((entry) => {
      const edge = entry?.edges?.[0];
      if (!edge || typeof edge.correlated_lat !== "number") return null;
      return { lat: edge.correlated_lat, lng: edge.correlated_lon };
    });
  } catch (err) {
    console.warn("Valhalla locate unavailable:", err.message);
    return locations.map(() => null);
  } finally {
    clearTimeout(timeoutId);
  }
}
