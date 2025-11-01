import Layout from "../components/Layout";
import Section from "../components/Section";
import { getUser, isMember } from "../lib/auth";
import { useState } from "react";
import BecomeMemberButton from "../components/BecomeMemberButton";
import ProtectedAction from "../components/ProtectedAction";
import { canPost } from "../lib/gate";

export default function SubmitDeal() {
  const member = isMember();
  const u = getUser();

  const [title, setTitle] = useState("");
  const [where, setWhere] = useState("");
  const [desc, setDesc] = useState("");
  const [kind, setKind] = useState("Product");
  const [price, setPrice] = useState("");
  const [delivery, setDelivery] = useState("Pickup");

  function doSubmit() {
    alert(
      "Submitted for review! (mock)\n\n" +
        JSON.stringify(
          {
            title,
            where,
            desc,
            kind,
            price,
            delivery,
            city: u?.city,
            locality: u?.locality,
            owner: u?.name,
          },
          null,
          2
        )
    );
  }

  return (
    <Layout>
      <Section title="Submit Deal / Marketplace Listing">
        {!member ? (
          <div className="text-sm flex items-center gap-3">
            You need to be a member to submit promotions. <BecomeMemberButton />
          </div>
        ) : (
          <form onSubmit={(e)=>e.preventDefault()} className="max-w-lg mx-auto space-y-3">
            <div className="text-xs text-[var(--color-muted)]">
              Posting as <b>{u?.name}</b>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="rounded px-3 py-2 border border-[var(--color-border)] bg-white dark:bg-gray-900"
              >
                <option>Product</option>
                <option>Service</option>
              </select>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="rounded px-3 py-2 border border-[var(--color-border)] bg-white dark:bg-gray-900"
                placeholder="MRP / Price"
              />
            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              placeholder="What are you selling?"
            />

            <select
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
              className="rounded px-3 py-2 border border-[var(--color-border)] bg-white dark:bg-gray-900"
            >
              <option>Pickup</option>
              <option>Delivery - Free</option>
              <option>Delivery - Chargeable</option>
            </select>

            <input
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              placeholder="Pickup point / Shop address"
            />

            <textarea
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              placeholder="Short description"
            />

            <div className="text-sm text-[var(--color-muted)]">Upload pictures (mock uploader)</div>
            <div className="flex gap-2">
              <button type="button" className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">
                Upload Photos
              </button>
            </div>

            <div className="text-right">
              <ProtectedAction guardFn={canPost} onAllowed={doSubmit}>
                <button className="px-4 py-2 rounded bg-[var(--color-accent)] text-white">Submit</button>
              </ProtectedAction>
            </div>
          </form>
        )}
      </Section>
    </Layout>
  );
}
