/**
 * Automatic route generation by target distance.
 *
 * Given a start point and a desired distance, we build a loop that passes
 * THROUGH the start (the start is a vertex on the loop's perimeter, not a hub
 * in the middle), snap every vertex onto the real road network with Valhalla's
 * `/locate` action, and then route the closed loop.
 *
 * Placing the start on the perimeter is what keeps the result a genuine loop:
 * there is no spoke running from the centre out to the ring, so no branch ever
 * sticks out of the loop.
 *
 * Even so, a snapped vertex can land on a side street / dead-end that pokes out
 * of the loop, and the router then has to run out to it and back — a visible
 * "branch". So after routing we:
 *   1. prune every out-and-back (retraced) excursion from the geometry, and
 *   2. resample the control points from the *cleaned* loop, guaranteeing each
 *      waypoint sits on the loop itself (no marker floating off the route).
 *
 * Because roads rarely match a perfect circle, the routed distance is not a
 * smooth function of the loop radius. So instead of a single scaling guess we
 * probe a geometric grid of radii, keep the closest loop, then refine it.
 *
 * No API keys, no server, everything runs against the public OSM routers that
 * the rest of the app already uses.
 */

import { fetchRoute, haversineDistance, snapLocations } from "./routing";

/** Distance templates offered in the UI (kilometers). */
export const DISTANCE_PRESETS_KM = [3, 5, 10, 15, 20, 25, 30, 35, 50];

const EARTH_RADIUS_M = 6371000;
const SEGMENTS = 6; // loop vertices generated around the centre
const GRID_SAMPLES = 6; // candidate loop radii probed per generation
const REFINE_STEPS = 2; // extra radius-scaling passes after the grid
const TOLERANCE = 0.06; // stop early within ±6% of the target distance
const MAX_SNAP_METERS = 350; // a vertex that must move farther is water/off-road
const MIN_RADIUS_METERS = 60;
const MIN_STEP_METERS = 1;

// Error code thrown when a user-forced direction has no routable road (e.g. it
// points out to sea). The modal turns this into a friendly message.
export const DIRECTION_OFFROAD = "DIRECTION_OFFROAD";

// How many distinct loop options the generator offers per run.
const MAX_OPTIONS = 3;
// Two options closer than this in distance are treated as the same loop.
const OPTION_MIN_DELTA_M = 120;
// Extra radii probed around the winner so options cluster near the target.
const VARIETY_FACTORS = [0.9, 1.1];

// A closed excursion narrower than this reads as an out-and-back spur rather
// than a real sub-loop; the return leg hugs the outbound leg within this many
// metres, so we can safely cut it out.
const SPUR_RETRACE_METERS = 25;
const MIN_LOOP_POINTS = 4;

// Control points handed back to the app: they become the on-map markers and are
// re-routed. Keep them on the loop and evenly spread, but never exceed the
// public Valhalla cap of 10 route locations per request (the closing point
// counts as one), otherwise the app's re-route is rejected with HTTP 400.
const MAX_ROUTE_LOCATIONS = 10;
const WAYPOINT_SPACING_M = 500;
const MIN_WAYPOINTS = 6;
const MAX_WAYPOINTS = MAX_ROUTE_LOCATIONS - 1;

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;
const toLatLng = (coord) => ({ lat: coord[1], lng: coord[0] });

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

