// src/lib/engagement.js
// Engagement counters with safe guards + helpers.
// Backward compatible with your existing API:
//   getEngagement(id), bump(id, field), score(id)
//
// New (optional) helpers:
//   touch(id), incrementMany(id, map), getAll(), topScores(n = 20), reset(id), resetAll()
//   setWeights(newWeights), getWeights()

import { loadJSON, saveJSON } from "./storage";

const K = (id) => `citykul:eng:${id}`;
const ALL_KEY = "citykul:eng:index";

// Centralized weights (tweak anytime)
let WEIGHTS = {
  likes: 3,
  shares: 4,
  comments: 2,
  interests: 5,
  buys: 6,
};

// Valid fields guard
const FIELDS = new Set(["likes", "shares", "comments", "interests", "buys"]);

export function getWeights() {
  return { ...WEIGHTS };
}
export function setWeights(newWeights = {}) {
  WEIGHTS = { ...WEIGHTS, ...newWeights };
}

function def() {
  return { likes: 0, shares: 0, comments: 0, interests: 0, buys: 0 };
}
function clampNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Keep an index of all ids we’ve seen (for top lists, etc.)
function _indexAdd(id) {
  const set = new Set(loadJSON(ALL_KEY, []));
  set.add(String(id));
  saveJSON(ALL_KEY, Array.from(set));
}
function _indexAll() {
  return loadJSON(ALL_KEY, []);
}

// --- Core API (backward compatible) ---
export function getEngagement(id) {
  const obj = loadJSON(K(id), null);
  if (!obj || typeof obj !== "object") return def();
  // sanitize
  const out = def();
  for (const f of Object.keys(out)) out[f] = clampNum(obj[f]);
  return out;
}

export function bump(id, field) {
  if (!FIELDS.has(field)) return getEngagement(id); // ignore unknown fields
  const v = getEngagement(id);
  v[field] = clampNum(v[field]) + 1;
  saveJSON(K(id), v);
  _indexAdd(id);
  return v;
}

export function score(id) {
  const s = getEngagement(id);
  return (
    WEIGHTS.likes * clampNum(s.likes) +
    WEIGHTS.shares * clampNum(s.shares) +
    WEIGHTS.comments * clampNum(s.comments) +
    WEIGHTS.interests * clampNum(s.interests) +
    WEIGHTS.buys * clampNum(s.buys)
  );
}

// --- Nice-to-have helpers (optional) ---
export function touch(id) {
  _indexAdd(id);
  if (!loadJSON(K(id), null)) saveJSON(K(id), def());
}

export function incrementMany(id, map = {}) {
  const v = getEngagement(id);
  for (const [k, delta] of Object.entries(map)) {
    if (!FIELDS.has(k)) continue;
    v[k] = clampNum(v[k]) + clampNum(delta);
  }
  saveJSON(K(id), v);
  _indexAdd(id);
  return v;
}

export function getAll() {
  const ids = _indexAll();
  return ids.map((id) => ({ id, ...getEngagement(id), score: score(id) }));
}

export function topScores(n = 20) {
  return getAll()
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, n));
}

export function reset(id) {
  saveJSON(K(id), def());
}

export function resetAll() {
  const ids = _indexAll();
  ids.forEach((id) => saveJSON(K(id), def()));
}
