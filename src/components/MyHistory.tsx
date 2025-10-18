import { useEffect, useState } from "react";
import { listMySessionsForQuiz, type Session } from "../lib/firestore";
import { auth } from "../firebase";

export default function MyHistory({
  quizId,
  title,
  onBack,
}: {
  quizId: string;
  title: string;
  onBack: () => void;
}) {
  const [items, setItems] = useState<Array<{ id: string } & Session>>([]);

  useEffect(() => {
    const user = auth.currentUser!;
    listMySessionsForQuiz(user.uid, quizId).then(setItems);
  }, [quizId]);

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-3 max-w-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My history</h2>
        <button className="underline" onClick={onBack}>
          Back
        </button>
      </div>
      <div className="text-sm text-slate-600">{title}</div>

      <ul className="space-y-2">
        {items.map((s) => (
          <li
            key={s.id}
            className="border rounded p-2 flex items-center justify-between"
          >
            <span>
              Score: <b>{s.score}</b>
            </span>
            <span className="text-xs text-slate-500">
              {s.startedAt && "toDate" in s.startedAt
                ? s.startedAt.toDate().toLocaleString()
                : "—"}
            </span>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <p className="text-sm text-slate-500">No attempts yet.</p>
      )}
    </div>
  );
}
