// src/lib/stake.js
// Reputation stake engine for Jobs (no cash bond).
// Public API:
//  - previewStake(userId, city, currentRep) -> { stake, policy }
//  - lockStake(userId, city, currentRep, { jobId })
//  - releaseOnSuccess(userId, city, { jobId })
//  - burnOnDefault(userId, city, { jobId })

import { getWeightsForCity } from "./config/weights";
import { getReputation, applyRepEvent } from "./reputation";

const STAKE_KEY = (uid, city) => `citykul:stake:${city}:${uid}`; // { jobId: { stake, status } }

function load(key, fb) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fb; } catch { return fb; } }
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

export function previewStake(userId, city, currentRep) {
  const w = getWeightsForCity(city);
  const stake = Math.max(0, Math.floor((w.stake.percentAtAccept || 0.3) * Number(currentRep || 0)));
  return { stake, policy: w.stake };
}

export function lockStake(userId, city, currentRep, { jobId }) {
  const { stake, policy } = previewStake(userId, city, currentRep);
  const map = load(STAKE_KEY(userId, city), {});
  map[jobId] = { stake, status: "locked", ts: Date.now() };
  save(STAKE_KEY(userId, city), map);
  // Deduct via reputation delta (negative)
  if (stake > 0) applyRepEvent(userId, city, { type: "stakeLock", delta: -stake, reason: `Stake lock for job ${jobId}`, refId: jobId });
  return { stake, policy };
}

export function releaseOnSuccess(userId, city, { jobId }) {
  const map = load(STAKE_KEY(userId, city), {});
  const row = map[jobId];
  if (!row || row.status !== "locked") return null;
  row.status = "released";
  row.releasedAt = Date.now();
  save(STAKE_KEY(userId, city), map);

  const w = getWeightsForCity(city);
  const bonus = Math.floor((w.stake.bonusOnSuccess || 0.1) * (row.stake || 0));
  // Return stake + bonus to reputation
  if (row.stake) applyRepEvent(userId, city, { type: "stakeReturn", delta: row.stake, reason: `Stake release for job ${jobId}`, refId: jobId });
  if (bonus) applyRepEvent(userId, city, { type: "stakeBonus", delta: bonus, reason: `Stake bonus for job ${jobId}`, refId: jobId });

  return { returned: row.stake, bonus };
}

export function burnOnDefault(userId, city, { jobId }) {
  const map = load(STAKE_KEY(userId, city), {});
  const row = map[jobId];
  if (!row || row.status !== "locked") return null;
  row.status = "burnt";
  row.burntAt = Date.now();
  save(STAKE_KEY(userId, city), map);

  const w = getWeightsForCity(city);
  const burnPct = Number(w.stake.burnOnDefault || 1.0); // 1.0 = 100%
  const burn = Math.floor(burnPct * (row.stake || 0));
  if (burn) applyRepEvent(userId, city, { type: "stakeBurn", delta: -burn, reason: `Stake burn for job ${jobId}`, refId: jobId });
  return { burnt: burn };
}

export function getOpenStakes(userId, city) {
  const map = load(STAKE_KEY(userId, city), {});
  return Object.entries(map)
    .filter(([, v]) => v && v.status === "locked")
    .map(([k, v]) => ({ jobId: k, ...v }));
}

// Helper to get live reputation after any stake ops
export function getLiveReputation(userId, city) {
  return getReputation(userId, city);
}
