import { useEffect, useState } from "react";
import { listQuizzes, type Quiz } from "../lib/firestore";

export default function QuizList({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const [quizzes, setQuizzes] = useState<Array<{ id: string } & Quiz>>([]);

  useEffect(() => {
    listQuizzes().then(setQuizzes);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h2 className="text-lg font-semibold mb-2">Quizzes</h2>
      <ul className="space-y-2">
        {quizzes.map((q) => (
          <li
            key={q.id}
            className="border rounded p-2 flex items-center justify-between"
          >
            <div>
              <div className="font-medium">{q.title}</div>
              <div className="text-sm text-slate-500">{q.description}</div>
            </div>
            <button
              className="px-3 py-2 border rounded"
              onClick={() => onSelect(q.id)}
            >
              Play
            </button>
          </li>
        ))}
      </ul>
      {quizzes.length === 0 && (
        <p className="text-sm text-slate-500">No quizzes yet.</p>
      )}
    </div>
  );
}
