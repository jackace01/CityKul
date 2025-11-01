// src/lib/api/marketplace.js
// Back-compat + Escrow Orders + Payer-borne Fees + Messaging (localStorage only)

import { computeRentalFees } from "../fees"; // reuse same fee engine as rentals
import {
  submit,
  listApproved,
  listPending,
  vote,
  tryFinalize,
  ensureReviewer,
  getReviewers,
  quorumNeeded,
} from "../review";

// ---------------- Local helpers ----------------
function loadJSON(k, f = []) {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch { return f; }
}
function saveJSON(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

// Overlay (e.g., stock)
const OVERLAY_KEY = "citykul:market:overlay"; // { [itemId]: { stock?: number } }
function loadOverlay() { return loadJSON(OVERLAY_KEY, {}); }
function saveOverlay(o) { saveJSON(OVERLAY_KEY, o); }
function getOverlay(itemId) { return loadOverlay()[itemId] || {}; }
function mergeOverlay(base, itemId) { return { ...base, ...getOverlay(itemId) }; }
export function setStock(itemId, stock) {
  const all = loadOverlay();
  all[itemId] = { ...(all[itemId] || {}), stock: Math.max(0, Number(stock || 0)) };
  saveOverlay(all);
}

// Wallet (optional)
let wallet = null;
try {
  wallet = await import("./wallet.js");
} catch { wallet = null; }

// ---------------- Shape mappers ----------------
// New, richer shape (kept internal)
function toRichShape(rec) {
  const d = rec.data || {};
  const rich = {
    id: rec.id,
    approved: rec.status === "approved",
    title: d.title || d.name || "Marketplace Item",
    category: d.category || "General",
    description: d.description || "",
    price: Number(d.price ?? 0),
    deposit: Number(d.deposit ?? 0),
    sellerId: d.sellerId || d.ownerId || "", // tolerate old payloads
    ownerId: d.ownerId || d.sellerId || "", // back-compat alias
    where: d.location || d.locality || rec.city, // back-compat
    city: rec.city || "",
    media: Array.isArray(d.media) ? d.media : [],
    stock: Number(d.stock ?? 0),
    createdAt: rec.createdAt || Date.now(),
  };
  return mergeOverlay(rich, rich.id);
}

// Your original light shape (for old list pages)
function toCompatShape(rec) {
  const r = toRichShape(rec);
  return {
    id: r.id,
    approved: r.approved,
    title: r.title,
    price: r.price,
    where: r.where,
    category: r.category,
    city: r.city,
    createdAt: r.createdAt,
    ownerId: r.ownerId,
  };
}

// ---------------- Submissions & lists ----------------
function _city() { return localStorage.getItem("citykul:city") || "Indore"; }

export function submitMarketItem(payload) { return submit("marketplace", payload); }
export function listPendingMarket(city) { return listPending(city, "marketplace").map(toRichShape); }
export function listApprovedMarket(city) { return listApproved(city || _city(), "marketplace").map(toRichShape); }
export function voteMarket(id, reviewerId, approve) {
  vote("marketplace", id, reviewerId, approve);
  return tryFinalize("marketplace", id);
}

// ---- Back-compat aliases (keep your Marketplace.jsx working) ----
export function submitListing(payload) { return submitMarketItem(payload); }
export function listPendingListings(city) { return listPending(city, "marketplace").map(toCompatShape); }
export function listApprovedListings(city) { return listApproved(city || _city(), "marketplace").map(toCompatShape); }
export function voteListing(id, reviewerId, approve) { return voteMarket(id, reviewerId, approve); }

// Reviewers
export function ensureMarketReviewer(city, reviewerId) { ensureReviewer(city, "marketplace", reviewerId); }
export function getMarketReviewers(city) { return getReviewers(city, "marketplace"); }
export function getMarketQuorum(city) { return quorumNeeded(city, "marketplace"); }

// ---- Back-compat reviewer names ----
export function ensureMarketplaceReviewer(city, reviewerId) { return ensureMarketReviewer(city, reviewerId); }
export function getMarketplaceReviewers(city) { return getMarketReviewers(city); }
export function getMarketplaceQuorum(city) { return getMarketQuorum(city); }

// ---------------- Get one ----------------
export function getMarketItemById(city, id) {
  const rows = listApprovedMarket(city);
  return rows.find((r) => r.id === id) || null;
}

// ---------------- Orders + Messaging (escrow) ----------------
const ORDERS_KEY = "citykul:market:orders";
const MSG_KEY = (orderId) => `citykul:market:messages:${orderId}`;
const LEDGER_KEY = "citykul:market:ledger"; // local diagnostics

function loadOrders() { return loadJSON(ORDERS_KEY, []); }
function saveOrders(arr) { saveJSON(ORDERS_KEY, arr || []); }
function updateOrder(id, patch) {
  const all = loadOrders();
  const i = all.findIndex((o) => o.id === id);
  if (i === -1) return null;
  const next = { ...all[i], ...patch };
  all[i] = next;
  saveOrders(all);
  return next;
}

/** createMarketOrder({ itemId, buyerId, buyerName, qty }) */
export function createMarketOrder({ itemId, buyerId, buyerName = "You", qty = 1 }) {
  const city = _city();
  const item = getMarketItemById(city, itemId);
  if (!item) throw new Error("Item not found or not approved");

  const quantity = Math.max(1, Number(qty || 1));
  const stock = Number(item.stock || 0);
  if (stock && quantity > stock) throw new Error("Insufficient stock");

  const unitPrice = Number(item.price || 0);
  const subtotal = unitPrice * quantity;
  const deposit = Number(item.deposit || 0);

  // platform% based on subtotal + fixed fee; deposit excluded from % calc
  const fee = computeRentalFees({ rent: subtotal, deposit });

  const order = {
    id: `mord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,
    itemId,
    sellerId: item.sellerId || item.ownerId || "",
    buyerId,
    buyerName,
    city: item.city,
    qty: quantity,
    unitPrice,
    subtotal,
    deposit,
    total: subtotal + deposit, // escrow only
    feeSummary: {
      platformFee: fee.platformFee,
      fixedFee: fee.fixedFee,
      totalFee: fee.totalFee,
    },
    status: "created", // created -> paid_hold -> accepted -> dispatched -> delivered -> completed
    timeline: [{ at: Date.now(), by: buyerId, action: "created" }],
    ts: Date.now(),
  };

  const list = loadOrders();
  list.unshift(order);
  saveOrders(list);

  const ledger = loadJSON(LEDGER_KEY, []);
  ledger.unshift({
    id: `txn-${Date.now().toString(36)}`,
    type: "market-create",
    orderId: order.id,
    itemId,
    buyerId,
    sellerId: order.sellerId,
    total: order.total,
    ts: Date.now(),
  });
  saveJSON(LEDGER_KEY, ledger);

  return order;
}
export function listMarketOrders() { return loadOrders(); }

/** payForOrder: buyer creates escrow hold (subtotal+deposit) and pays fees to platform immediately */
export function payForOrder(orderId, buyerId) {
  const o = listMarketOrders().find((x) => x.id === orderId);
  if (!o) throw new Error("Order not found");
  if (o.buyerId !== buyerId) throw new Error("Only buyer can pay");
  if (o.status !== "created") throw new Error("Order not payable");
  if (!wallet?.createHold) throw new Error("Wallet not available");

  // 1) Escrow hold
  wallet.createHold(orderId, buyerId, o.total, `Escrow for item ${o.itemId}`);

  // 2) Fees to platform (payer-borne)
  const fee = computeRentalFees({ rent: o.subtotal || 0, deposit: o.deposit || 0 });
  const platformId = "platform@citykul";
  if (wallet?.transfer && fee.totalFee > 0) {
    wallet.transfer(buyerId, platformId, fee.totalFee, `Platform & booking fee for ${orderId}`);
  }

  return updateOrder(orderId, {
    status: "paid_hold",
    timeline: [...(o.timeline || []), { at: Date.now(), by: buyerId, action: "paid_hold" }],
  });
}

export function acceptOrder(orderId, sellerId) {
  const o = listMarketOrders().find((x) => x.id === orderId);
  if (!o) throw new Error("Order not found");
  if (o.sellerId !== sellerId) throw new Error("Only seller can accept");
  if (o.status !== "paid_hold") throw new Error("Order not in paid state");

  // soft reduce overlay stock
  try {
    const city = _city();
    const item = getMarketItemById(city, o.itemId);
    if (item?.stock) setStock(o.itemId, Math.max(0, Number(item.stock) - Number(o.qty || 1)));
  } catch {}

  return updateOrder(orderId, {
    status: "accepted",
    timeline: [...(o.timeline || []), { at: Date.now(), by: sellerId, action: "accepted" }],
  });
}

export function markDispatched(orderId, sellerId) {
  const o = listMarketOrders().find((x) => x.id === orderId);
  if (!o) throw new Error("Order not found");
  if (o.sellerId !== sellerId) throw new Error("Only seller can dispatch");
  if (o.status !== "accepted") throw new Error("Order not accepted");
  return updateOrder(orderId, {
    status: "dispatched",
    timeline: [...(o.timeline || []), { at: Date.now(), by: sellerId, action: "dispatched" }],
  });
}

export function markDelivered(orderId, buyerId) {
  const o = listMarketOrders().find((x) => x.id === orderId);
  if (!o) throw new Error("Order not found");
  if (o.buyerId !== buyerId) throw new Error("Only buyer can mark delivered");
  if (!["dispatched", "accepted"].includes(o.status)) throw new Error("Order not deliverable yet");
  return updateOrder(orderId, {
    status: "delivered",
    timeline: [...(o.timeline || []), { at: Date.now(), by: buyerId, action: "delivered" }],
  });
}

export function releaseEscrow(orderId, sellerId) {
  const o = listMarketOrders().find((x) => x.id === orderId);
  if (!o) throw new Error("Order not found");
  if (o.sellerId !== sellerId) throw new Error("Only seller can release");
  if (!["delivered", "accepted"].includes(o.status)) throw new Error("Order not releasable");
  if (!wallet?.releaseHold) throw new Error("Wallet not available");

  wallet.releaseHold(orderId, sellerId);
  return updateOrder(orderId, {
    status: "completed",
    timeline: [...(o.timeline || []), { at: Date.now(), by: sellerId, action: "released" }],
  });
}

export function cancelOrder(orderId, byUser) {
  const o = listMarketOrders().find((x) => x.id === orderId);
  if (!o) throw new Error("Order not found");
  if (!["created", "paid_hold"].includes(o.status)) throw new Error("Order not cancelable now");

  if (o.status === "paid_hold" && wallet?.refundHold) {
    wallet.refundHold(orderId);
  }
  return updateOrder(orderId, {
    status: "canceled",
    timeline: [...(o.timeline || []), { at: Date.now(), by: byUser, action: "canceled" }],
  });
}

export function openDispute(orderId, byUser) {
  const o = listMarketOrders().find((x) => x.id === orderId);
  if (!o) throw new Error("Order not found");
  if (!["paid_hold", "accepted", "dispatched", "delivered"].includes(o.status)) {
    throw new Error("Order not disputable now");
  }
  return updateOrder(orderId, {
    status: "disputed",
    timeline: [...(o.timeline || []), { at: Date.now(), by: byUser, action: "disputed" }],
  });
}

// ---------------- Messaging ----------------
export function listOrderMessages(orderId) { return loadJSON(MSG_KEY(orderId), []); }
export function sendOrderMessage(orderId, { fromId, fromName = "User", text = "" }) {
  const msg = { id: `mm-${Date.now().toString(36)}`, ts: Date.now(), fromId, fromName, text: String(text || "").trim() };
  const arr = loadJSON(MSG_KEY(orderId), []);
  arr.push(msg);
  saveJSON(MSG_KEY(orderId), arr);
  return msg;
}
