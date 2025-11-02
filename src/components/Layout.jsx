// src/components/Layout.jsx
import React from "react";
import Header from "./Header";
import Footer from "./Footer";
import WalletBanner from "./WalletBanner";
import CityGuardBanner from "./CityGuardBanner";
import { Link } from "react-router-dom";
import { getUser, isMember } from "../lib/auth";

export default function Layout({ children }) {
  const u = getUser();
  const member = isMember();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)] transition-colors">
      {/* ---- Top Navigation Header ---- */}
      <Header />

      {/* ---- City and Wallet Banners ---- */}
      <CityGuardBanner />
      <WalletBanner />

      {/* ---- Quick Nav Bar for Key Admin / Reviewer Links ---- */}
      {u && (
        <div className="bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] text-sm text-center py-2 flex flex-wrap justify-center gap-3">
          <Link
            to="/dashboard"
            className="px-3 py-1 rounded ring-1 ring-[var(--color-border)] hover:bg-[var(--color-elev)]"
          >
            👤 Dashboard
          </Link>

          {member ? (
            <Link
              to="/review"
              className="px-3 py-1 rounded ring-1 ring-[var(--color-border)] hover:bg-[var(--color-elev)]"
            >
              🧮 Reviewer Dashboard
            </Link>
          ) : null}

          <Link
            to="/admin"
            className="px-3 py-1 rounded ring-1 ring-[var(--color-border)] hover:bg-[var(--color-elev)]"
          >
            ⚙️ Admin
          </Link>
        </div>
      )}

      {/* ---- Main Content ---- */}
      <main className="flex-1 p-4">{children}</main>

      {/* ---- Footer ---- */}
      <Footer />
    </div>
  );
}
