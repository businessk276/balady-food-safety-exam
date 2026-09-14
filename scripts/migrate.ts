import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

type SourceQuestion = {
  question?: string;
  questionText?: string;
  questionBn?: string;
  questionAr?: string;
  questionImage?: string;
  options?: Array<string | { text?: string; textBn?: string; textAr?: string; image?: string }>;
  optionsBn?: string[];
  optionsAr?: string[];
  correctAnswer?: number;
};

function adminApp() {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing from .env');
  const credentials = JSON.parse(serviceAccount);
  return getApps().length ? getApps()[0] : initializeApp({ credential: cert(credentials) });
}

function localized(en: string, bn?: string, ar?: string) {
  return { en, bn: bn || en, ar: ar || en };
}

async function main() {
  const source = JSON.parse(await readFile(new URL('../MCQ.json', import.meta.url), 'utf8')) as SourceQuestion[];
  const db = getFirestore(adminApp());
  const batchLimit = 400;
  for (let start = 0; start < source.length; start += batchLimit) {
    const batch = db.batch();
    const chunk = source.slice(start, start + batchLimit);
    chunk.forEach((item, offset) => {
      const index = start + offset;
      const reference = db.collection('questions').doc(`question-${String(index + 1).padStart(4, '0')}`);
      const questionText = String(item.questionText ?? item.question ?? '');
      const options = (item.options ?? []).map((option, optionIndex) => {
        if (typeof option === 'string') return { text: localized(option, item.optionsBn?.[optionIndex], item.optionsAr?.[optionIndex]), image: '' };
        return { text: localized(String(option.text ?? ''), option.textBn, option.textAr), image: option.image ?? '' };
      });
      batch.set(reference, {
        question: localized(questionText, item.questionBn, item.questionAr),
        questionImage: item.questionImage ?? '',
        options,
        correctAnswer: typeof item.correctAnswer === 'number' ? item.correctAnswer : null,
        sourceIndex: index,
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      }, { merge: true });
    });
    await batch.commit();
    console.log(`Imported ${Math.min(start + chunk.length, source.length)}/${source.length}`);
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
