import React, { useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import { getUser, isMember } from "../lib/auth";
import { useUploader } from "../hooks/useUploader";
import { addEvent } from "../lib/api/events";
import { addNotification } from "../lib/api/notifications";
import BecomeMemberButton from "../components/BecomeMemberButton";
import ProtectedAction from "../components/ProtectedAction";
import { canPost } from "../lib/gate";
import { getSelectedCity } from "../lib/cityState";

export default function SubmitEvent() {
  const u = getUser();
  const member = isMember();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [fee, setFee] = useState("");
  const [place, setPlace] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const { items: media, add: addMedia } = useUploader();

  function doSubmit() {
    const cat = (customCategory || "").trim() || category;

    const evt = {
      id: `evt-${Date.now()}`,
      name,
      category: cat || "General",
      date,
      time,
      fee,
      place,
      address,
      description,
      media,
      city: getSelectedCity() || u?.city || "",
      locality: u?.locality || "",
      createdBy: u?.name || u?.id || "Organizer",
      ownerId: u?.email || "guest@demo",
      createdAt: Date.now(),
    };

    addEvent(evt);
    addNotification({
      toUserId: u?.email || "guest@demo",
      title: "Event submitted for review",
      body: `“${name}” is pending approval.`,
      link: "/events",
    });

    alert("Submitted for review! It will appear after approval.");
  }

  return (
    <Layout>
      <Section title="Submit New Event">
        {!member ? (
          <div className="max-w-lg mx-auto rounded-xl ring-1 ring-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
            Only members can submit events.
            <div className="mt-3">
              <BecomeMemberButton label="Become a member to submit" />
            </div>
          </div>
        ) : (
          <form onSubmit={(e)=>e.preventDefault()} className="space-y-4 max-w-lg mx-auto">
            <div className="text-xs text-[var(--color-muted)]">
              Posting as <b>{u?.name || "Organizer"}</b>
              {u?.city ? ` · ${u.city}${u?.locality ? " - " + u.locality : ""}` : ""}
            </div>

            <div>
              <label className="block text-sm mb-1">Name of Event</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Category</label>
              <input
                list="categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Select or type"
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              />
              <datalist id="categories">
                <option>Music</option>
                <option>Meetup</option>
                <option>Workshop</option>
                <option>Sports</option>
                <option>Art</option>
              </datalist>
              <div className="mt-2 text-xs text-[var(--color-muted)]">
                Or enter custom:
                <input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Custom category"
                  className="ml-2 rounded border border-[var(--color-border)] px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Start Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Entry Fee (if any)</label>
              <input
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="e.g. ₹100 or Free"
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Venue / Place</label>
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                required
                placeholder="Name of hall / park / building"
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Address / Detailed Location</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="Street, landmarks, etc."
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What to expect, who it's for, etc."
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Images / Media (3–5 pics, short video)</label>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => addMedia(e.target.files)}
                className="block"
              />
            </div>

            <div className="text-right">
              <ProtectedAction guardFn={canPost} onAllowed={doSubmit}>
                <button className="px-4 py-2 rounded bg-[var(--color-accent)] text-white">
                  Submit for Review
                </button>
              </ProtectedAction>
            </div>
          </form>
        )}
      </Section>
    </Layout>
  );
}
