// src/lib/api/jobs.js
// CityKul Jobs System (Formal + Gig) — local mock API (city-scoped, wallet-ready stubs)
// + Review Center compatibility layer for the Reviewer Dashboard.
// UPDATED: reputation staking replaces cash bond; client fees direct to app wallet.

import { getUser } from "../auth";
import { getSelectedCity } from "../cityState";

// Stake engine (NEW)
import { getReputation } from "../reputation";
import { previewStake, lockStake, releaseOnSuccess, burnOnDefault } from "../stake";

// ---------------- Review Engine bridge (for /review page) ----------------
import {
  submit as _reviewSubmit,
  listApproved as _reviewListApproved,
  listPending as _reviewListPending,
  vote as _reviewVote,
  tryFinalize as _reviewTryFinalize,
  ensureReviewer as _reviewEnsureReviewer,
  getReviewers as _reviewGetReviewers,
  quorumNeeded as _reviewQuorumNeeded,
} from "../review.js";

// Shape a review record to what Review.jsx expects
function _toReviewShape(rec) {
  const d = rec?.data || {};
  return {
    id: rec.id,
    city: rec.city,
    locality: d.locality || d.area || "",
    name: d.title || d.name || "Job",
    title: d.title || d.name || "Job",
    description: d.description || "",
    org: d.company || d.org || "",
    date: d.date || "",
    where: d.location || d.locality || rec.city || "",
    price: d.salary || d.pay || "",
    createdAt: rec.createdAt,
    approved: rec.status === "approved",
    ownerId: d.ownerId || "",
  };
}

// ---- Public (used by Review.jsx) ----
export function submitJob(payload) {
  return _reviewSubmit("jobs", payload);
}
export function listPendingJobs(city) {
  return _reviewListPending(city, "jobs").map(_toReviewShape);
}
export function listApprovedJobs(city) {
  const c = city || localStorage.getItem("citykul:city") || "Indore";
  return _reviewListApproved(c, "jobs").map(_toReviewShape);
}
export function voteJob(id, reviewerId, approve) {
  _reviewVote("jobs", id, reviewerId, approve);
  return _reviewTryFinalize("jobs", id);
}
export function ensureJobsReviewer(city, reviewerId) {
  _reviewEnsureReviewer(city, "jobs", reviewerId);
}
export function getJobsReviewers(city) {
  return _reviewGetReviewers(city, "jobs");
}
export function getJobsQuorum(city) {
  return _reviewQuorumNeeded(city, "jobs");
}

// ---------------- Native Jobs module (Formal + Gig) ----------------

const KEY = (city, type) =>
  `citykul:jobs:${type}:${(city || "default").toLowerCase()}`;
const APPS_KEY = (city) =>
  `citykul:jobs:applications:${(city || "default").toLowerCase()}`;

// Categories
export const FORMAL_CATEGORIES = [
  "Admin / Back Office",
  "Sales / Business Development",
  "Customer Support",
  "Teaching / Tutoring",
  "Delivery / Logistics",
  "Retail / Shop",
  "Accounting / Finance",
  "Healthcare / Nursing",
  "IT / Software",
  "Creative / Design",
  "Hospitality / Events",
  "Field / Technician",
  "Manufacturing / Skilled Trades",
];

