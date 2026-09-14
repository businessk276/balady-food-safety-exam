import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Language, LocalizedText, Question, QuestionOption } from './types';

const questionsCollection = collection(db, 'questions');

function localizedText(value: unknown): LocalizedText {
  if (typeof value === 'string') return { en: value, bn: value, ar: value };
  const record = (value ?? {}) as Record<string, unknown>;
  const en = String(record.en ?? '');
  return { en, bn: String(record.bn ?? en), ar: String(record.ar ?? en) };
}

export function normalizeQuestion(id: string, data: Record<string, unknown>): Question {
  const rawOptions = Array.isArray(data.options) ? data.options : [];
  const options: QuestionOption[] = rawOptions.map((option) => {
    const item = (option ?? {}) as Record<string, unknown>;
    return { text: localizedText(item.text), image: typeof item.image === 'string' ? item.image : '' };
  });
  const parsedCorrectAnswer = typeof data.correctAnswer === 'number' ? data.correctAnswer : Number(data.correctAnswer);
  return {
    id,
    question: localizedText(data.question ?? data.questionText),
    questionImage: typeof data.questionImage === 'string' ? data.questionImage : '',
    options,
    correctAnswer: Number.isInteger(parsedCorrectAnswer) ? parsedCorrectAnswer : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function listQuestions(): Promise<Question[]> {
  const snapshot = await getDocs(query(questionsCollection, orderBy('createdAt', 'asc')));
  return snapshot.docs.map((item) => normalizeQuestion(item.id, item.data() as Record<string, unknown>));
}

export async function saveQuestion(question: Omit<Question, 'id'>, id?: string) {
  const reference = id ? doc(db, 'questions', id) : doc(questionsCollection);
  await setDoc(reference, {
    question: question.question,
    questionImage: question.questionImage ?? '',
    options: question.options,
    correctAnswer: question.correctAnswer ?? null,
    ...(id ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
  }, { merge: Boolean(id) });
  return reference.id;
}

export async function removeQuestion(id: string) {
  await deleteDoc(doc(db, 'questions', id));
}

export function textForLanguage(text: LocalizedText, language: Language) {
  return text[language] || text.en;
}
