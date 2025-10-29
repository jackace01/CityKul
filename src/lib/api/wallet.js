// src/lib/api/wallet.js
// Local wallet with balances, ledger, and simple ESCROW holds (all localStorage).
// Safe mocks for testing flows end-to-end.

import { loadJSON, saveJSON } from "../storage.js";

const KEY = (userId) => `citykul:wallet:${userId || "guest"}`;
const HOLDS_KEY = "citykul:wallet:holds"; // array of {orderId, fromId, toId?, amount, status, memo, ts}

function load(userId) {
  return loadJSON(KEY(userId), { balance: 0, ledger: [] });
}
function save(userId, data) {
  saveJSON(KEY(userId), data);
}

export function getLedger(userId) {
  const { ledger } = load(userId);
  return Array.isArray(ledger) ? ledger : [];
}
export function getBalance(userId) {
  const { balance } = load(userId);
  return Number(balance || 0);
}

/* --------------------------- Basic ops ---------------------------- */
export function deposit(userId, points, reason = "Deposit") {
  const cur = load(userId);
  const amt = Number(points || 0);
  cur.ledger.unshift({
    id: `w-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: Date.now(),
    points: amt,
    reason
  });
  cur.balance = Number(cur.balance || 0) + amt;
  save(userId, cur);
  return cur;
}

export function withdraw(userId, points, reason = "Withdraw") {
  const cur = load(userId);
  const amt = Number(points || 0);
  if ((cur.balance || 0) < amt) throw new Error("Insufficient balance");
  cur.ledger.unshift({
    id: `w-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: Date.now(),
    points: -amt,
    reason
  });
  cur.balance = Number(cur.balance || 0) - amt;
  save(userId, cur);
  return cur;
}

export function transfer(fromId, toId, points, reason = "Transfer") {
  if (String(fromId) === String(toId)) return;
  withdraw(fromId, points, `${reason} → ${toId}`);
  deposit(toId, points, `${reason} ← ${fromId}`);
}

/** Back-compat helpers used elsewhere */
export function addPoints(userId, points, reason = "") {
  return deposit(userId, points, reason || "Adjustment");
}
export function ensureDemoWallet(userId, isMember = false) {
  const cur = load(userId);
  if (cur.ledger.length) return cur;
  if (isMember) deposit(userId, 50, "Welcome bonus for becoming a member");
  return load(userId);
}

/* --------------------------- ESCROW holds -------------------------- */
function loadHolds() { return loadJSON(HOLDS_KEY, []); }
function saveHolds(arr) { saveJSON(HOLDS_KEY, arr || []); }

/**
 * createHold(orderId, fromId, amount, memo?)
 *  - deducts from fromId balance immediately and parks in hold bucket
 */
export function createHold(orderId, fromId, amount, memo = "") {
  const amt = Number(amount || 0);
  if (amt <= 0) throw new Error("Invalid hold amount");
  // deduct
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
 *  - moves held funds to the owner
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
 *  - returns held funds back to payer
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
