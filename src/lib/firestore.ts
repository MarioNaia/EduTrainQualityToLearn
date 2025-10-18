import { db } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentReference,
  type Timestamp,
} from "firebase/firestore";

export type Quiz = {
  title: string;
  description: string;
  ownerUid: string;
  createdAt?: Timestamp | null;
};

export type Question = {
  prompt: string;
  choices: string[];
  answerIndex: number;
};

export type Session = {
  userUid: string;
  quizId: string;
  score: number;
  startedAt?: Timestamp | null;
  finishedAt?: Timestamp | null;
};

export async function createQuiz(
  ownerUid: string,
  title: string,
  description = ""
): Promise<DocumentReference> {
  return addDoc(collection(db, "quizzes"), {
    ownerUid,
    title,
    description,
    createdAt: serverTimestamp(),
  });
}

export async function addQuestion(
  quizId: string,
  q: Question
): Promise<DocumentReference> {
  return addDoc(collection(db, "quizzes", quizId, "questions"), q);
}

export async function listQuizzes(): Promise<Array<{ id: string } & Quiz>> {
  const snap = await getDocs(
    query(collection(db, "quizzes"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Quiz) }));
}

export async function getQuiz(
  quizId: string
): Promise<({ id: string } & Quiz) | null> {
  const d = await getDoc(doc(db, "quizzes", quizId));
  return d.exists() ? ({ id: d.id, ...(d.data() as Quiz) }) : null;
}

export async function getQuestions(
  quizId: string
): Promise<Array<{ id: string } & Question>> {
  const snap = await getDocs(collection(db, "quizzes", quizId, "questions"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Question) }));
}

export async function startSession(
  userUid: string,
  quizId: string,
  score = 0
): Promise<DocumentReference> {
  return addDoc(collection(db, "sessions"), {
    userUid,
    quizId,
    score,
    startedAt: serverTimestamp(),
  });
}

export async function finishSession(
  sessionId: string,
  score: number
): Promise<void> {
  await setDoc(
    doc(db, "sessions", sessionId),
    { score, finishedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function listMySessionsForQuiz(
  userUid: string,
  quizId: string
): Promise<Array<{ id: string } & Session>> {
  const snap = await getDocs(
    query(
      collection(db, "sessions"),
      where("userUid", "==", userUid),
      where("quizId", "==", quizId),
      orderBy("startedAt", "desc"),
      limit(20)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Session) }));
}
