// src/lib/wallet/ops.js
// High-level wallet operations built on top of the ledger.

import {
  appendPending,
  appendPosted,
  computePostedBalance,
  getMergedLedger,
  postAllPendingNow,
} from "./ledger.js";

// ----- Public getters -----
export function getBalance(userId) {
  return computePostedBalance(userId);
}

export function getLedger(userId) {
  return getMergedLedger(userId);
}

// ----- Immediate ops (take effect now; no daily posting) -----
export function depositImmediate(userId, amount, reason = "Deposit", meta = {}) {
  if (!amount) return;
  return appendPosted(userId, { amount: Math.abs(Number(amount)), reason, meta });
}

export function withdrawImmediate(userId, amount, reason = "Withdraw", meta = {}) {
  const amt = Math.abs(Number(amount || 0));
  if (!amt) return;
  const bal = getBalance(userId);
  if (bal < amt) throw new Error("Insufficient balance");
  return appendPosted(userId, { amount: -amt, reason, meta });
}

export function transferImmediate(fromId, toId, amount, reason = "Transfer", meta = {}) {
  if (String(fromId) === String(toId)) return;
  withdrawImmediate(fromId, amount, `${reason} → ${toId}`, meta);
  depositImmediate(toId, amount, `${reason} ← ${fromId}`, meta);
}

// ----- Pending rewards (will post at 23:00) -----
export function rewardPending(userId, amount, reason = "Reward", meta = {}) {
  if (!amount) return;
  return appendPending(userId, { amount: Math.abs(Number(amount)), reason, meta });
}

export function rewardSplitPending(userIds = [], total = 0, reason = "Reward split", meta = {}) {
  const n = userIds.length || 0;
  const amt = Number(total || 0);
  if (!n || !amt) return [];
  const each = Math.floor((amt * 100) / n) / 100; // 2-dec split
  return userIds.map((uid) => rewardPending(uid, each, reason, meta));
}

// ----- Daily posting -----
export function postDueForUser(userId) {
  // Move all pending -> posted immediately (used by scheduler or manual trigger)
  return postAllPendingNow(userId);
}

// ----- Back-compat helpers (old API names) -----
export function addPoints(userId, points, reason = "Adjustment") {
  return depositImmediate(userId, points, reason);
}

export function ensureDemoWallet(userId, isMember = false) {
  // No-op init; optionally grant a welcome bonus one-time via posted entry
  const key = `citykul:wallet:demo_bonus:${userId || "guest"}`;
  try {
    if (isMember && !localStorage.getItem(key)) {
      depositImmediate(userId, 50, "Welcome bonus for becoming a member");
      localStorage.setItem(key, "1");
    }
  } catch {}
}
