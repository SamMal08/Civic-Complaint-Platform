const ngeohash = require("ngeohash");

/**
 * Calculates geohash string for given latitude and longitude.
 * Precision 7 is roughly ~150m accuracy.
 */
function encodeGeohash(lat, lon, precision = 7) {
  return ngeohash.encode(lat, lon, precision);
}

/**
 * Decodes geohash back to latitude and longitude
 */
function decodeGeohash(geohash) {
  return ngeohash.decode(geohash);
}

/**
 * Gets adjacent geohash cells to search nearby areas efficiently
 */
function getNeighbors(geohash) {
  return ngeohash.neighbors(geohash);
}

/**
 * Haversine distance formula between two lat/long points in kilometers
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes priority score for ranking civic issues:
 * Combines severity, net community upvotes, reporter star reputation, and time recency.
 * 
 * Priority = (severity * 25) + (netUpvotes * 10) + (reporterStars * 5) + recencyScore
 */
function calculatePriorityScore({ severity = 1, upvotes = 0, downvotes = 0, reporterStars = 0, createdAt = new Date() }) {
  const netUpvotes = Math.max(0, upvotes - downvotes);
  
  // Recency score (max 30 points, decays by 5 pts every 24 hours, min 0)
  const ageInHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 30 - Math.floor(ageInHours / 24) * 5);

  const score =
    severity * 25 +
    netUpvotes * 10 +
    reporterStars * 5 +
    recencyScore;

  return Math.round(score);
}

module.exports = {
  encodeGeohash,
  decodeGeohash,
  getNeighbors,
  calculateDistanceKm,
  calculatePriorityScore
};
