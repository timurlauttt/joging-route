/**
 * Strategic Places (POI) overlay service.
 *
 * Queries the free, keyless Overpass API (OpenStreetMap) for points of interest
 * inside the current map viewport and groups them into a handful of "strategic
 * place" categories — hotels, city squares (alun-alun), transit hubs, food,
 * shopping, health, sport/parks and landmarks.
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const REQUEST_TIMEOUT_MS = 20000;
const MAX_RESULTS = 220;

/** Minimum zoom level before POI queries are worth running. */
export const POI_MIN_ZOOM = 14;

/** Category catalogue: id, localized label key, emoji glyph and marker color. */
export const POI_CATEGORIES = [
  { id: 'lodging', labelKey: 'catLodging', emoji: '🏨', color: '#7c3aed' },
  { id: 'square', labelKey: 'catSquare', emoji: '🏛️', color: '#0891b2' },
  { id: 'transit', labelKey: 'catTransit', emoji: '🚉', color: '#2563eb' },
  { id: 'food', labelKey: 'catFood', emoji: '🍽️', color: '#ea580c' },
  { id: 'shopping', labelKey: 'catShopping', emoji: '🛍️', color: '#db2777' },
  { id: 'health', labelKey: 'catHealth', emoji: '🏥', color: '#dc2626' },
  { id: 'sport', labelKey: 'catSport', emoji: '🏟️', color: '#16a34a' },
  { id: 'attraction', labelKey: 'catAttraction', emoji: '🎯', color: '#ca8a04' },
];

const CATEGORY_BY_ID = Object.fromEntries(POI_CATEGORIES.map((c) => [c.id, c]));

/** Resolve a category config by id, falling back to the landmark category. */
export function getCategory(id) {
  return CATEGORY_BY_ID[id] || POI_CATEGORIES[POI_CATEGORIES.length - 1];
}

/** Classify an OSM tag set into one of the strategic-place categories. */
function categorize(tags = {}) {
  const tourism = tags.tourism || '';
  const amenity = tags.amenity || '';
  const leisure = tags.leisure || '';

  if (tags.place === 'square' || amenity === 'townhall' || amenity === 'courthouse') {
    return 'square';
  }
  if (/hotel|hostel|guest_house|motel|apartment|chalet/.test(tourism)) return 'lodging';
  if (amenity === 'bus_station' || amenity === 'ferry_terminal' || tags.railway || tags.aeroway) {
    return 'transit';
  }
  if (/restaurant|cafe|fast_food|food_court|bar|pub/.test(amenity)) return 'food';
  if (tags.shop || amenity === 'marketplace') return 'shopping';
  if (/hospital|clinic|pharmacy|doctors|dentist/.test(amenity)) return 'health';
  if (/stadium|sports_centre|pitch|fitness_centre|park|garden/.test(leisure)) return 'sport';
  return 'attraction';
}

/** Build the Overpass QL query for a bounding box. */
function buildQuery({ south, west, north, east }) {
  const bbox = `${south},${west},${north},${east}`;
  return `[out:json][timeout:25];
(
  nwr["tourism"~"^(hotel|hostel|guest_house|motel|apartment|chalet|attraction|museum|viewpoint|theme_park)$"](${bbox});
  nwr["place"="square"](${bbox});
  nwr["amenity"~"^(townhall|courthouse|bus_station|ferry_terminal|marketplace|restaurant|cafe|fast_food|food_court|bar|pub|hospital|clinic|pharmacy|doctors|dentist|cinema|theatre|place_of_worship|university|college|fuel)$"](${bbox});
  nwr["railway"~"^(station|halt|tram_stop|subway_entrance)$"](${bbox});
  nwr["leisure"~"^(stadium|sports_centre|pitch|fitness_centre|park|garden)$"](${bbox});
  nwr["shop"~"^(mall|supermarket|department_store)$"](${bbox});
);
out center ${MAX_RESULTS};`;
}

/**
 * Fetch strategic places inside the given bounds.
 * @param {{south:number, west:number, north:number, east:number}} bounds
 * @param {AbortSignal} [signal] optional external abort signal
 * @returns {Promise<Array<{id:string, lat:number, lon:number, name:(string|null), category:string}>>}
 */
export async function fetchNearbyPOIs(bounds, signal) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: buildQuery(bounds),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);

    const data = await response.json();
    return (data.elements || [])
      .map((el) => {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        if (lat === undefined || lon === undefined) return null;
        return {
          id: `${el.type}-${el.id}`,
          lat,
          lon,
          name: el.tags?.name || null,
          category: categorize(el.tags || {}),
        };
      })
      .filter(Boolean);
  } finally {
    clearTimeout(timeoutId);
  }
}
