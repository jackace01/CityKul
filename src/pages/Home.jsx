// src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import AutoSlider from "../components/AutoSlider";
import { Link } from "react-router-dom";
import { getUser, isMember } from "../lib/auth";
import { trendingPosts, hotEvents, latestJobs, deals, contributors } from "../lib/data";
import { useChat } from "../components/ChatProvider";

// Selected city state
import { getSelectedCity, getSelectedLocality, subscribeSelectedCity } from "../lib/cityState";

// Promotions (for full-width rail)
import { getActivePromotions, listMyPromotions } from "../lib/api/promotions";

// Wallet
import { getBalance, getLedger } from "../lib/api/wallet";

// City Hero
import {
  ensureHeroMonthlyRollup,
  getCurrentLeader,
  listWinners
} from "../lib/api/cityHero";

// Contests
import { ensureMonthlyRollup, getLatestWinners } from "../lib/api/contests.js";

// (Optional) Discover API stub – safe fallback if not present in your repo
let getTouristDiscoverSafe = () => [];
try {
  // if you later add: export function listDiscoverByTag(city, tag){...}
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const api = require("../lib/api/discover");
  if (api?.listDiscoverByTag) getTouristDiscoverSafe = (city) => api.listDiscoverByTag(city, "Tourist Attraction");
} catch {}

// Helpers
function currentMonthKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function money(n) {
  const v = Number(n || 0);
  return `₹${Math.round(v)}`;
}

function sumInWindow(rows, fromTs, toTs) {
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

function toLocalTime(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return ""; }
}

