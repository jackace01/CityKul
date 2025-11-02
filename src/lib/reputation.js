// src/lib/reputation.js
// Compute and mutate Reputation using weighted components.
// Public API:
//  - getReputation(userId, city)
//  - applyRepEvent(userId, city, {type, delta?, reason, refId})
//  - setProfessionBaseline(userId, city, profession)
//  - setKycFlags(userId, { phoneEmail?, aadhaar?, pan? })
//  - setJobsProfileCompleted(userId, city)

import { getWeightsForCity } from "./config/weights";

const REP_KEY = (uid, city) => `citykul:rep:${city}:${uid}`;
const REP_EVENTS_KEY = (uid, city) => `citykul:rep:events:${city}:${uid}`;
const PROF_KEY = (uid, city) => `citykul:rep:profession:${city}:${uid}`;
const KYC_KEY = (uid) => `citykul:rep:kyc:${uid}`;
const JOBS_PROFILE_KEY = (uid, city) => `citykul:rep:jobsprofile:${city}:${uid}`;

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    const v = raw ? JSON.parse(raw) : fallback;
    return v ?? fallback;
  } catch { return fallback; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export function setProfessionBaseline(userId, city, profession = "default") {
  saveJSON(PROF_KEY(userId, city), String(profession || "default"));
}
export function setKycFlags(userId, flags = {}) {
  const cur = loadJSON(KYC_KEY(userId), { phoneEmail: false, aadhaar: false, pan: false });
  const next = {
    phoneEmail: !!(flags.phoneEmail ?? cur.phoneEmail),
    aadhaar: !!(flags.aadhaar ?? cur.aadhaar),
    pan: !!(flags.pan ?? cur.pan),
  };
  saveJSON(KYC_KEY(userId), next);
}
export function setJobsProfileCompleted(userId, city, done = true) {
  if (done) saveJSON(JOBS_PROFILE_KEY(userId, city), true);
}

function clamp(x, min, max) { return Math.max(min, Math.min(max, x)); }

export function getReputation(userId, city) {
  const weights = getWeightsForCity(city);
  const baseMap = weights.rep.baseByProfession || {};
  const prof = loadJSON(PROF_KEY(userId, city), "default");
  const base = Number(baseMap[prof] ?? baseMap.default ?? 1.0);

  const kyc = loadJSON(KYC_KEY(userId), { phoneEmail: false, aadhaar: false, pan: false });
  const kycBonus =
    (kyc.phoneEmail ? (weights.rep.kyc.phoneEmail || 0) : 0) +
    (kyc.aadhaar ? (weights.rep.kyc.aadhaar || 0) : 0) +
    (kyc.pan ? (weights.rep.kyc.pan || 0) : 0);

  const jobsProfile = loadJSON(JOBS_PROFILE_KEY(userId, city), false) ? (weights.rep.profileJobsCompleted || 0) : 0;

  // Sum event deltas
  const events = loadJSON(REP_EVENTS_KEY(userId, city), []);
  const sumEvents = (events || []).reduce((s, ev) => s + (Number(ev.delta || 0)), 0);

  const score = base + kycBonus + jobsProfile + sumEvents;
  const min = Number(weights.rep.clamp?.min ?? 0);
  const max = Number(weights.rep.clamp?.max ?? 5000);
  return Number(clamp(score, min, max).toFixed(2));
}

// Generic mutate (admin & system)
export function applyRepEvent(userId, city, { type = "adjust", delta = 0, reason = "", refId = "" } = {}) {
  const ev = { type, delta: Number(delta || 0), reason, refId, ts: Date.now() };
  const key = REP_EVENTS_KEY(userId, city);
  const cur = loadJSON(key, []);
  cur.unshift(ev);
  saveJSON(key, cur.slice(0, 2000));
  return getReputation(userId, city);
}

// Convenience helpers (system rules)
export function repVoteCorrect(userId, city) {
  const w = getWeightsForCity(city);
  return applyRepEvent(userId, city, { type: "voteCorrect", delta: w.rep.voteCorrect, reason: "Vote aligned" });
}
export function repVoteWrong(userId, city) {
  const w = getWeightsForCity(city);
  return applyRepEvent(userId, city, { type: "voteWrong", delta: w.rep.voteWrong, reason: "Vote misaligned" });
}
export function repJobCompleted(userId, city) {
  const w = getWeightsForCity(city);
  return applyRepEvent(userId, city, { type: "jobCompleted", delta: w.rep.jobCompleted, reason: "Job completed" });
}
export function repJobDefault(userId, city) {
  const w = getWeightsForCity(city);
  return applyRepEvent(userId, city, { type: "jobDefault", delta: w.rep.jobDefault, reason: "Job default" });
}
export function repContributionApproved(userId, city) {
  const w = getWeightsForCity(city);
  return applyRepEvent(userId, city, { type: "contribApproved", delta: w.rep.contributionApproved, reason: "Contribution approved" });
}
export function repContributionRejected(userId, city) {
  const w = getWeightsForCity(city);
  return applyRepEvent(userId, city, { type: "contribRejected", delta: w.rep.contributionRejected, reason: "Contribution rejected" });
}
