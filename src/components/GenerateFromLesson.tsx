import { useMemo, useState } from "react";
import { extractTextFromPdf } from "../utils/pdf";
import {
  generateQuestionsLocal,
  generateQuestionsAI,
  type GeneratedQuestion,
} from "../lib/generate";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

type Props = {
  onCreated?: (quizId: string) => void;
};

export default function GenerateFromLesson({ onCreated }: Props) {
  // BYOK (OpenAI key) — stored locally in browser
  const [aiKey, setAiKey] = useState<string>(
    () => localStorage.getItem("byok") ?? ""
  );
  const [budget, setBudget] = useState<number>(
    () => Number(localStorage.getItem("byokBudget") ?? "0.00")
  );
  const [spent, setSpent] = useState<number>(
    () => Number(localStorage.getItem("byokSpent") ?? "0.00")
  );

  const [title, setTitle] = useState("");
  const [raw, setRaw] = useState("");
  const [count, setCount] = useState<number>(5);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<GeneratedQuestion[]>([]);

  useMemo(() => localStorage.setItem("byok", aiKey), [aiKey]);
  useMemo(() => localStorage.setItem("byokBudget", String(budget)), [budget]);
  useMemo(() => localStorage.setItem("byokSpent", String(spent)), [spent]);

  // Estimate cost (very rough)
  const estInputTokens = Math.max(1, Math.round(raw.length / 4 / 3));
  const estOutputTokens = count * 120;
  const estCost = (estInputTokens + estOutputTokens) * 0.0000005; // ~gpt-4o-mini
  const overBudget = spent + estCost > budget;

  async function handlePickPdf(file: File | null) {
    setRaw("");
    if (!file) return;
    setBusy(true);
    try {
      const text = await extractTextFromPdf(file);
      setRaw(text);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "PDF/OCR error";
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  async function doGenerateLocal() {
    if (!raw.trim()) return;
    setBusy(true);
    try {
      const qs = generateQuestionsLocal(raw, count);
      setPreview(qs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate";
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  async function doGenerateAI() {
    if (!raw.trim()) {
      alert("Paste text or upload a PDF first.");
      return;
    }
    if (!aiKey) {
      alert("Enter your OpenAI key (BYOK) to use AI generation.");
      return;
    }
    if (overBudget) {
      alert("Over your local soft budget. Increase it or lower question count.");
      return;
    }

    setBusy(true);
    try {
      const qs = await generateQuestionsAI(raw, count, aiKey);
      setPreview(qs);
      setSpent((prev) => prev + estCost);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI generation failed";
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  async function saveToFirestore() {
    if (!preview.length || !title.trim()) {
      alert("Add a quiz title and generate questions first.");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      alert("Sign in first.");
      return;
    }

    setBusy(true);
    try {
      const ref = await addDoc(collection(db, "quizzes"), {
        ownerUid: user.uid,
        title: title.trim(),
        description: "Generated with EduTrain QuizQuest",
        createdAt: serverTimestamp(),
      });
      for (const q of preview) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await addDoc(collection(db, "quizzes", ref.id, "questions"), q as any);
      }
      onCreated?.(ref.id);
      setPreview([]);
      setTitle("");
      setRaw("");
      alert("Quiz saved to Firestore!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white rounded-xl border p-4 space-y-4">
      <h2 className="font-semibold text-lg">
        Generate quiz from PDF or lesson text
      </h2>

      {/* BYOK + Budget section */}
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">OpenAI API Key (BYOK)</span>
          <input
            className="border rounded px-2 py-1"
            type="password"
            placeholder="sk-… (stored only in this browser)"
            value={aiKey}
            onChange={(e) => setAiKey(e.target.value)}
          />
          <span className="text-xs text-slate-500">
            Your key never leaves your browser. Only required for{" "}
            <b>Generate (AI)</b>.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">AI Budget (USD)</span>
          <input
            className="border rounded px-2 py-1"
            type="number"
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value || 0))}
          />
          <span className="text-xs text-slate-500">
            Soft limit enforced locally. For official usage, check your OpenAI
            dashboard.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Spent (est.)</span>
          <div className="flex gap-2">
            <input
              className="border rounded px-2 py-1 flex-1"
              value={`$${spent.toFixed(4)}`}
              readOnly
            />
            <button
              className="px-2 border rounded"
              onClick={() => setSpent(0)}
              type="button"
            >
              Reset
            </button>
          </div>
          <span className="text-xs text-slate-500">
            Estimated from tokens; may differ from real billing.
          </span>
        </label>
      </div>

      {/* Title */}
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Quiz title</span>
        <input
          className="border rounded px-2 py-1"
          placeholder="e.g., Photosynthesis Basics"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      {/* Upload PDF */}
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Upload PDF:</span>
        <input
          className="border rounded px-2 py-1"
          type="file"
          accept="application/pdf"
          onChange={(e) => handlePickPdf(e.target.files?.[0] ?? null)}
        />
      </label>

      {/* Paste text */}
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Or paste lesson text</span>
        <textarea
          className="border rounded px-2 py-1 h-44"
          placeholder="Paste lesson text here…"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
      </label>

      {/* Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Number of questions:</span>
          <input
            className="border rounded px-2 py-1 w-16"
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, Number(e.target.value || 1)))
            }
          />
        </label>

        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          onClick={doGenerateLocal}
          disabled={busy || !raw.trim()}
          type="button"
        >
          Generate (Local)
        </button>

        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          onClick={doGenerateAI}
          disabled={busy || !raw.trim() || !aiKey || overBudget}
          title={
            !aiKey
              ? "Enter your OpenAI key"
              : overBudget
              ? "Over your soft budget"
              : ""
          }
          type="button"
        >
          Generate (AI)
        </button>

        <button
          className="px-3 py-1 bg-black text-white rounded disabled:opacity-50"
          onClick={saveToFirestore}
          disabled={busy || !preview.length || !title.trim()}
          type="button"
        >
          Save to Firestore
        </button>
      </div>

      {/* Cost estimate */}
      <div className="text-xs text-slate-600 bg-slate-50 rounded p-2">
        <div>Estimated input tokens: {estInputTokens.toLocaleString()}</div>
        <div>Estimated output tokens: {estOutputTokens.toLocaleString()}</div>
        <div>
          Estimated request cost: <b>${estCost.toFixed(4)}</b>{" "}
          <span className="text-slate-500">(model: gpt-4o-mini)</span>
        </div>
      </div>

      {/* Working status */}
      {busy && <div className="text-sm text-slate-500">Working…</div>}

      {/* Preview */}
      {!!preview.length && (
        <div className="pt-4">
          <h3 className="font-semibold">Preview ({preview.length})</h3>
          <ol className="list-decimal pl-6 space-y-3">
            {preview.map((q, i) => (
              <li key={i} className="bg-slate-50 rounded p-2">
                <div className="font-medium">{q.prompt}</div>
                <ul className="list-disc pl-6">
                  {q.choices.map((c, j) => (
                    <li key={j}>
                      {c}{" "}
                      {j === q.answerIndex && (
                        <span className="text-emerald-600">(answer)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
