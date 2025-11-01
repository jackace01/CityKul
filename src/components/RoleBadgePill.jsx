// src/components/RoleBadgePill.jsx
export default function RoleBadgePill({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-[2px] rounded-full text-[11px] ring-1 ring-[var(--color-border)]">
      {children}
    </span>
  );
}
