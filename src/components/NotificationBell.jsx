// src/components/NotificationBell.jsx
import { Link } from "react-router-dom";
import { getUser } from "../lib/auth";
import { unreadCount } from "../lib/api/notifications";

export default function NotificationBell() {
  const u = getUser();
  const count = unreadCount(u?.email || "guest@demo");

  return (
    <Link
      to="/notifications"
      className="relative rounded-full px-2 py-1 border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
      title="Notifications"
    >
      🔔
      {count > 0 && (
        <span className="absolute -top-1 -right-1 text-[10px] bg-red-600 text-white rounded-full px-1">
          {count}
        </span>
      )}
    </Link>
  );
}
