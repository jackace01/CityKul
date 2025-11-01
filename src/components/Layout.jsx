// src/components/Layout.jsx
import React from "react";
import Header from "./Header";
import Footer from "./Footer";
import WalletBanner from "./WalletBanner";
import CityGuardBanner from "./CityGuardBanner";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)] transition-colors">
      <Header />
      <CityGuardBanner />
      {/* Wallet pending-rewards banner */}
      <WalletBanner />
      <main className="flex-1 p-4">{children}</main>
      <Footer />
    </div>
  );
}
