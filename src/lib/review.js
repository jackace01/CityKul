// src/lib/review.js
// Generic reviewer + quorum engine for modules: "events", "marketplace", "jobs"
import { loadJSON, saveJSON } from "./storage.js";

const REVIEWERS_KEY = (city, mod) => `citykul:reviewers:${city}:${mod}`;
const SUBMIT_ALL_KEY = (mod) => `citykul:${mod}:submissions`;
const PENDING_KEY = (city, mod) => `citykul:${mod}:pending:${city}`;
const APPROVED_KEY = (city, mod) => `citykul:${mod}:approved:${city}`;
const REJECTED_KEY = (city, mod) => `citykul:${mod}:rejected:${city}`;
const VOTE_KEY = (id) => `citykul:votes:${id}`;

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
}

// ----- Reviewers -----
export function getReviewers(city, mod) {
  return loadJSON(REVIEWERS_KEY(city, mod), []);
}
export function setReviewers(city, mod, list) {
  saveJSON(REVIEWERS_KEY(city, mod), Array.from(new Set(list || [])));
}
export function ensureReviewer(city, mod, reviewerId) {
  const set = new Set(getReviewers(city, mod));
  set.add(String(reviewerId));
  saveJSON(REVIEWERS_KEY(city, mod), Array.from(set));
}
export function quorumNeeded(city, mod) {
  const total = getReviewers(city, mod).length;
  return Math.max(1, Math.ceil(total * 0.8)); // 80%
}

// ----- Submissions lifecycle -----
export function submit(mod, payload) {
  // payload MUST include: city
  const id = uid();
  const rec = {
    id, module: mod, status: "pending",
    city: payload.city || "",
    category: payload.category || "General",
    createdAt: Date.now(),
    data: payload
  };
  const all = loadJSON(SUBMIT_ALL_KEY(mod), []);
  all.push(rec);
  saveJSON(SUBMIT_ALL_KEY(mod), all);

  const pend = loadJSON(PENDING_KEY(rec.city, mod), []);
  pend.push(rec);
  saveJSON(PENDING_KEY(rec.city, mod), pend);

  // init vote box
  saveJSON(VOTE_KEY(id), { approvals: [], rejections: [] });

  return rec;
}

export function getSubmissionById(mod, id) {
  const all = loadJSON(SUBMIT_ALL_KEY(mod), []);
  return all.find((r) => r.id === id) || null;
}

export function listPending(city, mod) {
  return loadJSON(PENDING_KEY(city, mod), []);
}
export function listApproved(city, mod) {
  return loadJSON(APPROVED_KEY(city, mod), []);
}
export function listRejected(city, mod) {
  return loadJSON(REJECTED_KEY(city, mod), []);
}

// ----- Voting -----
export function vote(mod, submissionId, reviewerId, approve) {
  const box = loadJSON(VOTE_KEY(submissionId), { approvals: [], rejections: [] });
  // de-dupe
  box.approvals = box.approvals.filter((u) => u !== reviewerId);
  box.rejections = box.rejections.filter((u) => u !== reviewerId);
  if (approve) box.approvals.push(reviewerId);
  else box.rejections.push(reviewerId);
  saveJSON(VOTE_KEY(submissionId), box);
  return box;
}

function moveBetweenBuckets(rec, fromKey, toKey, status) {
  const from = loadJSON(fromKey(rec.city, rec.module), []).filter((r) => r.id !== rec.id);
  saveJSON(fromKey(rec.city, rec.module), from);

  const updated = { ...rec, status };
  const to = loadJSON(toKey(rec.city, rec.module), []);
  to.push(updated);
  saveJSON(toKey(rec.city, rec.module), to);

  // also update in SUBMIT_ALL list
  const all = loadJSON(SUBMIT_ALL_KEY(rec.module), []);
  const idx = all.findIndex((r) => r.id === rec.id);
  if (idx >= 0) {
    all[idx] = updated;
    saveJSON(SUBMIT_ALL_KEY(rec.module), all);
  }
  return updated;
}

export function tryFinalize(mod, submissionId) {
  const rec = getSubmissionById(mod, submissionId);
  if (!rec || rec.status !== "pending") return null;

  const total = getReviewers(rec.city, mod).length;
  const needed = Math.max(1, Math.ceil(total * 0.8));
  const { approvals = [], rejections = [] } = loadJSON(VOTE_KEY(submissionId), {});

  if (approvals.length >= needed) {
    return moveBetweenBuckets(rec, PENDING_KEY, APPROVED_KEY, "approved");
  }
  if (rejections.length >= needed) {
    return moveBetweenBuckets(rec, PENDING_KEY, REJECTED_KEY, "rejected");
  }
  return null; // still pending
}