/** Initial bearing (degrees, 0 = north) from `from` to `to`. */
function bearingBetween(from, to) {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Ring of `segments` points placed on a circle that passes through `start`.
 *
 * The circle's centre sits `radius` away from the start in direction `dir`, so
 * vertex 0 lands exactly on the start and the polygon
 * `start → v1 → … → v(n-1) → start` is a clean closed loop whose start is on
 * the perimeter.
 */
function buildRing(start, dir, radius, segments = SEGMENTS) {
  const center = destinationPoint(start.lat, start.lng, dir, radius);
  const points = [];
  for (let i = 0; i < segments; i++) {
    points.push(
      destinationPoint(
        center.lat,
        center.lng,
        dir + 180 + (360 / segments) * i,
        radius,
      ),
    );
  }
  return points;
}

/**
 * Pick the outward direction whose loop centre lands closest to a real road,
 * so the loop is aimed toward land instead of out to sea. `angleOffset` rotates
 * the probe set (Auto "regenerate" nudges it to explore another direction).
 */
async function chooseDirection(start, radius, activity, angleOffset = 0) {
  const dirs = [0, 45, 90, 135, 180, 225, 270, 315].map(
    (d) => (d + angleOffset) % 360,
  );
  const probes = dirs.map((d) =>
    destinationPoint(start.lat, start.lng, d, radius),
  );

  let located;
  try {
    located = await snapLocations(probes, activity);
  } catch {
    return 0;
  }

  let bestDir = dirs[0];
  let bestMove = Infinity;
  located.forEach((snapped, i) => {
    if (!snapped) return;
    const move = haversineDistance(probes[i], snapped);
    if (move < bestMove) {
      bestMove = move;
      bestDir = dirs[i];
    }
  });
  return bestDir;
}

/** Drop consecutive points closer than `minMeters` (routers dislike duplicates). */
function dropTinySteps(points, minMeters = MIN_STEP_METERS) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && haversineDistance(last, p) < minMeters) continue;
    out.push(p);
  }
  return out;
}

/** Stable key for a `[lng, lat]` pair (~0.1 m resolution). */
const pointKey = (coord) =>
  `${Math.round(coord[0] * 1e6)},${Math.round(coord[1] * 1e6)}`;

/**
 * True when the closed excursion `coords[start..end]` retraces itself — i.e.
 * the outbound half and the return half run over the same ground — which is the
 * signature of an out-and-back spur rather than a genuine sub-loop.
 */
