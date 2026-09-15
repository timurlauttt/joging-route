/**
 * OSRM (Open Source Routing Machine) Service
 * Foot-walking profile
 */

/**
 * Fetch walking route from OSRM
 * @param {Array<{lat: number, lng: number}>} waypoints 
 * @returns {Promise<{geojson: any, distance: number, coordinates: [number, number][]}>}
 */
export async function fetchWalkingRoute(waypoints) {
  if (!waypoints || waypoints.length < 2) {
    return { geojson: null, distance: 0, coordinates: [] };
  }

  // Format: lng1,lat1;lng2,lat2;...
  const coordsQuery = waypoints
    .map((point) => `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`)
    .join(';');

  const url = `https://router.project-osrm.org/route/v1/walking/${coordsQuery}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const bestRoute = data.routes[0];
      return {
        geojson: bestRoute.geometry,
        distance: bestRoute.distance, // in meters
        coordinates: bestRoute.geometry.coordinates, // [[lng, lat], ...]
        isSnapped: true,
      };
    } else {
      throw new Error(data.message || 'Route not found by OSRM');
    }
  } catch (err) {
    console.warn('OSRM routing failed, falling back to straight-line connection:', err.message);
    
    // Fallback: create straight-line coordinates & approximate distance using Haversine
    const coords = waypoints.map(p => [p.lng, p.lat]);
    let fallbackDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      fallbackDistance += haversineDistance(waypoints[i], waypoints[i + 1]);
    }

    return {
      geojson: {
        type: 'LineString',
        coordinates: coords,
      },
      distance: fallbackDistance,
      coordinates: coords,
      isSnapped: false,
      error: err.message,
    };
  }
}

/**
 * Haversine formula to compute distance in meters between two lat/lng points
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
