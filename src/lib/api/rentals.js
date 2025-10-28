// src/lib/api/rentals.js
// Local Rentals with decentralised review + availability + booking + messaging + wallet hook (safe).

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

/* ------------------------ Wallet hook (safe) ---------------------- */
/* No top-level await; callers can inject wallet functions. */
let walletHooks = {
  addPoints: null,        // (userId, amount, note)
  transferPoints: null    // (fromId, toId, amount, note)
};
export function setWalletHooks(hooks = {}) {
  walletHooks = {
    addPoints: typeof hooks.addPoints === "function" ? hooks.addPoints : null,
    transferPoints: typeof hooks.transferPoints === "function" ? hooks.transferPoints : null
  };
}
// Optional: auto-detect global hooks if provided somewhere else
if (typeof window !== "undefined" && window.citykulWalletHooks) {
  setWalletHooks(window.citykulWalletHooks);
}

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
  // Merge with overlay so runtime updates are visible immediately
  return mergeOverlay(shaped, shaped.id);
}

/* --------------------------- Submissions -------------------------- */
export function submitRental(payload) {
  // payload: { city, category, title, description, price, pricePer, deposit, address, locality, ownerId, media:[], availability:[] }
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
  // Always merge current overlay (defensive)
  const merged = mergeOverlay(listing, listing.id);
  const { availability = [], bookings = [] } = merged;

  // start..end must fall fully within at least one declared availability range
  const inRange = availability.some(r => dparse(r.start) <= dparse(start) && dparse(end) <= dparse(r.end));
  if (!inRange) return false;

  // and must not clash with existing bookings
  return !bookings.some(b => overlaps(b.start, b.end, start, end));
}

export function setAvailability(listingId, ranges = []) {
  setOverlayAvailability(listingId, ranges);
}

/* ----------------------- Orders + Messaging ----------------------- */
const LEDGER_KEY = "citykul:rentals:ledger";
const ORDERS_KEY = "citykul:rentals:orders";
const MSG_KEY = (orderId) => `citykul:rentals:messages:${orderId}`;

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

  const total = rent + (Number(listing.deposit) || 0);

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
    deposit: Number(listing.deposit) || 0,
    total,
    status: "created",
    ts: Date.now()
  };

  // persist order
  const orders = loadJSON(ORDERS_KEY, []);
  orders.unshift(order);
  saveJSON(ORDERS_KEY, orders);

  // record booking in overlay (source of truth for clashes)
  appendOverlayBooking(listingId, { start, end, renterId, orderId: order.id });

  // wallet hooks (optional & safe)
  try {
    if (walletHooks.transferPoints) {
      walletHooks.transferPoints(renterId, order.ownerId, total, `Rental ${listing.title || "listing"} (${start}–${end})`);
    } else if (walletHooks.addPoints) {
      walletHooks.addPoints(order.ownerId, total, `Rental income: ${listing.title || "listing"}`);
    }
  } catch { /* ignore wallet failures gracefully */ }

  // ledger entry
  const ledger = loadJSON(LEDGER_KEY, []);
  ledger.unshift({
    id: `txn-${Date.now().toString(36)}`,
    type: "rent-create",
    orderId: order.id,
    listingId,
    renterId,
    ownerId: order.ownerId,
    total,
    ts: Date.now()
  });
  saveJSON(LEDGER_KEY, ledger);

  return order;
}

export function listRentalOrders() {
  return loadJSON(ORDERS_KEY, []);
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
