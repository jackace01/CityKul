// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

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
import People from "./pages/People"; // NEW

// Submit
import SubmitEvent from "./pages/SubmitEvent";
import SubmitJob from "./pages/SubmitJob";
import SubmitDeal from "./pages/SubmitDeal";
import SubmitPost from "./pages/SubmitPost";

// Details & utilities
import EventDetail from "./pages/EventDetail";
import Chat from "./pages/Chat";
import Membership from "./pages/Membership";
import Notifications from "./pages/Notifications";
import AdminNotices from "./pages/AdminNotices";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Safety from "./pages/Safety";

// NEW: Trending (More from “Trending in your city”)
import TrendingNST from "./pages/TrendingNST";

// Chat provider
import { ChatProvider } from "./components/ChatProvider";

// Optional: smart fallback
import { getUser } from "./lib/auth";
function SmartFallback() {
  const u = getUser();
  return <Navigate to={u ? "/home" : "/login"} replace />;
}

export default function App() {
  return (
    <Router>
      <ChatProvider>
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
          <Route path="/people" element={<People />} /> {/* NEW: fixes People button */}

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

          {/* Submit forms */}
          <Route path="/submit-event" element={<SubmitEvent />} />
          <Route path="/submit-job" element={<SubmitJob />} />
          <Route path="/submit-deal" element={<SubmitDeal />} />
          <Route path="/submit-post" element={<SubmitPost />} />

          {/* Fallback */}
          <Route path="*" element={<SmartFallback />} />
        </Routes>
      </ChatProvider>
    </Router>
  );
}
