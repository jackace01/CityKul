import React, { useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { getUser } from "../lib/auth";
import { followUser, unfollowUser, listFriends, isFriend } from "../lib/api/friends";
import { useChat } from "../components/ChatProvider";
import { PEOPLE } from "../lib/people";
import { Link } from "react-router-dom";

export default function Friends() {
  const me = getUser();
  const myId = me?.email || "guest@demo";
  const { openChat } = useChat();

  const [tick, setTick] = useState(0);
  const myFriends = useMemo(() => listFriends(myId), [myId, tick]);

  function toggleFollow(otherId) {
    if (isFriend(myId, otherId)) {
      unfollowUser(myId, otherId);
    } else {
      followUser(myId, otherId);
    }
    setTick((t) => t + 1);
  }

  const visible = PEOPLE.filter(p => myFriends.includes(p.id));

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Section title="Friends">
          {visible.length ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {visible.map((p) => {
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
                          {p.city} {p.locality ? `- ${p.locality}` : ""}
                        </div>
                      </div>
                      <Link
                        to={`/user/${encodeURIComponent(p.id)}`}
                        className="text-xs px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
                      >
                        Profile
                      </Link>
                    </div>
                    <div className="mt-2 flex gap-2">
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
          ) : (
            <div className="text-sm text-[var(--color-muted)]">You aren’t following anyone yet. Explore the <Link to="/people" className="text-[var(--color-accent)] underline">People</Link> page.</div>
          )}
        </Section>

        {/* Right rail: suggestions */}
        <div className="hidden lg:block">
          <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
            <div className="font-semibold text-sm">Suggestions</div>
            <div className="mt-2 space-y-1 text-sm">
              {PEOPLE.filter(p => !myFriends.includes(p.id)).slice(0,6).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <Link to={`/user/${encodeURIComponent(p.id)}`} className="hover:underline">{p.name}</Link>
                  <button
                    onClick={() => {
                      followUser(myId, p.id);
                      setTick(t=>t+1);
                    }}
                    className="text-xs px-2 py-1 rounded bg-[var(--color-accent)] text-white"
                  >
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
