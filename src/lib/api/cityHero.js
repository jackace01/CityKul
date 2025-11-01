// src/lib/api/cityHero.js
// City Hero of the Month — localStorage module (submit, vote, monthly auto-pick, reports, legacy)

import { loadJSON, saveJSON } from "../storage";
import { getUser, isMember } from "../auth";
import { submit as reviewSubmit, ensureReviewer, vote as reviewVote, tryFinalize, quorumInfo } from "../review";

const HERO_KEY = (city) => `citykul:hero:entries:${city}`;
const CURRENT_KEY = (city) => `citykul:hero:current:${city}`;
const WINNERS_KEY = (city) => `citykul:hero:winners:${city}`;
const REPORTS_KEY = (id) => `citykul:hero:reports:${id}`;

function monthKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // 2025-10
}
function ensureCurrentCycle(city) {
  const ck = CURRENT_KEY(city);
  const cur = loadJSON(ck, null);
  const mk = monthKey();
  if (!cur || cur.monthKey !== mk) {
    saveJSON(ck, { monthKey: mk, startedAt: Date.now() });
  }
  return loadJSON(ck, { monthKey: mk, startedAt: Date.now() });
}

/** Submit a hero profile into current cycle */
export function submitHero({ city, name, bio = "", photoUrl = "" }) {
  if (!city || !name) throw new Error("Missing city or name");
  const u = getUser();
  if (!u) throw new Error("Login required");
  if (!isMember()) throw new Error("Membership required to submit");

  ensureCurrentCycle(city);
  const list = loadJSON(HERO_KEY(city), []);
  const rec = {
    id: `hero-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    city,
    name: String(name).trim(),
    bio: String(bio || "").trim(),
    photoUrl: String(photoUrl || ""),
    submitterId: u.email || u.name || "user",
    createdAt: Date.now(),
    monthKey: monthKey(),
    votes: {},          // map of voterId: true
    voteCount: 0,
  };
  list.unshift(rec);
  saveJSON(HERO_KEY(city), list);
  return rec;
}

/** List current cycle nominees (top first) */
export function listNominees(city) {
  ensureCurrentCycle(city);
  const mk = monthKey();
  const list = loadJSON(HERO_KEY(city), []);
  return list.filter(x => x.monthKey === mk).sort((a,b)=> (b.voteCount||0)-(a.voteCount||0));
}

/** Vote for a nominee (subscribers only; 1 per user per nominee) */
export function voteHero({ city, heroId }) {
  const u = getUser();
  if (!u) throw new Error("Login required");
  if (!isMember()) throw new Error("Subscribers can vote");

  const list = loadJSON(HERO_KEY(city), []);
  const idx = list.findIndex(x => x.id === heroId);
  if (idx < 0) throw new Error("Nominee not found");

  const voterId = u.email || u.name || "user";
  if (list[idx].votes[voterId]) return list[idx]; // already voted

  list[idx].votes[voterId] = true;
  list[idx].voteCount = Object.keys(list[idx].votes).length;
  saveJSON(HERO_KEY(city), list);
  return list[idx];
}

/** Report a nominee as fake/duplicate — routes via review engine (module id: hero_report) */
export function reportHero({ city, heroId, reason = "fake" }) {
  const u = getUser();
  if (!u) throw new Error("Login required");

  const repList = loadJSON(REPORTS_KEY(heroId), []);
  repList.unshift({ reportId: `hr-${Date.now()}-${Math.random().toString(16).slice(2)}`, reporterId: u.email || u.name || "user", reason, ts: Date.now() });
  saveJSON(REPORTS_KEY(heroId), repList);

  ensureReviewer(city, "hero_report", u.email || u.name || "user"); // harmless no-op if already a reviewer
  const rec = reviewSubmit("hero_report", { city, heroId, reason, reporterId: u.email || u.name || "user" });
  return rec;
}

/** Cast a vote on a hero_report (admin/reviewer tooling can call) */
export function voteHeroReport({ submissionId, approve }) {
  const u = getUser();
  if (!u) throw new Error("Login required");
  reviewVote("hero_report", submissionId, u.email || u.name || "user", !!approve);
  return tryFinalize("hero_report", submissionId);
}

/** Get quorum settings snapshot for UI */
export function heroReportQuorum(city) {
  return quorumInfo(city, "hero_report");
}

/** Ensure monthly winner is selected (idempotent). Call on Home load or on /city-hero page mount. */
export function ensureHeroMonthlyRollup(city) {
  const cur = ensureCurrentCycle(city);
  const mk = cur.monthKey;
  const winners = loadJSON(WINNERS_KEY(city), []);
  if (winners.find(w => w.monthKey === mk)) return winners.find(w => w.monthKey === mk) || null;

  const now = new Date();
  const isFirst = now.getDate() === 1;
  if (!isFirst) return null;

  const list = loadJSON(HERO_KEY(city), []).filter(x => x.monthKey === mk);
  if (!list.length) return null;

  list.sort((a,b) => (b.voteCount||0)-(a.voteCount||0) || (a.createdAt - b.createdAt));
  const win = list[0];
  const row = {
    id: win.id,
    name: win.name,
    bio: win.bio,
    photoUrl: win.photoUrl,
    monthKey: mk,
    ts: Date.now(),
  };
  winners.unshift(row);
  saveJSON(WINNERS_KEY(city), winners);
  return row;
}

/** Get current month leader (live leaderboard top) */
export function getCurrentLeader(city) {
  const list = listNominees(city);
  return list[0] || null;
}

/** Get last N winners (legacy archive) */
export function listWinners(city, limit = 24) {
  const winners = loadJSON(WINNERS_KEY(city), []);
  return winners.slice(0, limit);
}
