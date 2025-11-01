// src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import AutoSlider from "../components/AutoSlider";
import { Link } from "react-router-dom";
import { getUser, isMember } from "../lib/auth";
import { trendingPosts, hotEvents, latestJobs, deals } from "../lib/data";
import { useChat } from "../components/ChatProvider";
import PromoRail from "../components/PromoRail";

// City Hero
import { ensureHeroMonthlyRollup, getCurrentLeader, listWinners } from "../lib/api/cityHero";
// Contests winners
import { ensureMonthlyRollup, getLatestWinners } from "../lib/api/contests.js";

// NEW: use selected city/locality
import { getSelectedCity, getSelectedLocality, subscribeSelectedCity } from "../lib/cityState";

function SliderCards({ items = [], render }) {
  const list = (items || []).slice(0, 5);
  if (!list.length) return <div className="text-sm text-[var(--color-muted)]">No data</div>;
  return <AutoSlider items={list} interval={2800} height={180} className="rounded-xl" render={render} />;
}

function currentMonthKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Home() {
  const u = getUser();
  const member = isMember();
  const { openChat } = useChat();

  // Prefer selected city/locality; fallback to user profile
  const [selCity, setSelCity] = useState(getSelectedCity() || u?.city || "Indore");
  const [selLoc, setSelLoc] = useState(getSelectedLocality() || u?.locality || "");

  // Refresh when user changes selection anywhere in app
  useEffect(() => {
    const unsub = subscribeSelectedCity(({ city, locality }) => {
      setSelCity(city || u?.city || "Indore");
      setSelLoc(locality || u?.locality || "");
    });
    return () => unsub();
  }, [u?.city, u?.locality]);

  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => { try { ensureHeroMonthlyRollup(selCity); } catch {} }, [selCity]);
  useEffect(() => { try { ensureMonthlyRollup(selCity); } catch {} }, [selCity]);

  // City Hero data
  const monthKey = currentMonthKey();
  const heroWinners = useMemo(() => listWinners(selCity, 1), [selCity, tick]);
  const latestHeroWinner = heroWinners && heroWinners[0] ? heroWinners[0] : null;
  const heroThisMonth = latestHeroWinner && latestHeroWinner.monthKey === monthKey ? latestHeroWinner : null;
  const heroLeader = useMemo(() => getCurrentLeader(selCity), [selCity, tick]);

  // Contests (existing)
  const winners = useMemo(() => getLatestWinners(selCity), [selCity, tick]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="mb-6 rounded-2xl ring-1 ring-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {u?.name ? u.name : "Welcome"}
                {member && <span className="inline-block text-[10px] px-1 py-[1px] rounded bg-blue-600 text-white align-middle">✓</span>}
              </h1>
              <div className="text-sm text-[var(--color-muted)]">
                {selCity ? `${selCity}${selLoc ? " - " + selLoc : ""}` : "Set your city to personalize your feed"}
              </div>
              <div className="mt-1 text-[13px] text-[var(--color-muted)]">
                <span className="font-medium text-[var(--color-fg)]">CityKul</span> — Discover places & rentals, find events/jobs, and solve civic issues together.
              </div>
            </div>

            <div className="flex gap-2">
              {member ? (
                <>
                  <Link to="/submit-post" className="px-3 py-2 rounded bg-[var(--color-accent)] text-white" title="Add feed post">+ Post</Link>
                  <Link to="/submit-event" className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">+ Event</Link>
                  <Link to="/submit-job" className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">+ Job</Link>
                  <Link to="/submit-deal" className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">+ Deal</Link>
                </>
              ) : (
                <Link to="/membership" className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">Become a member</Link>
              )}
              <button onClick={() => openChat({ to: "City Chat" })} className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">💬 City Chat</button>
            </div>
          </div>

          {/* Quick links */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
            <Link to="/discover" className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3 hover:shadow transition">
              <div className="text-xl">🧭</div>
              <div className="font-semibold mt-1">Discover</div>
              <div className="text-[11px] text-[var(--color-muted)]">New shops, hotels, restaurants…</div>
            </Link>
            <Link to="/rentals" className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3 hover:shadow transition">
              <div className="text-xl">🏠</div>
              <div className="font-semibold mt-1">Local Rentals</div>
              <div className="text-[11px] text-[var(--color-muted)]">Rooms, bikes, tools, more</div>
            </Link>
          </div>
        </div>

        {/* CITY HERO */}
        <Section
          title="City Hero — This Month"
          rightHref="/city-hero"
          rightText={heroThisMonth ? "See details" : "Vote / Nominate"}
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

        {/* City Stars (existing) */}
        <Section title="City Stars – Monthly Winners" rightHref="/contests" rightText="See all">
          {winners ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {winners.photo ? (
                <Card>
                  <div className="text-xs text-[var(--color-muted)]">📷 Photo — {winners.month}</div>
                  <div className="font-semibold">{winners.photo.title}</div>
                  {winners.photo.photoUrl ? (
                    <img src={winners.photo.photoUrl} alt="" className="mt-2 w-full aspect-video object-cover rounded" />
                  ) : null}
                </Card>
              ) : (
                <Card><div className="text-sm text-[var(--color-muted)]">No photo winner last month.</div></Card>
              )}
              {winners.description ? (
                <Card>
                  <div className="text-xs text-[var(--color-muted)]">✍️ Description — {winners.month}</div>
                  <div className="font-semibold">{winners.description.title}</div>
                  {winners.description.text ? <p className="mt-2 text-sm">{winners.description.text}</p> : null}
                </Card>
              ) : (
                <Card><div className="text-sm text-[var(--color-muted)]">No description winner last month.</div></Card>
              )}
            </div>
          ) : (
            <div className="text-sm text-[var(--color-muted)]">No winners yet. Be the first! <Link to="/contests" className="underline">Enter contests</Link></div>
          )}
        </Section>

        {/* Main grid + Right rail */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
          {/* Left column */}
          <div className="grid gap-6">
            <Section title={`Trending in ${selCity}`} rightHref="/trending" rightText="More">
              <SliderCards
                items={trendingPosts}
                render={(p) => (
                  <Card className="h-full">
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-xs text-[var(--color-muted)]">{p.author}</div>
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">Like</button>
                      <button className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">Share</button>
                      <button onClick={() => openChat({ to: p.author || "City Chat" })} className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">💬 Chat</button>
                    </div>
                  </Card>
                )}
              />
            </Section>

            <Section title="City Needs Attention" rightHref="/needsattention" rightText="Report issue">
              <SliderCards
                items={[
                  { text: `Potholes near Main St ${selLoc ? "· " + selLoc : ""}` },
                  { text: "Dim lights in Park Lane" },
                  { text: "Waste pickup delay Ward 4" },
                ]}
                render={(i) => (
                  <Card className="h-full">
                    <div className="font-medium">{i.text}</div>
                    <Link to="/needsattention" className="mt-3 inline-block px-3 py-1 rounded bg-[var(--color-accent)] text-white">Support</Link>
                  </Card>
                )}
              />
            </Section>
          </div>

          {/* Middle column */}
          <div className="grid gap-6">
            <Section title="Upcoming Events" rightHref="/events" rightText="View all">
              <SliderCards
                items={hotEvents}
                render={(e) => (
                  <Card className="h-full">
                    <div className="font-semibold">{e.name}</div>
                    <div className="text-xs text-[var(--color-muted)]">{e.date} · {e.venue}</div>
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">Interested</button>
                      <Link to="/events" className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">Details</Link>
                    </div>
                  </Card>
                )}
              />
            </Section>

            <Section title="Marketplace" rightHref="/marketplace" rightText="Explore">
              <SliderCards
                items={deals}
                render={(d) => (
                  <Card className="h-full">
                    <div className="font-semibold">{d.title}</div>
                    <div className="text-xs text-[var(--color-muted)]">{d.where}</div>
                    <div className="mt-3 flex gap-2">
                      <Link to="/marketplace" className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">Contact</Link>
                      <button onClick={() => openChat({ to: d.where || "City Chat" })} className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">💬 Chat</button>
                    </div>
                  </Card>
                )}
              />
            </Section>

            <Section title="Promotions" rightHref="/promotions" rightText="See more">
              <SliderCards
                items={deals}
                render={(d) => (
                  <Card className="h-full">
                    <div className="font-semibold">{d.title}</div>
                    <div className="text-xs text-[var(--color-muted)]">{d.where}</div>
                    <Link to="/promotions" className="mt-3 inline-block px-3 py-1 rounded ring-1 ring-[var(--color-border)]">Details</Link>
                  </Card>
                )}
              />
            </Section>
          </div>

          {/* Right rail promotions (city-aware) */}
          <div className="hidden lg:block">
            <PromoRail />
          </div>
        </div>
      </div>
    </Layout>
  );
}
