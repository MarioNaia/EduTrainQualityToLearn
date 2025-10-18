export default function Results({
  title,
  correct,
  total,
  onHome,
  onReplay,
  onHistory,
}: {
  title: string;
  correct: number;
  total: number;
  onHome: () => void;
  onReplay: () => void;
  onHistory: () => void;
}) {
  const pct = Math.round((correct / Math.max(total, 1)) * 100);
  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4 max-w-xl">
      <h2 className="text-2xl font-semibold">Results</h2>
      <div className="text-lg font-medium">{title}</div>
      <div className="text-5xl font-bold">
        {correct}/{total}
      </div>
      <div className="text-sm text-slate-600">Score: {pct}%</div>

      <div className="flex gap-2 pt-2">
        <button className="px-3 py-2 bg-black text-white rounded" onClick={onReplay}>
          Replay
        </button>
        <button className="px-3 py-2 border rounded" onClick={onHistory}>
          My history
        </button>
        <button className="px-3 py-2 border rounded" onClick={onHome}>
          Home
        </button>
      </div>
    </div>
  );
}
