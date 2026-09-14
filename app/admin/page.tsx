'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { listQuestions, removeQuestion, saveQuestion } from '../../lib/firestore';
import { getGoogleDriveImageUrl } from '../../lib/drive';
import { CircularLoader } from '../../components/CircularLoader';
import type { LocalizedText, Question, QuestionOption, QuestionType } from '../../lib/types';

const emptyText = (): LocalizedText => ({ en: '', bn: '', ar: '' });
const emptyOption = (): QuestionOption => ({ text: emptyText(), image: '' });
const trueFalseOptions = (): QuestionOption[] => [
  { text: { en: 'True', bn: 'সত্য', ar: 'صحيح' }, image: '' },
  { text: { en: 'False', bn: 'মিথ্যা', ar: 'خطأ' }, image: '' },
];
const emptyQuestion = (): Omit<Question, 'id'> => ({ question: emptyText(), questionImage: '', options: [emptyOption(), emptyOption()], questionType: 'normal', correctAnswer: 0 });

function defaultCorrectAnswer(question: Question, options: QuestionOption[]) {
  if (question.questionType === 'rearrange') return typeof question.correctAnswer === 'string' ? question.correctAnswer : options.map((_, index) => index + 1).join('');
  return typeof question.correctAnswer === 'number' && question.correctAnswer >= 0 && question.correctAnswer < options.length
    ? question.correctAnswer
    : 0;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [adminChecked, setAdminChecked] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [draft, setDraft] = useState<Omit<Question, 'id'> | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => onAuthStateChanged(auth, async (nextUser) => {
    if (!nextUser) { setUser(null); setAdminChecked(true); return; }
    const token = await nextUser.getIdTokenResult(true);
    if (token.claims.admin !== true) {
      await signOut(auth);
      setUser(null);
      setNotice({ type: 'error', text: 'This account is not an authorized admin.' });
    } else {
      setUser(nextUser);
    }
    setAdminChecked(true);
  }), []);
  useEffect(() => { if (user) refresh(); }, [user]);

  async function refresh() {
    setBusy(true);
    try { setQuestions(await listQuestions()); } catch { setNotice({ type: 'error', text: 'Unable to read questions. Check Firestore rules and configuration.' }); } finally { setBusy(false); }
  }

  async function login(event: React.FormEvent) {
    event.preventDefault(); setNotice(null); setBusy(true);
    try { await signInWithEmailAndPassword(auth, email, password); setPassword(''); } catch { setNotice({ type: 'error', text: 'Login failed. Use the Firebase Auth admin account.' }); } finally { setBusy(false); }
  }

  function updateDraft(updater: (draft: Omit<Question, 'id'>) => Omit<Question, 'id'>) { setDraft((value) => value ? updater(value) : value); }
  function updateQuestionText(language: keyof LocalizedText, text: string) { updateDraft((value) => ({ ...value, question: { ...value.question, [language]: text } })); }
  function updateOption(index: number, language: keyof LocalizedText, text: string) { updateDraft((value) => ({ ...value, options: value.options.map((option, item) => item === index ? { ...option, text: { ...option.text, [language]: text } } : option) })); }
  function updateOptionImage(index: number, image: string) { updateDraft((value) => ({ ...value, options: value.options.map((option, item) => item === index ? { ...option, image } : option) })); }
  function updateCorrectAnswer(answer: number) { updateDraft((value) => ({ ...value, correctAnswer: answer })); }
  function updateQuestionType(questionType: QuestionType) {
    updateDraft((value) => ({ ...value, questionType, correctAnswer: questionType === 'rearrange' ? value.options.map((_, index) => index + 1).join('') : 0 }));
  }

  async function submitQuestion(event: React.FormEvent) {
    event.preventDefault(); if (!draft) return;
    if (draft.questionType === 'rearrange') {
      const answer = typeof draft.correctAnswer === 'string' ? draft.correctAnswer : '';
      const expected = draft.options.map((_, index) => String(index + 1)).join('');
      if (answer.length !== expected.length || new Set(answer).size !== answer.length || [...answer].some((value) => !expected.includes(value))) {
        setNotice({ type: 'error', text: `Rearrange answer must use each option number exactly once: ${expected}.` });
        return;
      }
    }
    setBusy(true); setNotice(null);
    try { await saveQuestion(draft, editingId); setNotice({ type: 'success', text: editingId ? 'Question updated.' : 'Question added.' }); setDraft(null); setEditingId(undefined); await refresh(); } catch { setNotice({ type: 'error', text: 'Save failed. Confirm this account has the admin custom claim.' }); } finally { setBusy(false); }
  }

  async function deleteQuestion(id: string) {
    if (!window.confirm('Delete this question permanently?')) return;
    setBusy(true); try { await removeQuestion(id); setQuestions((items) => items.filter((item) => item.id !== id)); setNotice({ type: 'success', text: 'Question deleted.' }); } catch { setNotice({ type: 'error', text: 'Delete failed.' }); } finally { setBusy(false); }
  }

  function ImagePreview({ src }: { src: string | undefined }) {
    if (!src) return null;
    const imageUrl = getGoogleDriveImageUrl(src);
    return <div className="image-preview"><img src={imageUrl} alt="Preview" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }} /></div>;
  }

  function updateQuestionImage(image: string) { updateDraft((value) => ({ ...value, questionImage: image })); }

  if (!adminChecked) return <main className="main"><div className="panel start-panel"><CircularLoader label="Checking admin access..." /></div></main>;
  if (!user) return <main className="main"><div className="panel start-panel" style={{ maxWidth: 440 }}><div className="icon-box">🔐</div><h2>Admin Login</h2><p className="subtitle">Sign in with the Firebase Authentication admin account.</p>{notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}<form className="form-grid" onSubmit={login}><div className="field"><label>Email</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="field"><label>Password</label><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div><button className="primary" disabled={busy}>{busy ? 'Signing in...' : 'Sign In'}</button></form><a className="admin-link" href="/">← Back to exam</a></div></main>;

  if (draft) return <main className="main"><div className="panel admin-panel admin-form"><div className="admin-heading"><h2>{editingId ? 'Edit Question' : 'Add Question'}</h2><button className="secondary" type="button" onClick={() => { setDraft(null); setEditingId(undefined); }}>Cancel</button></div>{notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}<form className="form-grid" onSubmit={submitQuestion}><div className="field"><label>Question (English)</label><textarea rows={3} value={draft.question.en} onChange={(event) => updateQuestionText('en', event.target.value)} required /></div><div className="field"><label>Question (Bangla)</label><textarea rows={2} value={draft.question.bn} onChange={(event) => updateQuestionText('bn', event.target.value)} /></div><div className="field"><label>Question (Arabic)</label><textarea rows={2} dir="rtl" value={draft.question.ar} onChange={(event) => updateQuestionText('ar', event.target.value)} /></div><div className="field"><label>Question image URL (optional)</label><input value={draft.questionImage ?? ''} onChange={(event) => updateDraft((value) => ({ ...value, questionImage: event.target.value }))} placeholder="Google Drive link or image URL" /><p className="help-text">📎 Paste a Google Drive sharing link: https://drive.google.com/file/d/FILE_ID/view?usp=sharing</p><ImagePreview src={draft.questionImage} /></div><h3>Options</h3>{draft.options.map((option, index) => <div className="option-editor" key={index}><div className="field"><label>Option {index + 1} English</label><input value={option.text.en} onChange={(event) => updateOption(index, 'en', event.target.value)} required /></div><div className="field"><label>Bangla / Arabic</label><input value={option.text.bn} onChange={(event) => updateOption(index, 'bn', event.target.value)} placeholder="Bangla text" /><input value={option.text.ar} onChange={(event) => updateOption(index, 'ar', event.target.value)} placeholder="Arabic text" dir="rtl" /></div><div className="field"><label>Image URL</label><input value={option.image ?? ''} onChange={(event) => updateOptionImage(index, event.target.value)} placeholder="Optional Google Drive link or image URL" /><p className="help-text">📎 Google Drive: https://drive.google.com/file/d/FILE_ID/view</p><ImagePreview src={option.image} /><button className="danger" type="button" onClick={() => updateDraft((value) => { const options = value.options.filter((_, item) => item !== index); const correctAnswer = value.questionType === 'rearrange' ? options.map((_, item) => item + 1).join('') : value.correctAnswer === index ? 0 : value.correctAnswer !== undefined && typeof value.correctAnswer === 'number' && value.correctAnswer > index ? value.correctAnswer - 1 : value.correctAnswer; return { ...value, options, correctAnswer }; })}>Remove</button></div></div>)}<div className="field"><label htmlFor="question-type">Question Type</label><select id="question-type" value={draft.questionType ?? 'normal'} onChange={(event) => updateQuestionType(event.target.value as QuestionType)}><option value="normal">Normal</option><option value="rearrange">Rearrange</option></select></div><div className="field"><label htmlFor="correct-answer">Correct answer</label>{draft.questionType === 'rearrange' ? <input id="correct-answer" value={typeof draft.correctAnswer === 'string' ? draft.correctAnswer : ''} onChange={(event) => updateDraft((value) => ({ ...value, correctAnswer: event.target.value.replace(/[^1-9]/g, '') }))} pattern={`[1-${draft.options.length}]{${draft.options.length}}`} placeholder="Example: 3142" required /> : <select id="correct-answer" value={draft.correctAnswer ?? ''} onChange={(event) => updateCorrectAnswer(Number(event.target.value))} required><option value="" disabled>Select the correct option</option>{draft.options.map((option, index) => <option key={index} value={index}>Option {index + 1}: {option.text.en || '(empty)'} | {option.text.bn || '(বাংলা নেই)'}</option>)}</select>}</div><button className="secondary" type="button" onClick={() => updateDraft((value) => ({ ...value, options: [...value.options, emptyOption()], correctAnswer: value.questionType === 'rearrange' ? `${value.correctAnswer ?? ''}${value.options.length + 1}` : value.correctAnswer }))}>+ Add option</button><button className="primary" disabled={busy}>{busy ? 'Saving...' : 'Save Question'}</button></form></div></main>;

  return <main className="main"><div className="panel admin-panel"><div className="admin-heading"><div><h2>Question Management</h2><small>{questions.length} questions in Firestore</small></div><div className="row-actions"><button className="primary" onClick={() => { setDraft(emptyQuestion()); setNotice(null); }}>+ Add Question</button><button className="secondary" type="button" onClick={() => window.location.href = '/'}>🏠 Home</button><button className="secondary" onClick={() => signOut(auth)}>Sign out</button></div></div>{notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}{busy && <CircularLoader label="Working..." />}<div className="question-list">{questions.map((question, index) => <div className="question-row" key={question.id}><div><p><strong>{index + 1}.</strong> {question.question.en}</p><p className="question-bangla">{question.question.bn}</p><small>{question.options.length} options</small></div><button className="secondary" onClick={() => { const options = question.options.length ? question.options : trueFalseOptions(); setEditingId(question.id); setDraft({ ...question, options, correctAnswer: defaultCorrectAnswer(question, options) }); }}>Edit</button><button className="danger" onClick={() => deleteQuestion(question.id)}>Delete</button></div>)}</div><a className="admin-link" href="/">← Open public exam</a></div></main>;
}
