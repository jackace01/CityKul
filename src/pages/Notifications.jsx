// src/pages/Notifications.jsx
import Layout from "../components/Layout";
import Section from "../components/Section";
import { getUser } from "../lib/auth";
import { listNotifications, markAllRead } from "../lib/api/notifications";
import { Link, useNavigate } from "react-router-dom";

export default function Notifications() {
  const u = getUser();
  const nav = useNavigate();
  const notifs = listNotifications(u?.email || "guest@demo");

  function markRead() {
    markAllRead(u?.email || "guest@demo");
    nav("/notifications"); // refresh
  }

  return (
    <Layout>
      <Section title="Notifications">
        <div className="text-right mb-3">
          <button onClick={markRead} className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">Mark all read</button>
        </div>
        <div className="space-y-3">
          {notifs.map(n=>(
            <div key={n.id} className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{n.title}</div>
                <div className="text-xs text-[var(--color-muted)]">{new Date(n.ts).toLocaleString()}</div>
              </div>
              <div className="text-sm mt-1">{n.body}</div>
              {n.link && <Link to={n.link} className="text-sm text-[var(--color-accent)] underline mt-1 inline-block">Open</Link>}
            </div>
          ))}
          {!notifs.length && <div className="text-sm text-[var(--color-muted)]">No notifications.</div>}
        </div>
      </Section>
    </Layout>
  );
}
