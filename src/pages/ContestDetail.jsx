// src/pages/ContestDetail.jsx
import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { getUser } from "../lib/auth";
import { getContestById, likeEntry, unlikeEntry, getLikeCount, didLike } from "../lib/api/contests.js";

export default function ContestDetail() {
  const { id } = useParams();
  const u = getUser();
  const meId = u?.email || u?.name || "guest@demo";
  const city = u?.city || localStorage.getItem("citykul:city") || "Indore";

  const entry = useMemo(() => getContestById(city, id), [city, id]);

  const [liked, setLiked] = useState(entry ? didLike(entry.id, meId) : false);
  const [likes, setLikes] = useState(entry ? getLikeCount(entry.id) : 0);

  if (!entry) {
    return (
      <Layout>
        <Section title="Entry not found">
          <Link to="/contests" className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">← Back</Link>
        </Section>
      </Layout>
    );
  }

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
  }

  return (
    <Layout>
      <Section title="Contest Entry">
        <Card>
          <div className="text-xs text-[var(--color-muted)] mb-1">
            {entry.type === "photo" ? "📷 Photo" : "✍️ Description"} · {entry.city}
          </div>
          <div className="font-semibold text-lg">{entry.title}</div>

          {entry.type === "photo" && entry.photoUrl ? (
            <img src={entry.photoUrl} alt={entry.title} className="mt-3 w-full rounded" />
          ) : null}

          {entry.type === "description" && entry.text ? (
            <p className="mt-3 text-sm whitespace-pre-wrap">{entry.text}</p>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={toggleLike}
              className={`px-3 py-1 rounded ${liked ? "bg-[var(--color-accent)] text-white" : "ring-1 ring-[var(--color-border)]"}`}
            >
              ❤️ {likes}
            </button>
            <Link to="/contests" className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">Back</Link>
          </div>
        </Card>
      </Section>
    </Layout>
  );
}
