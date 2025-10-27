// src/pages/Home.jsx
import React from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import AutoSlider from "../components/AutoSlider";
import { Link } from "react-router-dom";
import { getUser, isMember } from "../lib/auth";
import { trendingPosts, hotEvents, latestJobs, deals } from "../lib/data";
import { useChat } from "../components/ChatProvider";

function SliderCards({ items = [], render }) {
  const list = (items || []).slice(0, 5);
  if (!list.length) return <div className="text-sm text-[var(--color-muted)]">No data</div>;
  return (
    <AutoSlider
      items={list}
      interval={2800}
      height={180}
      className="rounded-xl"
      render={render}
    />
  );
}

export default function Home() {
  const u = getUser();
  const member = isMember();
  const { openChat } = useChat();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="mb-6 rounded-2xl ring-1 ring-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {u?.name ? u.name : "Welcome"}
                {member && (
                  <span className="inline-block text-[10px] px-1 py-[1px] rounded bg-blue-600 text-white align-middle">
                    ✓
                  </span>
                )}
              </h1>
              <div className="text-sm text-[var(--color-muted)]">
                {u?.city
                  ? `${u.city}${u?.locality ? " - " + u.locality : ""}`
                  : "Set your city to personalize your feed"}
              </div>
              <div className="mt-1 text-[13px] text-[var(--color-muted)]">
                <span className="font-medium text-[var(--color-fg)]">CityKul</span> — Discover events, jobs, deals and solve civic issues together.
              </div>
            </div>

            <div className="flex gap-2">
              {member ? (
                <>
                  <Link
                    to="/submit-post"
                    className="px-3 py-2 rounded bg-[var(--color-accent)] text-white"
                    title="Add feed post"
                  >
                    + Post
                  </Link>
                  <Link to="/submit-event" className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">
                    + Event
                  </Link>
                  <Link to="/submit-job" className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">
                    + Job
                  </Link>
                  <Link to="/submit-deal" className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">
                    + Deal
                  </Link>
                </>
              ) : (
                <Link to="/membership" className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">
                  Become a member
                </Link>
              )}
              <button
                onClick={() => openChat({ to: "City Chat" })}
                className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]"
              >
                💬 City Chat
              </button>
            </div>
          </div>
        </div>

        {/* 2-up grid with right rail promotions */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
          {/* Left column */}
          <div className="grid gap-6">
            <Section title="Trending in Your City" rightHref="/trending" rightText="More">
              <SliderCards
                items={trendingPosts}
                render={(p) => (
                  <Card className="h-full">
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-xs text-[var(--color-muted)]">{p.author}</div>
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">Like</button>
                      <button className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">Share</button>
                      <button
                        onClick={() => openChat({ to: p.author || "City Chat" })}
                        className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
                      >
                        💬 Chat
                      </button>
                    </div>
                  </Card>
                )}
              />
            </Section>

            <Section title="Top Jobs" rightHref="/jobs" rightText="View all">
              <SliderCards
                items={latestJobs}
                render={(j) => (
                  <Card className="h-full">
                    <div className="font-semibold">{j.title}</div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {j.org} · {j.type}
                    </div>
                    <Link to="/jobs" className="mt-3 inline-block px-3 py-1 rounded bg-green-600 text-white">
                      Apply
                    </Link>
                  </Card>
                )}
              />
            </Section>

            <Section title="City Needs Attention" rightHref="/needsattention" rightText="Report issue">
              <SliderCards
                items={[
                  { text: "Potholes near Main St" },
                  { text: "Dim lights in Park Lane" },
                  { text: "Waste pickup delay Ward 4" },
                ]}
                render={(i) => (
                  <Card className="h-full">
                    <div className="font-medium">{i.text}</div>
                    <Link to="/needsattention" className="mt-3 inline-block px-3 py-1 rounded bg-[var(--color-accent)] text-white">
                      Support
                    </Link>
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
                    <div className="text-xs text-[var(--color-muted)]">
                      {e.date} · {e.venue}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">Interested</button>
                      <Link
                        to="/events"
                        className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
                      >
                        Details
                      </Link>
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
                      <Link to="/marketplace" className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">
                        Contact
                      </Link>
                      <button
                        onClick={() => openChat({ to: d.where || "City Chat" })}
                        className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
                      >
                        💬 Chat
                      </button>
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
                    <Link
                      to="/promotions"
                      className="mt-3 inline-block px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
                    >
                      Details
                    </Link>
                  </Card>
                )}
              />
            </Section>
          </div>

          {/* Right rail promotions */}
          <div className="hidden lg:block space-y-4">
            <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
              <div className="text-sm font-semibold">Sponsored</div>
              <p className="text-xs text-[var(--color-muted)] mt-1">Advertise here to reach your city.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
