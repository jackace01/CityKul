// Local mock DB for events + event feed (comments) + polls + approvals + RSVPs
import { loadJSON, saveJSON } from "../storage";

const KEY_EVENTS = "citykul:events";

function load() { return loadJSON(KEY_EVENTS, []); }
function save(arr) { saveJSON(KEY_EVENTS, arr); }

// Create (pending approval by default)
export function addEvent(evt) {
  const events = load();
  const record = {
    id: evt.id || `evt-${Date.now()}`,
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
    createdAt: evt.createdAt || Date.now(),
    approved: false,
    feed: [],
    polls: [],
    attendees: [],
  };
  events.unshift(record);
  save(events);
  return record;
}

// Approvals
export function approveEvent(id) {
  const events = load();
  const idx = events.findIndex(e => e.id === id);
  if (idx >= 0) {
    events[idx].approved = true;
    save(events);
    return events[idx];
  }
  return null;
}

export function listApprovedEvents() {
  return load()
    .filter(e => e.approved)
    .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function listAllEvents() {
  return load().sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));
}

export function getEventById(id) {
  return load().find(e => e.id === id) || null;
}

/* ---------- Event internal feed (comments) --------- */
export function addEventComment(eventId, { authorId, authorName, text }) {
  const events = load();
  const idx = events.findIndex(e => e.id === eventId);
  if (idx < 0) return null;

  const comment = {
    id: `c-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: Date.now(),
    authorId: authorId || "",
    authorName: authorName || "User",
    text: (text || "").trim(),
  };
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
  const events = load();
  const idx = events.findIndex(e => e.id === eventId);
  if (idx < 0) return null;

  const poll = {
    id: `poll-${Date.now()}`,
    question: question?.trim() || "Your opinion?",
    options: (optionsArr || ["Yes","No"]).map((t, i) => ({
      id: `opt-${i}-${Math.random().toString(16).slice(2)}`,
      text: String(t),
      votes: [],
    })),
    createdAt: Date.now(),
  };
  events[idx].polls.unshift(poll);
  save(events);
  return poll;
}

export function listPolls(eventId) {
  const e = getEventById(eventId);
  return e?.polls || [];
}

export function votePoll(eventId, pollId, optionId, userId) {
  const events = load();
  const idx = events.findIndex(e => e.id === eventId);
  if (idx < 0) return null;
  const pIdx = events[idx].polls.findIndex(p => p.id === pollId);
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
  const events = load();
  const idx = events.findIndex(e => e.id === eventId);
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
  const events = load();
  const idx = events.findIndex(e => e.id === eventId);
  if (idx < 0) return null;
  events[idx].attendees = (events[idx].attendees || []).filter(a => a.id !== userId);
  save(events);
  return events[idx].attendees;
}
