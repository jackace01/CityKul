import AutoSlider from "@/components/AutoSlider";

export default function Notices({ items }) {
  return (
    <div className="rounded-2xl bg-[radial-gradient(circle_at_top_left,_#1a1a1a,_#0b0b0b)] border border-neutral-800 shadow-xl">
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="text-lg font-semibold">Government Notice Board</div>
        <div className="h-2 w-2 rounded-full bg-red-500"></div>
      </div>
      <AutoSlider
        items={items}
        interval={3200}
        height={180}
        className="border-t border-neutral-800 rounded-b-2xl"
        render={(n) => (
          <div className="space-y-2">
            <div className="text-base font-medium">{n.text}</div>
            <div className="text-xs text-neutral-400">— {n.by}</div>
            <div className="text-xs text-neutral-500">{n.date}</div>
          </div>
        )}
      />
    </div>
  );
}