function isRetrace(coords, start, end, toleranceM) {
  const half = Math.floor((end - start) / 2);
  for (let k = 0; k <= half; k++) {
    if (
      haversineDistance(
        toLatLng(coords[start + k]),
        toLatLng(coords[end - k]),
      ) > toleranceM
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Remove out-and-back spurs from a routed polyline.
 *
 * Repeatedly finds the innermost retraced excursion (a point visited twice with
 * a mirrored path in between) and cuts it out, leaving the point once. The
 * outer closure of the loop is never removed because it is not a retrace.
 * Falls back to the original geometry if pruning would eat most of the loop.
 */
function pruneSpurs(coords, toleranceM = SPUR_RETRACE_METERS) {
  if (!coords || coords.length < MIN_LOOP_POINTS) return coords;

  const original = coords;
  let pts = coords.slice();
  let guard = 0;

  while (guard++ < 500) {
    const firstSeen = new Map();
    let removed = false;

    for (let i = 0; i < pts.length; i++) {
      const key = pointKey(pts[i]);
      const start = firstSeen.get(key);
      if (start === undefined) {
        firstSeen.set(key, i);
        continue;
      }
      if (i - start >= 2 && isRetrace(pts, start, i, toleranceM)) {
        // Keep pts[start]; drop the excursion body between the two visits.
        pts = pts.slice(0, start + 1).concat(pts.slice(i + 1));
        removed = true;
        break;
      }
    }

    if (!removed) break;
  }

  if (pts.length < MIN_LOOP_POINTS || pts.length < original.length * 0.5) {
    return original;
  }
  return pts;
}

/** Total on-ground length of a `[lng, lat]` polyline, in metres. */
function loopLength(coords) {
  let distance = 0;
  for (let i = 1; i < coords.length; i++) {
    distance += haversineDistance(toLatLng(coords[i - 1]), toLatLng(coords[i]));
  }
  return distance;
}

/** How many control points to spread around a loop of `lengthM` metres. */
function waypointCount(lengthM) {
  const n = Math.round(lengthM / WAYPOINT_SPACING_M);
  return Math.min(MAX_WAYPOINTS, Math.max(MIN_WAYPOINTS, n));
}

/**
 * Pick `count` evenly-spaced points along a closed polyline, starting at the
 * first vertex and finishing back on it so the loop stays closed.
 */
function resampleLoop(coords, count) {
  const pts = coords.map(toLatLng);
  if (pts.length < 2) return pts;

  const cumulative = [0];
  for (let i = 1; i < pts.length; i++) {
    cumulative.push(cumulative[i - 1] + haversineDistance(pts[i - 1], pts[i]));
  }
  const total = cumulative[cumulative.length - 1];
  if (total <= 0) return pts;

  const picks = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const target = (total * k) / count;
    while (j < cumulative.length - 1 && cumulative[j] < target) j++;
    const p = pts[j];
    // Consecutive samples can land on the same vertex; keep only one.
    if (
      picks.length === 0 ||
      haversineDistance(picks[picks.length - 1], p) >= MIN_STEP_METERS
    ) {
      picks.push(p);
    }
  }

  // Drop a trailing near-duplicate of the start, then close the loop on it.
  if (
    picks.length >= 2 &&
    haversineDistance(picks[0], picks[picks.length - 1]) < MIN_STEP_METERS
  ) {
    picks.pop();
  }
  if (picks.length > 0) picks.push(picks[0]);
  return picks;
}

/** Tiny deterministic PRNG so "regenerate" yields a fresh, repeatable set. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Candidate loop radii for a target distance: a geometric spread from the
 * minimum radius up to a little beyond the "perfect circle" radius.
 *
 * The routed distance is NOT a smooth function of the radius — roads force
 * detours that jump around as the ring grows — so we probe several radii and
 * keep whichever land closest to the target instead of trusting a single
 * scaling step. A non-zero `attempt` (the "regenerate" counter) nudges the
 * samples so each press probes a different set of roads.
 */
function candidateRadii(targetMeters, attempt = 0) {
  const nominal = targetMeters / (2 * Math.PI);
  const hi = Math.max(nominal * 1.4, MIN_RADIUS_METERS * 3);
  const lo = MIN_RADIUS_METERS;
  const wobble = mulberry32(attempt * 2654435761 + 1);
  const radii = [];
  for (let i = 0; i < GRID_SAMPLES; i++) {
    const t = i / (GRID_SAMPLES - 1);
    const base = lo * Math.pow(hi / lo, t);
    const factor = attempt > 0 ? 1 + (wobble() - 0.5) * 0.5 : 1;
    radii.push(Math.min(hi * 1.15, Math.max(lo, base * factor)));
  }
  return radii;
}

/**
 * Route one candidate ring, prune any branches and measure how close it lands
 * to the target. Returns a candidate object, or `null` when the ring cannot be
 * routed.
 */
async function routeRing(
  radius,
  ringPts,
  located,
  targetMeters,
  activity,
  prefs = null,
  via = null,
) {
  let shrunk = false;
  const ring = ringPts.map((pt, i) => {
    const snapped = located ? located[i] : null;
    if (!snapped) return pt;
    if (haversineDistance(pt, snapped) > MAX_SNAP_METERS) shrunk = true;
    return snapped;
  });

  // Force the loop through a via-point by swapping the nearest non-start vertex
  // with it. Swapping (rather than inserting a spur) keeps the polygon simple,
  // so the loop still closes cleanly and pruneSpurs leaves it intact.
  if (via) {
    let bestIdx = 1;
    let bestDist = Infinity;
    for (let i = 1; i < ring.length; i++) {
      const d = haversineDistance(ring[i], via);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    ring[bestIdx] = { lat: via.lat, lng: via.lng };
  }

  // Closed loop: the final vertex repeats the first (the start).
  const guide = dropTinySteps([...ring, ring[0]]);
  if (guide.length < 3) return null;

  let raw;
  try {
    raw = await fetchRoute(guide, activity, prefs);
  } catch {
    return null;
  }

  if (!raw || !raw.coordinates || raw.coordinates.length < 2) {
    return null;
  }

  // Cut out any branch and re-anchor everything to the clean loop.
  const pruned = pruneSpurs(raw.coordinates);
  const cleanCoords =
    pruned.length >= MIN_LOOP_POINTS ? pruned : raw.coordinates;
  const distance = loopLength(cleanCoords) || raw.distance || 0;
  const errorRatio =
    targetMeters > 0 ? Math.abs(distance - targetMeters) / targetMeters : 1;

  let waypoints = resampleLoop(cleanCoords, waypointCount(distance));
  if (waypoints.length < 3) {
    waypoints = resampleLoop(cleanCoords, MIN_WAYPOINTS);
  }

  return {
    waypoints,
    route: {
      ...raw,
      geojson: { type: "LineString", coordinates: cleanCoords },
      coordinates: cleanCoords,
      distance,
    },
    distance,
    errorRatio,
    clean: !shrunk,
    radius,
  };
}

/** Prefer a loop with no far snaps; break ties by the smallest distance error. */
function pickBetter(current, candidate) {
  if (!candidate) return current;
  if (!current) return candidate;
  if (candidate.clean && !current.clean) return candidate;
  if (
    candidate.clean === current.clean &&
    candidate.errorRatio < current.errorRatio
  ) {
    return candidate;
  }
  return current;
}

/**
 * Reduce the evaluated pool to up to `max` visually distinct options, best
 * first (a clean loop beats a snapped-far one, then the closest distance).
 * Options whose distance is within `minDelta` of one already chosen are
 * treated as duplicates, and options that miss the target far worse than the
 * winner are dropped so we never offer an obviously bad loop.
 */
function selectOptions(pool, max = MAX_OPTIONS, minDelta = OPTION_MIN_DELTA_M) {
  const ranked = pool.slice().sort((a, b) => {
    if (a.clean !== b.clean) return a.clean ? -1 : 1;
    return a.errorRatio - b.errorRatio;
  });
  const bestError = ranked[0]?.errorRatio ?? 0;
  // Keep options within a generous band of the winner's error. If the winner is
  // already far off (sparse road data), the band widens so alternatives show.
  const band = Math.max(bestError * 1.8, bestError + 0.15);
  const viable = ranked.filter((c) => c.errorRatio <= band);

  const chosen = [];
  for (const cand of viable) {
    if (chosen.length >= max) break;
    if (!chosen.some((c) => Math.abs(c.distance - cand.distance) < minDelta)) {
      chosen.push(cand);
    }
  }
  // If that left us short, top up with the next-best remaining near-target
  // loops (still from the banded pool, so quality stays bounded).
  for (const cand of viable) {
    if (chosen.length >= max) break;
    if (!chosen.includes(cand)) chosen.push(cand);
  }
  return chosen;
}

/** Score how many of a ring's vertices actually land on a road. */
async function directionIsViable(start, bearing, radius, activity) {
  const ring = buildRing(start, bearing, radius, SEGMENTS);
  let located;
  try {
    located = await snapLocations(ring, activity);
  } catch {
    return true; // cannot tell — don't block the user
  }
  let good = 0;
  located.forEach((snapped, i) => {
    if (snapped && haversineDistance(ring[i], snapped) <= MAX_SNAP_METERS) {
      good += 1;
    }
  });
  return good >= Math.ceil(ring.length / 2);
}

/**
 * Decide the loop direction: an explicit bearing (validated first) or the auto
 * probe. A forced direction with no routable road throws DIRECTION_OFFROAD.
 */
async function resolveDirection(
  start,
  targetMeters,
  activity,
  bearing,
  attempt = 0,
) {
  const radius = Math.max(targetMeters / (2 * Math.PI), MIN_RADIUS_METERS);
  if (Number.isFinite(bearing)) {
    const viable = await directionIsViable(start, bearing, radius, activity);
    if (!viable) {
      const err = new Error("No road in the chosen direction");
      err.code = DIRECTION_OFFROAD;
      throw err;
    }
    return bearing;
  }
  // Auto: rotate the probe set a little on each regenerate so the loop can
  // settle on a different, still road-friendly direction.
  const angleOffset = (attempt * 22.5) % 360;
  return chooseDirection(start, radius, activity, angleOffset);
}

/**
 * Generate road-snapped loop route options of approximately `targetMeters`.
 *
 * @param {{lat:number, lng:number}} start
 * @param {number} targetMeters
 * @param {'run'|'walk'|'ride'} activity
 * @param {(step:number, total:number) => void} [onProgress]
 * @param {{bearing?: number|null, attempt?: number, prefs?: object|null, via?: {lat:number,lng:number}|null}} [options]
 * @returns {Promise<{options: Array, bearing: number}>}
 */
export async function generateRouteOptions(
  start,
  targetMeters,
  activity = "run",
  onProgress,
  options = {},
) {
  const { bearing = null, attempt = 0, prefs = null, via = null } = options;
  if (!start || !targetMeters || targetMeters <= 0) {
    throw new Error("Invalid auto-route parameters");
  }

  // Snap the optional via-point onto the road network once up-front.
  let viaSnapped = null;
  if (via) {
    try {
      const located = await snapLocations([via], activity);
      viaSnapped = located[0] || null;
    } catch {
      viaSnapped = null;
    }
  }

  // Aim the loop toward land (auto) or validate the forced direction. When a
  // via-point is supplied with no forced direction, aim straight at it.
  let dir;
  if (viaSnapped && !Number.isFinite(bearing)) {
    dir = bearingBetween(start, viaSnapped);
  } else {
    dir = await resolveDirection(
      start,
      targetMeters,
      activity,
      bearing,
      attempt,
    );
  }

  const radii = candidateRadii(targetMeters, attempt);
  const totalSteps = radii.length + REFINE_STEPS + VARIETY_FACTORS.length;
  const pool = [];

  // Snap every candidate ring up-front in a single /locate request.
  const rings = radii.map((r) => buildRing(start, dir, r));
  const locatedFlat = await snapLocations(rings.flat(), activity);

  let best = null;
  for (let i = 0; i < radii.length; i++) {
    if (onProgress) onProgress(i + 1, totalSteps);
    const located = locatedFlat.slice(i * SEGMENTS, (i + 1) * SEGMENTS);
    const cand = await routeRing(
      radii[i],
      rings[i],
      located,
      targetMeters,
      activity,
      prefs,
      viaSnapped,
    );
    if (cand) {
      pool.push(cand);
      best = pickBetter(best, cand);
    }
  }

  // Refine the winner by scaling its radius toward the target.
  for (let i = 0; i < REFINE_STEPS && best; i++) {
    if (best.errorRatio <= TOLERANCE) break;
    const nextRadius = Math.max(
      best.radius * (targetMeters / best.distance),
      MIN_RADIUS_METERS,
    );
    if (onProgress) onProgress(radii.length + i + 1, totalSteps);
    const ringPts = buildRing(start, dir, nextRadius);
    const located = await snapLocations(ringPts, activity);
    const cand = await routeRing(
      nextRadius,
      ringPts,
      located,
      targetMeters,
      activity,
      prefs,
      viaSnapped,
    );
    if (cand) {
      pool.push(cand);
      best = pickBetter(best, cand);
    }
  }

  if (pool.length === 0) throw new Error("Auto-route generation failed");

  // Variety pass: probe a couple of radii around the winner so the user gets
  // several near-target loops to choose from (roads make the distance jumpy,
  // so nearby radii often yield visibly different shapes at a similar length).
  if (best) {
    const probeRadii = VARIETY_FACTORS.map((f) =>
      Math.max(MIN_RADIUS_METERS, best.radius * f),
    );
    const probeRings = probeRadii.map((r) => buildRing(start, dir, r));
    probeRadii.forEach((_, i) => {
      if (onProgress)
        onProgress(radii.length + REFINE_STEPS + i + 1, totalSteps);
    });
    const probeLocated = await snapLocations(probeRings.flat(), activity);
    for (let i = 0; i < probeRadii.length; i++) {
      const cand = await routeRing(
        probeRadii[i],
        probeRings[i],
        probeLocated.slice(i * SEGMENTS, (i + 1) * SEGMENTS),
        targetMeters,
        activity,
        prefs,
        viaSnapped,
      );
      if (cand) pool.push(cand);
    }
  }

  return { options: selectOptions(pool), bearing: dir };
}

/**
 * Backwards-compatible single-result helper: returns the best loop option.
 */
export async function generateRouteByDistance(
  start,
  targetMeters,
  activity = "run",
  onProgress,
  options = {},
) {
  const { options: opts } = await generateRouteOptions(
    start,
    targetMeters,
    activity,
    onProgress,
    options,
  );
  return opts[0];
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
