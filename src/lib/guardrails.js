// src/lib/guardrails.js
// Unusual-activity heuristics + gentle rate-limits for Discover & Rentals.
// Works with your reputation/quorum engine and stays fully local (localStorage).

import { listPending, listApproved, getReviewers, getVotesBox } from "./review.js";
import { listPlaceReviews } from "./api/discoverReviews.js";
import { score as engScore } from "./engagement.js";

// --- utils ---
function loadJSON(k, f) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch { return f; } }
function saveJSON(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
const now = () => Date.now();

// Modules considered for city-wide activity
const MODS = ["discover", "rentals", "events", "marketplace", "jobs"];

/* ----------------- Gentle rate-limit (per user per module) ----------------- */
const RL_KEY = (mod, userId) => `citykul:ratelimit:${mod}:${String(userId || "anon")}`;
export function rateLimitSubmission(mod, userId, windowMs = 2 * 60 * 1000) {
  const k = RL_KEY(mod, userId);
  const last = loadJSON(k, 0);
  const t = now();
  if (t - last < windowMs) {
    return { ok: false, retryInMs: windowMs - (t - last) };
  }
  saveJSON(k, t);
  return { ok: true, retryInMs: 0 };
}

/* --------------------- Normalization for duplicate checks ------------------- */
function normalize(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 140);
}

/* --------------------- City-wide anomalies (list banners) ------------------- */
export function getCityAnomalies(city) {
  const msgs = [];
  let risk = 0; // 0 none, 1 low, 2 medium, 3 high

  const MIN = 60 * 60 * 1000;       // 1h
  const DAY = 24 * 60 * 60 * 1000;  // 24h
  let lastHour = 0, lastDay = 0;

  for (const m of MODS) {
    const pend = listPending(city, m);
    const appr = listApproved(city, m);
    const all = [...pend, ...appr];
    const t = now();
    lastHour += all.filter(r => (t - (r.createdAt || 0)) <= MIN).length;
    lastDay  += all.filter(r => (t - (r.createdAt || 0)) <= DAY).length;

    // If there are >=10 reviewers and a pending item accumulates a large block of approvals,
    // watch for overly concentrated early approvals (e.g., >70% approvals while top 2 unique).
    const reviewers = getReviewers(city, m);
    if (reviewers.length >= 10) {
      for (const r of pend) {
        const { approvals } = getVotesBox(r.id);
        const uniqueApprovers = new Set(approvals).size;
        if (approvals.length >= Math.ceil(reviewers.length * 0.7) && uniqueApprovers <= 2) {
          risk = Math.max(risk, 2);
          msgs.push(`Unusual voting pattern on ${m} review queue.`);
          break;
        }
      }
    }
  }

  if (lastHour >= 10) { risk = Math.max(risk, 2); msgs.push("Spike in new submissions this hour."); }
  if (lastDay  >= 100) { risk = Math.max(risk, 2); msgs.push("Abnormally high submissions today."); }

  return { riskLevel: risk, messages: Array.from(new Set(msgs)) };
}

/* -------------------------- Per-place flags (Discover) ---------------------- */
export function flagDiscoverItem(place, city) {
  const warnings = [];
  const badges = [];

  // Recent review burst / few accounts
  const revs = listPlaceReviews(place.id);
  if (revs.length >= 5) {
    const latest5 = [...revs].sort((a, b) => b.ts - a.ts).slice(0, 5);
    const uniqUsers = new Set(latest5.map(r => r.userId)).size;
    if (uniqUsers <= 2) {
      warnings.push("Multiple recent reviews from very few accounts.");
      badges.push("Unusual Activity");
    }
    const span = latest5[0].ts - latest5.at(-1).ts;
    if (span <= 10 * 60 * 1000) {
      warnings.push("Reviews spiked within minutes.");
      badges.push("Rapid Reviews");
    }
  }

  // Engagement spike
  const EKEY = `citykul:guard:lastscore:${place.id}`;
  const prev = loadJSON(EKEY, null);
  const curr = engScore(place.id);
  if (prev != null && curr - prev >= 50) {
    warnings.push("Engagement jumped unusually fast.");
    badges.push("Engagement Spike");
  }
  saveJSON(EKEY, curr);

  // Duplicate/similar name flood in city
  const NKEY = `citykul:guard:seenname:${city}:${normalize(place.name)}`;
  const seen = loadJSON(NKEY, 0) + 1;
  saveJSON(NKEY, seen);
  if (seen > 3) {
    warnings.push("Many similar listings detected with this name in the city.");
    if (!badges.includes("Unusual Activity")) badges.push("Unusual Activity");
  }

  return { warnings: Array.from(new Set(warnings)), badges: Array.from(new Set(badges)) };
}

/* -------------------------- Per-listing flags (Rentals) --------------------- */
export function flagRentalItem(listing, city) {
  const warnings = [];
  const badges = [];

  const price = Number(listing.price || 0);
  if (price > 0 && price < 10) {
    warnings.push("Price looks unusually low for a rental.");
    badges.push("Review Carefully");
  }

  // Fast engagement spike
  const EKEY = `citykul:guard:lastscore:${listing.id}`;
  const prev = loadJSON(EKEY, null);
  const curr = engScore(listing.id);
  if (prev != null && curr - prev >= 50) {
    warnings.push("Engagement jumped unusually fast.");
    badges.push("Engagement Spike");
  }
  saveJSON(EKEY, curr);

  // Repeat titles in city
  const TKEY = `citykul:guard:seenrental:${city}:${normalize(listing.title)}`;
  const seen = loadJSON(TKEY, 0) + 1;
  saveJSON(TKEY, seen);
  if (seen > 3) {
    warnings.push("Multiple similar rental titles observed.");
    badges.push("Unusual Activity");
  }

  return { warnings: Array.from(new Set(warnings)), badges: Array.from(new Set(badges)) };
}
