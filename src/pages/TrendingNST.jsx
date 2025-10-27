// src/pages/TrendingNST.jsx
// “Trending in Your City” (NST = New Style Trending) — WIDER & PROPERLY CENTERED
// - 3 columns: Date nav (left) | Main content (wide) | Right rail
// - Date nav is visible from md+ (and a compact selector on mobile)
// - Includes City Needs Attention (top tags)
// - Top 5 Trending posts + Like/Share/Chat/Comment
// - “What’s on your mind?” (city chat) with tags
// - Date-wise browsing for thoughts

import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { Link } from "react-router-dom";
import { isMember, getCity, getLocality } from "../lib/auth";
import { listPosts, toggleLike, addComment } from "../lib/api/posts";
import { getTopTags } from "../lib/api/needs";
import BecomeMemberButton from "../components/BecomeMemberButton";

/* ---------------- City “Thoughts” (localStorage) ---------------- */
const THOUGHTS_KEY = "citykul:thoughts";
function loadThoughts() {
  try {
    const raw = localStorage.getItem(THOUGHTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveThoughts(arr) {
  localStorage.setItem(THOUGHTS_KEY, JSON.stringify(arr || []));
}

export default function TrendingNST() {
  const member = isMember();
  const city = getCity();
  const locality = getLocality();

  const [q, setQ] = useState("");
  const [tick, setTick] = useState(0);

  const [topTags, setTopTags] = useState([]);
  const [commentDrafts, setCommentDrafts] = useState({}); // {postId: text}

  // Thoughts input
  const [thoughtText, setThoughtText] = useState("");
  const [thoughtTags, setThoughtTags] = useState("");

  // Date selection for thoughts
  const [selectedDate, setSelectedDate] = useState("all");

  useEffect(() => {
    try {
      setTopTags(getTopTags(city, 10));
    } catch {
      setTopTags([]);
    }
  }, [city, tick]);

  // Posts
  const approved = useMemo(
    () => listPosts({ city, locality, onlyApproved: true }),
    [city, locality, tick]
  );

  const topFive = useMemo(
    () => [...approved].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 5),
    [approved]
  );

  const filteredLatest = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const base = qq
      ? approved.filter((p) =>
          `${p.title} ${p.text} ${p.authorName || p.author}`.toLowerCase().includes(qq)
        )
      : approved;
    const topIds = new Set(topFive.map((p) => p.id));
    return base.filter((p) => !topIds.has(p.id));
  }, [approved, q, topFive]);

  // Thoughts list & date buckets
  const thoughts = useMemo(() => {
    const all = loadThoughts()
      .filter((t) => (city ? (t.city || "").toLowerCase() === city.toLowerCase() : true))
      .filter((t) =>
        locality ? (t.locality || "").toLowerCase() === locality.toLowerCase() : true
      )
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
    if (selectedDate === "all") return all;
    return all.filter((t) => new Date(t.ts).toISOString().slice(0, 10) === selectedDate);
  }, [city, locality, selectedDate, tick]);

  const dateBuckets = useMemo(() => {
    const map = new Map(); // yyyy-mm-dd -> count
    for (const t of loadThoughts()) {
      if (city && (t.city || "").toLowerCase() !== city.toLowerCase()) continue;
      if (locality && (t.locality || "").toLowerCase() !== locality.toLowerCase()) continue;
      const iso = new Date(t.ts).toISOString().slice(0, 10);
      map.set(iso, (map.get(iso) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([iso, count]) => ({ iso, count }));
  }, [city, locality, tick]);

  // Actions
  function like(id) {
    toggleLike(id);
    setTick((t) => t + 1);
  }
  function onCommentSubmit(e, id) {
    e.preventDefault();
    const text = (commentDrafts[id] || "").trim();
    if (!text) return;
    addComment(id, "You", text);
    setCommentDrafts((d) => ({ ...d, [id]: "" }));
    setTick((t) => t + 1);
  }
  function addThought(e) {
    e.preventDefault();
    const body = thoughtText.trim();
    if (!body) return;
    const tags = (thoughtTags || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    saveThoughts([
      {
        id: `t-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ts: Date.now(),
        author: "You",
        text: body,
        tags,
        city: city || "",
        locality: locality || "",
      },
      ...loadThoughts(),
    ]);
    setThoughtText("");
    setThoughtTags("");
    setTick((t) => t + 1);
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-2 md:px-4">
        {/* Header bar */}
        <div className="mb-6 rounded-2xl ring-1 ring-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold">Trending in Your City</h1>
              <div className="text-sm text-[var(--color-muted)]">
                {city ? `${city}${locality ? " — " + locality : ""}` : "Pick your city from the header"}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search posts…"
                className="w-64 px-3 py-2 rounded bg-white dark:bg-gray-900 border border-[var(--color-border)] text-black dark:text-white"
              />
              {member ? (
                <>
                  <Link to="/submit-post" className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">
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
                <BecomeMemberButton label="Become a member to post" />
              )}
            </div>
          </div>

          {/* Needs-Attention tags */}
          <div className="mt-4">
            <div className="text-sm font-semibold mb-2">City Needs Attention — Top Issues</div>
            {topTags && topTags.length ? (
              <div className="flex flex-wrap gap-2">
                {topTags.map((t) => (
                  <span
                    key={t.tag}
                    className="px-3 py-1 rounded-full ring-1 ring-[var(--color-border)] bg-[var(--color-surface)] text-xs"
                    title={`${t.count} picks`}
                  >
                    {t.tag} <span className="opacity-60">· {t.count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[var(--color-muted)]">No top issues yet.</div>
            )}
          </div>
        </div>

        {/* Mobile date selector */}
        <div className="md:hidden mb-4">
          <div className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
            <label className="text-xs block mb-1">Browse thoughts by date</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
            >
              <option value="all">All recent</option>
              {dateBuckets.map((d) => (
                <option key={d.iso} value={d.iso}>
                  {new Date(d.iso).toLocaleDateString()} · {d.count}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* MAIN GRID — wider middle column and visible left nav on md+ */}
        <div className="grid items-start gap-6 md:grid-cols-[240px_minmax(0,1.6fr)_340px]">
          {/* LEFT: Date nav (visible from md) */}
          <aside className="hidden md:block">
            <div className="sticky top-20 rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
              <div className="font-semibold text-sm mb-2">Thoughts by Date</div>
              <button
                onClick={() => setSelectedDate("all")}
                className={`w-full text-left px-2 py-1 rounded text-sm ${
                  selectedDate === "all" ? "bg-black/5 dark:bg-white/5" : ""
                }`}
              >
                All recent
              </button>
              <div className="mt-1 space-y-1 max-h-[60vh] overflow-auto pr-1">
                {dateBuckets.length ? (
                  dateBuckets.map((d) => (
                    <button
                      key={d.iso}
                      onClick={() => setSelectedDate(d.iso)}
                      className={`w-full text-left px-2 py-1 rounded text-sm ${
                        selectedDate === d.iso ? "bg-black/5 dark:bg-white/5" : ""
                      }`}
                    >
                      {new Date(d.iso).toLocaleDateString()}{" "}
                      <span className="text-[var(--color-muted)]">· {d.count}</span>
                    </button>
                  ))
                ) : (
                  <div className="text-xs text-[var(--color-muted)]">No entries yet.</div>
                )}
              </div>
            </div>
          </aside>

          {/* MIDDLE: WIDE content */}
          <main className="grid gap-6">
            {/* Top 5 Trending */}
            <Section title="Top 5 Trending">
              {topFive.length ? (
                <div className="space-y-3">
                  {topFive.map((p) => (
                    <Card key={p.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{p.title || "Post"}</h3>
                          <p className="text-xs text-[var(--color-muted)]">
                            {(p.authorName || p.author || "User")} · {p.city || "City"}
                            {p.locality ? ` — ${p.locality}` : ""}
                          </p>
                        </div>
                        <span className="text-xs rounded-full px-2 py-1 bg-black/5 dark:bg-white/5">Trending</span>
                      </div>

                      {p.text && <p className="text-sm mt-2 whitespace-pre-wrap">{p.text}</p>}

                      {!!(p.media?.length) && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {p.media.slice(0, 4).map((m, i) => (
                            <img
                              key={i}
                              src={m.url}
                              alt=""
                              className="rounded-lg ring-1 ring-[var(--color-border)] object-cover w-full h-28"
                            />
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => like(p.id)}
                          className="px-3 py-1 rounded bg-[var(--color-accent)] text-white"
                        >
                          👍 {p.likes || 0}
                        </button>
                        <button
                          className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
                          onClick={() => {
                            navigator.clipboard?.writeText?.(`${location.origin}/feed?post=${p.id}`);
                            alert("Post link copied!");
                          }}
                        >
                          🔗 Share
                        </button>
                        <Link
                          to={`/chat?id=${encodeURIComponent(p.id)}&title=${encodeURIComponent(
                            p.title || "Post"
                          )}&ownerName=${encodeURIComponent(p.authorName || p.author || "User")}`}
                          className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
                        >
                          💬 Chat
                        </Link>
                      </div>

                      <form onSubmit={(e) => onCommentSubmit(e, p.id)} className="mt-3">
                        <input
                          value={commentDrafts[p.id] || ""}
                          onChange={(e) => setCommentDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                          placeholder="Write a comment…"
                          className="w-full rounded px-3 py-2 bg-white dark:bg-gray-900 border border-[var(--color-border)] text-black dark:text-white"
                        />
                      </form>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[var(--color-muted)]">No trending posts yet.</div>
              )}
            </Section>

            {/* City Chat — What’s on your mind */}
            <Section title="What’s on your mind today? (City chat)">
              <form onSubmit={addThought} className="rounded-xl ring-1 ring-[var(--color-border)] p-3 bg-[var(--color-surface)]">
                <textarea
                  rows={3}
                  value={thoughtText}
                  onChange={(e) => setThoughtText(e.target.value)}
                  placeholder="Share a thought, question, or quick update with your city…"
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    value={thoughtTags}
                    onChange={(e) => setThoughtTags(e.target.value)}
                    placeholder="Tags (comma separated, e.g. Roads, Safety)"
                    className="w-full md:w-80 rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
                  />
                  <button className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">Post</button>
                </div>
                <div className="mt-2 text-xs text-[var(--color-muted)]">
                  Tips: Add clear tags so thoughts are auto-categorized. Use the left sidebar to browse by date.
                </div>
              </form>

              <div className="mt-4 space-y-3">
                {thoughts.length ? (
                  thoughts.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{t.author}</div>
                        <div className="text-xs text-[var(--color-muted)]">{new Date(t.ts).toLocaleString()}</div>
                      </div>
                      <div className="text-sm whitespace-pre-wrap mt-1">{t.text}</div>
                      {t.tags?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {t.tags.map((tg, i) => (
                            <span
                              key={`${t.id}-${i}`}
                              className="px-2 py-1 rounded-full ring-1 ring-[var(--color-border)] bg-[var(--color-surface)] text-[11px]"
                            >
                              #{tg}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-[var(--color-muted)]">No thoughts yet. Start the conversation!</div>
                )}
              </div>
            </Section>

            {/* Latest Posts */}
            <Section title={`Latest in ${city || "your city"}`}>
              {filteredLatest.length ? (
                <div className="space-y-3">
                  {filteredLatest.map((p) => (
                    <Card key={p.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{p.title || "Post"}</h3>
                          <p className="text-xs text-[var(--color-muted)]">
                            {(p.authorName || p.author || "User")} · {p.city || "City"}
                            {p.locality ? ` — ${p.locality}` : ""}
                          </p>
                        </div>
                      </div>
                      {p.text && <p className="text-sm mt-2 whitespace-pre-wrap">{p.text}</p>}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => like(p.id)}
                          className="px-3 py-1 rounded bg-[var(--color-accent)] text-white"
                        >
                          👍 {p.likes || 0}
                        </button>
                        <Link
                          to={`/chat?id=${encodeURIComponent(p.id)}&title=${encodeURIComponent(
                            p.title || "Post"
                          )}&ownerName=${encodeURIComponent(p.authorName || p.author || "User")}`}
                          className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
                        >
                          💬 Chat
                        </Link>
                      </div>
                      <form onSubmit={(e) => onCommentSubmit(e, p.id)} className="mt-3">
                        <input
                          value={commentDrafts[p.id] || ""}
                          onChange={(e) => setCommentDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                          placeholder="Write a comment…"
                          className="w-full rounded px-3 py-2 bg-white dark:bg-gray-900 border border-[var(--color-border)] text-black dark:text-white"
                        />
                      </form>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[var(--color-muted)]">No posts found.</div>
              )}
            </Section>
          </main>

          {/* RIGHT: Rail */}
          <aside className="hidden lg:block space-y-4">
            <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
              <div className="font-semibold text-sm">Context</div>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Viewing for <b>{city || "your city"}</b>
                {locality ? ` — ${locality}` : ""}. Change city from the header.
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
              <div className="font-semibold text-sm">How this page works</div>
              <ul className="list-disc pl-4 text-xs text-[var(--color-muted)] mt-1 space-y-1">
                <li>Top 5 are ranked by likes in your city.</li>
                <li>“What’s on your mind” is public to city & locality.</li>
                <li>Use the left sidebar (or mobile selector) to jump by date.</li>
                <li>“City Needs Attention” shows the most-picked issue tags.</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
              <div className="font-semibold text-sm">Quick actions</div>
              {member ? (
                <div className="mt-2 space-y-2">
                  <Link to="/submit-post" className="block text-xs px-2 py-1 rounded bg-[var(--color-accent)] text-white">
                    + Post
                  </Link>
                  <Link to="/submit-event" className="block text-xs px-2 py-1 rounded ring-1 ring-[var(--color-border)]">
                    + Event
                  </Link>
                  <Link to="/submit-job" className="block text-xs px-2 py-1 rounded ring-1 ring-[var(--color-border)]">
                    + Job
                  </Link>
                  <Link to="/submit-deal" className="block text-xs px-2 py-1 rounded ring-1 ring-[var(--color-border)]">
                    + Deal
                  </Link>
                </div>
              ) : (
                <BecomeMemberButton className="mt-2" label="Become a member" />
              )}
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
