// src/pages/RentalDetail.jsx
import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { getUser } from "../lib/auth";
import { useChat } from "../components/ChatProvider";
import {
  getRentalById,
  isAvailable,
  createRentalOrder,
  listRentalOrders,
  listOrderMessages,
  sendOrderMessage
} from "../lib/api/rentals";

export default function RentalDetail() {
  const { id } = useParams();
  const user = getUser();
  const city = user?.city || localStorage.getItem("citykul:city") || "Indore";
  const { openChat } = useChat();

  const listing = useMemo(() => getRentalById(city, id), [city, id]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [lastOrderId, setLastOrderId] = useState(null);
  const [msgText, setMsgText] = useState("");

  const myOrders = useMemo(() => {
    const all = listRentalOrders();
    const me = user?.email || user?.name;
    return all.filter(o => o.listingId === id && (o.renterId === me || o.ownerId === me));
  }, [id, user?.email, user?.name, lastOrderId]);

  const messages = useMemo(() => {
    if (!lastOrderId) return [];
    return listOrderMessages(lastOrderId);
  }, [lastOrderId]);

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

  const canBook = start && end && isAvailable(listing, start, end);

  function onBook() {
    if (!user) { alert("Sign in to book."); return; }
    try {
      const order = createRentalOrder({
        listingId: listing.id,
        renterId: user.email || user.name || "user",
        renterName: user.name || "You",
        start, end
      });
      setLastOrderId(order.id);
      alert("Order created! A chat thread is available below.");
    } catch (err) {
      alert(err.message || "Could not create order.");
    }
  }

  function onSend() {
    if (!lastOrderId) { alert("Create or select an order first."); return; }
    const fromId = user?.email || user?.name || "user";
    const fromName = user?.name || "User";
    sendOrderMessage(lastOrderId, { fromId, fromName, text: msgText });
    setMsgText("");
  }

  return (
    <Layout>
      <Section title={listing.title}>
        <div className="text-xs text-[var(--color-muted)]">
          {listing.category} · {listing.locality || listing.city}
        </div>
        {listing.description ? <p className="text-sm mt-2">{listing.description}</p> : null}
        {listing.address ? <p className="text-xs text-[var(--color-muted)] mt-1">{listing.address}</p> : null}

        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <Card>
            <div className="text-sm">
              <div>Price: <span className="font-semibold">{listing.price}</span> / {listing.pricePer}</div>
              {listing.deposit ? <div>Deposit: <span className="font-semibold">{listing.deposit}</span></div> : null}
            </div>

            {/* Availability */}
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

            {/* Booking */}
            <div className="mt-4">
              <div className="font-semibold mb-2">Book</div>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="px-3 py-2 rounded border border-[var(--color-border)]"/>
                <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="px-3 py-2 rounded border border-[var(--color-border)]"/>
              </div>
              <button
                onClick={onBook}
                disabled={!canBook}
                className={`mt-3 px-3 py-2 rounded ${canBook ? "bg-[var(--color-accent)] text-white" : "ring-1 ring-[var(--color-border)] text-[var(--color-muted)]"}`}
              >
                {canBook ? "Create Order" : "Select valid dates"}
              </button>
            </div>

            {/* Contact / Chat */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => openChat({ to: listing.ownerId || "City Chat" })}
                className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]"
              >
                💬 Chat with Owner
              </button>
            </div>
          </Card>

          {/* Orders + Messages */}
          <Card>
            <div className="font-semibold mb-2">Your Orders</div>
            {myOrders.length ? (
              <div className="space-y-2">
                {myOrders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setLastOrderId(o.id)}
                    className={`w-full text-left rounded ring-1 ring-[var(--color-border)] px-3 py-2 ${lastOrderId === o.id ? "bg-[var(--color-surface)]" : ""}`}
                  >
                    <div className="text-sm font-medium">Order {o.id}</div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {o.start} → {o.end} · Total {o.total}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--color-muted)]">No orders yet.</div>
            )}

            <div className="mt-4">
              <div className="font-semibold mb-2">Messages {lastOrderId ? `— ${lastOrderId}` : ""}</div>
              {lastOrderId ? (
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
      </Section>
    </Layout>
  );
}
