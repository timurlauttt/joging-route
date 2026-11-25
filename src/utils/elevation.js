/**
 * Free, keyless elevation service.
 *
 * Uses the Open-Meteo Elevation API (Copernicus DEM GLO-90) — no API key, no
 * watermark, no tracking. Returns a sampled elevation profile plus total ascent
 * and descent so rides can show Strava-style climb data and include it on the
 * exported share card.
 */

const ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";
const REQUEST_TIMEOUT_MS = 12000;
/** Max points per request (the free API accepts up to 100). */
const MAX_SAMPLES = 90;

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

/**
 * Fetch a sampled elevation profile for a route/track.
 * @param {Array<[number, number]>} coordinates [[lng, lat], ...]
 * @returns {Promise<null | {points: Array<{lng:number, lat:number, elevation:number}>, gain:number, loss:number, min:number, max:number}>}
 */
export async function fetchElevationProfile(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const samples = sampleCoordinates(coordinates, MAX_SAMPLES);
  const latitudes = samples.map((c) => c[1].toFixed(5)).join(",");
  const longitudes = samples.map((c) => c[0].toFixed(5)).join(",");
  const url = `${ELEVATION_URL}?latitude=${latitudes}&longitude=${longitudes}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Elevation HTTP ${response.status}`);

    const data = await response.json();
    const elevations = data?.elevation;
    if (!Array.isArray(elevations) || elevations.length === 0) return null;

    const points = samples.map((c, i) => ({
      lng: c[0],
      lat: c[1],
      elevation: Number(elevations[i] ?? 0),
    }));
    const values = points.map((p) => p.elevation);
    const { gain, loss } = accumulateGainLoss(values);

    return {
      points,
      gain,
      loss,
      min: Math.round(Math.min(...values)),
      max: Math.round(Math.max(...values)),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
