// src/lib/api/needs.js
// CityKul — "City Needs Attention" lightweight API (localStorage-backed)

const KEY_PICKS = "citykul:needs:picks";   // array of { id, userId, tags:[], ts }
const KEY_COUNTS = "citykul:needs:counts"; // map { [tag]: number }

/* ---------- internal helpers ---------- */
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ---------- write: user selects tags ---------- */
/**
 * Record one user's selection of tags (e.g., ["Potholes","Dim lights"])
 * - De-dupes tags inside a single submission
 * - Increments global counters
 */
export function pickTags(userId = "guest@demo", tags = []) {
  const clean = Array.from(new Set((tags || []).map(t => String(t).trim()).filter(Boolean)));
  if (!clean.length) return { ok: false, reason: "no-tags" };

  const picks = loadJSON(KEY_PICKS, []);
  const counts = loadJSON(KEY_COUNTS, {});

  // write pick
  const rec = {
    id: `need-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    userId,
    tags: clean,
    ts: Date.now(),
  };
  picks.unshift(rec);

  // update counters
  for (const t of clean) {
    counts[t] = (counts[t] || 0) + 1;
  }

  saveJSON(KEY_PICKS, picks);
  saveJSON(KEY_COUNTS, counts);
  return { ok: true, record: rec };
}

/* ---------- read: top tags ---------- */
/**
 * Get top tags by frequency.
 * @param {number} limit - how many tags to return (default 5)
 * @returns {Array<{tag:string, count:number}>}
 */
export function getTopTags(limit = 5) {
  const counts = loadJSON(KEY_COUNTS, {});
  const arr = Object.entries(counts)
    .map(([tag, count]) => ({ tag, count: Number(count) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, Math.max(0, limit));
  return arr;
}

/* ---------- read: a user's last selected tags ---------- */
/**
 * Returns the most recent tag selection this user submitted (for prefilling UI).
 * @param {string} userId
 * @returns {string[]} last selected tags or []
 */
export function getUserSelectedTags(userId = "guest@demo") {
  const picks = loadJSON(KEY_PICKS, []);
  const rec = picks.find(p => p.userId === userId);
  return rec?.tags || [];
}

/* ---------- optional reads for pages/analytics ---------- */
export function listTagPicks() {
  return loadJSON(KEY_PICKS, []);
}

export function getAllTagCounts() {
  return loadJSON(KEY_COUNTS, {});
}

/* ---------- maintenance (optional) ---------- */
/** Clear all needs data (useful for tests/admin). */
export function __resetNeedsData() {
  saveJSON(KEY_PICKS, []);
  saveJSON(KEY_COUNTS, {});
}
