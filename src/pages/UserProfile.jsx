import React, { useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { useParams } from "react-router-dom";
import { PEOPLE } from "../lib/people";
import { getUser } from "../lib/auth";
import { followUser, unfollowUser, isFriend } from "../lib/api/friends";
import { blockUser, unblockUser, isBlocked } from "../lib/api/blocks";
import { useChat } from "../components/ChatProvider";

export default function UserProfile() {
  const { id } = useParams();
  const person = useMemo(() => PEOPLE.find(p => p.id === id), [id]);

  const me = getUser();
  const myId = me?.email || "guest@demo";
  const { openChat } = useChat();

  const [tick, setTick] = useState(0);
  const f = isFriend(myId, id);
  const blocked = isBlocked(myId, id);

  function toggleFollow() {
    if (f) {
      unfollowUser(myId, id);
    } else {
      followUser(myId, id);
    }
    setTick(t => t + 1);
  }

  function toggleBlock() {
    if (blocked) {
      unblockUser(myId, id);
    } else {
      blockUser(myId, id);
    }
    setTick(t => t + 1);
  }

  function report() {
    alert("Thanks for reporting. Our team will review this profile.");
  }

  if (!person) {
    return (
      <Layout>
        <Section title="User not found">
          <div className="text-sm text-[var(--color-muted)]">This profile does not exist.</div>
        </Section>
      </Layout>
    );
  }

  return (
    <Layout>
      <Section title="Profile">
        <Card>
          <div className="flex flex-wrap items-start gap-4">
            <div className="h-16 w-16 rounded-full grid place-items-center bg-[var(--color-accent)] text-white font-bold text-xl">
              {person.name?.slice(0,1) || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xl font-semibold">{person.name}</div>
              <div className="text-sm text-[var(--color-muted)]">
                {person.occupation || "—"}
              </div>
              <div className="text-sm text-[var(--color-muted)]">
                {person.city}{person.locality ? ` — ${person.locality}` : ""}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleFollow}
                className={`px-3 py-1 rounded ${f ? "ring-1 ring-[var(--color-border)]" : "bg-[var(--color-accent)] text-white"}`}
              >
                {f ? "Remove Friend" : "Add Friend"}
              </button>
              <button
                onClick={() => openChat({ toUserId: person.id, toName: person.name })}
                className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
              >
                💬 DM
              </button>
              <button
                onClick={toggleBlock}
                className={`px-3 py-1 rounded ${blocked ? "bg-yellow-600 text-white" : "ring-1 ring-[var(--color-border)]"}`}
              >
                {blocked ? "Unblock" : "Block"}
              </button>
              <button onClick={report} className="px-3 py-1 rounded bg-red-600 text-white">
                Report
              </button>
            </div>
          </div>

          {person.bio && <p className="mt-3 text-sm">{person.bio}</p>}
        </Card>
      </Section>
    </Layout>
  );
}
