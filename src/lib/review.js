// src/lib/review.js
// Reputation-weighted review engine with dynamic quorum + moderation log.
// Backward-compatible API for submissions/lists/votes used across modules.
//
// Exposed API (unchanged where possible):
// - getReviewers(city, mod), setReviewers(city, mod, list), ensureReviewer(city, mod, reviewerId)
// - quorumNeeded(city, mod) -> number (for display; still returns an integer)
// - submit(mod, payload{city,...})
// - getSubmissionById(mod, id)
// - listPending(city, mod), listApproved(city, mod), listRejected(city, mod)
// - vote(mod, submissionId, reviewerId, approve)
// - tryFinalize(mod, submissionId) -> updated record | null
//
// NEW (optional) helpers:
// - getReputation(city, mod, reviewerId)
// - quorumInfo(city, mod) -> { totalReviewers, targetPercent, neededWeight, totalWeight, windowDays, activeRate }
// - getVotesBox(submissionId)
// - listModerationLog(filters), clearModerationLog()

import { loadJSON, saveJSON } from "./storage.js";

/* ============================ Keys & constants ============================ */

const REVIEWERS_KEY = (city, mod) => `citykul:reviewers:${city}:${mod}`;
const SUBMIT_ALL_KEY = (mod) => `citykul:${mod}:submissions`;
const PENDING_KEY = (city, mod) => `citykul:${mod}:pending:${city}`;
const APPROVED_KEY = (city, mod) => `citykul:${mod}:approved:${city}`;
const REJECTED_KEY = (city, mod) => `citykul:${mod}:rejected:${city}`;
const VOTE_KEY = (id) => `citykul:votes:${id}`;

// NEW: moderation log (global)
const MODLOG_KEY = "citykul:modlog";

// NEW: per city+module reputation + activity
const REPUTATION_KEY = (city, mod) => `citykul:rep:${city}:${mod}`;          // { reviewerId: rep(0.2..1.0) }
const AGREEMENT_KEY  = (city, mod) => `citykul:agree:${city}:${mod}`;       // { reviewerId: {agree: n, total: n} }
const ACTIVITY_KEY   = (city, mod) => `citykul:activity:${city}:${mod}`;    // [{ reviewerId, ts }]
const ACTIVITY_WINDOW_DAYS = 14;

// reputation bounds & step sizes
const REP_MIN = 0.2;
const REP_MAX = 1.0;
const REP_START = 0.5;
const STEP_AGREE = 0.03;   // gains when a reviewer voted with the final outcome
const STEP_DISAG = 0.02;   // penalty when a reviewer voted against the final outcome
const DECAY_ALPHA = 0.02;  // mild decay toward 0.5 each finalization (rep = rep*(1-a) + 0.5*a)

// dynamic quorum: target percent between 0.60 and 0.80 depending on active rate
const TARGET_MIN = 0.60;
const TARGET_MAX = 0.80;

// util
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function now() { return Date.now(); }
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
}

/* ============================ Reviewers ============================ */

export function getReviewers(city, mod) {
  return loadJSON(REVIEWERS_KEY(city, mod), []);
}
export function setReviewers(city, mod, list) {
  saveJSON(REVIEWERS_KEY(city, mod), Array.from(new Set(list || [])));
}
export function ensureReviewer(city, mod, reviewerId) {
  const set = new Set(getReviewers(city, mod));
  set.add(String(reviewerId));
  saveJSON(REVIEWERS_KEY(city, mod), Array.from(set));
}

/* ============================ Reputation store ============================ */

function _getRepMap(city, mod) {
  const map = loadJSON(REPUTATION_KEY(city, mod), {});
  return map && typeof map === "object" ? map : {};
}
function _saveRepMap(city, mod, map) {
  saveJSON(REPUTATION_KEY(city, mod), map || {});
}
export function getReputation(city, mod, reviewerId) {
  const map = _getRepMap(city, mod);
  const r = Number(map[reviewerId]);
  if (Number.isFinite(r)) return clamp(r, REP_MIN, REP_MAX);
  return REP_START;
}
function _setReputation(city, mod, reviewerId, rep) {
  const map = _getRepMap(city, mod);
  map[reviewerId] = clamp(Number(rep || REP_START), REP_MIN, REP_MAX);
  _saveRepMap(city, mod, map);
}
function _nudgeTowardBaseline(rep) {
  // small decay toward 0.5 to avoid extremes over time
  return clamp(rep * (1 - DECAY_ALPHA) + 0.5 * DECAY_ALPHA, REP_MIN, REP_MAX);
}

/* ============================ Agreement & activity ============================ */

