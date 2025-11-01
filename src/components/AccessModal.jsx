// src/components/AccessModal.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function AccessModal({ open, reason = "subscribe", onClose }) {
  if (!open) return null;

  const title =
    reason === "resident"
      ? "City verification required"
      : reason === "subscribe"
      ? "Members only"
      : "Action not allowed";

  const message =
    reason === "resident"
      ? "Verify you belong to this city to perform this action."
      : reason === "subscribe"
      ? "This action is for CityKul members. Subscribe to continue."
      : "You don’t have access to this action yet.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative max-w-sm w-full rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
        <div className="text-lg font-semibold">{title}</div>
        <p className="text-sm text-[var(--color-muted)] mt-1">{message}</p>

        <div className="mt-4 flex items-center gap-2">
          {reason === "subscribe" ? (
            <Link
              to="/membership"
              className="px-3 py-2 rounded bg-[var(--color-accent)] text-white"
              onClick={onClose}
            >
              Become a member
            </Link>
          ) : null}
          {reason === "resident" ? (
            <Link
              to="/profile"
              className="px-3 py-2 rounded bg-[var(--color-accent)] text-white"
              onClick={onClose}
            >
              Verify profile
            </Link>
          ) : null}
          <button
            onClick={onClose}
            className="ml-auto px-3 py-2 rounded ring-1 ring-[var(--color-border)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
