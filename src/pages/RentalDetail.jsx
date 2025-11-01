// src/pages/RentalDetail.jsx
import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { getUser } from "../lib/auth";
import { useChat } from "../components/ChatProvider";
import StatusPill from "../components/StatusPill";
import {
  getRentalById,
  isAvailable,
  createRentalOrder,
  listRentalOrders,
  listOrderMessages,
  sendOrderMessage,
  payForOrder,
  acceptOrder,
  markHandedOver,
  markReturned,
  releaseEscrow,
  cancelOrder,
  openDispute
} from "../lib/api/rentals";
import { getBalance } from "../lib/api/wallet";
import { flagRentalItem } from "../lib/guardrails.js";

// Map pane on detail
import MapPane from "../components/MapPane";

// Reviews
import {
  getRentalReviewParameters,
  listRentalReviews,
  addRentalReview,
  getRentalAverages,
  getRentalDistributions,
  voteRentalReviewHelpful,
  getMyRentalHelpfulVote
} from "../lib/api/rentalReviews";

// Roles & Badges
import { getEntityBadges, getUserBadges } from "../lib/roles";

// Action-level guard
import ProtectedAction from "../components/ProtectedAction";
import { canReviewOrVote } from "../lib/gate";

// Fees UI
import FeeBreakdown from "../components/FeeBreakdown";
import { computeRentalFees } from "../lib/fees";

function mapsHref(listing) {
  const has = typeof listing?.lat === "number" && typeof listing?.lng === "number";
  if (has) return `https://www.google.com/maps?q=${listing.lat},${listing.lng}`;
  const q = encodeURIComponent([listing?.title, listing?.address, listing?.locality, listing?.city].filter(Boolean).join(", "));
  return `https://www.google.com/maps?q=${q}`;
}

// Tiny visual bar for 1..5 distributions
function Bar({ value = 0, total = 0 }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex-1 h-2 rounded bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-hidden">
      <div className="h-2" style={{ width: `${pct}%`, background: "var(--color-accent)" }} aria-hidden />
    </div>
  );
}

