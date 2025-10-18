import { useState } from "react";
import { createQuiz } from "../lib/firestore";
import { auth } from "../firebase";

export default function CreateQuiz({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  async function submit() {
    const user = auth.currentUser;
    if (!user || !title.trim()) return;
    const ref = await createQuiz(user.uid, title.trim(), desc.trim());
    setTitle("");
    setDesc("");
    onCreated(ref.id);
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-2">
      <h2 className="text-lg font-semibold">Create a quiz</h2>
      <input
        className="w-full border rounded p-2"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="w-full border rounded p-2"
        placeholder="Description (optional)"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <button className="px-3 py-2 bg-black text-white rounded" onClick={submit}>
        Create
      </button>
    </div>
  );
}
