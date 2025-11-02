// src/lib/review.js
// Reputation/verification-weighted review engine with dynamic quorum + moderation log.
// Now integrates separate Vote-Weight engine + Reputation deltas post-finalization.

import { loadJSON, saveJSON } from "./storage.js";
import { getCityEconomy } from "./config/economy.js";

// NEW: separate engines
import { applyVoteOutcome } from "./voteWeight";
import { repVoteCorrect, repVoteWrong } from "./reputation";

/* ============================ Keys & constants ============================ */

const REVIEWERS_KEY = (city, mod) => `citykul:reviewers:${city}:${mod}`;
const SUBMIT_ALL_KEY = (mod) => `citykul:${mod}:submissions`;
const PENDING_KEY = (city, mod) => `citykul:${mod}:pending:${city}`;
const APPROVED_KEY = (city, mod) => `citykul:${mod}:approved:${city}`;
const REJECTED_KEY = (city, mod) => `citykul:${mod}:rejected:${city}`;
const VOTE_KEY = (id) => `citykul:votes:${id}`;

// moderation log (global)
const MODLOG_KEY = "citykul:modlog";

// agreement + activity (per city+module)
const AGREEMENT_KEY  = (city, mod) => `citykul:agree:${city}:${mod}`;       // { reviewerId: {agree, total} }
const ACTIVITY_KEY   = (city, mod) => `citykul:activity:${city}:${mod}`;    // [{ reviewerId, ts }]

// verification profile store
const VERIFY_KEY = (rid) => `citykul:verify:profile:${rid}`;

// util
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function now() { return Date.now(); }
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
}

/* ============================ Verification profile ============================ */

export function getVerificationProfile(reviewerId) {
  try {
    const raw = localStorage.getItem(VERIFY_KEY(reviewerId));
    const obj = raw ? JSON.parse(raw) : null;
    if (obj && typeof obj === "object") return {
      phone: !!obj.phone,
      kyc: !!obj.kyc,
      address: !!obj.address,
    };
  } catch {}
  return { phone: false, kyc: false, address: false };
}

export function setVerificationProfile(reviewerId, profile = {}) {
  try {
    const clean = {
      phone: !!profile.phone,
      kyc: !!profile.kyc,
      address: !!profile.address,
    };
    localStorage.setItem(VERIFY_KEY(reviewerId), JSON.stringify(clean));
  } catch {}
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

/* ============================ Agreement (accuracy) & activity ============================ */

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
}

function _getAccuracy(city, mod, reviewerId) {
  const m = _getAgreeMap(city, mod);
  const cur = m[reviewerId] || { agree: 0, total: 0 };
  if (!cur.total) return 0.5;
  return clamp(cur.agree / cur.total, 0, 1);
}

function _pushActivity(city, mod, reviewerId) {
  const arr = loadJSON(ACTIVITY_KEY(city, mod), []);
  arr.push({ reviewerId, ts: now() });
  const cfg = getCityEconomy(city);
  const days = Number(cfg?.voting?.activityWindowDays ?? 14);
  const cutoff = now() - days * 24 * 60 * 60 * 1000;
  const pruned = arr.filter(x => x.ts >= cutoff);
  saveJSON(ACTIVITY_KEY(city, mod), pruned);
}
function _activeRate(city, mod) {
  const total = getReviewers(city, mod).length || 0;
  if (!total) return 0;
  const cfg = getCityEconomy(city);
  const days = Number(cfg?.voting?.activityWindowDays ?? 14);
  const arr = loadJSON(ACTIVITY_KEY(city, mod), []);
  const cutoff = now() - days * 24 * 60 * 60 * 1000;
  const unique = new Set(arr.filter(x => x.ts >= cutoff).map(x => x.reviewerId)).size;
  return clamp(unique / total, 0, 1);
}

/* ============================ Voting weight (legacy W) ============================ */

