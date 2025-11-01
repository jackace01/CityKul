// src/pages/SubmitPost.jsx
import Layout from "../components/Layout";
import Section from "../components/Section";
import { isMember, getUser } from "../lib/auth";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { addPost } from "../lib/api/posts";
import { addNotification } from "../lib/api/notifications";
import ProtectedAction from "../components/ProtectedAction";
import { canPost } from "../lib/gate";
import { getSelectedCity } from "../lib/cityState";

export default function SubmitPost() {
  const member = isMember();
  const u = getUser();
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  function doSubmit() {
    const post = {
      id: `post-${Date.now()}`,
      title,
      text,
      author: u?.name || "Anonymous",
      city: getSelectedCity() || u?.city || "",
      locality: u?.locality || "",
      ownerId: u?.email || "guest@demo",
      createdAt: Date.now(),
      approved: false,
    };
    addPost(post);

    addNotification({
      toUserId: u?.email || "guest@demo",
      title: "Post submitted for review",
      body: `“${title}” is pending approval.`,
      link: "/feed",
    });

    alert("Post submitted for review. It will appear after approval.");
    nav("/feed");
  }

  return (
    <Layout>
      <Section title="Create New Post">
        {!member ? (
          <div className="text-sm">
            Only members can create posts.{" "}
            <Link to="/membership" className="text-[var(--color-accent)] underline">
              Become a member
            </Link>
          </div>
        ) : (
          <form onSubmit={(e)=>e.preventDefault()} className="max-w-lg mx-auto space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              placeholder="Post title"
              required
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              placeholder="Write something…"
            />
            <div className="text-right">
              <ProtectedAction guardFn={canPost} onAllowed={doSubmit}>
                <button className="px-4 py-2 rounded bg-[var(--color-accent)] text-white">
                  Submit
                </button>
              </ProtectedAction>
            </div>
          </form>
        )}
      </Section>
    </Layout>
  );
}
