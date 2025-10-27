// src/components/Layout.jsx
import React from "react";
import Header from "./Header";
import Footer from "./Footer";
import { ChatProvider } from "./ChatProvider";

export default function Layout({ children }) {
  return (
    <ChatProvider>
      <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)] transition-colors">
        <Header />
        <main className="flex-1 p-4">{children}</main>
        <Footer />
      </div>
    </ChatProvider>
  );
}
