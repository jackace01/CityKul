// src/pages/Contests.jsx
import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { Link } from "react-router-dom";
import { getUser, isMember } from "../lib/auth";

import {
  listApprovedContests,
  likeEntry,
  unlikeEntry,
  getLikeCount,
  didLike,
  ensureMonthlyRollup,
  getLatestWinners,
} from "../lib/api/contests.js";

function ContestCard({ entry, meId, onRefresh }) {
  const [liked, setLiked] = useState(didLike(entry.id, meId));
  const [likes, setLikes] = useState(getLikeCount(entry.id));

  function toggleLike() {
    if (liked) {
      const n = unlikeEntry(entry.id, meId);
      setLikes(n);
      setLiked(false);
    } else {
      const n = likeEntry(entry.id, meId);
      setLikes(n);
      setLiked(true);
    }
    onRefresh?.();
  }

  return (
    <Card className="h-full">
      <div className="text-xs text-[var(--color-muted)] mb-1">
        {entry.type === "photo" ? "📷 Photo" : "✍️ Description"} · {entry.city}
      </div>
      <div className="font-semibold">{entry.title}</div>
      {entry.type === "photo" && entry.photoUrl ? (
        <img
          src={entry.photoUrl}
          alt={entry.title}
          className="mt-2 w-full aspect-video object-cover rounded"
        />
      ) : null}
      {entry.type === "description" && entry.text ? (
        <p className="mt-2 text-sm whitespace-pre-wrap">{entry.text}</p>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={toggleLike}
          className={`px-3 py-1 rounded ${liked ? "bg-[var(--color-accent)] text-white" : "ring-1 ring-[var(--color-border)]"}`}
        >
          ❤️ {likes}
        </button>
        <Link
          to={`/contests/${entry.id}`}
          className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
        >
          View
        </Link>
      </div>
    </Card>
  );
}

export default function Contests() {
  const me = getUser();
  const meId = me?.email || me?.name || "guest@demo";
  const member = isMember();
  const city = me?.city || localStorage.getItem("citykul:city") || "Indore";

  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  // run monthly rollup on open
  useEffect(() => {
    try { ensureMonthlyRollup(city); } catch {}
  }, [city]);

  const all = useMemo(() => listApprovedContests(city), [city, tick]);

  const photos = all.filter(e => e.type === "photo");
  const descriptions = all.filter(e => e.type === "description");
  const mine = all.filter(e => e.ownerId === meId);

  const latestWinners = getLatestWinners(city);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <Section
          title="City Contests"
          rightNode={
            member ? (
              <Link to="/contests/new" className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">
                + Submit Entry
              </Link>
            ) : (
              <Link to="/membership" className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">Become a member</Link>
            )
          }
        >
          <div className="text-sm text-[var(--color-muted)]">
            Monthly winners are auto-featured from the last month based on likes (tie → earlier entry).
          </div>
        </Section>

        {/* Winners rail */}
        <Section title="City Stars – Latest Winners">
          {latestWinners ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {latestWinners.photo ? (
                <Card>
                  <div className="text-xs text-[var(--color-muted)]">📷 Photo — {latestWinners.month}</div>
                  <div className="font-semibold">{latestWinners.photo.title}</div>
                  {latestWinners.photo.photoUrl ? (
                    <img src={latestWinners.photo.photoUrl} alt="" className="mt-2 w-full aspect-video object-cover rounded" />
                  ) : null}
                </Card>
              ) : (
                <Card><div className="text-sm text-[var(--color-muted)]">No photo winner last month.</div></Card>
              )}
              {latestWinners.description ? (
                <Card>
                  <div className="text-xs text-[var(--color-muted)]">✍️ Description — {latestWinners.month}</div>
                  <div className="font-semibold">{latestWinners.description.title}</div>
                  {latestWinners.description.text ? <p className="mt-2 text-sm">{latestWinners.description.text}</p> : null}
                </Card>
              ) : (
                <Card><div className="text-sm text-[var(--color-muted)]">No description winner last month.</div></Card>
              )}
            </div>
          ) : (
            <div className="text-sm text-[var(--color-muted)]">No winners yet.</div>
          )}
        </Section>

        {/* Photo tab */}
        <Section title={`Photo Entries (${photos.length})`}>
          {photos.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {photos.map(e => (
                <ContestCard key={e.id} entry={e} meId={meId} onRefresh={refresh} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-[var(--color-muted)]">No photo entries yet.</div>
          )}
        </Section>

        {/* Description tab */}
        <Section title={`Description Entries (${descriptions.length})`}>
          {descriptions.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {descriptions.map(e => (
                <ContestCard key={e.id} entry={e} meId={meId} onRefresh={refresh} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-[var(--color-muted)]">No description entries yet.</div>
          )}
        </Section>

        {/* My entries */}
        <Section title={`My Entries (${mine.length})`}>
          {mine.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mine.map(e => (
                <ContestCard key={e.id} entry={e} meId={meId} onRefresh={refresh} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-[var(--color-muted)]">You haven’t submitted any entries yet.</div>
          )}
        </Section>
      </div>
    </Layout>
  );
}