export function getVoteWeight(city, mod, reviewerId) {
  // This legacy getter remains for quorum math; your separate vote-weight UI uses lib/voteWeight.
  const cfg = getCityEconomy(city);
  const vb = cfg?.voting?.verificationBonus || {};
  const ver = getVerificationProfile(reviewerId);
  const V =
    (ver.phone ? Number(vb.phone ?? 1.0) : 0) +
    (ver.kyc ? Number(vb.kyc ?? 1.5) : 0) +
    (ver.address ? Number(vb.address ?? 0.5) : 0);

  // Reputation via accuracy -> R in [0..2]
  const R = _getAccuracy(city, mod, reviewerId) * 2;

  const W = clamp((V + R), 0, 10);
  return Number(W.toFixed(2));
}

function _targetPercent(city, mod) {
  const cfg = getCityEconomy(city);
  const tMin = Number(cfg?.voting?.targetMin ?? 0.60);
  const tMax = Number(cfg?.voting?.targetMax ?? 0.80);
  const ar = _activeRate(city, mod);
  return clamp(tMin + (tMax - tMin) * ar, 0.5, 0.95);
}
function _moduleThresholdTau(city, mod) {
  const cfg = getCityEconomy(city);
  const tiersByModule = cfg?.voting?.tiersByModule || {};
  const tier = tiersByModule[mod] || "low";
  const th = cfg?.voting?.thresholds || {};
  const tau = Number(th[tier]);
  return Number.isFinite(tau) ? clamp(tau, 0.5, 0.95) : 0.6;
}
function _totalPotentialWeight(city, mod) {
  const reviewers = getReviewers(city, mod);
  if (!reviewers.length) return 0;
  return reviewers.reduce((w, r) => w + getVoteWeight(city, mod, r), 0);
}

/* ============================ Transparency helpers ============================ */

export function quorumInfo(city, mod) {
  const totalReviewers = getReviewers(city, mod).length;
  const totalWeight = _totalPotentialWeight(city, mod);
  const targetPercent = _targetPercent(city, mod);
  const neededWeight = totalWeight * targetPercent;
  const cfg = getCityEconomy(city);
  const windowDays = Number(cfg?.voting?.activityWindowDays ?? 14);

  return {
    totalReviewers,
    totalWeight: Number(totalWeight.toFixed(2)),
    targetPercent: Number(targetPercent.toFixed(2)),
    neededWeight: Number(neededWeight.toFixed(2)),
    windowDays,
    activeRate: Number(_activeRate(city, mod).toFixed(2)),
    tau: Number(_moduleThresholdTau(city, mod).toFixed(2)),
  };
}
export function quorumNeeded(city, mod) {
  const total = getReviewers(city, mod).length;
  const pct = _targetPercent(city, mod);
  return Math.max(1, Math.ceil(total * pct));
}

/* ============================ Submissions lifecycle ============================ */

export function submit(mod, payload) {
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

  saveJSON(VOTE_KEY(id), { approvals: [], rejections: [] });
  return rec;
}
export function getSubmissionById(mod, id) {
  const all = loadJSON(SUBMIT_ALL_KEY(mod), []);
  return all.find((r) => r.id === id) || null;
}
export function listPending(city, mod) { return loadJSON(PENDING_KEY(city, mod), []); }
export function listApproved(city, mod) { return loadJSON(APPROVED_KEY(city, mod), []); }
export function listRejected(city, mod) { return loadJSON(REJECTED_KEY(city, mod), []); }

/* ============================ Voting ============================ */

export function vote(mod, submissionId, reviewerId, approve) {
  const box = loadJSON(VOTE_KEY(submissionId), { approvals: [], rejections: [] });
  const rid = String(reviewerId || "");

  box.approvals = (box.approvals || []).filter((u) => u !== rid);
  box.rejections = (box.rejections || []).filter((u) => u !== rid);

  if (approve) box.approvals.push(rid);
  else box.rejections.push(rid);

  saveJSON(VOTE_KEY(submissionId), box);

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

  const all = loadJSON(SUBMIT_ALL_KEY(rec.module), []);
  const idx = all.findIndex((r) => r.id === rec.id);
  if (idx >= 0) { all[idx] = updated; saveJSON(SUBMIT_ALL_KEY(rec.module), all); }
  return updated;
}

