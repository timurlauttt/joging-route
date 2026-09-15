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

  const pad = (num) => String(num).padStart(2, '0');
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
  const paceDecimalMinutes = (totalSeconds / 60) / distanceKm;

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

  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(finalMin)}:${pad(finalSec)} /km`;
}

/**
 * Estimate calories burned (average ~60 kcal per km for running)
 * @param {number} meters 
 * @returns {number} kcal
 */
export function calculateCalories(meters) {
  if (!meters || meters <= 0) return 0;
  const km = meters / 1000;
  return Math.round(km * 62);
}
