import { useState } from "react";
import { addQuestion } from "../lib/firestore";

export default function AddQuestion({ quizId }: { quizId: string }) {
  const [prompt, setPrompt] = useState("");
  const [choices, setChoices] = useState<[string, string, string, string]>([
    "",
    "",
    "",
    "",
  ]);
  const [answerIndex, setAnswerIndex] = useState(0);

  async function add() {
    if (!prompt.trim() || choices.some((c) => !c.trim())) return;
    await addQuestion(quizId, {
      prompt: prompt.trim(),
      choices: [...choices],
      answerIndex,
    });
    setPrompt("");
    setChoices(["", "", "", ""]);
    setAnswerIndex(0);
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-2">
      <h3 className="font-semibold">Add question</h3>
      <input
        className="w-full border rounded p-2"
        placeholder="Question"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      {choices.map((c, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className="flex-1 border rounded p-2"
            placeholder={`Choice ${i + 1}`}
            value={c}
            onChange={(e) =>
              setChoices((prev) => {
                const next = [...prev] as [string, string, string, string];
                next[i] = e.target.value;
                return next;
              })
            }
          />
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              checked={answerIndex === i}
              onChange={() => setAnswerIndex(i)}
            />
            correct
          </label>
        </div>
      ))}
      <button className="px-3 py-2 bg-black text-white rounded" onClick={add}>
        Save question
      </button>
    </div>
  );
}
