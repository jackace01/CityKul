// src/lib/api/discoverReviews.js
// Lightweight local reviews for Discover places (ratings + text + helpful votes).
// Stored per-place in localStorage. No backend required.

const KEY = (placeId) => `citykul:discover:reviews:${placeId}`;

// Track each user's helpful vote per review so 1 user == 1 vote (toggle allowed)
const VOTE_KEY = (placeId) => `citykul:discover:reviewVotes:${placeId}`;

// Ratings dimensions (unchanged)
const PARAMS = ["Service", "Quality", "Cleanliness", "Value", "Accessibility"];
export function getReviewParameters() { return PARAMS.slice(); }

function load(placeId) {
  try {
    const raw = localStorage.getItem(KEY(placeId));
    const arr = raw ? JSON.parse(raw) : [];
    // Backfill missing helpful fields for older reviews
    for (const r of arr) {
      if (!r.helpful || typeof r.helpful.up !== "number" || typeof r.helpful.down !== "number") {
        r.helpful = { up: 0, down: 0 };
      }
    }
    return arr;
  } catch {
    return [];
  }
}
function save(placeId, arr) {
  localStorage.setItem(KEY(placeId), JSON.stringify(arr || []));
}

function loadVotes(placeId) {
  try {
    const raw = localStorage.getItem(VOTE_KEY(placeId));
    return raw ? JSON.parse(raw) : {}; // { [reviewId]: { [userId]: 1|-1 } }
  } catch {
    return {};
  }
}
function saveVotes(placeId, votes) {
  localStorage.setItem(VOTE_KEY(placeId), JSON.stringify(votes || {}));
}

// { id, userId, userName, ts, text, ratings: {Service:1-5, ...}, helpful: {up,down} }
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
    ratings: normalized,
    helpful: { up: 0, down: 0 }
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

/** NEW: per-parameter 1..5 distributions and overall star distribution. */
export function getPlaceDistributions(placeId) {
  const arr = load(placeId);
  // paramBuckets: { param: {1:n,...,5:n} }
  const paramBuckets = {};
  for (const p of PARAMS) {
    paramBuckets[p] = { 1:0, 2:0, 3:0, 4:0, 5:0 };
  }
  // overall by rounding the average of params per review
  const overall = { 1:0, 2:0, 3:0, 4:0, 5:0 };

  for (const r of arr) {
    let sum = 0;
    let count = 0;
    for (const p of PARAMS) {
      const v = Number(r?.ratings?.[p] || 0);
      if (v >= 1 && v <= 5) {
        paramBuckets[p][v] += 1;
        sum += v;
        count += 1;
      }
    }
    if (count > 0) {
      const avg = sum / count;
      const rounded = Math.min(5, Math.max(1, Math.round(avg)));
      overall[rounded] += 1;
    }
  }

  return { total: arr.length, params: paramBuckets, overall };
}

/** NEW: get user's current helpful vote for a review: 1 (helpful), -1 (not), 0 (none) */
export function getMyHelpfulVote(placeId, reviewId, userId) {
  if (!userId) return 0;
  const votes = loadVotes(placeId);
  const rv = votes[reviewId] || {};
  return rv[userId] || 0;
}

/**
 * NEW: cast or change helpful vote.
 * vote: 1 (helpful) or -1 (not helpful). If same vote is repeated, it toggles off (removes vote).
 * Returns updated review.
 */
export function voteReviewHelpful(placeId, reviewId, userId, vote) {
  const arr = load(placeId);
  const idx = arr.findIndex(r => r.id === reviewId);
  if (idx === -1) return null;
  const review = arr[idx];
  if (!review.helpful) review.helpful = { up: 0, down: 0 };

  const votes = loadVotes(placeId);
  if (!votes[reviewId]) votes[reviewId] = {};
  const prev = votes[reviewId][userId] || 0;

  // remove previous counts
  if (prev === 1) review.helpful.up = Math.max(0, review.helpful.up - 1);
  if (prev === -1) review.helpful.down = Math.max(0, review.helpful.down - 1);

  let next = vote;
  // toggle off if same
  if (prev === vote) next = 0;

  // add new counts
  if (next === 1) review.helpful.up += 1;
  if (next === -1) review.helpful.down += 1;

  // persist vote
  if (next === 0) {
    delete votes[reviewId][userId];
    if (!Object.keys(votes[reviewId]).length) delete votes[reviewId]; // cleanup
  } else {
    votes[reviewId][userId] = next;
  }

  arr[idx] = review;
  save(placeId, arr);
  saveVotes(placeId, votes);
  return review;
}
