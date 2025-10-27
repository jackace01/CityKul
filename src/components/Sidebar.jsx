const items = [
  { id: "feed", label: "City Feed", icon: "🏠" },
  { id: "submit", label: "Submit", icon: "➕" },
  { id: "review", label: "Review Queue", icon: "✅" },
  { id: "wallet", label: "Wallet", icon: "🪙" },
  { id: "profile", label: "Profile", icon: "👤" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];
export default function Sidebar({ current, onChange }) {
  return (
    <nav className="sticky top-6 space-y-2">
      {items.map(s => (
        <button key={s.id}
          onClick={() => onChange(s.id)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left border transition
          ${current === s.id ? "bg-white text-black border-white" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
          <span className="text-lg">{s.icon}</span><span className="font-medium">{s.label}</span>
        </button>
      ))}
    </nav>
  );
}
