// src/App.jsx
import React from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Chat provider must wrap everything that uses useChat()
import { ChatProvider } from "./components/ChatProvider";

// Public pages
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Core pages
import Home from "./pages/Home";
import Feed from "./pages/Feed";
import Events from "./pages/Events";
import Jobs from "./pages/Jobs";
import Marketplace from "./pages/Marketplace";
import NeedsAttention from "./pages/NeedsAttention";
import Promotions from "./pages/Promotions";
import Wallet from "./pages/Wallet";
import Review from "./pages/Review";
import Friends from "./pages/Friends";
import People from "./pages/People";

// Submit (existing)
import SubmitEvent from "./pages/SubmitEvent";
import SubmitJob from "./pages/SubmitJob";
import SubmitDeal from "./pages/SubmitDeal";
import SubmitPost from "./pages/SubmitPost";
import SubmitGig from "./pages/SubmitGig"; // NEW

// Details & utilities
import EventDetail from "./pages/EventDetail";
import Chat from "./pages/Chat";
import Membership from "./pages/Membership";
import Notifications from "./pages/Notifications";
import AdminNotices from "./pages/AdminNotices";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Safety from "./pages/Safety";

// NEW: Trending
import TrendingNST from "./pages/TrendingNST";

// Rentals pages (existing)
import RentalList from "./pages/RentalList";
import RentalForm from "./pages/RentalForm";
import RentalDetail from "./pages/RentalDetail";

// Discover pages (existing)
import DiscoverList from "./pages/DiscoverList";
import DiscoverForm from "./pages/DiscoverForm";
import DiscoverDetail from "./pages/DiscoverDetail";

// NEW: Contests
import Contests from "./pages/Contests";
import SubmitContestEntry from "./pages/SubmitContestEntry";
import ContestDetail from "./pages/ContestDetail";

// NEW: City Hero
import CityHero from "./pages/CityHero";
import CityHeroLegacy from "./pages/CityHeroLegacy";

// NEW: Admin Finance (Platform Wallet)
import AdminFinance from "./pages/AdminFinance";

// NEW: Admin Hub
import AdminHub from "./pages/AdminHub";

// NEW: Admin Config (per-city knobs)
import AdminConfig from "./pages/AdminConfig";
import AdminTrust from "./pages/AdminTrust";

// NEW: User Dashboard
import Dashboard from "./pages/Dashboard";

// Optional: smart fallback
import { getUser } from "./lib/auth";
function SmartFallback() {
  const u = getUser();
  return <Navigate to={u ? "/home" : "/login"} replace />;
}

export default function App() {
  return (
    <ChatProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Core */}
          <Route path="/home" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/events" element={<Events />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/needsattention" element={<NeedsAttention />} />
          <Route path="/promotions" element={<Promotions />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/review" element={<Review />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/people" element={<People />} />

          {/* Details & utilities */}
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/admin-notices" element={<AdminNotices />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/safety" element={<Safety />} />

          {/* NEW: Trending “More” page */}
          <Route path="/trending" element={<TrendingNST />} />

          {/* Rentals */}
          <Route path="/rentals" element={<RentalList />} />
          <Route path="/rentals/new" element={<RentalForm />} />
          <Route path="/rentals/:id" element={<RentalDetail />} />

          {/* Discover */}
          <Route path="/discover" element={<DiscoverList />} />
          <Route path="/discover/new" element={<DiscoverForm />} />
          <Route path="/discover/:id" element={<DiscoverDetail />} />

          {/* NEW: Contests */}
          <Route path="/contests" element={<Contests />} />
          <Route path="/contests/new" element={<SubmitContestEntry />} />
          <Route path="/contests/:id" element={<ContestDetail />} />

          {/* NEW: City Hero */}
          <Route path="/city-hero" element={<CityHero />} />
          <Route path="/city-hero/legacy" element={<CityHeroLegacy />} />

          {/* NEW: Admin Finance (Platform Wallet) */}
          <Route path="/admin/finance" element={<AdminFinance />} />

          {/* NEW: Admin Hub */}
          <Route path="/admin" element={<AdminHub />} />
          <Route path="/admin/config" element={<AdminConfig />} /> {/* NEW */}
          <Route path="/admin/trust" element={<AdminTrust />} />

          {/* NEW: Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Submit forms */}
          <Route path="/submit-event" element={<SubmitEvent />} />
          <Route path="/submit-job" element={<SubmitJob />} />
          <Route path="/submit-deal" element={<SubmitDeal />} />
          <Route path="/submit-post" element={<SubmitPost />} />
          <Route path="/gigs/new" element={<SubmitGig />} /> {/* NEW */}

          {/* Legacy redirects (singular -> plural) */}
          <Route path="/contest" element={<Navigate to="/contests" replace />} />
          <Route path="/contest/new" element={<Navigate to="/contests/new" replace />} />
          <Route path="/contest/*" element={<Navigate to="/contests" replace />} />

          {/* Legacy redirects */}
          <Route path="/wallet/ledger" element={<Navigate to="/wallet" replace />} />

          {/* Fallback */}
          <Route path="*" element={<SmartFallback />} />
        </Routes>
      </Router>
    </ChatProvider>
  );
}