/* ============================ Moderation log ============================ */

function _pushModLog(entry) {
  const arr = loadJSON(MODLOG_KEY, []);
  arr.unshift(entry);
  const capped = arr.slice(0, 2000);
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
export function clearModerationLog() { saveJSON(MODLOG_KEY, []); }

/* ============================ Finalization (+rep & vote-weight updates) ============================ */

export function tryFinalize(mod, submissionId) {
  const rec = getSubmissionById(mod, submissionId);
  if (!rec || rec.status !== "pending") return null;

  const { approvals = [], rejections = [] } = loadJSON(VOTE_KEY(submissionId), { approvals: [], rejections: [] });

  const city = rec.city;
  const module = rec.module;

  // weighted tallies with W = V + accuracy contribution
  const approvalWeight = approvals.reduce((w, rid) => w + getVoteWeight(city, module, rid), 0);
  const rejectionWeight = rejections.reduce((w, rid) => w + getVoteWeight(city, module, rid), 0);

  const totalWeight = _totalPotentialWeight(city, module);
  const targetPercent = _targetPercent(city, module);
  const neededWeight = totalWeight * targetPercent;

  const tau = _moduleThresholdTau(city, module);
  const castTotal = approvalWeight + rejectionWeight;
  const approvalRatio = castTotal > 0 ? (approvalWeight / castTotal) : 0;

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
        tau: Number(tau.toFixed(2)),
        approvals: approvals.length,
        rejections: rejections.length,
        approvalWeight: Number(approvalWeight.toFixed(2)),
        rejectionWeight: Number(rejectionWeight.toFixed(2)),
        approvalRatio: Number(approvalRatio.toFixed(2)),
      },
    });
    return updated;
  }

  // finalize only when enough total WEIGHT has participated on either side
  if (approvalWeight >= neededWeight && approvalRatio >= tau) {
    const updated = moveBetweenBuckets(rec, PENDING_KEY, APPROVED_KEY, "approved");

    // Accuracy bookkeeping
    approvals.forEach((rid) => _recordAgreement(city, module, rid, true));
    rejections.forEach((rid) => _recordAgreement(city, module, rid, false));

    // Update separate vote-weight & reputation per voter
    approvals.forEach((rid) => {
      const isMember = false; // wire actual membership lookup if needed
      applyVoteOutcome(rid, city, isMember, { correct: true });
      repVoteCorrect(rid, city);
    });
    rejections.forEach((rid) => {
      const isMember = false;
      applyVoteOutcome(rid, city, isMember, { correct: false });
      repVoteWrong(rid, city);
    });

    return logDecision(updated, "approved");
  }
  if (rejectionWeight >= neededWeight && (1 - approvalRatio) >= tau) {
    const updated = moveBetweenBuckets(rec, PENDING_KEY, REJECTED_KEY, "rejected");

    approvals.forEach((rid) => _recordAgreement(city, module, rid, false));
    rejections.forEach((rid) => _recordAgreement(city, module, rid, true));

    approvals.forEach((rid) => {
      const isMember = false;
      applyVoteOutcome(rid, city, isMember, { correct: false });
      repVoteWrong(rid, city);
    });
    rejections.forEach((rid) => {
      const isMember = false;
      applyVoteOutcome(rid, city, isMember, { correct: true });
      repVoteCorrect(rid, city);
    });

    return logDecision(updated, "rejected");
  }

  return null; // still pending
}

/* ============================ Read-only votes box ============================ */
export function getVotesBox(submissionId) {
  const box = loadJSON(VOTE_KEY(submissionId), { approvals: [], rejections: [] });
  return {
    approvals: Array.isArray(box.approvals) ? box.approvals : [],
    rejections: Array.isArray(box.rejections) ? box.rejections : []
  };
}
