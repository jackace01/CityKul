// src/lib/api/rentals.js
// Local Rentals with decentralised review + availability + booking + messaging + ESCROW wallet flow (safe).

import {
  submit,
  listApproved,
  listPending,
  vote,
  tryFinalize,
  ensureReviewer,
  getReviewers,
  quorumNeeded
} from "../review.js";

import { computeRentalFees } from "../fees.js";

/* --------------------------- Categories --------------------------- */
export const RENTAL_CATEGORIES = [
  "Real Estate",
  "Vehicles",
  "Tools & Machines",
  "Fashion & Attire",
  "Home & Utility",
  "Miscellaneous"
];

/* ------------------------ Local persistence ----------------------- */
function loadJSON(key, fallback = []) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function saveJSON(key, v) { localStorage.setItem(key, JSON.stringify(v)); }

/* Overlay keeps user runtime updates (bookings/availability) without
   depending on internal layout of the review engine’s storage. */
const OVERLAY_KEY = "citykul:rentals:overlay"; // { [listingId]: { availability:[], bookings:[] } }
function loadOverlay() { return loadJSON(OVERLAY_KEY, {}); }
function saveOverlay(obj) { saveJSON(OVERLAY_KEY, obj); }
function getOverlay(listingId) {
  const all = loadOverlay(); return all[listingId] || { availability: [], bookings: [] };
}
function mergeOverlay(base, listingId) {
  const o = getOverlay(listingId);
  const availability = [...(base.availability || []), ...(o.availability || [])];
  const bookings = [...(base.bookings || []), ...(o.bookings || [])];
  return { ...base, availability, bookings };
}
function setOverlayAvailability(listingId, ranges = []) {
  const all = loadOverlay();
  const cur = all[listingId] || { availability: [], bookings: [] };
  cur.availability = Array.isArray(ranges) ? ranges : [];
  all[listingId] = cur;
  saveOverlay(all);
}
function appendOverlayBooking(listingId, booking) {
  const all = loadOverlay();
  const cur = all[listingId] || { availability: [], bookings: [] };
  cur.bookings = Array.isArray(cur.bookings) ? cur.bookings : [];
  cur.bookings.push(booking);
  all[listingId] = cur;
  saveOverlay(all);
}

/* ------------------------ Wallet hooks (safe) --------------------- */
let wallet = null;
try {
  wallet = await import("./wallet.js");
} catch { wallet = null; }

/* ----------------------- Shape mapping helpers -------------------- */
function toShape(rec) {
  const d = rec.data || {};
  const shaped = {
    id: rec.id,
    approved: rec.status === "approved",
    title: d.title || d.name || "Rental Listing",
    category: d.category || "Miscellaneous",
    description: d.description || "",
    pricePer: d.pricePer || "day",            // day/week/month
    price: Number(d.price ?? 0),
    deposit: Number(d.deposit ?? 0),
    address: d.address || "",
    locality: d.locality || "",
    city: rec.city || "",
    media: Array.isArray(d.media) ? d.media : [],
    ownerId: d.ownerId || "",
    createdAt: rec.createdAt || Date.now(),
    availability: Array.isArray(d.availability) ? d.availability : [],
    bookings: Array.isArray(d.bookings) ? d.bookings : []
  };
  return mergeOverlay(shaped, shaped.id);
}

/* --------------------------- Submissions -------------------------- */
export function submitRental(payload) {
  return submit("rentals", payload);
}
export function listPendingRentals(city) {
  return listPending(city, "rentals").map(toShape);
}
export function listApprovedRentals(city) {
  const c = city || localStorage.getItem("citykul:city") || "Indore";
  return listApproved(c, "rentals").map(toShape);
}
export function voteRental(id, reviewerId, approve) {
  vote("rentals", id, reviewerId, approve);
  return tryFinalize("rentals", id);
}

/* ---------------------------- Reviewers --------------------------- */
export function ensureRentalsReviewer(city, reviewerId) {
  ensureReviewer(city, "rentals", reviewerId);
}
export function getRentalsReviewers(city) {
  return getReviewers(city, "rentals");
}
export function getRentalsQuorum(city) {
  return quorumNeeded(city, "rentals");
}

/* ------------------------- Availability API ----------------------- */
const dparse = (d) => new Date(`${d}T00:00:00`);
function overlaps(aStart, aEnd, bStart, bEnd) {
  return dparse(aStart) <= dparse(bEnd) && dparse(bStart) <= dparse(aEnd);
}

