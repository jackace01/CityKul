// src/pages/Feed.jsx
// “Trending in Your City” — centered, sectioned layout with Needs-Attention tags
import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { Link } from "react-router-dom";
import { isMember, getCity, getLocality } from "../lib/auth";
import { listPosts, toggleLike, addComment } from "../lib/api/posts";
import { getTopTags } from "../lib/api/needs"; // <-- show “City Needs Attention” tags
import BecomeMemberButton from "../components/BecomeMemberButton";

export default function Feed() {
  const member = isMember();
  const city = getCity();
  const locality = getLocality();

  const [q, setQ] = useState("");
  const [tick, setTick] = useState(0);
  const [commentDrafts, setCommentDrafts] = useState({}); // {postId: text}
  const [topTags, setTopTags] = useState([]); // [{tag,count}]

  // Load top city-issues tags (most picked)
  useEffect(() => {
    try {
      const tags = getTopTags(city, 8); // top 8 chips
      setTopTags(tags);
    } catch {
      setTopTags([]);
    }
  }, [city, tick]);

  // Approved posts scoped to city/locality (if set)
  const approved = useMemo(() => {
    return listPosts({ city, locality, onlyApproved: true });
  }, [city, locality, tick]);

  // Top 5 trending by likes
  const topFive = useMemo(
    () => [...approved].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 5),
    [approved]
  );

  // Filter for “Latest” section (excluding Top 5)
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const base = qq
      ? approved.filter((p) =>
          `${p.title} ${p.text} ${p.authorName || p.author}`.toLowerCase().includes(qq)
        )
      : approved;
    const topIds = new Set(topFive.map((p) => p.id));
    return base.filter((p) => !topIds.has(p.id));
  }, [approved, q, topFive]);

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

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Page header & actions */}
        <div className="mb-6 rounded-2xl ring-1 ring-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold">Trending in Your City</h1>
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

          {/* City Needs Attention — top picked tags */}
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

        {/* Two-column layout: content + right rail */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* LEFT: Content */}
          <div className="grid gap-6">
            {/* Top 5 Trending */}
            <Section title="Top 5 Trending">
              {topFive.length ? (
                <div className="space-y-3">
                  {topFive.map((p) => (
                    <Card key={p.id} className="h-full">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{p.title || "Post"}</h3>
                          <p className="text-xs text-[var(--color-muted)]">
                            {(p.authorName || p.author || "User")} · {p.city || "City"}
                            {p.locality ? ` — ${p.locality}` : ""}
                          </p>
                        </div>
                        <span className="text-xs rounded-full px-2 py-1 bg-black/5 dark:bg-white/5">
                          Trending
                        </span>
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
                <div className="text-sm text-[var(--color-muted)]">
                  No trending posts yet. Be the first to post!
                </div>
              )}
            </Section>

            {/* Latest Posts */}
            <Section title={`Latest in ${city || "your city"}`}>
              {filtered.length ? (
                <div className="space-y-3">
                  {filtered.map((p) => (
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
          </div>

          {/* RIGHT: Rail */}
          <div className="hidden lg:block space-y-4">
            <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
              <div className="font-semibold text-sm">City context</div>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Viewing posts for <b>{city || "your city"}</b>
                {locality ? ` — ${locality}` : ""}. Change it from the header.
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
              <div className="font-semibold text-sm">How “Trending” works</div>
              <ul className="list-disc pl-4 text-xs text-[var(--color-muted)] mt-1 space-y-1">
                <li>Top 5 are ranked by likes.</li>
                <li>Latest shows everything else, newest first.</li>
                <li>Use the search box to filter.</li>
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
          </div>
        </div>
      </div>
    </Layout>
  );
}
