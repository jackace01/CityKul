// src/components/MapToggleBar.jsx
export default function MapToggleBar({ view, setView, total, onReset }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="text-sm text-[var(--color-muted)]">
        Showing <b>{total}</b> result{total === 1 ? "" : "s"}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setView("list")}
          className={`px-3 py-1 rounded-full ring-1 ring-[var(--color-border)] ${view === "list" ? "bg-white text-black" : ""}`}
        >
          List
        </button>
        <button
          onClick={() => setView("map")}
          className={`px-3 py-1 rounded-full ring-1 ring-[var(--color-border)] ${view === "map" ? "bg-white text-black" : ""}`}
        >
          Map
        </button>
        {onReset ? (
          <button
            onClick={onReset}
            className="px-3 py-1 rounded-full ring-1 ring-[var(--color-border)]"
            title="Reset filters"
          >
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}