export function getRentalById(city, id) {
  const rows = listApprovedRentals(city);
  return rows.find(r => r.id === id) || null;
}

export function isAvailable(listing, start, end) {
  if (!listing) return false;
  const merged = mergeOverlay(listing, listing.id);
  const { availability = [], bookings = [] } = merged;

  const inRange = availability.some(r => dparse(r.start) <= dparse(start) && dparse(end) <= dparse(r.end));
  if (!inRange) return false;

  return !bookings.some(b => overlaps(b.start, b.end, start, end));
}

export function setAvailability(listingId, ranges = []) {
  setOverlayAvailability(listingId, ranges);
}

/* ----------------------- Orders + Messaging ----------------------- */
const LEDGER_KEY = "citykul:rentals:ledger";
const ORDERS_KEY = "citykul:rentals:orders";
const MSG_KEY = (orderId) => `citykul:rentals:messages:${orderId}`;

function loadOrders() { return loadJSON(ORDERS_KEY, []); }
function saveOrders(arr) { saveJSON(ORDERS_KEY, arr || []); }
function updateOrder(id, patch) {
  const all = loadOrders();
  const i = all.findIndex(o => o.id === id);
  if (i === -1) return null;
  const next = { ...all[i], ...patch };
  all[i] = next;
  saveOrders(all);
  return next;
}

