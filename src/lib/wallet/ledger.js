// src/lib/wallet/ledger.js
// Append-only per-user ledger with "posted" and "pending" buckets.

import { loadJSON, saveJSON } from "../storage.js";

const LEDGER_KEY = (userId) => `citykul:wallet:ledger:${userId || "guest"}`;
const META_KEY = (userId) => `citykul:wallet:meta:${userId || "guest"}`; // e.g., lastPostIso

function loadAll(userId) {
  const d = loadJSON(LEDGER_KEY(userId), { posted: [], pending: [] });
  if (!Array.isArray(d.posted)) d.posted = [];
  if (!Array.isArray(d.pending)) d.pending = [];
  return d;
}

function saveAll(userId, data) {
  saveJSON(LEDGER_KEY(userId), data);
}

function loadMeta(userId) {
  return loadJSON(META_KEY(userId), { lastPostIso: "" });
}
function saveMeta(userId, meta) {
  saveJSON(META_KEY(userId), meta || {});
}

export function getPosted(userId) {
  return loadAll(userId).posted;
}
export function getPending(userId) {
  return loadAll(userId).pending;
}
export function getMeta(userId) {
  return loadMeta(userId);
}

export function appendPending(userId, entry) {
  const all = loadAll(userId);
  all.pending.unshift(normalizeEntry(entry));
  saveAll(userId, all);
  return all.pending[0];
}

export function appendPosted(userId, entry) {
  const all = loadAll(userId);
  all.posted.unshift(normalizeEntry(entry));
  saveAll(userId, all);
  return all.posted[0];
}

export function postAllPendingNow(userId) {
  const all = loadAll(userId);
  if (!all.pending.length) return 0;
  // move pending -> posted
  const moved = all.pending.splice(0, all.pending.length).map((e) => ({
    ...e,
    postedTs: Date.now(),
    state: "posted",
  }));
  all.posted.unshift(...moved);
  saveAll(userId, all);
  // mark meta
  const meta = loadMeta(userId);
  meta.lastPostIso = new Date().toISOString().slice(0, 10);
  saveMeta(userId, meta);
  return moved.length;
}

export function clearAll(userId) {
  saveAll(userId, { posted: [], pending: [] });
}

export function computePostedBalance(userId) {
  const posted = getPosted(userId);
  const sum = posted.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  return Number(sum || 0);
}

export function getMergedLedger(userId) {
  const { posted, pending } = loadAll(userId);
  return [
    ...pending.map((e) => ({ ...e, state: "pending" })),
    ...posted.map((e) => ({ ...e, state: "posted" })),
  ].sort((a, b) => (b.ts || b.postedTs || 0) - (a.ts || a.postedTs || 0));
}

let _idCounter = 0;
function nextId() {
  _idCounter += 1;
  return `wl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}-${_idCounter}`;
}

function normalizeEntry(e) {
  const now = Date.now();
  return {
    id: e?.id || nextId(),
    ts: e?.ts || now,
    amount: Number(e?.amount || 0), // + credit, - debit
    reason: e?.reason || "",
    module: e?.module || "general",
    refId: e?.refId || "",
    city: e?.city || "",
    meta: e?.meta || {},
    state: e?.state || "pending",
  };
}
