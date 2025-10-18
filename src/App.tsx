import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "./firebase";

import CreateQuiz from "./components/CreateQuiz";
import AddQuestion from "./components/AddQuestion";
import QuizList from "./components/QuizList";
import PlayQuiz from "./components/PlayQuiz";
import Results from "./components/Results";
import MyHistory from "./components/MyHistory";
import GenerateFromLesson from "./components/GenerateFromLesson";

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password123");
  const [view, setView] = useState<
    "home" | "builder" | "play" | "results" | "history" | "generate"
  >("home");
  const [activeQuiz, setActiveQuiz] = useState<string>("");
  const [activeQuizTitle, setActiveQuizTitle] = useState<string>("");
  const [lastResult, setLastResult] = useState<{
    score: number;
    total: number;
    title: string;
  } | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  async function handleSignUp() {
    await createUserWithEmailAndPassword(auth, email, password);
  }
  async function handleSignIn() {
    await signInWithEmailAndPassword(auth, email, password);
  }
  async function handleSignOut() {
    await signOut(auth);
    setView("home");
    setActiveQuiz("");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold">EduTrain • QuizQuest</h1>
          <nav className="flex items-center gap-3 text-sm">
            <button className="underline" onClick={() => setView("home")}>
              Home
            </button>
            {user && (
              <>
                <button className="underline" onClick={() => setView("builder")}>
                  Build
                </button>
                <button className="underline" onClick={() => setView("generate")}>
                  Generate
                </button>
              </>
            )}
            <span className="mx-2 text-slate-400">|</span>
            {user ? (
              <>
                <span className="text-slate-600">
                  Signed in as <b>{user.email}</b>
                </span>
                <button className="underline" onClick={handleSignOut}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <input
                  className="border rounded p-1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email"
                />
                <input
                  className="border rounded p-1"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                />
                <button
                  className="px-2 py-1 bg-black text-white rounded"
                  onClick={handleSignUp}
                >
                  Sign up
                </button>
                <button className="px-2 py-1 border rounded" onClick={handleSignIn}>
                  Sign in
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {view === "home" && (
          <QuizList
            onSelect={(id) => {
              setActiveQuiz(id);
              setView("play");
            }}
          />
        )}

        {view === "builder" && user && (
          <>
            <CreateQuiz
              onCreated={(id) => {
                setActiveQuiz(id);
              }}
            />
            {activeQuiz && <AddQuestion quizId={activeQuiz} />}
          </>
        )}

        {view === "generate" && user && (
          <GenerateFromLesson
            onCreated={(id) => {
              setActiveQuiz(id);
              setView("builder");
            }}
          />
        )}

        {view === "play" && activeQuiz && (
          <PlayQuiz
            quizId={activeQuiz}
            onDone={(r) => {
              setLastResult(r);
              setActiveQuizTitle(r.title);
              setView("results");
            }}
          />
        )}

        {view === "results" && lastResult && (
          <Results
            title={lastResult.title}
            correct={lastResult.score}
            total={lastResult.total}
            onHome={() => setView("home")}
            onReplay={() => setView("play")}
            onHistory={() => setView("history")}
          />
        )}

        {view === "history" && activeQuiz && (
          <MyHistory
            quizId={activeQuiz}
            title={activeQuizTitle || lastResult?.title || "Quiz"}
            onBack={() => setView("results")}
          />
        )}
      </main>
    </div>
  );
}
