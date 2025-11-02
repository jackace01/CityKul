// src/lib/voteWeight.js
// Vote-weight changes ONLY from voting outcomes; separate from reputation

import { getWeightsForCity } from "./config/weights";
import { isMember } from "./auth";

const VW_KEY = (userId) => `citykul:voteWeight:${userId}`;
const VW_HIST_KEY = (userId) => `citykul:voteWeight:hist:${userId}`;

function _load(userId) {
  try { return Number(localStorage.getItem(VW_KEY(userId)) || "1"); } catch { return 1; }
}
function _save(userId, val) {
  try { localStorage.setItem(VW_KEY(userId), String(val)); } catch {}
}
function _hist(userId) {
  try { return JSON.parse(localStorage.getItem(VW_HIST_KEY(userId)) || "[]"); } catch { return []; }
}
function _push(userId, row) {
  const arr = _hist(userId);
  arr.unshift(row);
  localStorage.setItem(VW_HIST_KEY(userId), JSON.stringify(arr.slice(0, 400)));
}

function _clamp(v, floor, cap) {
  return Math.max(floor, Math.min(cap, Number(v || 0)));
}

export function getVoteWeight(userId) {
  return _load(userId);
}
export function getVoteWeightHistory(userId) {
  return _hist(userId);
}

export function applyVoteOutcome({ userId, city, correct, refId }) {
  const w = getWeightsForCity(city);
  const floor = Number(w?.voteWeight?.floor ?? 0.3);
  const cap = isMember() ? Number(w?.voteWeight?.capMember ?? 5.0)
                         : Number(w?.voteWeight?.capFree ?? 3.5);
  const delta = correct ? Number(w?.voteWeight?.correct ?? 0.05)
                        : Number(w?.voteWeight?.wrong ?? -0.07);

  const cur = _load(userId);
  const next = _clamp(cur + delta, floor, cap);
  _save(userId, next);
  _push(userId, { ts: Date.now(), city, delta, correct: !!correct, refId, after: next });
  return next;
}
