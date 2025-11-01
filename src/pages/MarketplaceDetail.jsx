// src/pages/MarketplaceDetail.jsx
import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import StatusPill from "../components/StatusPill";
import { getUser } from "../lib/auth";
import { useChat } from "../components/ChatProvider";
import FeeBreakdown from "../components/FeeBreakdown";
import { computeRentalFees } from "../lib/fees";
import {
  getMarketItemById,
  createMarketOrder,
  listMarketOrders,
  listOrderMessages,
  sendOrderMessage,
  payForOrder,
  acceptOrder,
  markDispatched,
  markDelivered,
  releaseEscrow,
  cancelOrder,
  openDispute,
} from "../lib/api/marketplace";
import { getBalance } from "../lib/api/wallet";

export default function MarketplaceDetail() {
  const { id } = useParams();
  const user = getUser();
  const uid = user?.email || user?.name || "guest@demo";
  const city = user?.city || localStorage.getItem("citykul:city") || "Indore";
  const { openChat } = useChat();

  const item = useMemo(() => getMarketItemById(city, id), [city, id]);

  const [qty, setQty] = useState(1);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [msgText, setMsgText] = useState("");
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  const allOrders = useMemo(() => listMarketOrders(), [tick]);
  const myOrders = useMemo(() => {
    const me = uid;
    return allOrders.filter((o) => o.itemId === id && (o.buyerId === me || o.sellerId === me));
  }, [allOrders, id, uid]);

  const active = useMemo(
    () => myOrders.find((o) => o.id === lastOrderId) || myOrders[0] || null,
    [myOrders, lastOrderId]
  );

  const messages = useMemo(() => {
    if (!active?.id) return [];
    return listOrderMessages(active.id);
  }, [active?.id, tick]);

  if (!item) {
    return (
      <Layout>
        <Section title="Item Not Found">
          <div className="text-sm text-[var(--color-muted)]">
            This item is not available. Go back to{" "}
            <Link to="/marketplace" className="underline">Marketplace</Link>.
          </div>
        </Section>
      </Layout>
    );
  }

  const isSeller = item.sellerId && item.sellerId === uid;
  const canBuy = Number(qty || 0) >= 1 && (!item.stock || Number(qty) <= Number(item.stock));
  const balance = useMemo(() => getBalance(uid), [uid, tick]);

  const est = useMemo(() => {
    const quantity = Math.max(1, Number(qty || 1));
    const unit = Number(item.price || 0);
    const subtotal = unit * quantity;
    const deposit = Number(item.deposit || 0);
    const f = computeRentalFees({ rent: subtotal, deposit });
    return { rent: subtotal, deposit, platformFee: f.platformFee, fixedFee: f.fixedFee };
  }, [qty, item?.price, item?.deposit]);

  function onCreateOrder() {
    try {
      const o = createMarketOrder({ itemId: id, buyerId: uid, buyerName: user?.name || "You", qty: Math.max(1, Number(qty || 1)) });
      setLastOrderId(o.id);
      bump();
      alert("Order created. You can now Pay & Hold or chat with the seller.");
    } catch (e) { alert(e?.message || "Could not create order."); }
  }
  function onSend() {
    if (!active?.id || !msgText.trim()) return;
    sendOrderMessage(active.id, { fromId: uid, fromName: user?.name || "You", text: msgText.trim() });
    setMsgText(""); bump();
  }
  function onPay() { try { if (active?.id) { payForOrder(active.id, uid); bump(); alert("Hold created and fees paid from wallet."); } } catch (e) { alert(e?.message || "Payment failed."); } }
  function onAccept() { try { if (active?.id) { acceptOrder(active.id, uid); bump(); } } catch (e) { alert(e?.message || "Could not accept."); } }
  function onDispatched() { try { if (active?.id) { markDispatched(active.id, uid); bump(); } } catch (e) { alert(e?.message || "Could not mark dispatched."); } }
  function onDelivered() { try { if (active?.id) { markDelivered(active.id, uid); bump(); } } catch (e) { alert(e?.message || "Could not mark delivered."); } }
  function onRelease() { try { if (active?.id) { releaseEscrow(active.id, uid); bump(); } } catch (e) { alert(e?.message || "Could not release escrow."); } }
  function onCancel() { try { if (active?.id) { cancelOrder(active.id, uid); bump(); } } catch (e) { alert(e?.message || "Could not cancel."); } }
  function onDispute() { try { if (active?.id) { openDispute(active.id, uid); bump(); } } catch (e) { alert(e?.message || "Could not open dispute."); } }

  return (
    <Layout>
      <Section title={item.title}>
        <div className="text-xs text-[var(--color-muted)]">
          {item.category} · {item.city} {item.stock ? `· In stock: ${item.stock}` : ""}
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-4">
          {/* LEFT */}
          <Card>
            <div className="text-sm">
              <div>Price: <span className="font-semibold">{item.price}</span></div>
              {item.deposit ? <div>Deposit (escrow): <span className="font-semibold">{item.deposit}</span></div> : null}
            </div>

            <div className="mt-3">
              <div className="font-semibold mb-2">Buy</div>
              <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                <label className="text-sm">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="px-3 py-2 rounded border border-[var(--color-border)]"
                />
              </div>

              <div className="mt-3">
                <FeeBreakdown rent={est.rent} deposit={est.deposit} platformFee={est.platformFee} fixedFee={est.fixedFee} />
              </div>

              <button
                onClick={onCreateOrder}
                disabled={!canBuy}
                className={`mt-3 px-3 py-2 rounded ${canBuy ? "bg-[var(--color-accent)] text-white" : "ring-1 ring-[var(--color-border)] text-[var(--color-muted)]"}`}
              >
                {canBuy ? "Create Order" : "Invalid quantity"}
              </button>

              <div className="mt-3 text-xs text-[var(--color-muted)]">
                Your wallet balance: ₹ {Number(balance || 0).toLocaleString()}
              </div>

              <div className="mt-3">
                <button onClick={() => openChat({ to: item.sellerId || "City Chat" })} className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">
                  💬 Chat with Seller
                </button>
              </div>
            </div>
          </Card>

          {/* RIGHT */}
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
                      Qty {o.qty} · Escrow {o.total}{o?.feeSummary?.totalFee ? ` · Fees ${o.feeSummary.totalFee}` : ""}
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
                  {!isSeller && active.status === "created" && (
                    <button onClick={onPay} className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">Pay & Hold</button>
                  )}
                  {!isSeller && ["dispatched"].includes(active.status) && (
                    <button onClick={onDelivered} className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">Mark Delivered</button>
                  )}
                  {!isSeller && ["paid_hold", "accepted", "dispatched"].includes(active.status) && (
                    <button onClick={onDispute} className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">Open Dispute</button>
                  )}
                  {!isSeller && ["created", "paid_hold"].includes(active.status) && (
                    <button onClick={onCancel} className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">Cancel</button>
                  )}

                  {isSeller && active.status === "paid_hold" && (
                    <button onClick={onAccept} className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">Accept</button>
                  )}
                  {isSeller && active.status === "accepted" && (
                    <button onClick={onDispatched} className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">Mark Dispatched</button>
                  )}
                  {isSeller && ["delivered", "accepted"].includes(active.status) && (
                    <button onClick={onRelease} className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">Release Escrow</button>
                  )}
                  {isSeller && ["paid_hold", "dispatched"].includes(active.status) && (
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

        {item.description ? (
          <div className="mt-4">
            <Card>
              <div className="font-semibold mb-2">Description</div>
              <p className="text-sm">{item.description}</p>
            </Card>
          </div>
        ) : null}
      </Section>
    </Layout>
  );
}
