// src/pages/EventDetail.jsx
import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import Section from "../components/Section";
import PromoRail from "../components/PromoRail";
import MapEmbed from "../components/MapEmbed";
import Poll from "../components/Poll";
import ChatButton from "../components/ChatButton";
import {
  getEventById,
  addEventComment,
  listEventComments,
  listPolls,
  listAttendees,
  rsvp,
  cancelRsvp,
  isGoing,
} from "../lib/api/events";
import { getUser, initialsFromName } from "../lib/auth";
import { addNotification } from "../lib/api/notifications";

export default function EventDetail() {
  const { id } = useParams();
  const u = getUser();
  const meId = u?.email || "guest@demo";
  const meName = u?.name || "You";

  const event = getEventById(id);
  const [comments, setComments] = useState(listEventComments(id));
  const [polls, setPolls] = useState(listPolls(id));
  const [text, setText] = useState("");
  const [attendees, setAttendees] = useState(listAttendees(id));
  const [going, setGoing] = useState(isGoing(id, meId));

  const placeQuery = useMemo(() => {
    const parts = [event?.place, event?.address, event?.city].filter(Boolean);
    return parts.join(", ");
  }, [event]);

  function addComment(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    const c = addEventComment(id, {
      authorId: meId,
      authorName: meName,
      text: body,
    });
    setText("");
    setComments([c, ...comments]);

    // Auto-notify event owner (if not self)
    const owner = event?.ownerId;
    if (owner && owner !== meId) {
      addNotification({
        toUserId: owner,
        title: "New comment on your event",
        body: `${meName} commented on “${event?.name}”`,
        link: `/event/${id}`,
      });
    }
  }

  function go() {
    const arr = rsvp(id, meId, meName);
    setAttendees(arr || []);
    setGoing(true);
  }
  function ungo() {
    const arr = cancelRsvp(id, meId);
    setAttendees(arr || []);
    setGoing(false);
  }

  function handlePollChange() {
    // refresh snapshot
    setPolls(listPolls(id));
  }

  if (!event) {
    return (
      <Layout>
        <Section title="Event not found">
          <Link to="/events" className="text-[var(--color-accent)] underline">Back to Events</Link>
        </Section>
      </Layout>
    );
  }

  const count = attendees.length;

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title={event.name} rightHref="/events" rightText="All Events">
            <div className="text-xs text-[var(--color-muted)]">📍 {event.city}{event.locality ? ` - ${event.locality}` : ""}</div>
            <div className="text-sm text-[var(--color-muted)] mt-1">
              {event.date}{event.time?` · ${event.time}`:""} {event.fee?`· ${event.fee}`:""}
            </div>
            {event.description && <p className="mt-2 text-sm">{event.description}</p>}

            {event.media?.length ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {event.media.slice(0,4).map((m,i)=>(
                  <img key={i} src={m.url} alt="" className="rounded-lg ring-1 ring-[var(--color-border)] object-cover w-full h-28" />
                ))}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {!going ? (
                <button onClick={go} className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">
                  I’m going
                </button>
              ) : (
                <button onClick={ungo} className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">
                  Cancel RSVP
                </button>
              )}
              <div className="text-sm text-[var(--color-muted)]">{count} going</div>

              <div className="flex ml-auto gap-2">
                <ChatButton
                  contextType="event"
                  contextId={event.id}
                  contextTitle={`Event: ${event.name}`}
                  ownerId={event.createdBy || "host"}
                  ownerName={event.createdBy || "Organizer"}
                />
              </div>
            </div>

            {/* Attendee chips */}
            {!!attendees.length && (
              <div className="mt-3 flex flex-wrap gap-2">
                {attendees.slice(0,12).map(a=>(
                  <div key={a.id} className="flex items-center gap-2 px-2 py-1 rounded-full ring-1 ring-[var(--color-border)]">
                    <span className="h-6 w-6 rounded-full grid place-items-center bg-[var(--color-accent)] text-white text-[10px] font-bold">
                      {initialsFromName(a.name)}
                    </span>
                    <span className="text-xs">{a.name}</span>
                  </div>
                ))}
                {attendees.length > 12 && (
                  <div className="text-xs text-[var(--color-muted)]">+{attendees.length - 12} more</div>
                )}
              </div>
            )}
          </Section>

          <Section title="Venue & Map">
            <div className="text-sm">
              <div className="font-medium">{event.place || "Venue TBA"}</div>
              {event.address && <div className="text-[var(--color-muted)]">{event.address}</div>}
            </div>
            <div className="mt-3">
              <MapEmbed query={placeQuery || event.city} />
            </div>
          </Section>

          <Section title="Event Feed (updates & chat)">
            <form onSubmit={addComment} className="mb-3">
              <textarea
                value={text}
                onChange={(e)=>setText(e.target.value)}
                rows={3}
                placeholder="Post an update, ask a question…"
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white"
              />
              <div className="text-right mt-2">
                <button className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">Post</button>
              </div>
            </form>

            <div className="space-y-3">
              {comments.map(c=>(
                <div key={c.id} className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{c.authorName}</div>
                    <div className="text-xs text-[var(--color-muted)]">{new Date(c.ts).toLocaleString()}</div>
                  </div>
                  <div className="text-sm whitespace-pre-wrap mt-1">{c.text}</div>
                </div>
              ))}
              {!comments.length && <div className="text-sm text-[var(--color-muted)]">No updates yet. Be the first!</div>}
            </div>
          </Section>

          <Section title="Live Polls">
            <Poll eventId={event.id} polls={polls} onChange={handlePollChange} />
          </Section>
        </div>

        <div className="hidden lg:block">
          <PromoRail />
        </div>
      </div>
    </Layout>
  );
}
