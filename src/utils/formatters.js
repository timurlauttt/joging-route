/**
 * Minimalist Jogging Route Tracker - Utility Functions
 */

/**
 * Format total seconds into HH:MM:SS format
 * @param {number} totalSeconds
 * @returns {string} e.g. "00:45:12"
 */
export function formatTime(totalSeconds) {
  if (!totalSeconds || totalSeconds < 0) return "00:00:00";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (num) => String(num).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format meters into kilometers with 2 decimal places
 * @param {number} meters
 * @returns {string} e.g. "5.24 km"
 */
export function formatDistance(meters) {
  if (!meters || meters <= 0) return "0.00 km";
  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
}

/**
 * Calculate running pace in MM:SS /km
 * Formula: (totalSeconds / 60) / km
 * @param {number} totalSeconds
 * @param {number} meters
 * @returns {string} e.g. "05:32 /km" or "--:-- /km"
 */
export function calculatePace(totalSeconds, meters) {
  if (!meters || meters <= 0 || !totalSeconds || totalSeconds <= 0) {
    return "--:-- /km";
  }

  const distanceKm = meters / 1000;
  // If distance is negligible (< 10 meters) or pace would be absurd (> 99 min/km)
  if (distanceKm < 0.01) return "--:-- /km";

  // Pace in decimal minutes per km
  const paceDecimalMinutes = totalSeconds / 60 / distanceKm;

  // If pace is unrealistically high (e.g. over 99 minutes per km)
  if (paceDecimalMinutes > 99 || !isFinite(paceDecimalMinutes)) {
    return "--:-- /km";
  }

  const paceMinutes = Math.floor(paceDecimalMinutes);
  const paceSeconds = Math.round((paceDecimalMinutes - paceMinutes) * 60);

  // Handle seconds roll-over
  let finalMin = paceMinutes;
  let finalSec = paceSeconds;
  if (finalSec >= 60) {
    finalMin += 1;
    finalSec = 0;
  }

  const pad = (num) => String(num).padStart(2, "0");
  return `${pad(finalMin)}:${pad(finalSec)} /km`;
}

/**
 * Estimate calories burned per kilometer by activity.
 * Running ~62 kcal/km, walking ~45 kcal/km, cycling ~30 kcal/km.
 */
export const CALORIE_FACTOR_BY_ACTIVITY = {
  run: 62,
  walk: 45,
  ride: 30,
};

/**
 * Estimate calories burned for a given distance and activity.
 * @param {number} meters
 * @param {'run'|'walk'|'ride'} activity
 * @returns {number} kcal
 */
export function calculateCalories(meters, activity = "run") {
  if (!meters || meters <= 0) return 0;
  const km = meters / 1000;
  const factor =
    CALORIE_FACTOR_BY_ACTIVITY[activity] ?? CALORIE_FACTOR_BY_ACTIVITY.run;
  return Math.round(km * factor);
}

/**
 * Calculate average speed in km/h (used for cycling, à la Strava).
 * @param {number} totalSeconds
 * @param {number} meters
 * @returns {number} km/h (0 when not computable)
 */
export function calculateSpeedKmh(totalSeconds, meters) {
  if (!meters || meters <= 0 || !totalSeconds || totalSeconds <= 0) return 0;
  const speed = meters / 1000 / (totalSeconds / 3600);
  if (!isFinite(speed) || speed <= 0) return 0;
  return speed;
}

/**
 * Format average speed as a fixed 1-decimal km/h string.
 * @param {number} totalSeconds
 * @param {number} meters
 * @returns {string} e.g. "24.6" (empty-safe: "--")
 */
export function formatSpeed(totalSeconds, meters) {
  const speed = calculateSpeedKmh(totalSeconds, meters);
  return speed > 0 ? speed.toFixed(1) : "--";
}

/**
 * Rough per-kilometre effort used to preview a planned route's duration:
 * an easy run pace (~5:30 /km) and a moderate ride (~20 km/h).
 */
export const ESTIMATE_SECONDS_PER_KM = {
  run: 330,
  walk: 720,
  ride: 180,
};

/**
 * Estimate how long a route of `meters` will take for the given activity.
 * @param {number} meters
 * @param {'run'|'walk'|'ride'} activity
 * @returns {number} seconds (0 when not computable)
 */
export function estimateDurationSeconds(meters, activity = "run") {
  if (!meters || meters <= 0) return 0;
  const perKm =
    ESTIMATE_SECONDS_PER_KM[activity] ?? ESTIMATE_SECONDS_PER_KM.run;
  return Math.round((meters / 1000) * perKm);
}
