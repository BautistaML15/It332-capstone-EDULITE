import { PERFORMANCE_LEVELS } from "../utils/performance";

export default function RecordPerformanceSummary({ counts, total, shown, level, onLevelChange, context, disabled = false }) {
  const cards = [{ label: "All students", value: "ALL", count: total, dotClass: "bg-[#36A9E1]", range: "All performance levels" },
    ...PERFORMANCE_LEVELS.map((item) => ({ ...item, value: item.label, count: counts[item.label] ?? 0 }))];
  return (
    <section aria-label="Student performance overview" className="rounded-[24px] border border-[#E3E9EE] bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-[#25313C]">Performance overview</h2>
          <p className="mt-1 text-xs text-[#71808D]">{context}</p>
        </div>
        <p aria-live="polite" aria-atomic="true" className="text-sm font-semibold text-[#168CC8]">
          Showing {shown} of {total} student{total === 1 ? "" : "s"}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {cards.map((card) => (
          <button key={card.value} type="button" aria-pressed={level === card.value}
            aria-label={`Filter ${card.label}: ${card.count} student${card.count === 1 ? "" : "s"}`} title={card.range}
            disabled={disabled} onClick={() => onLevelChange(card.value)}
            className={`rounded-[14px] border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${level === card.value ? "border-[#36A9E1] bg-[#EDF7FC] ring-1 ring-[#36A9E1]" : "border-[#E3E9EE] bg-white hover:border-[#B8DDEC] hover:bg-[#F8FAFB]"}`}>
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#52616D]">
              <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${card.dotClass}`} />
              {card.label}
            </span>
            <span className="mt-1.5 block text-2xl font-bold tabular-nums text-[#25313C]">{card.count}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
