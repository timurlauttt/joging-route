/**
 * GPX exporter.
 *
 * Turns the current route into a standard GPX 1.1 track so it can be opened in
 * Strava, Garmin, Komoot, Google Earth, etc. Elevation is embedded for rides
 * (using the same ~30 m DEM profile shown on the map and share card) and
 * omitted for runs. No API keys, no server — purely client-side.
 */

/** Escape text for safe XML embedding. */
function xmlEscape(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
}

/**
 * Find the elevation nearest to a coordinate from the sampled profile.
 * @param {[number, number]} lngLat [lng, lat]
 * @param {Array<{lng:number, lat:number, elevation:number}>} points
 * @returns {number|null}
 */
function nearestElevation(lngLat, points) {
  if (!Array.isArray(points) || points.length === 0) return null;
  const [lng, lat] = lngLat;
  let best = points[0];
  let bestDist = Infinity;
  for (const p of points) {
    const dx = p.lng - lng;
    const dy = p.lat - lat;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return Number.isFinite(best?.elevation) ? best.elevation : null;
}

/**
 * Convert a timestamp to an ISO-8601 UTC string (GPX wants Zulu time).
 * @param {number} ms
 * @returns {string}
 */
function isoTime(ms) {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Build a GPX 1.1 document for a route.
 * @param {object} params
 * @param {string} [params.name]
 * @param {Array<[number, number]>} params.coordinates [[lng, lat], ...]
 * @param {null | {points: Array<{lng:number, lat:number, elevation:number}>}} [params.elevationData]
 * @returns {string} GPX XML
 */
export function buildGpx({
  name = "OnTrack Route",
  coordinates,
  elevationData,
}) {
  const coords = Array.isArray(coordinates) ? coordinates : [];
  if (coords.length < 2) return "";

  const trackName = xmlEscape(name || "OnTrack Route");
  const time = isoTime(Date.now());
  const points = elevationData?.points || null;

  const trkpts = coords
    .map((coord) => {
      const [lng, lat] = coord;
      const ele = points ? nearestElevation(coord, points) : null;
      const eleTag = ele == null ? "" : `<ele>${ele.toFixed(1)}</ele>`;
      return `      <trkpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}">${eleTag}</trkpt>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="OnTrack" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${trackName}</name>
    <time>${time}</time>
  </metadata>
  <trk>
    <name>${trackName}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}

/** Slugify a session title into a safe filename fragment. */
function slugify(value = "") {
  return (
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "ontrack-route"
  );
}

/**
 * Trigger a browser download of a GPX document.
 * @param {object} params
 * @param {string} params.name human-readable track name
 * @param {Array<[number, number]>} params.coordinates
 * @param {null | object} [params.elevationData]
 * @returns {boolean} whether a download was started
 */
export function downloadRouteGpx({ name, coordinates, elevationData }) {
  const xml = buildGpx({ name, coordinates, elevationData });
  if (!xml) return false;

  const blob = new Blob([xml], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(name || "ontrack-route")}.gpx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
