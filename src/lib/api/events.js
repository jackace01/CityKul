// src/lib/api/events.js
// Keeps your existing local DB features (comments, polls, RSVPs) but
// wires creation/approval into the decentralised 80% quorum review engine.

import { loadJSON, saveJSON } from "../storage.js";
import {
  submit,
  listApproved as reviewListApproved,
  listPending as reviewListPending,
  vote as reviewVote,
  tryFinalize as reviewTryFinalize,
  ensureReviewer as reviewEnsureReviewer,
  getReviewers as reviewGetReviewers,
  quorumNeeded as reviewQuorumNeeded,
} from "../review.js";

const KEY_EVENTS = "citykul:events";

function load() { return loadJSON(KEY_EVENTS, []); }
function save(arr) { saveJSON(KEY_EVENTS, arr); }

// ---- helpers ----
function findIndexById(id) {
  const events = load();
  const idx = events.findIndex(e => e.id === id);
  return { events, idx };
}
function upsertEvent(ev) {
  const events = load();
  const idx = events.findIndex(e => e.id === ev.id);
  if (idx >= 0) events[idx] = { ...events[idx], ...ev };
  else events.unshift(ev);
  save(events);
  return ev;
}

// ---------- CREATE (goes to decentralised review: pending by default) ----------
export function addEvent(evt) {
  // 1) Create a submission in the review engine (module="events")
  const rec = submit("events", {
    // keep your existing fields as-is
    name: (evt.name || "").trim(),
    category: (evt.category || "General").trim(),
    date: evt.date || "",
    time: evt.time || "",
    fee: evt.fee || "",
    place: evt.place || "",
    address: evt.address || "",
    city: evt.city || "",
    locality: evt.locality || "",
    description: evt.description || "",
    media: Array.isArray(evt.media) ? evt.media : [],
    createdBy: evt.createdBy || "Organizer",
    ownerId: evt.ownerId || "",
  });

  // 2) Mirror into your local event DB (so comments/polls/RSVPs still work)
  const record = {
    id: rec.id, // IMPORTANT: use the submission id
    name: (evt.name || "").trim(),
    category: (evt.category || "General").trim(),
    date: evt.date || "",
    time: evt.time || "",
    fee: evt.fee || "",
    place: evt.place || "",
    address: evt.address || "",
    city: evt.city || "",
    locality: evt.locality || "",
    description: evt.description || "",
    media: Array.isArray(evt.media) ? evt.media : [],
    createdBy: evt.createdBy || "Organizer",
    ownerId: evt.ownerId || "",
    createdAt: Date.now(),
    approved: rec.status === "approved",
    feed: [],
    polls: [],
    attendees: [],
  };
  return upsertEvent(record);
}

// ---------- APPROVALS (compat: manual approval; still marks local DB) ----------
export function approveEvent(id) {
  const { events, idx } = findIndexById(id);
  if (idx >= 0) {
    events[idx].approved = true;
    save(events);
    return events[idx];
  }
  return null;
}

