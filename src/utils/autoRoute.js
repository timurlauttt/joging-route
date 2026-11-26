/**
 * Automatic route generation by target distance.
 *
 * Given a start point and a desired distance, we build a closed loop of
 * waypoints around that start and let the existing keyless router
 * (`./routing`, Valhalla pedestrian/bicycle) snap it to real roads. Because
 * roads rarely match a perfect circle, we iteratively rescale the loop radius
 * until the routed distance lands close to the requested target.
 *
 * No API keys, no server, everything runs against the public OSM routers that
 * the rest of the app already uses.
 */

import { fetchRoute } from "./routing";

/** Distance templates offered in the UI (kilometers). */
export const DISTANCE_PRESETS_KM = [3, 5, 10, 15, 20, 25, 30, 35, 50];

const EARTH_RADIUS_M = 6371000;
const SEGMENTS = 6; // hexagonal loop — enough detail, few enough routing calls
const MAX_ITERATIONS = 3; // how many times we rescale before accepting the best
const TOLERANCE = 0.06; // stop early within ±6% of the target distance

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

/**
 * Geodesic destination point: given a start, a bearing and a distance, returns
 * the { lat, lng } reached.
 */
export function destinationPoint(lat, lng, bearingDeg, distanceMeters) {
  const angular = distanceMeters / EARTH_RADIUS_M;
  const bearing = toRad(bearingDeg);
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) +
      Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: toDeg(lat2), lng: ((toDeg(lng2) + 540) % 360) - 180 };
}

/**
 * Build a closed hexagonal loop that starts and ends near `start`.
 * The loop is a circle offset north of the start so that it passes through the
 * start point, giving a natural "leave home and come back" shape.
 */
function buildLoop(start, radiusMeters, segments = SEGMENTS) {
  const center = destinationPoint(start.lat, start.lng, 0, radiusMeters);
  const waypoints = [];

  for (let i = 0; i <= segments; i++) {
    const bearing = 180 + (360 / segments) * i;
    waypoints.push(
      destinationPoint(center.lat, center.lng, bearing, radiusMeters),
    );
  }

  // The first and last vertices coincide (a perfect circle). Routers dislike
  // duplicated consecutive locations, so we nudge the closing point slightly
  // inward — leaving a tiny, visually negligible gap.
  const first = waypoints[0];
  const last = waypoints[waypoints.length - 1];
  if (last.lat === first.lat && last.lng === first.lng) {
    // Leave a tiny (~25 m) fixed gap so the router never sees two identical
    // consecutive locations.
    waypoints[waypoints.length - 1] = destinationPoint(
      start.lat,
      start.lng,
      0,
      25,
    );
  }

  return { waypoints, center };
}

/**
 * Generate a road-snapped loop route of approximately `targetMeters`.
 *
 * @param {{lat:number, lng:number}} start
 * @param {number} targetMeters
 * @param {'run'|'walk'|'ride'} activity
 * @param {(step:number, total:number) => void} [onProgress]
 * @returns {Promise<{waypoints: Array<{lat:number,lng:number}>, distance:number, route:any}>}
 */
export async function generateRouteByDistance(
  start,
  targetMeters,
  activity = "run",
  onProgress,
) {
  if (!start || !targetMeters || targetMeters <= 0) {
    throw new Error("Invalid auto-route parameters");
  }

  // A circle's circumference is 2πR, so start with R = target / 2π.
  let radius = targetMeters / (2 * Math.PI);
  let best = null;

  for (let step = 0; step < MAX_ITERATIONS; step++) {
    const { waypoints } = buildLoop(start, radius);
    if (onProgress) onProgress(step + 1, MAX_ITERATIONS);

    let route;
    try {
      route = await fetchRoute(waypoints, activity);
    } catch (err) {
      if (best) break;
      throw err;
    }

    if (
      !route ||
      !route.coordinates ||
      route.coordinates.length < 2 ||
      !route.distance
    ) {
      if (best) break;
      continue;
    }

    const errorRatio = Math.abs(route.distance - targetMeters) / targetMeters;
    if (!best || errorRatio < best.errorRatio) {
      best = { waypoints, route, distance: route.distance, errorRatio };
    }

    if (errorRatio <= TOLERANCE) break;
    radius = radius * (targetMeters / route.distance);
  }

  if (!best) throw new Error("Auto-route generation failed");
  return best;
}

/** Promise wrapper around the browser Geolocation API. */
export function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...(options || {}),
      },
    );
  });
}
