/**
 * Free, keyless elevation service.
 *
 * Primary  : AWS Terrain Tiles (Terrarium) — a ~30 m global DEM (SRTM / USGS
 *            3DEP / NED blend), keyless and CORS-enabled, decoded from PNG
 *            tiles directly in the browser. This replaces the old 90 m lookup
 *            for a ~3× finer climb profile.
 * Fallback : Open-Meteo Elevation API (Copernicus GLO-90) if the tiles cannot
 *            be fetched/decoded for any reason.
 *
 * Note: a literal Copernicus DEM GLO-30 is not available from a keyless,
 * CORS-enabled point API. To use it, self-host OpenTopoData configured with the
 * `copernicus-dem-30m` dataset and swap TERRARIUM source below.
 */

const TERRARIUM_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium";
const OPENTOPO_FALLBACK_URL = "https://api.open-meteo.com/v1/elevation";
const REQUEST_TIMEOUT_MS = 12000;
/** Max points per request (Open-Meteo fallback accepts up to 100). */
const MAX_SAMPLES = 90;
/** Keep tile fetches bounded for long routes (adaptive zoom picks the level). */
const MAX_TILES = 16;
const MAX_ZOOM = 13;
const MIN_ZOOM = 8;
/** Session cache so repeated elevation recomputes reuse fetched PNG tiles. */
const MAX_CACHED_TILES = 64;

/**
 * Evenly downsample a coordinate list, always keeping the first and last point.
 * @param {Array<[number, number]>} coordinates [[lng, lat], ...]
 * @param {number} max
 * @returns {Array<[number, number]>}
 */
export function sampleCoordinates(coordinates, max = MAX_SAMPLES) {
  if (!Array.isArray(coordinates) || coordinates.length <= max) {
    return coordinates || [];
  }
  const step = (coordinates.length - 1) / (max - 1);
  const sampled = [];
  for (let i = 0; i < max; i += 1) {
    sampled.push(coordinates[Math.round(i * step)]);
  }
  return sampled;
}

/**
 * Sum ascent/descent while ignoring sub-metre jitter (GPS/DEM noise).
 * @param {number[]} elevations
 * @param {number} threshold metres below which a delta is treated as noise
 * @returns {{gain: number, loss: number}}
 */
function accumulateGainLoss(elevations, threshold = 1) {
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < elevations.length; i += 1) {
    const delta = elevations[i] - elevations[i - 1];
    if (delta > threshold) gain += delta;
    else if (delta < -threshold) loss += -delta;
  }
  return { gain: Math.round(gain), loss: Math.round(loss) };
}

/**
 * Build an SVG polyline path for an elevation profile, normalised to the
 * given viewBox dimensions.
 * @param {Array<{elevation: number}>} points
 * @param {number} width
 * @param {number} height
 * @returns {string} an SVG path (e.g. "M0,20 L50,10 L100,25")
 */
export function buildElevationPath(points, width = 100, height = 30) {
  if (!points || points.length < 2) return "";
  const values = points.map((p) => p.elevation);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const stepX = width / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - 2 - ((p.elevation - min) / range) * (height - 4);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return `M${coords.join(" L")}`;
}

/** Convert sampled points into the public elevation-profile shape. */
function summarize(points) {
  const values = points.map((p) => p.elevation);
  const { gain, loss } = accumulateGainLoss(values);
  return {
    points,
    gain,
    loss,
    min: Math.round(Math.min(...values)),
    max: Math.round(Math.max(...values)),
  };
}

// ---------------------------------------------------------------------------
// Terrarium tile decoding
// ---------------------------------------------------------------------------

const tileCache = new Map();

/**
 * Map a lon/lat to its slippy-map tile and the pixel inside it, at zoom `z`.
 * @returns {{z:number, x:number, y:number, px:number, py:number}}
 */
function lonLatToTilePixel(lat, lng, z) {
  const n = 2 ** z;
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const xf = ((lng + 180) / 360) * n;
  const latRad = (clampedLat * Math.PI) / 180;
  const yf =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  let x = Math.floor(xf);
  let y = Math.floor(yf);
  x = ((x % n) + n) % n; // wrap longitude at the antimeridian
  y = Math.max(0, Math.min(n - 1, y));

  const px = Math.max(0, Math.min(255, Math.floor((xf - x) * 256)));
  const py = Math.max(0, Math.min(255, Math.floor((yf - y) * 256)));
  return { z, x, y, px, py };
}

