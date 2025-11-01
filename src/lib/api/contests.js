// src/lib/api/contests.js
// Local contests (Photo & Description) with review engine + likes + monthly winners.
// Storage: localStorage only. Safe with your existing review engine.

import {
  submit,
  listApproved as reviewListApproved,
  listPending as reviewListPending,
  vote as reviewVote,
  tryFinalize as reviewTryFinalize,
  ensureReviewer as reviewEnsureReviewer,
  getReviewers as reviewGetReviewers,
  quorumNeeded as reviewQuorumNeeded,
} from "../review.js";

import { getUser } from "../auth";

// ---------- Keys ----------
const LIKE_OVERLAY_KEY = "citykul:contests:likes";              // { [entryId]: Set(userIds) -> stored as array }
const WIN_MARK_KEY     = "citykul:contests:winners";            // { [city:YYYY-MM]: { photo: entry, description: entry } }
const ENTRY_CACHE_KEY  = "citykul:contests:cache:v1";           // local cache to enrich approved entries with likes, etc.

function loadJSON(k, f = null) {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch { return f; }
}
function saveJSON(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

function _city() {
  return (getUser()?.city) || localStorage.getItem("citykul:city") || "Indore";
}
function _likes() { return loadJSON(LIKE_OVERLAY_KEY, {}); }
function _saveLikes(map) { saveJSON(LIKE_OVERLAY_KEY, map || {}); }

// ---------- Shape mapper ----------
function toShape(rec) {
  const d = rec?.data || {};
  return {
    id: rec.id,
    city: rec.city || "",
    approved: rec.status === "approved",
    type: (d.type === "photo" || d.type === "description") ? d.type : "photo",
    title: d.title || "",
    text: d.text || "",
    photoUrl: d.photoUrl || "",
    ownerId: d.ownerId || "",
    ownerName: d.ownerName || d.author || "",
    createdAt: rec.createdAt || Date.now(),
    category: d.category || "General",
  };
}

// ---------- Submit ----------
/** submitContestEntry({ type: "photo"|"description", title, text?, photoUrl?, city?, ownerId? }) */
export function submitContestEntry(payload) {
  const u = getUser();
  const rec = submit("contests", {
    type: (payload.type || "photo").toLowerCase() === "description" ? "description" : "photo",
    title: (payload.title || "").trim(),
    text: (payload.text || "").trim(),
    photoUrl: (payload.photoUrl || "").trim(),
    city: payload.city || u?.city || _city(),
    ownerId: payload.ownerId || (u?.email || u?.name || "guest@demo"),
    ownerName: u?.name || "",
    category: payload.category || "General",
  });
  // keep a minimal cache (optional)
  const cache = loadJSON(ENTRY_CACHE_KEY, []);
  cache.unshift(toShape(rec));
  saveJSON(ENTRY_CACHE_KEY, cache);
  return rec;
}

// ---------- Lists ----------
export function listPendingContests(city) {
  return reviewListPending(city || _city(), "contests").map(toShape);
}
export function listApprovedContests(city) {
  const rows = reviewListApproved(city || _city(), "contests").map(toShape);
  return rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

// ---------- Voting (reviewers) ----------
export function voteContest(id, reviewerId, approve) {
  reviewVote("contests", id, reviewerId, approve);
  return reviewTryFinalize("contests", id);
}
export function ensureContestReviewer(city, reviewerId) {
  reviewEnsureReviewer(city || _city(), "contests", reviewerId);
}
export function getContestReviewers(city) {
  return reviewGetReviewers(city || _city(), "contests");
}
export function getContestQuorum(city) {
  return reviewQuorumNeeded(city || _city(), "contests");
}

// ---------- Likes ----------
export function likeEntry(entryId, userId) {
  const map = _likes();
  const set = new Set(map[entryId] || []);
  set.add(String(userId));
  map[entryId] = Array.from(set);
  _saveLikes(map);
  return map[entryId].length;
}
export function unlikeEntry(entryId, userId) {
  const map = _likes();
  const set = new Set(map[entryId] || []);
  set.delete(String(userId));
  map[entryId] = Array.from(set);
  _saveLikes(map);
  return map[entryId].length;
}
export function getLikeCount(entryId) {
  const map = _likes();
  return (map[entryId] || []).length;
}
export function didLike(entryId, userId) {
  const map = _likes();
  return (map[entryId] || []).includes(String(userId));
}

// ---------- Winners (Monthly Auto-Feature) ----------
/** monthStr: "YYYY-MM" for last month if omitted */
function monthKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
  d.setUTCMonth(d.getUTCMonth() - 1); // last month
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function _winKey(city, mm) {
  return `${city}:${mm}`;
}

/** ensureMonthlyRollup(city?): run-on-open check; picks winners for LAST month */
export function ensureMonthlyRollup(cityArg) {
  const city = (cityArg || _city());
  const mm = monthKey();
  const mark = loadJSON(WIN_MARK_KEY, {});
  const composite = _winKey(city, mm);
  if (mark[composite]) return mark[composite]; // already rolled

  // Pick winners among APPROVED entries created in that month.
  const rows = listApprovedContests(city).filter(e => {
    const d = new Date(e.createdAt || Date.now());
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return ym === mm;
  });

  const likesMap = _likes();
  const best = (type) => {
    const candidates = rows.filter(r => r.type === type);
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
      const la = (likesMap[a.id] || []).length;
      const lb = (likesMap[b.id] || []).length;
      if (lb !== la) return lb - la; // more likes first
      return (a.createdAt || 0) - (b.createdAt || 0); // earlier tie-break
    });
    return candidates[0] || null;
  };

  const winners = {
    photo: best("photo"),
    description: best("description"),
    month: mm,
    city,
    ts: Date.now(),
  };

  mark[composite] = winners;
  saveJSON(WIN_MARK_KEY, mark);
  return winners;
}

export function getMonthlyWinners(cityArg, mm) {
  const city = (cityArg || _city());
  const mark = loadJSON(WIN_MARK_KEY, {});
  return mark[_winKey(city, mm)] || null;
}
export function getLatestWinners(cityArg) {
  const city = (cityArg || _city());
  const mark = loadJSON(WIN_MARK_KEY, {});
  // find latest for this city
  const pairs = Object.entries(mark)
    .filter(([k]) => k.startsWith(`${city}:`))
    .sort((a, b) => (b[1]?.ts || 0) - (a[1]?.ts || 0));
  return pairs.length ? pairs[0][1] : null;
}

// ---------- Get one ----------
export function getContestById(cityArg, id) {
  const city = cityArg || _city();
  const rows = listApprovedContests(city);
  return rows.find(r => r.id === id) || null;
}