export default function RentalDetail() {
  const { id } = useParams();
  const user = getUser();
  const uid = user?.email || user?.name || "guest@demo";
  const city = user?.city || localStorage.getItem("citykul:city") || "Indore";
  const { openChat } = useChat();

  const listing = useMemo(() => getRentalById(city, id), [city, id]);

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [lastOrderId, setLastOrderId] = useState(null);
  const [msgText, setMsgText] = useState("");
  const [tick, setTick] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const bump = () => setTick((t) => t + 1);

  const allOrders = useMemo(() => listRentalOrders(), [tick]);
  const myOrders = useMemo(() => {
    const me = uid;
    return allOrders.filter(
      (o) => o.listingId === id && (o.renterId === me || o.ownerId === me)
    );
  }, [allOrders, id, uid]);

  const active = useMemo(
    () => myOrders.find((o) => o.id === lastOrderId) || myOrders[0] || null,
    [myOrders, lastOrderId]
  );

  const messages = useMemo(() => {
    if (!active?.id) return [];
    return listOrderMessages(active.id);
  }, [active?.id, tick]);

  const flags = listing ? flagRentalItem(listing, city) : { warnings: [], badges: [] };
  const entityBadges = listing ? getEntityBadges("rental", listing) : [];

  if (!listing) {
    return (
      <Layout>
        <Section title="Listing Not Found">
          <div className="text-sm text-[var(--color-muted)]">
            This rental is not available. Go back to{" "}
            <Link to="/rentals" className="underline">Local Rentals</Link>.
          </div>
        </Section>
      </Layout>
    );
  }

  const isOwner = listing.ownerId && listing.ownerId === uid;
  const canBook = start && end && isAvailable(listing, start, end);
  const hasCoords = typeof listing.lat === "number" && typeof listing.lng === "number";

  // Reviews state
  const params = getRentalReviewParameters();
  const [text, setText] = useState("");
  const [ratings, setRatings] = useState(params.reduce((m, p) => ((m[p] = 4), m), {}));
  const reviews = useMemo(() => listRentalReviews(id), [id, tick]);
  const summary = useMemo(() => getRentalAverages(id), [id, tick]);
  const distributions = useMemo(() => getRentalDistributions(id), [id, tick]); // { dist, overall }

  function setRating(p, v) {
    setRatings((r) => ({ ...r, [p]: Number(v) }));
  }

  // Orders & chat handlers
  async function onCreateOrder() {
    try {
      const o = createRentalOrder({
        listingId: id,
        renterId: uid,
        renterName: user?.name || "You",
        start,
        end,
      });
      setLastOrderId(o.id);
      bump();
      alert("Order created. You can now Pay & Hold or chat with the owner.");
    } catch (err) {
      alert(err?.message || "Could not create order.");
    }
  }

  function onSend() {
    if (!active?.id || !msgText.trim()) return;
    sendOrderMessage(active.id, {
      fromId: uid,
      fromName: user?.name || "You",
      text: msgText.trim(),
    });
    setMsgText("");
    bump();
  }

  function onPay() {
    if (!active?.id) return;
    try {
      payForOrder(active.id, uid);
      bump();
      alert("Hold created and fees paid from wallet.");
    } catch (e) {
      alert(e?.message || "Payment failed.");
    }
  }

  function onAccept() {
    if (!active?.id) return;
    try {
      acceptOrder(active.id, uid);
      bump();
    } catch (e) {
      alert(e?.message || "Could not accept.");
    }
  }

  function onHanded() {
    if (!active?.id) return;
    try {
      markHandedOver(active.id, uid);
      bump();
    } catch (e) {
      alert(e?.message || "Could not mark handed over.");
    }
  }

  function onReturned() {
    if (!active?.id) return;
    try {
      markReturned(active.id, uid);
      bump();
    } catch (e) {
      alert(e?.message || "Could not mark returned.");
    }
  }

  function onRelease() {
    if (!active?.id) return;
    try {
      releaseEscrow(active.id, uid);
      bump();
    } catch (e) {
      alert(e?.message || "Could not release escrow.");
    }
  }

  function onCancel() {
    if (!active?.id) return;
    try {
      cancelOrder(active.id, uid);
      bump();
    } catch (e) {
      alert(e?.message || "Could not cancel.");
    }
  }

  function onDispute() {
    if (!active?.id) return;
    try {
      openDispute(active.id, uid);
      bump();
    } catch (e) {
      alert(e?.message || "Could not open dispute.");
    }
  }

  // Reviews handlers
  function onSubmitReview(e) {
    e?.preventDefault?.();
    if (!user) { alert("Sign in to add a review."); return; }
    addRentalReview(id, {
      userId: uid,
      userName: user.name || "User",
      text,
      ratings,
    });
    setText("");
    setRatings(params.reduce((m, p) => ((m[p] = 4), m), {}));
    bump();
    alert("Thanks! Your review has been added.");
  }

  function onVote(reviewId, val) {
    const current = getMyRentalHelpfulVote(id, reviewId, uid) || 0;
    const next = current === val ? 0 : val;
    voteRentalReviewHelpful(id, reviewId, uid, next);
    bump();
  }

  const balance = useMemo(() => getBalance(uid), [uid, tick]);

  // Estimated fee breakdown for the currently selected dates
  const est = useMemo(() => {
    if (!start || !end) return null;
    // mirror the pricing logic here
    const d1 = new Date(`${start}T00:00:00`), d2 = new Date(`${end}T00:00:00`);
    const days = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
    const unit = Number(listing.price) || 0;
    let rent;
    if (listing.pricePer === "month") rent = unit * Math.max(1, Math.ceil(days / 30));
    else if (listing.pricePer === "week") rent = unit * Math.max(1, Math.ceil(days / 7));
    else rent = unit * days;
    const deposit = Number(listing.deposit) || 0;
    const f = computeRentalFees({ rent, deposit });
    return { rent, deposit, platformFee: f.platformFee, fixedFee: f.fixedFee };
  }, [start, end, listing?.price, listing?.pricePer, listing?.deposit]);

  return (
    <Layout>
      <Section title={listing.title}>
        <div className="flex items-center flex-wrap gap-2">
          <div className="text-xs text-[var(--color-muted)]">
            {listing.category} · {listing.locality || listing.city}
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
          <div className="mt-2 mb-3 rounded-lg border border-yellow-400/50 bg-yellow-50/60 dark:bg-yellow-900/20 p-3 text-[13px]">
            <div className="font-medium mb-1">Please review carefully</div>
            <ul className="list-disc pl-4 space-y-1">
              {flags.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        ) : null}

        {listing.description ? <p className="text-sm mt-2">{listing.description}</p> : null}
        {listing.address ? <p className="text-xs text-[var(--color-muted)] mt-1">{listing.address}</p> : null}

        {/* Map + Directions */}
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
          <a href={mapsHref(listing)} target="_blank" rel="noreferrer" className="px-2 py-1 text-xs rounded-full ring-1 ring-[var(--color-border)]">
            Directions
          </a>
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-[2px] text-xs rounded-full ring-1 ring-[var(--color-border)]">
            💠 Escrow Protected
          </span>
        </div>

        {showMap && hasCoords ? (
          <div className="mt-3 rounded-xl overflow-hidden">
            <MapPane
              markers={[{ id: listing.id, name: listing.title, lat: listing.lat, lng: listing.lng }]}
              fitBoundsPadding={40}
            />
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-3 mt-4">
          {/* Left: Price + Availability + Booking */}
          <Card>
            <div className="text-sm">
              <div>Price: <span className="font-semibold">{listing.price}</span> / {listing.pricePer}</div>
              {listing.deposit ? <div>Deposit: <span className="font-semibold">{listing.deposit}</span></div> : null}
            </div>

            <div className="mt-3">
              <div className="font-semibold mb-2">Availability</div>
              {listing.availability?.length ? (
                <div className="space-y-2">
                  {listing.availability.map((r, i) => (
                    <div key={`${r.start}-${r.end}-${i}`} className="text-sm rounded ring-1 ring-[var(--color-border)] px-3 py-2">
                      {r.start} → {r.end}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[var(--color-muted)]">Owner hasn’t added availability yet.</div>
              )}
            </div>

            <div className="mt-4">
              <div className="font-semibold mb-2">Book</div>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="px-3 py-2 rounded border border-[var(--color-border)]"/>
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="px-3 py-2 rounded border border-[var(--color-border)]"/>
              </div>

              {/* Live fee breakdown for selected dates */}
              {est ? (
                <div className="mt-3">
                  <FeeBreakdown
                    rent={est.rent}
                    deposit={est.deposit}
                    platformFee={est.platformFee}
                    fixedFee={est.fixedFee}
                  />
                </div>
              ) : null}

              <button
                onClick={onCreateOrder}
                disabled={!canBook}
                className={`mt-3 px-3 py-2 rounded ${canBook ? "bg-[var(--color-accent)] text-white" : "ring-1 ring-[var(--color-border)] text-[var(--color-muted)]"}`}
              >
                {canBook ? "Create Order" : "Select valid dates"}
              </button>

              <div className="mt-3 text-xs text-[var(--color-muted)]">
                Your wallet balance: ₹ {Number(balance || 0).toLocaleString()}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => openChat({ to: listing.ownerId || "City Chat" })}
                className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]"
              >
                💬 Chat with Owner
              </button>
            </div>
          </Card>

          {/* Right: Orders + Actions + Messages */}
          <Card>
            <div className="font-semibold mb-2">Your Orders</div>
            {myOrders.length ? (
              <div className="space-y-2">
                {myOrders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setLastOrderId(o.id)}
                    className={`w-full text-left rounded ring-1 ring-[var(--color-border)] px-3 py-2 ${active?.id === o.id ? "bg-[var(--color-surface)]" : ""}`}
                  >
                    <div className="text-sm font-medium flex items-center gap-2">
                      <span>Order {o.id}</span>
                      <StatusPill status={o.status} />
                    </div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {o.start} → {o.end} · Escrow {o.total}
                      {o?.feeSummary?.totalFee ? ` · Fees ${o.feeSummary.totalFee}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--color-muted)]">No orders yet.</div>
            )}

            {active ? (
              <div className="mt-3">
                <div className="font-semibold mb-2">Actions</div>
                <div className="flex flex-wrap gap-2">
                  {!isOwner && active.status === "created" && (
                    <button onClick={onPay} className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">Pay & Hold</button>
                  )}
                  {!isOwner && active.status === "in_use" && (
                    <button onClick={onReturned} className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">Mark Returned</button>
                  )}
                  {!isOwner && ["paid_hold", "accepted"].includes(active.status) && (
                    <button onClick={onDispute} className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">Open Dispute</button>
                  )}
                  {!isOwner && ["created", "paid_hold"].includes(active.status) && (
                    <button onClick={onCancel} className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">Cancel</button>
                  )}

                  {isOwner && active.status === "paid_hold" && (
                    <button onClick={onAccept} className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">Accept</button>
                  )}
                  {isOwner && active.status === "accepted" && (
                    <button onClick={onHanded} className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">Mark Handed Over</button>
                  )}
                  {isOwner && ["returned", "accepted"].includes(active.status) && (
                    <button onClick={onRelease} className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">Release Escrow</button>
                  )}
                  {isOwner && ["paid_hold", "in_use", "returned"].includes(active.status) && (
                    <button onClick={onDispute} className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">Open Dispute</button>
                  )}
                </div>
              </div>
            ) : null}

            {/* Messages */}
            <div className="mt-4">
              <div className="font-semibold mb-2">Messages {active?.id ? `— ${active.id}` : ""}</div>
              {active?.id ? (
                <>
                  <div className="space-y-2 max-h-48 overflow-auto ring-1 ring-[var(--color-border)] rounded p-2">
                    {messages.length ? messages.map((m) => (
                      <div key={m.id} className="text-sm">
                        <span className="font-medium">{m.fromName}</span>: {m.text}
                        <div className="text-[10px] text-[var(--color-muted)]">{new Date(m.ts).toLocaleString()}</div>
                      </div>
                    )) : (
                      <div className="text-sm text-[var(--color-muted)]">No messages yet.</div>
                    )}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      className="flex-1 px-3 py-2 rounded border border-[var(--color-border)]"
                      placeholder="Type a message…"
                    />
                    <button onClick={onSend} className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">Send</button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-[var(--color-muted)]">Create or select an order to chat.</div>
              )}
            </div>
          </Card>
        </div>

        {/* Ratings & Reviews */}
        <div className="mt-4 grid md:grid-cols-2 gap-3">
          <Card>
            <div className="font-semibold mb-2">Ratings Summary</div>
            {summary?.count ? (
              <>
                <div className="space-y-1 mb-2">
                  {Object.entries(summary.averages).map(([p, v]) => (
                    <div key={p} className="flex items-center gap-2 text-sm">
                      <div className="w-36">{p}</div>
                      <Bar value={v} total={5} />
                      <div className="w-10 text-right font-medium">{v}/5</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-3">
                  {Object.entries(distributions?.dist || {}).map(([p, bucket]) => {
                    const total = Object.values(bucket).reduce((a, b) => a + b, 0);
                    return (
                      <div key={p}>
                        <div className="text-xs font-medium mb-1">{p} — {total} rating(s)</div>
                        <div className="space-y-1">
                          {[5,4,3,2,1].map((star) => (
                            <div key={star} className="flex items-center gap-2 text-xs">
                              <div className="w-8">{star}★</div>
                              <Bar value={bucket[star] || 0} total={total || 1} />
                              <div className="w-8 text-right">{bucket[star] || 0}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-[var(--color-muted)] mt-3">Based on {summary.count} review(s)</div>
              </>
            ) : (
              <div className="text-sm text-[var(--color-muted)]">No reviews yet.</div>
            )}
          </Card>

          <Card>
            <div className="font-semibold mb-2">Add Your Review</div>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
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
              <ProtectedAction guardFn={canReviewOrVote} onAllowed={onSubmitReview}>
                <button className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">Submit Review</button>
              </ProtectedAction>
            </form>
          </Card>
        </div>

        <div className="mt-4">
          <div className="text-sm font-semibold mb-2">Recent Reviews</div>
          {reviews.length ? (
            <div className="space-y-3">
              {reviews.map((r) => {
                const myVote = getMyRentalHelpfulVote(id, r.id, uid);
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
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(r.ratings).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between">
                          <span>{k}</span><span className="font-semibold">{v}/5</span>
                        </div>
                      ))}
                    </div>
                    {r.text ? <p className="text-sm mt-2">{r.text}</p> : null}

                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-[var(--color-muted)]">Was this review helpful?</span>
                      <ProtectedAction guardFn={canReviewOrVote} onAllowed={() => onVote(r.id, 1)}>
                        <button
                          className={`px-2 py-[2px] rounded ring-1 ring-[var(--color-border)] ${myVote === 1 ? "bg-[var(--color-accent)] text-white" : ""}`}
                          title="Helpful"
                        >
                          👍 {r.helpfulUp || 0}
                        </button>
                      </ProtectedAction>
                      <ProtectedAction guardFn={canReviewOrVote} onAllowed={() => onVote(r.id, -1)}>
                        <button
                          className={`px-2 py-[2px] rounded ring-1 ring-[var(--color-border)] ${myVote === -1 ? "bg-[var(--color-accent)] text-white" : ""}`}
                          title="Not helpful"
                        >
                          👎 {r.helpfulDown || 0}
                        </button>
                      </ProtectedAction>
                    </div>
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
