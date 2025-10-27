// src/pages/Membership.jsx
import Layout from "../components/Layout";
import Section from "../components/Section";
import { getUser, setUser, isMember } from "../lib/auth";
import { useNavigate } from "react-router-dom";

export default function Membership() {
  const u = getUser();
  const nav = useNavigate();
  const member = isMember();

  function activate() {
    const next = { ...(u || {}), member: true };
    setUser(next);
    alert("Membership activated! (mock payment ₹100)");
    nav("/home");
  }

  return (
    <Layout>
      <Section title="Become a Member – Start Earning">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl ring-1 ring-[var(--color-border)] p-4 bg-[var(--color-surface)]">
            <h3 className="font-semibold">Benefits</h3>
            <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
              <li>Post Events, Jobs, Marketplace deals</li>
              <li>Earn points for valid posts & verifications</li>
              <li>Blue tick next to your name</li>
              <li>Priority placement in local listings</li>
            </ul>
          </div>
          <div className="rounded-xl ring-1 ring-[var(--color-border)] p-4 bg-[var(--color-surface)]">
            <h3 className="font-semibold">Pricing</h3>
            <p className="text-sm mt-2">₹100 / year</p>
            <button
              onClick={activate}
              disabled={member}
              className="mt-3 px-4 py-2 rounded bg-[var(--color-accent)] text-white disabled:opacity-60"
            >
              {member ? "You’re already a member" : "Activate membership"}
            </button>
          </div>
        </div>
      </Section>
    </Layout>
  );
}
