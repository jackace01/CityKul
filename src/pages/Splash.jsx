import React from "react";
import { Link } from "react-router-dom";

export default function Splash() {
  return (
    <div className="flex items-center justify-center h-screen bg-[var(--color-bg)] text-[var(--color-fg)] flex-col space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl grid place-items-center ring-1 ring-[var(--color-border)] bg-[var(--color-surface)]">
          <svg viewBox="0 0 32 32" className="h-7 w-7">
            <path
              d="M16 3c-5 0-9 3.9-9 8.8 0 5.9 7.5 13 8.4 13.9.3.3.8.3 1.1 0 .9-.9 8.4-8 8.4-13.9C25.9 6.9 21 3 16 3z"
              fill="currentColor"
              className="text-[var(--color-accent)]"
            />
            <circle cx="16" cy="12" r="3.2" fill="white" />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">
          <span className="text-[var(--color-fg)]">City</span>{" "}
          <span
            className="font-extrabold"
            style={{
              background:
                "linear-gradient(90deg, #f59e0b 0%, #ef4444 50%, #8b5cf6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            कुल
          </span>
        </h1>
      </div>
      <p className="text-[var(--color-muted)]">Reinvent Your Locality</p>
      <Link
        to="/login"
        className="px-4 py-2 rounded bg-[var(--color-accent)] text-white"
      >
        Get Started →
      </Link>
    </div>
  );
}
