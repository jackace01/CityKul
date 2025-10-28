// src/pages/DiscoverDetail.jsx
import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { getUser } from "../lib/auth";
import { getDiscoverItemById } from "../lib/api/discover.js";
import {
  getReviewParameters,
  listPlaceReviews,
  addPlaceReview,
  getPlaceAverages
} from "../lib/api/discoverReviews.js";

export default function DiscoverDetail() {
  const { id } = useParams();
  const user = getUser();
  const city = user?.city || localStorage.getItem("citykul:city") || "Indore";

  const place = useMemo(() => getDiscoverItemById(city, id), [city, id]);
  const params = getReviewParameters();

  const [text, setText] = useState("");
  const [ratings, setRatings] = useState(params.reduce((m, p) => (m[p] = 4, m), {}));
  const [tick, setTick] = useState(0);

  const reviews = useMemo(() => listPlaceReviews(id), [id, tick]);
  const summary = useMemo(() => getPlaceAverages(id), [id, tick]);

  function setRating(p, v) { setRatings((r) => ({ ...r, [p]: Number(v) })); }

  function onSubmit(e) {
    e.preventDefault();
    if (!user) { alert("Sign in to add a review."); return; }
    addPlaceReview(id, {
      userId: user.email || user.name || "user",
      userName: user.name || "User",
      text,
      ratings
    });
    setText("");
    setTick((t) => t + 1);
    alert("Thanks! Your review has been added.");
  }

  if (!place) {
    return (
      <Layout>
        <Section title="Place Not Found">
          <div className="text-sm text-[var(--color-muted)]">
            This place is not available. Go back to{" "}
            <Link to="/discover" className="underline">Discover</Link>.
          </div>
        </Section>
      </Layout>
    );
  }

  return (
    <Layout>
      <Section title={place.name}>
        <div className="text-xs text-[var(--color-muted)] mb-1">
          {place.category} · {place.locality || place.city}
        </div>
        {place.description ? <p className="text-sm">{place.description}</p> : null}
        {place.address ? <p className="text-xs text-[var(--color-muted)] mt-1">{place.address}</p> : null}

        <div className="mt-4 grid md:grid-cols-2 gap-3">
          <Card>
            <div className="font-semibold mb-2">Overall Ratings</div>
            {summary?.count ? (
              <div className="space-y-2">
                {Object.entries(summary.averages).map(([p, v]) => (
                  <div key={p} className="flex items-center justify-between text-sm">
                    <span>{p}</span>
                    <span className="font-medium">{v}/5</span>
                  </div>
                ))}
                <div className="text-xs text-[var(--color-muted)]">Based on {summary.count} review(s)</div>
              </div>
            ) : (
              <div className="text-sm text-[var(--color-muted)]">No reviews yet.</div>
            )}
          </Card>

          <Card>
            <div className="font-semibold mb-2">Add Your Review</div>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {params.map((p) => (
                  <label key={p} className="text-sm">
                    <div className="mb-1">{p}: {ratings[p]}/5</div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={ratings[p]}
                      onChange={(e) => setRating(p, e.target.value)}
                      className="w-full"
                    />
                  </label>
                ))}
              </div>
              <div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Share your experience (optional)"
                  className="w-full px-3 py-2 rounded border border-[var(--color-border)] h-24"
                />
              </div>
              <button className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">Submit Review</button>
            </form>
          </Card>
        </div>

        {/* Reviews list */}
        <div className="mt-4">
          <div className="text-sm font-semibold mb-2">Recent Reviews</div>
          {reviews.length ? (
            <div className="space-y-3">
              {reviews.map((r) => (
                <Card key={r.id}>
                  <div className="text-sm font-medium">{r.userName}</div>
                  <div className="text-[11px] text-[var(--color-muted)] mb-2">{new Date(r.ts).toLocaleString()}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(r.ratings).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between">
                        <span>{k}</span><span className="font-semibold">{v}/5</span>
                      </div>
                    ))}
                  </div>
                  {r.text ? <p className="text-sm mt-2">{r.text}</p> : null}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[var(--color-muted)]">Be the first to review.</div>
          )}
        </div>
      </Section>
    </Layout>
  );
}