// ---------- LISTS ----------
export function listApprovedEvents(cityOpt) {
  // Prefer local DB (because it keeps comments/polls/rsvps) but
  // ensure it reflects review-engine approvals for the city.
  const city = cityOpt || localStorage.getItem("citykul:city") || "";
  const approvedIds = new Set(reviewListApproved(city, "events").map(r => r.id));

  return load()
    .map(e => approvedIds.has(e.id) ? { ...e, approved: true } : e)
    .filter(e => e.approved)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function listAllEvents() {
  // Local store, newest first
  return load().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function getEventById(id) {
  return load().find(e => e.id === id) || null;
}

// ---------- Review queue (for Review page – decentralised voting) ----------
export function listPendingEvents(city) {
  // Convert review-engine records to your event shape (minimal)
  const pend = reviewListPending(city, "events");
  return pend.map(rec => {
    const d = rec.data || {};
    return {
      id: rec.id,
      name: d.name || "Event",
      category: d.category || "General",
      date: d.date || "",
      time: d.time || "",
      place: d.place || d.venue || "",
      fee: d.fee || "",
      city: rec.city,
      locality: d.locality || "",
      createdAt: rec.createdAt,
      approved: false,
    };
  });
}

// Reviewer vote (approve/reject). When quorum (80%) is reached, sync local DB.
export function voteEvent(submissionId, reviewerId, approve) {
  reviewVote("events", submissionId, reviewerId, approve);
  const finalized = reviewTryFinalize("events", submissionId);
  if (finalized && finalized.status === "approved") {
    // mark the mirrored local event approved
    const { events, idx } = findIndexById(finalized.id);
    if (idx >= 0) {
      events[idx].approved = true;
      save(events);
    } else {
      // if somehow missing locally, create a minimal approved record
      upsertEvent({
        id: finalized.id,
        name: finalized?.data?.name || "Event",
        category: finalized?.data?.category || "General",
        date: finalized?.data?.date || "",
        time: finalized?.data?.time || "",
        place: finalized?.data?.place || finalized?.data?.venue || "",
        fee: finalized?.data?.fee || "",
        city: finalized.city || "",
        locality: finalized?.data?.locality || "",
        description: finalized?.data?.description || "",
        media: Array.isArray(finalized?.data?.media) ? finalized.data.media : [],
        createdBy: finalized?.data?.createdBy || "Organizer",
        ownerId: finalized?.data?.ownerId || "",
        createdAt: finalized.createdAt || Date.now(),
        approved: true,
        feed: [],
        polls: [],
        attendees: [],
      });
    }
  }
  return finalized;
}

// Reviewer utilities
export function ensureEventReviewer(city, reviewerId) {
  reviewEnsureReviewer(city, "events", reviewerId);
}
export function getEventReviewers(city) {
  return reviewGetReviewers(city, "events");
}
export function getEventQuorum(city) {
  return reviewQuorumNeeded(city, "events");
}

/* ---------- Event internal feed (comments) --------- */
export function addEventComment(eventId, { authorId, authorName, text }) {
  const { events, idx } = findIndexById(eventId);
  if (idx < 0) return null;
  const comment = {
    id: `c-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: Date.now(),
    authorId: authorId || "",
    authorName: authorName || "User",
    text: (text || "").trim(),
  };
  events[idx].feed = events[idx].feed || [];
  events[idx].feed.unshift(comment);
  save(events);
  return comment;
}

export function listEventComments(eventId) {
  const e = getEventById(eventId);
  return e?.feed || [];
}

/* --------------- Event polls ---------------- */
export function createPoll(eventId, question, optionsArr) {
  const { events, idx } = findIndexById(eventId);
  if (idx < 0) return null;

  const poll = {
    id: `poll-${Date.now()}`,
    question: question?.trim() || "Your opinion?",
    options: (optionsArr || ["Yes", "No"]).map((t, i) => ({
      id: `opt-${i}-${Math.random().toString(16).slice(2)}`,
      text: String(t),
      votes: [],
    })),
    createdAt: Date.now(),
  };
  events[idx].polls = events[idx].polls || [];
  events[idx].polls.unshift(poll);
  save(events);
  return poll;
}

export function listPolls(eventId) {
  const e = getEventById(eventId);
  return e?.polls || [];
}

export function votePoll(eventId, pollId, optionId, userId) {
  const { events, idx } = findIndexById(eventId);
  if (idx < 0) return null;
  const pIdx = (events[idx].polls || []).findIndex(p => p.id === pollId);
  if (pIdx < 0) return null;

  events[idx].polls[pIdx].options.forEach(o => {
    o.votes = (o.votes || []).filter(v => v !== userId);
  });
  const oIdx = events[idx].polls[pIdx].options.findIndex(o => o.id === optionId);
  if (oIdx >= 0) {
    events[idx].polls[pIdx].options[oIdx].votes.push(userId);
  }
  save(events);
  return events[idx].polls[pIdx];
}

/* ---------------- RSVPs ------------------- */
export function listAttendees(eventId) {
  const e = getEventById(eventId);
  return e?.attendees || [];
}

export function isGoing(eventId, userId) {
  const e = getEventById(eventId);
  if (!e) return false;
  return (e.attendees || []).some(a => a.id === userId);
}

export function rsvp(eventId, userId, userName) {
  const { events, idx } = findIndexById(eventId);
  if (idx < 0) return null;
  const a = events[idx].attendees || [];
  if (!a.some(x => x.id === userId)) {
    a.push({ id: userId, name: userName || "You" });
    events[idx].attendees = a;
    save(events);
  }
  return events[idx].attendees;
}

export function cancelRsvp(eventId, userId) {
  const { events, idx } = findIndexById(eventId);
  if (idx < 0) return null;
  events[idx].attendees = (events[idx].attendees || []).filter(a => a.id !== userId);
  save(events);
  return events[idx].attendees;
}