export default function Home() {
  // --------- USER / CITY CONTEXT ----------
  const u = getUser();
  const member = isMember();
  const { openChat } = useChat();

  // prefer the global “selected city” so page follows City Switcher
  const [selCity, setSelCity] = useState(getSelectedCity() || u?.city || "Indore");
  const [selLoc, setSelLoc] = useState(getSelectedLocality() || u?.locality || "");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsub = subscribeSelectedCity(({ city, locality }) => {
      setSelCity(city || "");
      setSelLoc(locality || "");
      setTick(t => t + 1);
    });
    return () => unsub();
  }, []);

  // Ensure monthly rollups are ready (safe no-ops if already done)
  useEffect(() => { try { ensureHeroMonthlyRollup(selCity); } catch {} }, [selCity]);
  useEffect(() => { try { ensureMonthlyRollup(selCity); } catch {} }, [selCity]);

  // --------- PROMO RAIL (Full width slideshow) ----------
  const promos = useMemo(
    () => (selCity ? getActivePromotions(selCity, selLoc, Date.now()) : []),
    [selCity, selLoc, tick]
  );
  const bannerPromos = promos
    .filter(p => (p.slot || "rail") === "rail")
    .slice(0, 8);

  // --------- CITY HERO / CONTESTS ----------
  const monthKey = currentMonthKey();
  const heroWinners = useMemo(() => listWinners(selCity, 1), [selCity, tick]);
  const latestHeroWinner = heroWinners && heroWinners[0] ? heroWinners[0] : null;
  const heroThisMonth = latestHeroWinner && latestHeroWinner.monthKey === monthKey ? latestHeroWinner : null;
  const heroLeader = useMemo(() => getCurrentLeader(selCity), [selCity, tick]);

  const contestLatest = useMemo(() => getLatestWinners(selCity), [selCity, tick]);
  const cityThemePhoto = contestLatest?.photo?.photoUrl || heroThisMonth?.photoUrl || "";

  // --------- CITY ACTIVITY BOARD (top 1-2 of each) ----------
  const activityEvents = (hotEvents || []).slice(0, 2);
  const activityJobs = (latestJobs || []).slice(0, 2);
  const activityMarketplace = (deals || []).slice(0, 2);
  const activityRentals = []; // plug when rentals mock/list is ready
  const activityDiscover = []; // small highlights besides tourism carousel

  // --------- LEADERBOARDS (mini widgets right panel) ----------
  // Top Earners: sum ledger by user (mock: re-use contributors as fallback)
  const topContributors = contributors || [];
  // You can later replace with a real query that aggregates wallet by city.

  // --------- LIVE CITY CHAT HIGHLIGHTS ----------
  // We don’t have a public API to read ChatProvider messages.
  // Show a simple “highlights” teaser; clicking opens chat.
  const chatHighlights = (trendingPosts || []).slice(0, 3).map(x => ({
    id: x.id, user: x.author || "city", text: x.title
  }));

  // --------- TOURISM HIGHLIGHTS (Discover) ----------
  const tourism = useMemo(() => {
    try { return (getTouristDiscoverSafe(selCity) || []).slice(0, 8); } catch { return []; }
  }, [selCity, tick]);

  // --------- REWARDS SUMMARY ----------
  const userId = u?.email || u?.name || "guest@demo";
  const balance = useMemo(() => {
    try { return Math.round(getBalance(userId) || 0); } catch { return 0; }
  }, [userId, tick]);

  const recentLedger = useMemo(() => {
    try {
      const rows = getLedger(userId) || [];
      return Array.isArray(rows) ? rows : [];
    } catch { return []; }
  }, [userId, tick]);

  const now = Date.now();
  const startOfToday = new Date(new Date().toDateString()).getTime();
  const startOfWeek = (() => {
    const d = new Date();
    const day = d.getDay(); // 0 Sun
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.getTime();
  })();

  const earnedToday = Math.max(0, sumInWindow(recentLedger, startOfToday, now));
  const earnedThisWeek = Math.max(0, sumInWindow(recentLedger, startOfWeek, now));

  const nextRewardTimeLabel = (() => {
    // Your economy default says 11:00 PM local — show countdown-ish label
    const targetH = 23, targetM = 0;
    const d = new Date();
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), targetH, targetM, 0, 0);
    if (now > target.getTime()) target.setDate(target.getDate() + 1);
    return target.toLocaleTimeString();
  })();

  // --------- PAGE ----------
  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* 1️⃣ HEADER STRIP (visual city tone) */}
        <div
          className="mb-6 rounded-2xl ring-1 ring-[var(--color-border)] overflow-hidden"
          style={{
            background:
              cityThemePhoto
                ? `url(${cityThemePhoto}) center/cover no-repeat`
                : "linear-gradient(90deg, rgba(59,130,246,0.12), rgba(147,197,253,0.08))"
          }}
        >
          <div className="backdrop-brightness-[.85] backdrop-saturate-150 bg-black/20 p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-white drop-shadow">
                  {selCity || u?.city || "Your City"} · CityKul
                  {member && <span className="inline-block text-[10px] px-1 py-[1px] rounded bg-blue-600 text-white align-middle">✓</span>}
                </h1>
                <div className="text-sm text-white/90 drop-shadow">
                  {selLoc ? `${selLoc} · ` : ""}Your City, Your Vibe
                </div>
              </div>
              <div className="flex gap-2">
                {member ? (
                  <>
                    <Link to="/submit-post" className="px-3 py-2 rounded bg-[var(--color-accent)] text-white" title="Add feed post">+ Post</Link>
                    <Link to="/submit-event" className="px-3 py-2 rounded bg-white/90">+ Event</Link>
                    <Link to="/submit-job" className="px-3 py-2 rounded bg-white/90">+ Job</Link>
                    <Link to="/submit-deal" className="px-3 py-2 rounded bg-white/90">+ Deal</Link>
                  </>
                ) : (
                  <Link to="/membership" className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">Become a member</Link>
                )}
                <button onClick={() => openChat({ to: "City Chat" })} className="px-3 py-2 rounded bg-white/90">💬 City Chat</button>
              </div>
            </div>
            {/* Nav hint row (lightweight; your real nav is in Header) */}
            <div className="mt-3 text-[11px] text-white/90">
              Home · Discussions · Jobs · Events · Marketplace · Rentals · Discover · Wallet · Membership · Profile
            </div>
          </div>
        </div>

        {/* 2️⃣ TOP SECTION — PROMOTION RAIL (full width) */}
        <Section title="Sponsored — City Promotion Rail" rightHref="/promotions" rightText="See more">
          {bannerPromos.length ? (
            <AutoSlider
              items={bannerPromos}
              interval={3500}
              height={220}
              className="rounded-2xl"
              render={(p) => (
                <a
                  href={p.ctaHref || "#"}
                  target={p.ctaHref ? "_blank" : undefined}
                  rel="noreferrer"
                  className="block rounded-2xl overflow-hidden ring-1 ring-[var(--color-border)] bg-[var(--color-bg)]"
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="p-5">
                      <div className="text-sm font-semibold">{p.title || "Promotion"}</div>
                      {p.description ? <div className="text-xs text-[var(--color-muted)] mt-1">{p.description}</div> : null}
                    </div>
                  )}
                </a>
              )}
            />
          ) : (
            <Card>
              <div className="text-sm text-[var(--color-muted)]">No active sponsors right now.</div>
            </Card>
          )}
          <div className="mt-2 text-[11px] text-[var(--color-muted)]">
            Ads are targeted by city, interests & time slot. All promotions are verified before publishing.
          </div>
        </Section>

        {/* UNIFORM 12-COL GRID BODY */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* MAIN: 8 columns */}
          <div className="lg:col-span-8 grid gap-6">
            {/* 3️⃣ CITY ACTIVITY BOARD */}
            <Section title="City Activity Board" rightHref="/discover" rightText="See More">
              <div className="grid md:grid-cols-3 gap-3">
                {/* Events */}
                <Card>
                  <div className="text-xs text-[var(--color-muted)] mb-1">Events</div>
                  {(activityEvents.length ? activityEvents : [{ name: "No events yet" }]).map((e, i) => (
                    <div key={i} className="text-sm truncate">{e.name || e.title}</div>
                  ))}
                  <Link to="/events" className="mt-2 inline-block text-xs px-2 py-1 rounded bg-[var(--color-accent)] text-white">See Events</Link>
                </Card>

                {/* Jobs / Gigs */}
                <Card>
                  <div className="text-xs text-[var(--color-muted)] mb-1">Jobs & Gigs</div>
                  {(activityJobs.length ? activityJobs : [{ title: "No jobs yet" }]).map((j, i) => (
                    <div key={i} className="text-sm truncate">{j.title} {j.org ? <span className="text-[11px] text-[var(--color-muted)]">· {j.org}</span> : null}</div>
                  ))}
                  <Link to="/jobs" className="mt-2 inline-block text-xs px-2 py-1 rounded bg-[var(--color-accent)] text-white">See Jobs</Link>
                </Card>

                {/* Marketplace */}
                <Card>
                  <div className="text-xs text-[var(--color-muted)] mb-1">Marketplace</div>
                  {(activityMarketplace.length ? activityMarketplace : [{ title: "No deals yet" }]).map((d, i) => (
                    <div key={i} className="text-sm truncate">{d.title} {d.where ? <span className="text-[11px] text-[var(--color-muted)]">· {d.where}</span> : null}</div>
                  ))}
                  <Link to="/marketplace" className="mt-2 inline-block text-xs px-2 py-1 rounded bg-[var(--color-accent)] text-white">See Marketplace</Link>
                </Card>

                {/* Rentals */}
                <Card>
                  <div className="text-xs text-[var(--color-muted)] mb-1">Rentals</div>
                  {(activityRentals.length ? activityRentals : [{ title: "No rentals yet" }]).map((r, i) => (
                    <div key={i} className="text-sm truncate">{r.title || r.name}</div>
                  ))}
                  <Link to="/rentals" className="mt-2 inline-block text-xs px-2 py-1 rounded bg-[var(--color-accent)] text-white">See Rentals</Link>
                </Card>

                {/* Discover */}
                <Card>
                  <div className="text-xs text-[var(--color-muted)] mb-1">Discover</div>
                  {(activityDiscover.length ? activityDiscover : [{ title: "No new places" }]).map((d, i) => (
                    <div key={i} className="text-sm truncate">{d.title || d.name}</div>
                  ))}
                  <Link to="/discover" className="mt-2 inline-block text-xs px-2 py-1 rounded bg-[var(--color-accent)] text-white">See Discover</Link>
                </Card>

                {/* Tip */}
                <Card>
                  <div className="text-xs text-[var(--color-muted)] mb-1">Tip</div>
                  <div className="text-sm">Earn ₹3 per approved entry. Review and earn more!</div>
                </Card>
              </div>
            </Section>

            {/* 4️⃣ ONGOING CONTESTS */}
            <Section title="Ongoing Contests" rightHref="/contests" rightText="Enter now">
              <div className="grid sm:grid-cols-3 gap-3">
                {/* City Photo */}
                <Card className="overflow-hidden">
                  <div className="text-xs text-[var(--color-muted)] mb-1">City Photo</div>
                  {contestLatest?.photo?.photoUrl ? (
                    <img src={contestLatest.photo.photoUrl} alt="" className="w-full aspect-video object-cover rounded" />
                  ) : <div className="text-sm text-[var(--color-muted)]">Upload the best photo of {selCity}</div>}
                  <div className="mt-2 text-xs">Block {money(100)} + fee {money(5)}</div>
                  <div className="text-xs text-[var(--color-muted)]">₹500 winner · ₹300 split to voters</div>
                </Card>

                {/* City Description */}
                <Card>
                  <div className="text-xs text-[var(--color-muted)] mb-1">City Description</div>
                  <div className="text-sm">Write the best one-line vibe for {selCity}.</div>
                  <div className="mt-2 text-xs">Block {money(100)} + fee {money(5)}</div>
                  <div className="text-xs text-[var(--color-muted)]">₹500 winner · ₹300 split to voters</div>
                </Card>

                {/* City Hero (as contest tile too) */}
                <Card>
                  <div className="text-xs text-[var(--color-muted)] mb-1">City Hero</div>
                  <div className="text-sm">Nominate a local icon. Subscribers vote.</div>
                  <div className="mt-2 text-xs">Block {money(100)} + fee {money(5)}</div>
                  <div className="text-xs text-[var(--color-muted)]">₹500 winner · ₹300 split to voters</div>
                </Card>
              </div>
            </Section>

            {/* 5️⃣ HERO OF THE CITY */}
            <Section
              title="Hero of the City"
              rightHref="/city-hero"
              rightText={heroThisMonth ? "See Full Profile" : "Vote / Nominate"}
            >
              {heroThisMonth ? (
                <Card>
                  <div className="text-xs text-[var(--color-muted)]">Winner · {heroThisMonth.monthKey}</div>
                  <div className="mt-1 flex gap-3">
                    {heroThisMonth.photoUrl ? <img src={heroThisMonth.photoUrl} alt="" className="w-24 h-24 object-cover rounded" /> : null}
                    <div className="min-w-0">
                      <div className="font-semibold">{heroThisMonth.name}</div>
                      {heroThisMonth.bio ? <div className="text-sm mt-1 line-clamp-3">{heroThisMonth.bio}</div> : null}
                      <div className="mt-2">
                        <Link to="/city-hero" className="text-sm px-3 py-1 rounded bg-[var(--color-accent)] text-white">View City Hero</Link>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : heroLeader ? (
                <Card>
                  <div className="text-xs text-[var(--color-muted)]">Live Leaderboard · {monthKey}</div>
                  <div className="mt-1 flex gap-3">
                    {heroLeader.photoUrl ? <img src={heroLeader.photoUrl} alt="" className="w-24 h-24 object-cover rounded" /> : null}
                    <div className="min-w-0">
                      <div className="font-semibold">{heroLeader.name}</div>
                      {heroLeader.bio ? <div className="text-sm mt-1 line-clamp-3">{heroLeader.bio}</div> : null}
                      <div className="mt-2 flex items-center gap-2">
                        <Link to="/city-hero" className="text-sm px-3 py-1 rounded bg-[var(--color-accent)] text-white">Vote / Nominate</Link>
                        <span className="text-xs text-[var(--color-muted)]">Votes: {heroLeader.voteCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="text-sm text-[var(--color-muted)]">
                  No nominees yet. <Link to="/city-hero" className="underline">Be the first to nominate</Link>.
                </div>
              )}
            </Section>

            {/* 7️⃣ TRENDING IN YOUR CITY — Live Chat Highlights */}
            <Section title="Trending in Your City" rightHref="/chat" rightText="Join Chat">
              <div className="space-y-2">
                {chatHighlights.length ? chatHighlights.map((c) => (
                  <div key={c.id} className="rounded-lg ring-1 ring-[var(--color-border)] bg-[var(--color-surface)] p-2">
                    <div className="text-xs text-[var(--color-muted)]">{c.user}</div>
                    <div className="text-sm">{c.text}</div>
                  </div>
                )) : (
                  <Card><div className="text-sm text-[var(--color-muted)]">No messages yet. Be the first to say hi!</div></Card>
                )}
              </div>
              <div className="mt-2 text-[11px] text-[var(--color-muted)]">
                All users can view city chat. Only subscribers can send messages.
              </div>
            </Section>

            {/* 8️⃣ TOURISM HIGHLIGHTS (from Discover) */}
            <Section title="Explore Your City — Tourism Highlights" rightHref="/discover" rightText="See all">
              {tourism.length ? (
                <AutoSlider
                  items={tourism.slice(0, 8)}
                  interval={2800}
                  height={180}
                  className="rounded-xl"
                  render={(p) => (
                    <Link to={`/discover/${p._id || p.id || ""}`} className="block rounded-xl overflow-hidden ring-1 ring-[var(--color-border)] bg-[var(--color-bg)]">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="p-3">
                          <div className="text-sm font-semibold">{p.title || p.name || "Attraction"}</div>
                          {p.description ? <div className="text-xs text-[var(--color-muted)] mt-1 line-clamp-2">{p.description}</div> : null}
                        </div>
                      )}
                    </Link>
                  )}
                />
              ) : (
                <Card><div className="text-sm text-[var(--color-muted)]">No tourist attractions posted yet.</div></Card>
              )}
            </Section>
          </div>

          {/* RIGHT PANEL: 4 columns */}
          <div className="lg:col-span-4 grid gap-6">
            {/* 6️⃣ LEADERBOARDS */}
            <Section title="Top Earners (This Month)">
              <div className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
                <div className="space-y-2">
                  {(topContributors.slice(0, 5)).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="truncate">{i + 1}. {c.name}</div>
                      <div className="text-[11px] text-[var(--color-muted)]">{c.score}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Top Reviewers / Contributors">
              <div className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
                <div className="space-y-2">
                  {(topContributors.slice(0, 5)).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="truncate">{i + 1}. {c.name} <span className="ml-1 text-[10px] px-1 py-[1px] rounded bg-emerald-600 text-white">Trusted</span></div>
                      <div className="text-[11px] text-[var(--color-muted)]">{c.score}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* 9️⃣ REWARD SUMMARY WIDGET */}
            <Section title="Your Rewards">
              <Card>
                <div className="text-sm">
                  You earned <b>{money(earnedToday)}</b> today · <b>{money(earnedThisWeek)}</b> this week
                </div>
                <div className="text-xs text-[var(--color-muted)] mt-1">
                  Next Reward Update: {nextRewardTimeLabel}
                </div>
                <Link to="/wallet" className="mt-3 inline-block text-xs px-3 py-1 rounded bg-[var(--color-accent)] text-white">
                  Open Wallet
                </Link>
                <div className="mt-2 text-[11px] text-[var(--color-muted)]">Current balance: {money(balance)}</div>
              </Card>
            </Section>
          </div>
        </div>

        {/* 🔟 FOOTER */}
        <footer className="mt-8 mb-4 text-center">
          <div className="text-xs text-[var(--color-muted)]">
            Data shown for <b>{selCity || u?.city || "your city"}</b> · Last updated {toLocalTime(Date.now())}
          </div>
          <div className="mt-1 text-xs">
            <Link to="/safety" className="underline">Safety</Link> ·{" "}
            <Link to="/settings" className="underline">Privacy Policy</Link> ·{" "}
            <Link to="/settings" className="underline">Terms</Link> ·{" "}
            <a href="mailto:hello@citykul.com" className="underline">Contact Us</a>
          </div>
          <div className="mt-1 text-xs text-[var(--color-muted)]">© 2025 CityKul. All Rights Reserved.</div>
        </footer>
      </div>
    </Layout>
  );
}
