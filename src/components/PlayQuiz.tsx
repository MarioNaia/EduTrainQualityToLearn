import { useEffect, useState } from "react";
import {
  getQuestions,
  getQuiz,
  startSession,
  finishSession,
  type Question,
} from "../lib/firestore";
import { auth } from "../firebase";

export default function PlayQuiz({
  quizId,
  onDone,
}: {
  quizId: string;
  onDone: (result: { score: number; total: number; title: string }) => void;
}) {
  const [title, setTitle] = useState<string>("");
  const [qs, setQs] = useState<Array<{ id: string } & Question>>([]);
  const [i, setI] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const quiz = await getQuiz(quizId);
      setTitle(quiz?.title ?? "Quiz");

      const questions = await getQuestions(quizId);
      setQs(questions);

      const user = auth.currentUser!;
      const ref = await startSession(user.uid, quizId, 0);
      setSessionId(ref.id);
    })();
  }, [quizId]);

  if (!qs.length) {
    return <div className="bg-white rounded-xl shadow p-4">Loading…</div>;
  }

  const q = qs[i];

  async function pick(answerIdx: number) {
    const nextScore = score + (answerIdx === q.answerIndex ? 1 : 0);

    if (i + 1 < qs.length) {
      setScore(nextScore);
      setI((prev) => prev + 1);
    } else {
      try {
        await finishSession(sessionId, nextScore);
      } finally {
        onDone({ score: nextScore, total: qs.length, title });
      }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-sm text-slate-500">
        Question {i + 1} / {qs.length}
      </div>
      <div className="font-medium">{q.prompt}</div>
      <div className="grid gap-2">
        {q.choices.map((c, idx) => (
          <button
            key={idx}
            className="px-3 py-2 border rounded hover:bg-slate-50 text-left"
            onClick={() => pick(idx)}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
