import { useEffect, useMemo, useState } from "react";
import { auth, db } from "./firebase";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";

// Minimal message shape for the demo
type Message = {
  id: string;
  text: string;
  uid: string;
  ts?: unknown; // could be Timestamp | null; using unknown keeps it strict without pulling extra types
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password123");
  const [text, setText] = useState("");
  const [items, setItems] = useState<Message[]>([]);
  const messagesRef = useMemo(() => collection(db, "messages"), []);

  useEffect(() => {
    // return the unsubscribe for cleanup
    return onAuthStateChanged(auth, setUser);
  }, []);

  async function handleSignUp() {
    await createUserWithEmailAndPassword(auth, email, password);
  }
  async function handleSignIn() {
    await signInWithEmailAndPassword(auth, email, password);
  }
  async function handleSignOut() {
    await signOut(auth);
    setItems([]);
  }

  async function addMessage() {
    if (!user || !text.trim()) return;
    await addDoc(messagesRef, {
      text: text.trim(),
      uid: user.uid,
      ts: serverTimestamp(),
    } satisfies DocumentData);
    setText("");
    await loadMessages();
  }

  async function loadMessages() {
    const snap = await getDocs(query(messagesRef, orderBy("ts", "desc")));
    const data: Message[] = snap.docs.map((d) => {
      const v = d.data() as DocumentData;
      return { id: d.id, text: String(v.text ?? ""), uid: String(v.uid ?? ""), ts: v.ts };
    });
    setItems(data);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold">EduTrain • Firebase Starter</h1>
          <div className="text-sm">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-slate-600">
                  Signed in as <b>{user.email}</b>
                </span>
                <button onClick={handleSignOut} className="underline">
                  Sign out
                </button>
              </div>
            ) : (
              <span className="text-slate-500">Not signed in</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        {!user ? (
          <AuthPanel
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            onSignUp={handleSignUp}
            onSignIn={handleSignIn}
          />
        ) : (
          <MessagesPanel
            text={text}
            setText={setText}
            addMessage={addMessage}
            loadMessages={loadMessages}
            items={items}
          />
        )}
      </main>
    </div>
  );
}

function AuthPanel(props: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  onSignUp: () => Promise<void>;
  onSignIn: () => Promise<void>;
}) {
  const { email, setEmail, password, setPassword, onSignUp, onSignIn } = props;
  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-3">
      <h2 className="text-xl font-semibold">Sign up / Sign in</h2>
      <input
        className="w-full border rounded p-2"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="w-full border rounded p-2"
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex gap-2">
        <button className="px-3 py-2 bg-black text-white rounded" onClick={onSignUp}>
          Sign up
        </button>
        <button className="px-3 py-2 border rounded" onClick={onSignIn}>
          Sign in
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Using <b>Auth + Firestore Emulators</b> in dev. Use any email/password.
      </p>
    </div>
  );
}

function MessagesPanel(props: {
  text: string;
  setText: (v: string) => void;
  addMessage: () => Promise<void>;
  loadMessages: () => Promise<void>;
  items: Message[];
}) {
  const { text, setText, addMessage, loadMessages, items } = props;
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Messages (Firestore)</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded p-2"
            placeholder="Type a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="px-3 py-2 bg-black text-white rounded" onClick={addMessage}>
            Add
          </button>
          <button className="px-3 py-2 border rounded" onClick={loadMessages}>
            Load
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {items.map((m) => (
            <li key={m.id} className="border rounded p-2 bg-slate-50">
              {m.text}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-slate-500">
        Data is stored in the <code>messages</code> collection. Tighten rules before production.
      </p>
    </div>
  );
}
