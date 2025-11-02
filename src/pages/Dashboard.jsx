// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { Link } from "react-router-dom";

import { getUser, isMember } from "../lib/auth";
import { getSelectedCity, getSelectedLocality } from "../lib/cityState";
import { getEffectiveConfig } from "../lib/config/loader";

// Wallet
import { getBalance, getLedger } from "../lib/api/wallet";

// Review engine (legacy quorum UI still uses this)
import * as Review from "../lib/review";

// NEW: separate engines
import { getReputation } from "../lib/reputation";
import { getVoteWeight as getVoteWeightSeparate } from "../lib/voteWeight";

// Promotions (safe)
let listMyPromotionsSafe = () => [];
try {
  const promoApi = require("../lib/api/promotions");
  if (promoApi?.listMyPromotions) listMyPromotionsSafe = promoApi.listMyPromotions;
} catch {}

// Optional module APIs (safe fallbacks)
const safe = {
  myEvents: () => [],
  myDiscover: () => [],
  myJobsPosted: () => [],
  myJobsApplied: () => [],
  myRentals: () => [],
  myListings: () => [],
  myContestEntries: () => [],
  myHeroNominations: () => [],
};
try { const ev = require("../lib/api/events"); if (ev?.listMyEvents) safe.myEvents = ev.listMyEvents; } catch {}
try { const d = require("../lib/api/discover"); if (d?.listMyDiscover) safe.myDiscover = d.listMyDiscover; } catch {}
try { const j = require("../lib/api/jobs"); if (j?.listMyJobs) safe.myJobsPosted = j.listMyJobs; if (j?.listMyApplications) safe.myJobsApplied = j.listMyApplications; } catch {}
try { const r = require("../lib/api/rentals"); if (r?.listMyRentals) safe.myRentals = r.listMyRentals; } catch {}
try { const m = require("../lib/api/marketplace"); if (m?.listMyListings) safe.myListings = m.listMyListings; } catch {}
try { const c = require("../lib/api/contests"); if (c?.listMyEntries) safe.myContestEntries = c.listMyEntries; } catch {}
try { const h = require("../lib/api/cityHero"); if (h?.listMyNominations) safe.myHeroNominations = h.listMyNominations; } catch {}

function money(v) { const n = Number(v || 0); return `₹${Math.round(n)}`; }

