// src/lib/api/rentalReviews.js
// Lightweight local reviews for Rentals (ratings + text + helpful votes).
// Stored per-listing in localStorage. No backend required.

// Storage keys
const KEY_REVIEWS = (listingId) => `citykul:rentals:reviews:${listingId}`;
const KEY_VOTES = (listingId) => `citykul:rentals:reviewVotes:${listingId}`;
// We keep votes per listing as: { [reviewId]: { [voterId]: 1|-1 } }

const PARAMS = ["Accuracy", "Condition", "Value", "Communication", "Cleanliness"];
export function getRentalReviewParameters() {
  return PARAMS.slice();
}

// ---- internal helpers ----
function loadReviews(listingId) {
  try {
    const raw = localStorage.getItem(KEY_REVIEWS(listingId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveReviews(listingId, arr) {
  localStorage.setItem(KEY_REVIEWS(listingId), JSON.stringify(arr || []));
}

function loadVotes(listingId) {
  try {
    const raw = localStorage.getItem(KEY_VOTES(listingId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveVotes(listingId, obj) {
  localStorage.setItem(KEY_VOTES(listingId), JSON.stringify(obj || {}));
}

// ---- public API ----

// { id, userId, userName, ts, text, ratings: {Accuracy..Cleanliness:1..5} }
export function listRentalReviews(listingId) {
  const arr = loadReviews(listingId);
  const votes = loadVotes(listingId);
  // Enrich each review with helpful counts derived from votes store
  return arr.map((r) => {
    const byUsers = votes[r.id] || {};
    let up = 0, down = 0;
    for (const v of Object.values(byUsers)) {
      if (v === 1) up++;
      else if (v === -1) down++;
    }
    return { ...r, helpfulUp: up, helpfulDown: down };
  });
}

export function addRentalReview(listingId, { userId = "", userName = "User", text = "", ratings = {} }) {
  // sanitize 1..5 for each parameter
  const normalized = {};
  for (const p of PARAMS) {
    const v = Number(ratings[p] ?? 0);
    normalized[p] = Math.min(5, Math.max(1, Math.round(v || 0) || 1));
  }
  const rec = {
    id: `rrev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: String(userId || ""),
    userName: userName || "User",
    ts: Date.now(),
    text: String(text || "").trim(),
    ratings: normalized
  };
  const arr = loadReviews(listingId);
  arr.unshift(rec);
  saveReviews(listingId, arr);
  return rec;
}

export function getRentalAverages(listingId) {
  const arr = loadReviews(listingId);
  if (!arr.length) {
    return { count: 0, averages: PARAMS.reduce((m, p) => ((m[p] = 0), m), {}) };
  }
  const sums = PARAMS.reduce((m, p) => ((m[p] = 0), m), {});
  for (const r of arr) for (const p of PARAMS) sums[p] += Number(r?.ratings?.[p] || 0);
  const averages = PARAMS.reduce((m, p) => ((m[p] = +(sums[p] / arr.length).toFixed(1)), m), {});
  return { count: arr.length, averages };
}

// Return per-parameter distributions for 1..5 stars and overall mean
export function getRentalDistributions(listingId) {
  const arr = loadReviews(listingId);
  const dist = {};
  for (const p of PARAMS) {
    dist[p] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  }
  for (const r of arr) {
    for (const p of PARAMS) {
      const v = Number(r?.ratings?.[p] || 0);
      const clamped = Math.min(5, Math.max(1, Math.round(v || 0) || 1));
      dist[p][clamped] += 1;
    }
  }
  const overall = getRentalAverages(listingId);
  return { dist, overall };
}

// Helpful votes: +1 (helpful), -1 (not helpful), 0 (clear my vote)
export function voteRentalReviewHelpful(listingId, reviewId, voterId, value) {
  // value: -1 | 0 | 1
  const v = Number(value);
  if (![ -1, 0, 1 ].includes(v)) return;

  const votes = loadVotes(listingId);
  votes[reviewId] = votes[reviewId] || {};
  if (v === 0) {
    // clear any existing vote
    delete votes[reviewId][voterId];
    if (Object.keys(votes[reviewId]).length === 0) {
      delete votes[reviewId];
    }
  } else {
    votes[reviewId][voterId] = v;
  }
  saveVotes(listingId, votes);
}

export function getMyRentalHelpfulVote(listingId, reviewId, voterId) {
  const votes = loadVotes(listingId);
  return Number(votes?.[reviewId]?.[voterId] || 0); // -1 | 0 | 1
}