function _getAgreeMap(city, mod) {
  return loadJSON(AGREEMENT_KEY(city, mod), {});
}
function _saveAgreeMap(city, mod, map) {
  saveJSON(AGREEMENT_KEY(city, mod), map || {});
}
function _recordAgreement(city, mod, reviewerId, agreed) {
  const m = _getAgreeMap(city, mod);
  const cur = m[reviewerId] || { agree: 0, total: 0 };
  cur.total += 1;
  if (agreed) cur.agree += 1;
  m[reviewerId] = cur;
  _saveAgreeMap(city, mod, m);

  // reputation update
  const before = getReputation(city, mod, reviewerId);
  const after = _nudgeTowardBaseline(before + (agreed ? STEP_AGREE : -STEP_DISAG));
  _setReputation(city, mod, reviewerId, after);
}

function _pushActivity(city, mod, reviewerId) {
  const arr = loadJSON(ACTIVITY_KEY(city, mod), []);
  arr.push({ reviewerId, ts: now() });
  // prune old
  const cutoff = now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const pruned = arr.filter(x => x.ts >= cutoff);
  saveJSON(ACTIVITY_KEY(city, mod), pruned);
}
function _activeRate(city, mod) {
  const total = getReviewers(city, mod).length || 0;
  if (!total) return 0;
  const arr = loadJSON(ACTIVITY_KEY(city, mod), []);
  const cutoff = now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recent = arr.filter(x => x.ts >= cutoff);
  const unique = new Set(recent.map(x => x.reviewerId)).size;
  return clamp(unique / total, 0, 1);
}

/* ============================ Dynamic quorum ============================ */

function _targetPercent(city, mod) {
  // linear between 60% and 80% based on activity rate
  const ar = _activeRate(city, mod); // 0..1
  return clamp(TARGET_MIN + (TARGET_MAX - TARGET_MIN) * ar, TARGET_MIN, TARGET_MAX);
}
function _totalWeight(city, mod) {
  const reviewers = getReviewers(city, mod);
  if (!reviewers.length) return 0;
  return reviewers.reduce((w, r) => w + getReputation(city, mod, r), 0);
}

/**
 * quorumInfo:
 *  - totalReviewers
 *  - targetPercent (0..1)
 *  - neededWeight (float)
 *  - totalWeight (float)
 *  - windowDays (activity window)
 *  - activeRate (0..1)
 */
export function quorumInfo(city, mod) {
  const totalReviewers = getReviewers(city, mod).length;
  const totalWeight = _totalWeight(city, mod);
  const targetPercent = _targetPercent(city, mod);
  const neededWeight = totalWeight * targetPercent;
  return {
    totalReviewers,
    totalWeight: Number(totalWeight.toFixed(2)),
    targetPercent: Number(targetPercent.toFixed(2)),
    neededWeight: Number(neededWeight.toFixed(2)),
    windowDays: ACTIVITY_WINDOW_DAYS,
    activeRate: Number(_activeRate(city, mod).toFixed(2)),
  };
}

/**
 * Back-compat: return an integer "quorum count" for display,
 * approximated as ceil(totalReviewers * targetPercent).
 */
export function quorumNeeded(city, mod) {
  const total = getReviewers(city, mod).length;
  const pct = _targetPercent(city, mod);
  return Math.max(1, Math.ceil(total * pct));
}

/* ============================ Submissions lifecycle ============================ */

export function submit(mod, payload) {
  // payload MUST include: city
  const id = uid();
  const rec = {
    id,
    module: mod,
    status: "pending",
    city: payload.city || "",
    category: payload.category || "General",
    createdAt: now(),
    data: payload,
  };
  const all = loadJSON(SUBMIT_ALL_KEY(mod), []);
  all.push(rec);
  saveJSON(SUBMIT_ALL_KEY(mod), all);

  const pend = loadJSON(PENDING_KEY(rec.city, mod), []);
  pend.push(rec);
  saveJSON(PENDING_KEY(rec.city, mod), pend);

  // init vote box
  saveJSON(VOTE_KEY(id), { approvals: [], rejections: [] });

  return rec;
}

export function getSubmissionById(mod, id) {
  const all = loadJSON(SUBMIT_ALL_KEY(mod), []);
  return all.find((r) => r.id === id) || null;
}

export function listPending(city, mod) {
  return loadJSON(PENDING_KEY(city, mod), []);
}
export function listApproved(city, mod) {
  return loadJSON(APPROVED_KEY(city, mod), []);
}
export function listRejected(city, mod) {
  return loadJSON(REJECTED_KEY(city, mod), []);
}

/* ============================ Voting ============================ */

