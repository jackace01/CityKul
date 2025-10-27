import React, { useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { PEOPLE } from "../lib/people";
import { getUser } from "../lib/auth";
import { followUser, unfollowUser, isFriend } from "../lib/api/friends";
import { useChat } from "../components/ChatProvider";
import { Link } from "react-router-dom";

export default function People() {
  const me = getUser();
  const myId = me?.email || "guest@demo";
  const { openChat } = useChat();

  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return PEOPLE;
    return PEOPLE.filter(p =>
      [p.name, p.city, p.locality, p.occupation].join(" ").toLowerCase().includes(s)
    );
  }, [q]);

  const [tick, setTick] = useState(0);
  function toggleFollow(otherId) {
    if (isFriend(myId, otherId)) {
      unfollowUser(myId, otherId);
    } else {
      followUser(myId, otherId);
    }
    setTick(t => t + 1);
  }

  return (
    <Layout>
      <Section title="People">
        <div className="mb-3 flex gap-2 flex-wrap">
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="Search by name, city, occupation…"
            className="w-full md:w-96 px-3 py-2 rounded bg-white dark:bg-gray-900 border border-[var(--color-border)] text-black dark:text-white"
          />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map(p => {
            const f = isFriend(myId, p.id);
            return (
              <Card key={p.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {p.occupation || "—"}
                    </div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {p.city}{p.locality ? ` — ${p.locality}` : ""}
                    </div>
                  </div>
                  <Link
                    to={`/user/${encodeURIComponent(p.id)}`}
                    className="text-xs px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
                    title="View profile"
                  >
                    Profile
                  </Link>
                </div>

                <p className="text-sm mt-2 line-clamp-3">{p.bio || ""}</p>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => toggleFollow(p.id)}
                    className={`px-3 py-1 rounded ${f ? "ring-1 ring-[var(--color-border)]" : "bg-[var(--color-accent)] text-white"}`}
                  >
                    {f ? "Unfollow" : "Follow"}
                  </button>
                  <button
                    onClick={() => openChat({ toUserId: p.id, toName: p.name })}
                    className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
                  >
                    💬 DM
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </Section>
    </Layout>
  );
}
