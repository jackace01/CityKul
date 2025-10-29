// src/lib/api/discover.js
// Discover = City directory (seed) + user-submitted places (after decentralised approval).

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

// ------- Categories -------
export const DISCOVER_CATEGORIES = [
  "Shops & Businesses",
  "Restaurants & Cafés",
  "Hotels & Stays",
  "Coaching & Institutions",
  "Hospitals & Clinics",
  "Parks & Public Places",
  "Others",
];

// ------- Seeded City Directory (local) -------
const SEED_KEY = "citykul:discover:seed:v1";
const STORE_KEY = (city) => `citykul:discover:directory:${city || "Indore"}`;

function loadJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function saveJSON(key, v) { localStorage.setItem(key, JSON.stringify(v)); }

function seedDataFor(city) {
  const std = (c) => ({
    id: `dir-${city}-${c.id}`,
    name: c.name,
    category: c.category,
    description: c.description || "",
    address: c.address || "",
    locality: c.locality || "",
    city,
    contact: c.contact || "",
    website: c.website || "",
    media: [],
    // map coords optional
    lat: typeof c.lat === "number" ? c.lat : undefined,
    lng: typeof c.lng === "number" ? c.lng : undefined,
  });

  if ((city || "").toLowerCase() === "prayagraj" || (city || "").toLowerCase() === "allahabad") {
    return [
      std({ id: "hosp1", name: "CityCare Hospital", category: "Hospitals & Clinics", address: "MG Road, Civil Lines", locality: "Civil Lines", contact: "+91-9999990001" }),
      std({ id: "park1", name: "Central City Park", category: "Parks & Public Places", address: "Near Town Hall", locality: "Katra" }),
      std({ id: "rest1", name: "Tasty Bites Café", category: "Restaurants & Cafés", address: "Station Road", locality: "George Town", contact: "+91-9999990002" }),
      std({ id: "shop1", name: "City Hardware & Tools", category: "Shops & Businesses", address: "Bazaar Street", locality: "Kareli", contact: "+91-9999990003" }),
    ];
  }
  return [
    std({ id: "hosp1", name: "Metro Multi-Speciality Hospital", category: "Hospitals & Clinics", address: "Ring Road", locality: "Vijay Nagar", contact: "+91-9999991001" }),
    std({ id: "park1", name: "Greenleaf Park", category: "Parks & Public Places", address: "Sector 3", locality: "Scheme 78" }),
    std({ id: "rest1", name: "TasteTown Diner", category: "Restaurants & Cafés", address: "Main Avenue", locality: "Palasia", contact: "+91-9999991002" }),
  ];
}

function ensureSeed(city) {
  const seeded = loadJSON(SEED_KEY, {});
  if (seeded[city]) return;
  saveJSON(STORE_KEY(city), seedDataFor(city));
  seeded[city] = true;
  saveJSON(SEED_KEY, seeded);
}

function listSeed(city) {
  ensureSeed(city);
  return loadJSON(STORE_KEY(city), []);
}

// ------- Review-engine wired submissions (module "discover") -------
function toShape(rec) {
  const d = rec.data || {};
  return {
    id: rec.id,
    name: d.name || "Place",
    category: d.category || "Others",
    description: d.description || "",
    address: d.address || "",
    locality: d.locality || "",
    city: rec.city,
    contact: d.contact || "",
    website: d.website || "",
    media: Array.isArray(d.media) ? d.media : [],
    createdAt: rec.createdAt,
    approved: rec.status === "approved",
    ownerId: d.ownerId || "",
    // NEW: coordinates optional
    lat: typeof d.lat === "number" ? d.lat : (typeof d.latitude === "number" ? d.latitude : undefined),
    lng: typeof d.lng === "number" ? d.lng : (typeof d.longitude === "number" ? d.longitude : undefined),
  };
}

export function submitDiscover(payload) {
  // payload may include lat/lng
  return submit("discover", payload);
}
export function listPendingDiscover(city) {
  return listPending(city, "discover").map(toShape);
}
export function listApprovedDiscover(city) {
  const c = city || localStorage.getItem("citykul:city") || "Indore";
  return listApproved(c, "discover").map(toShape);
}
export function voteDiscover(id, reviewerId, approve) {
  vote("discover", id, reviewerId, approve);
  return tryFinalize("discover", id);
}
export function ensureDiscoverReviewer(city, reviewerId) {
  ensureReviewer(city, "discover", reviewerId);
}
export function getDiscoverReviewers(city) {
  return getReviewers(city, "discover");
}
export function getDiscoverQuorum(city) {
  return quorumNeeded(city, "discover");
}

// ------- Merged listing for the Discover pages (seed + approved) -------
export function listDiscoverMerged(cityOpt) {
  const city = cityOpt || localStorage.getItem("citykul:city") || "Indore";
  const seed = listSeed(city);
  const approved = listApprovedDiscover(city);
  const byId = new Map();
  for (const r of approved) byId.set(r.id, r);
  for (const r of seed) if (!byId.has(r.id)) byId.set(r.id, r);
  return Array.from(byId.values());
}

export function getDiscoverItemById(cityOpt, id) {
  const city = cityOpt || localStorage.getItem("citykul:city") || "Indore";
  const arr = listDiscoverMerged(city);
  return arr.find(x => x.id === id) || null;
}