export function vote(mod, submissionId, reviewerId, approve) {
  const box = loadJSON(VOTE_KEY(submissionId), { approvals: [], rejections: [] });
  const rid = String(reviewerId || "");

  // de-dupe
  box.approvals = (box.approvals || []).filter((u) => u !== rid);
  box.rejections = (box.rejections || []).filter((u) => u !== rid);

  if (approve) box.approvals.push(rid);
  else box.rejections.push(rid);

  saveJSON(VOTE_KEY(submissionId), box);

  // mark reviewer active
  const rec = getSubmissionById(mod, submissionId);
  if (rec) _pushActivity(rec.city, rec.module, rid);

  return box;
}

function moveBetweenBuckets(rec, fromKey, toKey, status) {
  const from = loadJSON(fromKey(rec.city, rec.module), []).filter((r) => r.id !== rec.id);
  saveJSON(fromKey(rec.city, rec.module), from);

  const updated = { ...rec, status };
  const to = loadJSON(toKey(rec.city, rec.module), []);
  to.push(updated);
  saveJSON(toKey(rec.city, rec.module), to);

  // also update in SUBMIT_ALL list
  const all = loadJSON(SUBMIT_ALL_KEY(rec.module), []);
  const idx = all.findIndex((r) => r.id === rec.id);
  if (idx >= 0) {
    all[idx] = updated;
    saveJSON(SUBMIT_ALL_KEY(rec.module), all);
  }
  return updated;
}

/* ============================ Moderation log ============================ */

function _pushModLog(entry) {
  const arr = loadJSON(MODLOG_KEY, []);
  arr.unshift(entry);
  const capped = arr.slice(0, 2000); // keep last 2000 entries
  saveJSON(MODLOG_KEY, capped);
}

export function listModerationLog(filters = {}) {
  const { city, module, fromTs, toTs, limit = 500 } = filters || {};
  let rows = loadJSON(MODLOG_KEY, []);
  if (city)   rows = rows.filter(r => (r.city || "").toLowerCase() === String(city).toLowerCase());
  if (module && module !== "all") rows = rows.filter(r => r.module === module);
  if (fromTs) rows = rows.filter(r => r.ts >= fromTs);
  if (toTs)   rows = rows.filter(r => r.ts <= toTs);
  rows.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return rows.slice(0, limit);
}

export function clearModerationLog() {
  saveJSON(MODLOG_KEY, []);
}

/* ============================ Finalization ============================ */

export function tryFinalize(mod, submissionId) {
  const rec = getSubmissionById(mod, submissionId);
  if (!rec || rec.status !== "pending") return null;

  const { approvals = [], rejections = [] } = loadJSON(VOTE_KEY(submissionId), { approvals: [], rejections: [] });

  // weighted tallies
  const city = rec.city;
  const module = rec.module;

  const approvalWeight = approvals.reduce((w, rid) => w + getReputation(city, module, rid), 0);
  const rejectionWeight = rejections.reduce((w, rid) => w + getReputation(city, module, rid), 0);

  const totalWeight = _totalWeight(city, module);
  const targetPercent = _targetPercent(city, module);
  const neededWeight = totalWeight * targetPercent;

  function logDecision(updated, outcome) {
    _pushModLog({
      id: rec.id,
      module,
      city,
      category: rec.category || "General",
      status: outcome,      // "approved" | "rejected"
      ts: Date.now(),
      quorum: {
        targetPercent: Number(targetPercent.toFixed(2)),
        neededWeight: Number(neededWeight.toFixed(2)),
        totalWeight: Number(totalWeight.toFixed(2)),
      },
      votes: {
        approvals: approvals.length,
        rejections: rejections.length,
        approvalWeight: Number(approvalWeight.toFixed(2)),
        rejectionWeight: Number(rejectionWeight.toFixed(2)),
      },
    });
    return updated;
  }

  // finalize when either side reaches neededWeight
  if (approvalWeight >= neededWeight) {
    const updated = moveBetweenBuckets(rec, PENDING_KEY, APPROVED_KEY, "approved");
    approvals.forEach((rid) => _recordAgreement(city, module, rid, true));
    rejections.forEach((rid) => _recordAgreement(city, module, rid, false));
    return logDecision(updated, "approved");
  }
  if (rejectionWeight >= neededWeight) {
    const updated = moveBetweenBuckets(rec, PENDING_KEY, REJECTED_KEY, "rejected");
    approvals.forEach((rid) => _recordAgreement(city, module, rid, false));
    rejections.forEach((rid) => _recordAgreement(city, module, rid, true));
    return logDecision(updated, "rejected");
  }

  return null; // still pending
}

/* ============================ Read-only votes box ============================ */
// For guardrails/anomaly banners (does NOT expose identities publicly in UI)
export function getVotesBox(submissionId) {
  const box = loadJSON(VOTE_KEY(submissionId), { approvals: [], rejections: [] });
  return {
    approvals: Array.isArray(box.approvals) ? box.approvals : [],
    rejections: Array.isArray(box.rejections) ? box.rejections : []
  };
}
