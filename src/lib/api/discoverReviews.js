// src/lib/api/discoverReviews.js
// Lightweight local reviews for Discover places (ratings + text).
// Stored per-place in localStorage. No backend required.

const KEY = (placeId) => `citykul:discover:reviews:${placeId}`;

const PARAMS = ["Service", "Quality", "Cleanliness", "Value", "Accessibility"];
export function getReviewParameters() { return PARAMS.slice(); }

function load(placeId) {
  try {
    const raw = localStorage.getItem(KEY(placeId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function save(placeId, arr) {
  localStorage.setItem(KEY(placeId), JSON.stringify(arr || []));
}

// { id, userId, userName, ts, text, ratings: {Service:1-5, ...} }
export function listPlaceReviews(placeId) {
  return load(placeId);
}

export function addPlaceReview(placeId, { userId = "", userName = "User", text = "", ratings = {} }) {
  // sanitize 1..5
  const normalized = {};
  for (const p of PARAMS) {
    const v = Number(ratings[p] ?? 0);
    normalized[p] = Math.min(5, Math.max(1, Math.round(v || 0) || 1));
  }
  const rec = {
    id: `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,
    userId: String(userId || ""),
    userName: userName || "User",
    ts: Date.now(),
    text: String(text || "").trim(),
    ratings: normalized
  };
  const arr = load(placeId);
  arr.unshift(rec);
  save(placeId, arr);
  return rec;
}

export function getPlaceAverages(placeId) {
  const arr = load(placeId);
  if (!arr.length) {
    return { count: 0, averages: PARAMS.reduce((m, p) => (m[p] = 0, m), {}) };
  }
  const sums = PARAMS.reduce((m, p) => (m[p] = 0, m), {});
  for (const r of arr) for (const p of PARAMS) sums[p] += Number(r?.ratings?.[p] || 0);
  const averages = PARAMS.reduce((m, p) => (m[p] = +(sums[p] / arr.length).toFixed(1), m), {});
  return { count: arr.length, averages };
}
