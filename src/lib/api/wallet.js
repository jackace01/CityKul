// src/lib/api/wallet.js
// Public wallet API (back-compat) now backed by unified ledger.
// Existing "holds" remain for now; they’ll be migrated in a later step.

import { loadJSON, saveJSON } from "../storage.js";
import {
  getBalance as _getBalance,
  getLedger as _getLedger,
  depositImmediate,
  withdrawImmediate,
  transferImmediate,
  addPoints as _addPoints,
  ensureDemoWallet as _ensureDemoWallet,
} from "../wallet/ops.js";
import { getCityEconomy } from "../config/economy.js";
import { getUser } from "../auth.js";
import { getMeta as _getMeta } from "../wallet/ledger.js";
import { startWalletSchedulerForUser } from "../wallet/scheduler.js";

/* ---------------------- Exposed getters (back-compat) ---------------------- */
export function getLedger(userId) {
  return _getLedger(userId);
}
export function getBalance(userId) {
  return _getBalance(userId);
}

/* --------------------------- Basic ops (posted) --------------------------- */
export function deposit(userId, points, reason = "Deposit") {
  return depositImmediate(userId, points, reason);
}
export function withdraw(userId, points, reason = "Withdraw") {
  return withdrawImmediate(userId, points, reason);
}
export function transfer(fromId, toId, points, reason = "Transfer") {
  return transferImmediate(fromId, toId, points, reason);
}

/** Back-compat helpers used elsewhere */
export function addPoints(userId, points, reason = "") {
  return _addPoints(userId, points, reason || "Adjustment");
}
export function ensureDemoWallet(userId, isMember = false) {
  _ensureDemoWallet(userId, isMember);
  // start per-user scheduler (no-op if already started by other mounts)
  try {
    const u = getUser();
    const uid = userId || u?.email || u?.name || "guest@demo";
    const city = u?.city || localStorage.getItem("citykul:city") || "Indore";
    // bootstrap scheduler for this user
    startWalletSchedulerForUser(uid, city, _getMeta);
  } catch {}
}

/* --------------------------- ESCROW holds (legacy) -------------------------- */
// Keeping your existing holds store intact for now. We’ll unify into the ledger in Step 3.
const HOLDS_KEY = "citykul:wallet:holds"; // array of {orderId, fromId, toId?, amount, status, memo, ts}

function loadHolds() { return loadJSON(HOLDS_KEY, []); }
function saveHolds(arr) { saveJSON(HOLDS_KEY, arr || []); }

/**
 * createHold(orderId, fromId, amount, memo?)
 * - withdraws immediately (posted) and parks in holds
 */
export function createHold(orderId, fromId, amount, memo = "") {
  const amt = Number(amount || 0);
  if (amt <= 0) throw new Error("Invalid hold amount");
  // deduct posted immediately for certainty
  withdraw(fromId, amt, `Escrow hold for ${orderId}`);
  const all = loadHolds();
  const exists = all.find(h => h.orderId === orderId && h.status === "held");
  if (exists) throw new Error("Hold already exists");
  all.unshift({ orderId, fromId, toId: null, amount: amt, status: "held", memo, ts: Date.now() });
  saveHolds(all);
  return all[0];
}

/**
 * releaseHold(orderId, toId)
 * - moves held funds to the owner (posted)
 */
export function releaseHold(orderId, toId) {
  const all = loadHolds();
  const i = all.findIndex(h => h.orderId === orderId && h.status === "held");
  if (i === -1) throw new Error("No active hold");
  const h = all[i];
  all[i] = { ...h, status: "released", toId, releasedAt: Date.now() };
  saveHolds(all);
  deposit(toId, h.amount, `Escrow release for ${orderId}`);
  return all[i];
}

/**
 * refundHold(orderId)
 * - returns held funds back to payer (posted)
 */
export function refundHold(orderId) {
  const all = loadHolds();
  const i = all.findIndex(h => h.orderId === orderId && h.status === "held");
  if (i === -1) throw new Error("No active hold");
  const h = all[i];
  all[i] = { ...h, status: "refunded", refundedAt: Date.now() };
  saveHolds(all);
  deposit(h.fromId, h.amount, `Escrow refund for ${orderId}`);
  return all[i];
}

export function getAllHolds() { return loadHolds(); }
export function getUserHolds(userId) {
  return loadHolds().filter(h => h.fromId === userId || h.toId === userId);
}