function sumByWindow(rows, fromTs, toTs) {
  return (rows || []).reduce((s, r) => {
    const ts = Number(r?.ts || 0);
    if (ts < fromTs || ts > toTs) return s;
    const delta =
      Number.isFinite(r?.delta) ? r.delta :
      Number.isFinite(r?.amount) ? r.amount :
      Number.isFinite(r?.points) ? r.points : 0;
    return s + (delta || 0);
  }, 0);
}
function startOfWeekMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0,0,0,0);
  return monday.getTime();
}
function tinyPill({ text, tone = "default" }) {
  const tones = {
    default: "ring-1 ring-[var(--color-border)]",
    ok: "bg-emerald-600 text-white",
    warn: "bg-amber-600 text-white",
    bad: "bg-red-600 text-white",
    info: "bg-[var(--color-accent)] text-white",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${tones[tone] || tones.default}`}>{text}</span>;
}

// Simple local appeals log (mock)
const APPEALS_KEY = "citykul:appeals:v1";
function loadAppeals() { try { return JSON.parse(localStorage.getItem(APPEALS_KEY) || "[]"); } catch { return []; } }
function saveAppeal(row) {
  const cur = loadAppeals();
  cur.unshift(row);
  localStorage.setItem(APPEALS_KEY, JSON.stringify(cur.slice(0, 500)));
}

export default function Dashboard() {
  const u = getUser();
  const member = isMember();
  const userId = u?.email || u?.name || "guest@demo";
  const selCity = getSelectedCity() || u?.city || "Indore";
  const selLoc = getSelectedLocality() || u?.locality || "";

  // Economy
  const econ = useMemo(() => getEffectiveConfig(selCity), [selCity]);

  // Tabs
  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "profile", label: "Profile & Security" },
    { id: "submissions", label: "Your Submissions" },
    { id: "jobs", label: "Jobs & Gigs" },
    { id: "reviews", label: "Reviews & Votes" },
    { id: "wallet", label: "Wallet" },
    { id: "appeals", label: "Flags & Appeals" },
    { id: "missions", label: "City Missions" },
    { id: "settings", label: "Settings" },
  ];
  const [tab, setTab] = useState("overview");

  // Wallet
  const [tick, setTick] = useState(0);
  const balance = useMemo(() => {
    try { return Math.round(getBalance(userId) || 0); } catch { return 0; }
  }, [userId, tick]);
  const ledger = useMemo(() => {
    try {
      const rows = getLedger(userId) || [];
      return Array.isArray(rows) ? rows.sort((a,b) => (b.ts||0)-(a.ts||0)) : [];
    } catch { return []; }
  }, [userId, tick]);

  // Stats
  const now = Date.now();
  const monday = startOfWeekMonday();
  const earnedThisWeek = Math.max(0, sumByWindow(ledger, monday, now));
  const lc = (x) => (x || "").toLowerCase();
  const blockedFunds = Math.abs(
    (ledger || []).reduce((s, r) => {
      const reason = lc(r?.reason);
      const amt = Number.isFinite(r?.delta) ? r.delta :
                  Number.isFinite(r?.amount) ? r.amount :
                  Number.isFinite(r?.points) ? r.points : 0;
      if (amt < 0 && (reason.includes("block") || reason.includes("hold"))) return s + amt;
      return s;
    }, 0)
  );

  // Submissions (safe)
  const myPromos = useMemo(() => listMyPromotionsSafe(userId), [userId, tick]);
  const myEvents = useMemo(() => safe.myEvents(userId) || [], [userId, tick]);
  const myDiscover = useMemo(() => safe.myDiscover(userId) || [], [userId, tick]);
  const myJobsPosted = useMemo(() => safe.myJobsPosted(userId) || [], [userId, tick]);
  const myJobsApplied = useMemo(() => safe.myJobsApplied(userId) || [], [userId, tick]);
  const myRentals = useMemo(() => safe.myRentals(userId) || [], [userId, tick]);
  const myListings = useMemo(() => safe.myListings(userId) || [], [userId, tick]);
  const myContestEntries = useMemo(() => safe.myContestEntries(userId) || [], [userId, tick]);
  const myHeroNominations = useMemo(() => safe.myHeroNominations(userId) || [], [userId, tick]);

  const pendingApprovals = useMemo(() => {
    const rows = [ ...myPromos, ...myEvents, ...myDiscover, ...myListings, ...myRentals, ...myJobsPosted ];
    return rows.filter(it => (it?._status || it?.status || "under_review") === "under_review").length;
  }, [myPromos, myEvents, myDiscover, myListings, myRentals, myJobsPosted]);

  // NEW: Live Reputation & Vote-Weight (separate engine)
  const repScore = useMemo(() => getReputation(userId, selCity), [userId, selCity, tick]);
  const voteWeight = useMemo(() => getVoteWeightSeparate(userId, selCity, member), [userId, selCity, member, tick]);

  // Countdown
  function computeCountdown() {
    const hour = Number.isFinite(econ?.postingHour) ? econ.postingHour : 23;
    const minute = Number.isFinite(econ?.postingMinute) ? econ.postingMinute : 0;
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (Date.now() > target.getTime()) target.setDate(target.getDate() + 1);
    const ms = target.getTime() - Date.now();
    const hh = String(Math.floor(ms / 3600000)).padStart(2, "0");
    const mm = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
    const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  const [countdown, setCountdown] = useState(computeCountdown());
  useEffect(() => {
    const t = setInterval(() => setCountdown(computeCountdown()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [econ?.postingHour, econ?.postingMinute]);

  function StatCard({ label, value, sub }) {
    return (
      <Card>
        <div className="text-xs text-[var(--color-muted)]">{label}</div>
        <div className="text-xl font-semibold mt-1">{value}</div>
        {sub ? <div className="text-[11px] text-[var(--color-muted)] mt-1">{sub}</div> : null}
      </Card>
    );
  }

  function Table({ columns = [], rows = [] }) {
    return (
      <div className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-[var(--color-muted)] bg-[var(--color-elev)]">
            <tr>
              {columns.map((c, i) => (
                <th key={i} className={`${c.align === "right" ? "text-right" : "text-left"} px-3 py-2`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((r, i) => (
              <tr key={i} className="border-t border-[var(--color-border)] align-top">
                {columns.map((c, j) => (
                  <td key={j} className={`${c.align === "right" ? "text-right" : "text-left"} px-3 py-2`}>{c.render ? c.render(r) : r[c.key]}</td>
                ))}
              </tr>
            )) : (
              <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-[var(--color-muted)]">No data.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Layout>
      <Section title="User Dashboard">
        <div className="text-sm text-[var(--color-muted)]">
          {u ? <>Signed in as <b>{u.name || u.email || "User"}</b> · {selCity}{selLoc ? ` – ${selLoc}` : ""}</> : <>You’re not logged in.</>}
        </div>

        {/* Tabs */}
        <div className="mt-3 flex flex-wrap gap-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1 rounded text-sm ${tab === t.id ? "bg-[var(--color-accent)] text-white" : "ring-1 ring-[var(--color-border)]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div className="mt-6 grid gap-6">
          {tab === "overview" && (
            <>
              <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                {/* Profile Snapshot */}
                <Card>
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded bg-[var(--color-elev)] grid place-items-center text-xl">👤</div>
                    <div className="min-w-0">
                      <div className="font-semibold">{u?.name || "Guest"}</div>
                      <div className="text-xs text-[var(--color-muted)]">{selCity}{selLoc ? ` · ${selLoc}` : ""}</div>
                      <div className="mt-1 flex items-center gap-1">
                        {member ? tinyPill({ text: "Subscriber", tone: "info" }) : tinyPill({ text: "Free", tone: "default" })}
                        {repScore >= 3 ? tinyPill({ text: "Trusted Reviewer", tone: "ok" }) : null}
                      </div>
                      <div className="mt-2 text-[11px] text-[var(--color-muted)]">
                        Membership: {money(econ?.membership?.priceINR ?? 100)} / mo · Welcome bonus {money(econ?.membership?.welcomeBonusPts ?? 50)}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Quick Stats Panel */}
                <div className="grid md:grid-cols-6 gap-3">
                  <StatCard label="Reputation" value={repScore.toFixed(2)} sub="Trust score (city-wide)" />
                  <StatCard label="Vote Weight" value={voteWeight.toFixed(2)} sub="Used in Review decisions" />
                  <StatCard label="Wallet Balance" value={money(balance)} />
                  <StatCard label="Rewards (This Week)" value={money(earnedThisWeek)} />
                  <StatCard label="Blocked Funds" value={money(blockedFunds)} />
                  <StatCard label="Pending Approvals" value={pendingApprovals} />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Link to="/wallet" className="px-3 py-2 rounded bg-[var(--color-accent)] text-white text-sm">Withdraw</Link>
                <Link to="/membership" className="px-3 py-2 rounded ring-1 ring-[var(--color-border)] text-sm">Upgrade Membership</Link>
                <Link to="/settings" className="px-3 py-2 rounded ring-1 ring-[var(--color-border)] text-sm">Change City</Link>
              </div>
            </>
          )}

          {tab === "profile" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <div className="font-semibold">Your Trust Metrics</div>
                <div className="mt-2 grid sm:grid-cols-2 gap-3">
                  <div className="rounded-xl ring-1 ring-[var(--color-border)] p-3">
                    <div className="text-xs text-[var(--color-muted)]">Reputation</div>
                    <div className="text-xl font-semibold">{repScore.toFixed(2)}</div>
                    <div className="text-[11px] text-[var(--color-muted)] mt-1">Boosted by KYC, jobs success & contributions</div>
                  </div>
                  <div className="rounded-xl ring-1 ring-[var(--color-border)] p-3">
                    <div className="text-xs text-[var(--color-muted)]">Vote Weight</div>
                    <div className="text-xl font-semibold">{voteWeight.toFixed(2)}</div>
                    <div className="text-[11px] text-[var(--color-muted)] mt-1">Improves when your votes match outcomes</div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="font-semibold">Verification & Privacy</div>
                <ul className="mt-2 text-sm text-[var(--color-muted)] list-disc list-inside">
                  <li>KYC: Not completed</li>
                  <li>Phone: {u?.phone ? "Verified" : "Not verified"}</li>
                  <li>ID/Address: Not submitted</li>
                  <li className="mt-2">Export data · Delete account · Hide name from Discover contributions</li>
                </ul>
                <div className="mt-2 text-[11px] text-[var(--color-muted)]">
                  We store minimum data needed to operate CityKul. You can request deletion anytime.
                </div>
              </Card>
            </div>
          )}

          {/* Remaining tabs unchanged except for layout tweaks */}
          {/* ... (keep your existing Submissions / Jobs / Reviews / Wallet / Appeals / Missions / Settings sections as-is) ... */}

          {/* Submissions */}
          {/* (unchanged – keep your previous code) */}
          {/* Jobs */}
          {/* (unchanged – keep your previous code) */}
          {/* Reviews */}
          {/* (unchanged – keep your previous code) */}
          {/* Wallet */}
          {/* (unchanged – keep your previous code) */}
          {/* Appeals */}
          {/* (unchanged – keep your previous code) */}
          {/* Missions */}
          {/* (unchanged – keep your previous code) */}
          {/* Settings */}
          {/* (unchanged – keep your previous code) */}
        </div>

        {/* Footer of Dashboard */}
        <div className="mt-8 text-xs text-[var(--color-muted)]">
          Quick Links: <button className="underline">Report a Problem</button> · <Link to="/settings" className="underline">Privacy Policy</Link> · <Link to="/settings" className="underline">Terms</Link>
        </div>
      </Section>
    </Layout>
  );
}