export const GIG_CATEGORIES = [
  "Errands & Deliveries",
  "On-site Helpers",
  "Event Assistants",
  "Cleaning / Basic Labor",
  "Leaflet Distribution",
  "Handyman / Repairs",
  "Photography / Videography Help",
  "Marketing / Surveys",
  "On-call Support",
];

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function loadList(city, type) {
  try {
    const raw = localStorage.getItem(KEY(city, type));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveList(city, type, list) {
  try { localStorage.setItem(KEY(city, type), JSON.stringify(list || [])); } catch {}
}
function loadApplications(city) {
  try {
    const raw = localStorage.getItem(APPS_KEY(city));
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch { return {}; }
}
function saveApplications(city, appsByJobId) {
  try { localStorage.setItem(APPS_KEY(city), JSON.stringify(appsByJobId || {})); } catch {}
}

// ---------------- PUBLIC API ----------------

// Seed with a few examples if empty (safe)
export function ensureSeed(city) {
  const formal = loadList(city, "formal");
  const gig = loadList(city, "gig");
  if (!formal.length) {
    formal.push(
      {
        id: uid("job"),
        type: "formal",
        title: "Customer Support Associate",
        employer: "QuickHelp Services",
        city,
        locality: "Central",
        pay: "₹15k–₹22k",
        roleType: "Full-time",
        category: "Customer Support",
        verified: true,
        createdAt: Date.now() - 86400000 * 3,
        status: "live",
        tags: ["Immediate", "Office"],
      },
      {
        id: uid("job"),
        type: "formal",
        title: "Sales Executive",
        employer: "GreenMart",
        city,
        locality: "North Zone",
        pay: "₹18k + Incentives",
        roleType: "Full-time",
        category: "Sales / Business Development",
        verified: false,
        createdAt: Date.now() - 86400000 * 8,
        status: "live",
        tags: ["Field", "2Wheeler"],
      }
    );
    saveList(city, "formal", formal);
  }
  if (!gig.length) {
    gig.push(
      {
        id: uid("gig"),
        type: "gig",
        title: "Deliver leaflets in Sector 12",
        client: "ShopEase",
        city,
        locality: "Sector 12",
        value: 500,
        proof: "photo",
        timeWindow: "Today 4–7 PM",
        category: "Leaflet Distribution",
        verified: true,
        createdAt: Date.now() - 86400000,
        status: "open",
        tags: ["Outdoor", "3 hours"],
      },
      {
        id: uid("gig"),
        type: "gig",
        title: "Event hall setup helper",
        client: "City Banquets",
        city,
        locality: "Old Town",
        value: 750,
        proof: "photo",
        timeWindow: "Tomorrow 9–12 AM",
        category: "Event Assistants",
        verified: false,
        createdAt: Date.now() - 3600000 * 12,
        status: "open",
        tags: ["Indoor", "Lifting"],
      }
    );
    saveList(city, "gig", gig);
  }
}

// Listing / search
export function listJobs({
  city,
  q = "",
  type = "all",
  category = "",
  verifiedOnly = false,
  payMin = 0,
  payMax = Infinity,
} = {}) {
  const f = type === "gig" ? [] : loadList(city, "formal");
  const g = type === "formal" ? [] : loadList(city, "gig");
  const all = [...f, ...g];

  const lc = q.trim().toLowerCase();
  return all
    .filter((item) => {
      if (verifiedOnly && !item.verified) return false;
      if (category && (item.category || "") !== category) return false;

      if (item.type === "gig") {
        const v = Number(item.value || 0);
        if (Number.isFinite(payMin) && v < payMin) return false;
        if (Number.isFinite(payMax) && v > payMax) return false;
      }

      if (lc) {
        const hay = `${item.title || ""} ${item.employer || item.client || ""} ${item.locality || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
        if (!hay.includes(lc)) return false;
      }
      return true;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

// Create
export function createFormalJob(city, payload, userId) {
  const list = loadList(city, "formal");
  const row = {
    id: uid("job"),
    type: "formal",
    status: "live",
    createdAt: Date.now(),
    verified: false,
    ...payload,
    city,
    posterId: userId,
  };
  list.unshift(row);
  saveList(city, "formal", list);
  // NOTE: Client fee goes to app wallet in backend wiring.
  return row;
}

export function createGigJob(city, payload, userId) {
  const list = loadList(city, "gig");
  const row = {
    id: uid("gig"),
    type: "gig",
    status: "open",
    createdAt: Date.now(),
    verified: false,
    ...payload,
    city,
    clientId: userId,
  };
  list.unshift(row);
  saveList(city, "gig", list);
  // NOTE: Client fee goes to app wallet in backend wiring.
  return row;
}

// Apply (formal) — triggers REPUTATION STAKE lock
export function applyFormal({ city, jobId, userId, cvUrl }) {
  const all = loadList(city, "formal");
  const job = all.find((j) => j.id === jobId);
  if (!job) throw new Error("Job not found");

  // ensure not duplicate
  const appsByJob = loadApplications(city);
  const cur = appsByJob[jobId] || [];
  if (cur.find((a) => a.userId === userId)) return cur.find((a) => a.userId === userId);

  // Reputation stake lock
  const rep = getReputation(userId, city);
  const { stake } = previewStake(userId, city, rep);
  lockStake(userId, city, rep, { jobId });

  const row = {
    id: uid("app"),
    ts: Date.now(),
    userId,
    cvUrl: cvUrl || "",
    status: "applied", // later: accepted/completed/disputed
    repStake: stake,
  };
  appsByJob[jobId] = [row, ...cur];
  saveApplications(city, appsByJob);

  return row;
}

export function listApplications({ city, jobId }) {
  const apps = loadApplications(city);
  return apps[jobId] || [];
}

// For future flow control (client marks success/default)
export function markJobSuccess({ city, jobId, workerId }) {
  releaseOnSuccess(workerId, city, { jobId });
}
export function markJobDefault({ city, jobId, workerId }) {
  burnOnDefault(workerId, city, { jobId });
}

// Save job
export function toggleSaveJob({ city, jobId, type = "formal", userId }) {
  const key = `citykul:jobs:saved:${userId || "guest"}:${city || "default"}`;
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}
  const idx = saved.findIndex((x) => x.id === jobId);
  if (idx >= 0) saved.splice(idx, 1);
  else saved.unshift({ id: jobId, type, city, ts: Date.now() });
  localStorage.setItem(key, JSON.stringify(saved.slice(0, 500)));
  return saved;
}

export function listSavedJobs({ city, userId }) {
  const key = `citykul:jobs:saved:${userId || "guest"}:${city || "default"}`;
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}

// Report (fraud / spam)
export function reportJob({ city, jobId, type = "formal", userId, reason = "" }) {
  const key = `citykul:jobs:reports:${(city || "default").toLowerCase()}`;
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(key) || "[]"); } catch {}
  const row = { id: uid("rep"), ts: Date.now(), jobId, type, userId, reason };
  arr.unshift(row);
  localStorage.setItem(key, JSON.stringify(arr.slice(0, 1000)));
  return row;
}