/** Pick the highest zoom whose tile footprint stays within MAX_TILES. */
function chooseZoom(samples) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const c of samples) {
    const [lng, lat] = c;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  const lngSpan = Math.max(1e-6, maxLng - minLng);
  const latSpan = Math.max(1e-6, maxLat - minLat);

  for (let z = MAX_ZOOM; z >= MIN_ZOOM; z -= 1) {
    const n = 2 ** z;
    const xSpan = Math.ceil((lngSpan / 360) * n) + 1;
    const ySpan = Math.ceil((latSpan / 180) * n) + 1;
    if (xSpan * ySpan <= MAX_TILES) return z;
  }
  return MIN_ZOOM;
}

/** Fetch + decode a Terrarium PNG tile into a flat RGBA byte array. */
async function loadTile(z, x, y, signal) {
  const key = `${z}/${x}/${y}`;
  const cached = tileCache.get(key);
  if (cached) return cached;

  const response = await fetch(`${TERRARIUM_URL}/${z}/${x}/${y}.png`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(`Terrarium tile HTTP ${response.status}`);
  }

  if (typeof createImageBitmap !== "function") {
    throw new Error("createImageBitmap unavailable");
  }
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0);
  const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  bitmap.close?.();

  const tile = { width: bitmap.width, height: bitmap.height, data };

  if (tileCache.size >= MAX_CACHED_TILES) {
    const oldest = tileCache.keys().next().value;
    tileCache.delete(oldest);
  }
  tileCache.set(key, tile);
  return tile;
}

/** Decode a Terrarium pixel: elevation = (R*256 + G + B/256) − 32768. */
function decodeElevation(tile, px, py) {
  const idx = (py * tile.width + px) * 4;
  const r = tile.data[idx];
  const g = tile.data[idx + 1];
  const b = tile.data[idx + 2];
  return r * 256 + g + b / 256 - 32768;
}

/** Sample elevations for `samples` from Terrarium tiles (throws on failure). */
async function fetchTerrariumProfile(samples) {
  const zoom = chooseZoom(samples);
  const located = samples.map((c) => ({
    coord: c,
    t: lonLatToTilePixel(c[1], c[0], zoom),
  }));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const tiles = new Map();
    const keys = new Set(located.map(({ t }) => `${t.z}/${t.x}/${t.y}`));
    await Promise.all(
      [...keys].map(async (key) => {
        const [tz, tx, ty] = key.split("/").map(Number);
        tiles.set(key, await loadTile(tz, tx, ty, controller.signal));
      }),
    );

    return located.map(({ coord, t }) => {
      const tile = tiles.get(`${t.z}/${t.x}/${t.y}`);
      return {
        lng: coord[0],
        lat: coord[1],
        elevation: decodeElevation(tile, t.px, t.py),
      };
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Open-Meteo fallback (Copernicus GLO-90)
// ---------------------------------------------------------------------------

async function fetchOpenMeteoProfile(samples) {
  const latitudes = samples.map((c) => c[1].toFixed(5)).join(",");
  const longitudes = samples.map((c) => c[0].toFixed(5)).join(",");
  const url = `${OPENTOPO_FALLBACK_URL}?latitude=${latitudes}&longitude=${longitudes}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Elevation HTTP ${response.status}`);

    const data = await response.json();
    const elevations = data?.elevation;
    if (!Array.isArray(elevations) || elevations.length === 0) return null;

    return summarize(
      samples.map((c, i) => ({
        lng: c[0],
        lat: c[1],
        elevation: Number(elevations[i] ?? 0),
      })),
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch a sampled elevation profile for a route/track.
 *
 * Uses ~30 m Terrarium tiles first (keyless, CORS), falling back to the
 * Copernicus GLO-90 Open-Meteo API if tiles can't be decoded.
 *
 * @param {Array<[number, number]>} coordinates [[lng, lat], ...]
 * @returns {Promise<null | {points: Array<{lng:number, lat:number, elevation:number}>, gain:number, loss:number, min:number, max:number}>}
 */
export async function fetchElevationProfile(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const samples = sampleCoordinates(coordinates, MAX_SAMPLES);

  try {
    const points = await fetchTerrariumProfile(samples);
    if (points && points.length) return summarize(points);
  } catch (err) {
    console.warn(
      "Terrarium elevation failed, falling back to Open-Meteo (GLO-90):",
      err.message,
    );
  }

  return fetchOpenMeteoProfile(samples);
}
