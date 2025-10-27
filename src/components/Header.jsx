import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { getUser, isMember, signOut, subscribeUser } from "../lib/auth";
import { useChat } from "./ChatProvider";
import CitySwitcher from "./CitySwitcher";

export default function Header() {
  const location = useLocation();
  const nav = useNavigate();
  const { openChat } = useChat();
  const [u, setU] = useState(getUser());
  const member = isMember();
  const [showCitySwitcher, setShowCitySwitcher] = useState(false);

  useEffect(() => {
    const unsub = subscribeUser(setU);
    return unsub;
  }, []);

  const navItems = [
    { name: "Home", path: "/home" },
    { name: "Feed", path: "/feed" },
    { name: "Events", path: "/events" },
    { name: "Jobs", path: "/jobs" },
    { name: "Marketplace", path: "/marketplace" },
    { name: "Needs", path: "/needsattention" },
    { name: "Promotions", path: "/promotions" },
    { name: "Wallet", path: "/wallet" },
    { name: "Review", path: "/review" },
    { name: "Friends", path: "/friends" },
    { name: "People", path: "/people" },
  ];

  const onLogout = () => {
    signOut();
    nav("/login");
  };

  const onLogoClick = (e) => {
    if (location.pathname === "/login" || location.pathname === "/signup") {
      e.preventDefault();
      return;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/80 backdrop-blur border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left: Logo + Nav */}
          <div className="min-w-0 flex items-center gap-4">
            <Link to="/home" onClick={onLogoClick} className="flex items-center gap-2" title="Go to Home">
              <div className="h-8 w-8 rounded-lg grid place-items-center bg-[var(--color-accent)] text-white font-bold">
                C
              </div>
              <div className="leading-tight">
                <div className="font-bold">CityKul</div>
                <div className="text-[11px] text-[var(--color-muted)] -mt-0.5">Reinvent Your Locality</div>
              </div>
            </Link>

            <nav className="ml-3 flex gap-1 overflow-x-auto no-scrollbar">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-medium px-2 py-1 rounded whitespace-nowrap ${
                    location.pathname === item.path ? "bg-[var(--color-surface)]" : "hover:bg-[var(--color-surface)]"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: Quick actions */}
          <div className="flex items-center gap-3">
            {/* City switch is now a clear button */}
            <button
              type="button"
              onClick={() => setShowCitySwitcher(true)}
              className="flex items-center gap-2 px-3 py-1 rounded ring-1 ring-[var(--color-border)] bg-[var(--color-surface)] text-sm"
              title="Change city & neighbourhood"
              aria-label="Change city and neighbourhood"
            >
              <span>📍</span>
              <span className="hidden sm:inline">
                {u?.city ? `${u.city}${u?.locality ? " · " + u.locality : ""}` : "Set City"}
              </span>
            </button>

            <button
              onClick={() => openChat({ toUserId: "city-room", toName: "City Chat" })}
              className="hidden sm:block text-sm px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
              title="Open city chat"
            >
              💬 City Chat
            </button>

            <div className="hidden sm:flex flex-col items-end leading-tight mr-1">
              <div className="text-sm font-semibold flex items-center gap-1">
                {u?.name || "Guest"}
                {member && (
                  <span
                    title="Member"
                    className="inline-block text-[10px] px-1 py-[1px] rounded bg-blue-600 text-white"
                  >
                    ✓
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[var(--color-muted)]">
                {u?.city ? `${u.city}${u?.locality ? " - " + u.locality : ""}` : "Set your city"}
              </div>
            </div>

            <ThemeToggle />

            {u ? (
              <button onClick={onLogout} className="text-xs px-3 py-1 rounded bg-red-500 text-white">
                Logout
              </button>
            ) : (
              <Link to="/login" className="text-xs px-3 py-1 rounded bg-[var(--color-accent)] text-white">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {showCitySwitcher && <CitySwitcher onClose={() => setShowCitySwitcher(false)} />}
    </>
  );
}