export function createRentalOrder({ listingId, renterId, renterName = "You", start, end }) {
  const city = localStorage.getItem("citykul:city") || "Indore";
  const listing = getRentalById(city, listingId);
  if (!listing) throw new Error("Listing not found or not approved");
  if (!start || !end) throw new Error("Please select start and end dates");
  if (!isAvailable(listing, start, end)) throw new Error("Selected dates are not available");

  // compute duration & price
  const ms = dparse(end) - dparse(start);
  const days = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
  const unit = Number(listing.price) || 0;

  let rent;
  if (listing.pricePer === "month") rent = unit * Math.max(1, Math.ceil(days / 30));
  else if (listing.pricePer === "week") rent = unit * Math.max(1, Math.ceil(days / 7));
  else rent = unit * days;

  const deposit = Number(listing.deposit) || 0;
  const totalEscrow = rent + deposit; // escrow amount ONLY (unchanged)
  const fee = computeRentalFees({ rent, deposit }); // payer-borne

  const order = {
    id: `ord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    listingId,
    ownerId: listing.ownerId || "",
    renterId,
    renterName,
    city: listing.city,
    start, end, days,
    pricePer: listing.pricePer,
    unitPrice: unit,
    rent,
    deposit,
    total: totalEscrow, // we keep "total" = escrow amount for compatibility
    feeSummary: {
      platformFee: fee.platformFee,
      fixedFee: fee.fixedFee,
      totalFee: fee.totalFee
    },
    status: "created",                 // created -> paid_hold -> accepted -> in_use -> returned -> completed
    timeline: [{ at: Date.now(), by: renterId, action: "created" }],
    ts: Date.now()
  };

  const orders = loadJSON(ORDERS_KEY, []);
  orders.unshift(order);
  saveJSON(ORDERS_KEY, orders);

  // Reserve slot visually so others see clash while pending
  appendOverlayBooking(listingId, { start, end, renterId, orderId: order.id });

  // ledger note (local diagnostics)
  const ledger = loadJSON(LEDGER_KEY, []);
  ledger.unshift({
    id: `txn-${Date.now().toString(36)}`,
    type: "rent-create",
    orderId: order.id,
    listingId,
    renterId,
    ownerId: order.ownerId,
    total: totalEscrow,
    ts: Date.now()
  });
  saveJSON(LEDGER_KEY, ledger);

  return order;
}

export function listRentalOrders() {
  return loadJSON(ORDERS_KEY, []);
}

/* --------------------------- Escrow Flow --------------------------- */
/** payForOrder: renter pays escrow (hold) AND pays fees immediately (payer-borne). */
export function payForOrder(orderId, renterId) {
  const o = listRentalOrders().find(x => x.id === orderId);
  if (!o) throw new Error("Order not found");
  if (o.renterId !== renterId) throw new Error("Only renter can pay");
  if (o.status !== "created") throw new Error("Order not payable");
  if (!wallet?.createHold) throw new Error("Wallet not available");

  // 1) Create escrow hold for rent+deposit (unchanged legacy)
  wallet.createHold(orderId, renterId, o.total, `Escrow for rental ${o.listingId}`);

  // 2) Collect fees from payer up-front (outside escrow)
  const fee = computeRentalFees({ rent: o.rent || 0, deposit: o.deposit || 0 });
  const platformId = "platform@citykul";
  if (wallet?.transfer && fee.totalFee > 0) {
    wallet.transfer(renterId, platformId, fee.totalFee, `Platform & booking fee for ${orderId}`);
  }

  const next = updateOrder(orderId, {
    status: "paid_hold",
    timeline: [...(o.timeline || []), { at: Date.now(), by: renterId, action: "paid_hold" }]
  });
  return next;
}

/** acceptOrder: owner accepts booking */
export function acceptOrder(orderId, ownerId) {
  const o = listRentalOrders().find(x => x.id === orderId);
  if (!o) throw new Error("Order not found");
  if (o.ownerId !== ownerId) throw new Error("Only owner can accept");
  if (o.status !== "paid_hold") throw new Error("Order not in paid state");
  return updateOrder(orderId, {
    status: "accepted",
    timeline: [...(o.timeline || []), { at: Date.now(), by: ownerId, action: "accepted" }]
  });
}

/** markHandedOver: owner hands item to renter */
export function markHandedOver(orderId, ownerId) {
  const o = listRentalOrders().find(x => x.id === orderId);
  if (!o) throw new Error("Order not found");
  if (o.ownerId !== ownerId) throw new Error("Only owner can mark handover");
  if (o.status !== "accepted") throw new Error("Order not accepted");
  return updateOrder(orderId, {
    status: "in_use",
    timeline: [...(o.timeline || []), { at: Date.now(), by: ownerId, action: "handed_over" }]
  });
}

/** markReturned: renter marks the item returned */
export function markReturned(orderId, renterId) {
  const o = listRentalOrders().find(x => x.id === orderId);
  if (!o) throw new Error("Order not found");
  if (o.renterId !== renterId) throw new Error("Only renter can mark returned");
  if (o.status !== "in_use") throw new Error("Order not in-use");
  return updateOrder(orderId, {
    status: "returned",
    timeline: [...(o.timeline || []), { at: Date.now(), by: renterId, action: "returned" }]
  });
}

/** releaseEscrow: owner releases escrow after return (pays owner) */
export function releaseEscrow(orderId, ownerId) {
  const o = listRentalOrders().find(x => x.id === orderId);
  if (!o) throw new Error("Order not found");
  if (o.ownerId !== ownerId) throw new Error("Only owner can release");
  if (!["returned", "accepted"].includes(o.status)) throw new Error("Order not releasable");
  if (!wallet?.releaseHold) throw new Error("Wallet not available");

  wallet.releaseHold(orderId, ownerId);
  return updateOrder(orderId, {
    status: "completed",
    timeline: [...(o.timeline || []), { at: Date.now(), by: ownerId, action: "released" }]
  });
}

/** cancelOrder: before accept -> refund hold if paid (fees remain payer-borne, non-refundable) */
export function cancelOrder(orderId, byUser) {
  const o = listRentalOrders().find(x => x.id === orderId);
  if (!o) throw new Error("Order not found");
  if (!["created", "paid_hold"].includes(o.status)) throw new Error("Order not cancelable now");

  if (o.status === "paid_hold" && wallet?.refundHold) {
    wallet.refundHold(orderId);
  }

  return updateOrder(orderId, {
    status: "canceled",
    timeline: [...(o.timeline || []), { at: Date.now(), by: byUser, action: "canceled" }]
  });
}

/** openDispute: either party can dispute while paid/accepted/in_use/returned */
export function openDispute(orderId, byUser) {
  const o = listRentalOrders().find(x => x.id === orderId);
  if (!o) throw new Error("Order not found");
  if (!["paid_hold", "accepted", "in_use", "returned"].includes(o.status)) {
    throw new Error("Order not disputable now");
  }
  return updateOrder(orderId, {
    status: "disputed",
    timeline: [...(o.timeline || []), { at: Date.now(), by: byUser, action: "disputed" }]
  });
}

/* --------------------------- Messaging ---------------------------- */
export function listOrderMessages(orderId) {
  return loadJSON(MSG_KEY(orderId), []);
}
export function sendOrderMessage(orderId, { fromId, fromName = "User", text = "" }) {
  const msg = {
    id: `m-${Date.now().toString(36)}`,
    ts: Date.now(),
    fromId,
    fromName,
    text: String(text || "").trim()
  };
  const arr = loadJSON(MSG_KEY(orderId), []);
  arr.push(msg);
  saveJSON(MSG_KEY(orderId), arr);
  return msg;
}
