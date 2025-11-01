// src/pages/DiscoverDetail.jsx
import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { getUser, isMember } from "../lib/auth";
import { getDiscoverItemById } from "../lib/api/discover.js";
import {
  getReviewParameters,
  listPlaceReviews,
  addPlaceReview,
  getPlaceAverages,
  getPlaceDistributions,
  voteReviewHelpful,
  getMyHelpfulVote
} from "../lib/api/discoverReviews.js";
import { flagDiscoverItem } from "../lib/guardrails.js";

import MapPane from "../components/MapPane";
import RatingBars from "../components/RatingBars";
import { getEntityBadges, getUserBadges } from "../lib/roles";
import ProtectedAction from "../components/ProtectedAction";
import { canReviewOrVote } from "../lib/gate";

function mapsHref(place) {
  const hasLatLng = typeof place?.lat === "number" && typeof place?.lng === "number";
  if (hasLatLng) return `https://www.google.com/maps?q=${place.lat},${place.lng}`;
  const q = encodeURIComponent([place?.name, place?.address, place?.locality, place?.city].filter(Boolean).join(", "));
  return `https://www.google.com/maps?q=${q}`;
}

export default function DiscoverDetail() {
  const { id } = useParams();
  const user = getUser();
  const uid = user?.email || user?.name || ""; // used for helpful votes
  const city = user?.city || localStorage.getItem("citykul:city") || "Indore";

  const place = useMemo(() => getDiscoverItemById(city, id), [city, id]);
  const params = getReviewParameters();

  const [text, setText] = useState("");
  const [ratings, setRatings] = useState(params.reduce((m, p) => (m[p] = 4, m), {}));
  const [tick, setTick] = useState(0);
  const [showMap, setShowMap] = useState(false);

  const reviews = useMemo(() => listPlaceReviews(id), [id, tick]);
  const summary = useMemo(() => getPlaceAverages(id), [id, tick]);
  const dist = useMemo(() => getPlaceDistributions(id), [id, tick]);
  const flags = place ? flagDiscoverItem(place, city) : { warnings: [], badges: [] };
  const entityBadges = place ? getEntityBadges("discover", place) : [];

  function setRating(p, v) { setRatings((r) => ({ ...r, [p]: Number(v) })); }

  function doSubmitReview() {
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

  function doVote(reviewId, vote) {
    if (!uid) { alert("Sign in to vote."); return; }
    voteReviewHelpful(id, reviewId, uid, vote);
    setTick(t => t + 1);
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

  const hasCoords = typeof place.lat === "number" && typeof place.lng === "number";

  return (
    <Layout>
      <Section title={place.name}>
        <div className="flex items-center flex-wrap gap-2 mb-1">
          <div className="text-xs text-[var(--color-muted)]">
            {place.category} · {place.locality || place.city}
          </div>
          <div className="flex items-center gap-1 ml-auto">
            {entityBadges.map((b) => (
              <span key={`ent-${b}`} className="inline-flex items-center px-2 py-[2px] rounded-full text-[11px] ring-1 ring-[var(--color-border)]">
                {b}
              </span>
            ))}
          </div>
        </div>

        {flags.warnings?.length ? (
          <div className="mb-3 rounded-lg border border-yellow-400/50 bg-yellow-50/60 dark:bg-yellow-900/20 p-3 text-[13px]">
            <div className="font-medium mb-1">Heads up: review activity looks unusual</div>
            <ul className="list-disc pl-4 space-y-1">
              {flags.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        ) : null}

        {place.description ? <p className="text-sm">{place.description}</p> : null}
        {place.address ? <p className="text-xs text-[var(--color-muted)] mt-1">{place.address}</p> : null}

        <div className="mt-3 flex items-center gap-2">
          {hasCoords ? (
            <button
              onClick={() => setShowMap((s) => !s)}
              className="px-2 py-1 text-xs rounded-full ring-1 ring-[var(--color-border)]"
              title="Show on map"
            >
              {showMap ? "Hide Map" : "Show Map"}
            </button>
          ) : null}
          <a
            href={mapsHref(place)}
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1 text-xs rounded-full ring-1 ring-[var(--color-border)]"
          >
            Directions
          </a>
        </div>

        {showMap && hasCoords ? (
          <div className="mt-3 rounded-xl overflow-hidden">
            <MapPane
              markers={[{ id: place.id, name: place.name, lat: place.lat, lng: place.lng }]}
              fitBoundsPadding={40}
            />
          </div>
        ) : null}

        <div className="mt-4 grid lg:grid-cols-3 gap-3">
          {/* Left: Averages + Overall distribution */}
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
                <div className="mt-3">
                  <RatingBars title="Overall distribution" buckets={dist.overall} total={dist.total} compact />
                </div>
                <div className="text-xs text-[var(--color-muted)] mt-2">Based on {summary.count} review(s)</div>
              </div>
            ) : (
              <div className="text-sm text-[var(--color-muted)]">No reviews yet.</div>
            )}
          </Card>

          {/* Middle: Per-parameter distributions */}
          <Card>
            <div className="font-semibold mb-2">Breakdown by parameter</div>
            {summary?.count ? (
              <div className="space-y-3">
                {Object.keys(dist.params).map((p) => (
                  <RatingBars key={p} title={p} buckets={dist.params[p]} total={dist.total} compact />
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--color-muted)]">No data yet.</div>
            )}
          </Card>

          {/* Right: Add review */}
          <Card>
            <div className="font-semibold mb-2">Add Your Review</div>
            <form onSubmit={(e)=>e.preventDefault()} className="space-y-3">
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
              <ProtectedAction guardFn={canReviewOrVote} onAllowed={doSubmitReview}>
                <button className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">Submit Review</button>
              </ProtectedAction>
            </form>
          </Card>
        </div>

        {/* Reviews list with helpful votes and reviewer badges */}
        <div className="mt-4">
          <div className="text-sm font-semibold mb-2">Recent Reviews</div>
          {reviews.length ? (
            <div className="space-y-3">
              {reviews.map((r) => {
                const myVote = getMyHelpfulVote(id, r.id, uid); // 1 | -1 | 0
                const reviewerBadges = getUserBadges(r.userId);
                return (
                  <Card key={r.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">{r.userName}</div>
                          <div className="flex items-center gap-1">
                            {reviewerBadges.map((b) => (
                              <span key={`rb-${r.id}-${b}`} className="inline-flex items-center px-2 py-[1px] rounded-full text-[10px] ring-1 ring-[var(--color-border)]">
                                {b}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-[11px] text-[var(--color-muted)] mb-2">{new Date(r.ts).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <ProtectedAction guardFn={canReviewOrVote} onAllowed={() => doVote(r.id, 1)}>
                          <button
                            className={`px-2 py-1 rounded ring-1 ring-[var(--color-border)] ${myVote === 1 ? "bg-[var(--color-surface)]" : ""}`}
                            title="Helpful"
                          >
                            👍 {r.helpful?.up || 0}
                          </button>
                        </ProtectedAction>
                        <ProtectedAction guardFn={canReviewOrVote} onAllowed={() => doVote(r.id, -1)}>
                          <button
                            className={`px-2 py-1 rounded ring-1 ring-[var(--color-border)] ${myVote === -1 ? "bg-[var(--color-surface)]" : ""}`}
                            title="Not helpful"
                          >
                            👎 {r.helpful?.down || 0}
                          </button>
                        </ProtectedAction>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      {Object.entries(r.ratings).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between">
                          <span>{k}</span><span className="font-semibold">{v}/5</span>
                        </div>
                      ))}
                    </div>
                    {r.text ? <p className="text-sm mt-2">{r.text}</p> : null}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-[var(--color-muted)]">Be the first to review.</div>
          )}
        </div>
      </Section>
    </Layout>
  );
}
