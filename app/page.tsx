'use client';

import { useEffect, useMemo, useState } from 'react';
import { listQuestions, textForLanguage } from '../lib/firestore';
import { getGoogleDriveImageUrl } from '../lib/drive';
import { CircularLoader } from '../components/CircularLoader';
import type { Language, Question } from '../lib/types';

const labels = {
  en: { subtitle: 'Food Safety Practice Test', home: 'Home', title: 'Balady Food Safety Official Practice Exam', desc: 'Complete self-assessment exam covering municipal food safety, HACCP management, personal hygiene, and hazard control regulations.', total: 'Total Questions', time: 'Time Allocation', minute: '1 Min / Q', pass: 'Passing Mark', start: 'Start Timed Practice Exam', question: 'Question', timer: 'Timer:', previous: 'Previous', next: 'Next', submit: 'Submit Exam', loading: 'Loading questions from Firebase...', empty: 'No questions have been added yet.', passed: 'Congratulations! You Passed', failed: 'Test Not Passed', resultSubtitle: 'Minimum passing threshold is 70%. Review your incorrect answers and retry.', correct: 'Correct', wrong: 'Wrong', skipped: 'Skipped', score: 'Final Score Percentage', benchmark: 'Official Municipal Benchmark is 70%', review: 'Review Answers', retry: 'Retry Test', reviewTitle: 'Answer Review', yourAnswer: 'Your answer', correctAnswer: 'Correct answer', unanswered: 'Not answered', backResult: 'Back to Result' },
  bn: { subtitle: 'খাদ্য নিরাপত্তা অনুশীলন পরীক্ষা', home: 'হোম', title: 'বলদিয়া খাদ্য নিরাপত্তা অফিসিয়াল অনুশীলন পরীক্ষা', desc: 'পৌর খাদ্য নিরাপত্তা, HACCP ব্যবস্থাপনা, ব্যক্তিগত পরিচ্ছন্নতা এবং ঝুঁকি নিয়ন্ত্রণের সম্পূর্ণ মূল্যায়ন।', total: 'মোট প্রশ্ন', time: 'সময় বরাদ্দ', minute: '১ মিনিট / প্রশ্ন', pass: 'উত্তীর্ণের নম্বর', start: 'সময়ভিত্তিক অনুশীলন পরীক্ষা শুরু করুন', question: 'প্রশ্ন', timer: 'অবশিষ্ট সময়:', previous: 'পূর্ববর্তী', next: 'পরবর্তী', submit: 'পরীক্ষা জমা দিন', loading: 'প্রশ্ন লোড হচ্ছে...', empty: 'এখনও কোনো প্রশ্ন যোগ করা হয়নি।', passed: 'অভিনন্দন! আপনি উত্তীর্ণ হয়েছেন', failed: 'পরীক্ষায় উত্তীর্ণ হননি', resultSubtitle: 'উত্তীর্ণ হওয়ার ন্যূনতম সীমা ৭০%। ভুল উত্তরগুলো পর্যালোচনা করে আবার চেষ্টা করুন।', correct: 'সঠিক', wrong: 'ভুল', skipped: 'এড়িয়ে যাওয়া', score: 'চূড়ান্ত স্কোর শতাংশ', benchmark: 'সরকারি পৌরসভার মানদণ্ড ৭০%', review: 'উত্তর পর্যালোচনা', retry: 'আবার পরীক্ষা দিন', reviewTitle: 'উত্তর পর্যালোচনা', yourAnswer: 'আপনার উত্তর', correctAnswer: 'সঠিক উত্তর', unanswered: 'উত্তর দেওয়া হয়নি', backResult: 'ফলাফলে ফিরে যান' },
  ar: { subtitle: 'اختبار تدريبي لسلامة الأغذية', home: 'الرئيسية', title: 'اختبار ممارسة سلامة الأغذية الرسمي للبلدية', desc: 'اختبار شامل يغطي سلامة الأغذية البلدية ونظام الهاسب والنظافة الشخصية ومراقبة المخاطر.', total: 'إجمالي الأسئلة', time: 'الوقت المخصص', minute: 'دقيقة / سؤال 1', pass: 'درجة النجاح', start: 'بدء الاختبار التدريبي المؤقت', question: 'السؤال', timer: 'الوقت المتبقي:', previous: 'السابق', next: 'التالي', submit: 'إرسال الاختبار', loading: 'جار تحميل الأسئلة من Firebase...', empty: 'لم تتم إضافة أسئلة بعد.', passed: 'تهانينا! لقد نجحت', failed: 'لم تنجح في الاختبار', resultSubtitle: 'الحد الأدنى للنجاح هو 70٪. راجع إجاباتك غير الصحيحة وحاول مرة أخرى.', correct: 'صحيح', wrong: 'خطأ', skipped: 'متروك', score: 'النسبة النهائية', benchmark: 'المعيار الرسمي للبلدية هو 70٪', review: 'مراجعة الإجابات', retry: 'إعادة الاختبار', reviewTitle: 'مراجعة الإجابات', yourAnswer: 'إجابتك', correctAnswer: 'الإجابة الصحيحة', unanswered: 'لم تتم الإجابة', backResult: 'العودة إلى النتيجة' },
};

type Answer = number | string | null;

export default function HomePage() {
  const [language, setLanguage] = useState<Language>('bn');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [screen, setScreen] = useState<'start' | 'quiz' | 'result' | 'review'>('start');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draggedOption, setDraggedOption] = useState<number | null>(null);
  const t = labels[language];

  useEffect(() => {
    listQuestions().then((items) => { setQuestions(items); setAnswers(new Array(items.length).fill(null)); setSeconds(items.length * 60); }).catch(() => setError('Unable to load questions. Check Firebase configuration.')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { if (screen !== 'quiz' || seconds <= 0) return; const timer = window.setInterval(() => setSeconds((value) => value - 1), 1000); return () => window.clearInterval(timer); }, [screen, seconds]);
  useEffect(() => { if (screen === 'quiz' && seconds === 0 && questions.length) setScreen('result'); }, [screen, seconds, questions.length]);

  const currentQuestion = questions[current];
  const progress = questions.length ? ((current + 1) / questions.length) * 100 : 0;
  const score = useMemo(() => answers.reduce<number>((total, answer, index) => total + (answer !== null && answer === questions[index]?.correctAnswer ? 1 : 0), 0), [answers, questions]);
  const answered = answers.filter((answer) => answer !== null).length;
  const wrong = answered - score;
  const skipped = questions.length - answered;
  const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const passed = percentage >= 70;
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');

  function switchLanguage(next: Language) { setLanguage(next); document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = next; }
  function startQuiz() { setAnswers(new Array(questions.length).fill(null)); setCurrent(0); setSeconds(questions.length * 60); setScreen('quiz'); }
  function rearrangedOrder(question: Question, answer: Answer) {
    if (question.questionType !== 'rearrange' || typeof answer !== 'string') return question.options.map((_, index) => index);
    const order = answer.split('').map((value) => Number(value) - 1);
    return order.length === question.options.length && new Set(order).size === order.length && order.every((index) => index >= 0 && index < question.options.length) ? order : question.options.map((_, index) => index);
  }
  function setRearrangedOrder(order: number[]) { setAnswers((old) => old.map((answer, index) => index === current ? order.map((optionIndex) => optionIndex + 1).join('') : answer)); }
  function answerText(question: Question, answer: Answer) {
    if (answer === null) return t.unanswered;
    if (question.questionType === 'rearrange' && typeof answer === 'string') return rearrangedOrder(question, answer).map((index) => textForLanguage(question.options[index].text, language)).join(' → ');
    return typeof answer === 'number' ? textForLanguage(question.options[answer]?.text, language) : t.unanswered;
  }

  if (loading) return <Shell language={language} setLanguage={switchLanguage} t={t}><div className="panel start-panel"><CircularLoader label={t.loading} /></div></Shell>;
  if (error) return <Shell language={language} setLanguage={switchLanguage} t={t}><div className="panel start-panel"><div className="notice error">{error}</div></div></Shell>;
  if (!questions.length) return <Shell language={language} setLanguage={switchLanguage} t={t}><div className="panel start-panel"><div className="icon-box">!</div><p>{t.empty}</p><a className="admin-link" href="/admin">Admin Panel</a></div></Shell>;

  return <Shell language={language} setLanguage={switchLanguage} t={t}>
    {screen === 'start' && <div className="panel start-panel"><div className="icon-box">✓</div><h2>{t.title}</h2><p className="subtitle">{t.desc}</p><div className="stats"><div className="stat"><small>{t.total}</small><strong>{questions.length}</strong></div><div className="stat"><small>{t.time}</small><strong>{t.minute}</strong></div><div className="stat"><small>{t.pass}</small><strong>70%</strong></div></div><button className="primary" onClick={startQuiz}>{t.start} →</button></div>}
    {screen === 'quiz' && currentQuestion && <div className="panel quiz-panel"><div className="quiz-top"><div><span className="badge">{t.question}</span> <span className="counter">{current + 1} / {questions.length}</span></div><div className="timer">◷ {t.timer} {minutes}:{remainder}</div><div className="progress"><span style={{ width: `${progress}%` }} /></div></div><div className="quiz-body"><h3>{current + 1}. {textForLanguage(currentQuestion.question, language)}</h3>{currentQuestion.questionImage && <img className="question-image" src={getGoogleDriveImageUrl(currentQuestion.questionImage)} alt="Question" onError={(e) => (e.currentTarget.style.display = 'none')} />}{currentQuestion.questionType === 'rearrange' ? <RearrangeOptions question={currentQuestion} language={language} order={rearrangedOrder(currentQuestion, answers[current])} draggedOption={draggedOption} setDraggedOption={setDraggedOption} onReorder={setRearrangedOrder} /> : <div className="options">{currentQuestion.options.map((option, index) => <button key={index} className={`option ${answers[current] === index ? 'selected' : ''}`} onClick={() => setAnswers((old) => old.map((answer, item) => item === current ? index : answer))}><span className="option-key">{String.fromCharCode(65 + index)}</span><span>{textForLanguage(option.text, language)}{option.image && <img className="option-image" src={getGoogleDriveImageUrl(option.image)} alt="Option" onError={(e) => (e.currentTarget.style.display = 'none')} />}</span></button>)}</div>}</div><div className="quiz-footer"><button className="secondary" disabled={current === 0} onClick={() => setCurrent((value) => value - 1)}>← {t.previous}</button><button className="primary" onClick={() => current === questions.length - 1 ? setScreen('result') : setCurrent((value) => value + 1)}>{current === questions.length - 1 ? t.submit : t.next} →</button></div></div>}
    {screen === 'result' && <div className="panel result-panel"><div className={`result-icon ${passed ? 'passed' : 'failed'}`}>{passed ? '✓' : '!'}</div><h2>{passed ? t.passed : t.failed}</h2><p className="subtitle">{t.resultSubtitle}</p><div className="result-stats"><div className="result-stat total"><small>{t.total}</small><strong>{questions.length}</strong></div><div className="result-stat correct"><small>{t.correct}</small><strong>{score}</strong></div><div className="result-stat wrong"><small>{t.wrong}</small><strong>{wrong}</strong></div><div className="result-stat skipped"><small>{t.skipped}</small><strong>{skipped}</strong></div></div><div className="score-summary"><div><strong>{t.score}</strong><small>{t.benchmark}</small></div><b>{percentage}%</b></div><div className="result-actions"><button className="secondary" onClick={() => setScreen('review')}>☷ {t.review}</button><button className="primary" onClick={startQuiz}>↻ {t.retry}</button><a className="secondary" href="/">⌂ {t.home}</a></div></div>}
    {screen === 'review' && <div className="panel review-panel"><div className="review-heading"><div><h2>{t.reviewTitle}</h2><p className="subtitle">{score} {t.correct.toLowerCase()} / {questions.length}</p></div><button className="secondary" onClick={() => setScreen('result')}>{t.backResult}</button></div><div className="review-list">{questions.map((question, index) => { const selected = answers[index]; const isCorrect = selected !== null && selected === question.correctAnswer; return <article className={`review-item ${selected === null ? 'skipped' : isCorrect ? 'correct' : 'wrong'}`} key={question.id}><div className="review-item-top"><strong>{index + 1}. {textForLanguage(question.question, language)}</strong><span>{selected === null ? t.skipped : isCorrect ? t.correct : t.wrong}</span></div><p><b>{t.yourAnswer}:</b> {answerText(question, selected)}</p><p><b>{t.correctAnswer}:</b> {question.correctAnswer === undefined ? t.unanswered : answerText(question, question.correctAnswer)}</p></article>; })}</div></div>}
  </Shell>;
}

function RearrangeOptions({ question, language, order, draggedOption, setDraggedOption, onReorder }: { question: Question; language: Language; order: number[]; draggedOption: number | null; setDraggedOption: (index: number | null) => void; onReorder: (order: number[]) => void }) {
  return <div className="rearrange-options">{order.map((optionIndex, position) => <div className="rearrange-option" key={optionIndex} draggable onDragStart={() => setDraggedOption(position)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedOption === null || draggedOption === position) return; const next = [...order]; const [moved] = next.splice(draggedOption, 1); next.splice(position, 0, moved); onReorder(next); setDraggedOption(null); }} onDragEnd={() => setDraggedOption(null)}><span className="drag-handle" aria-hidden="true">☷</span><span className="option-key">{position + 1}</span><span>{textForLanguage(question.options[optionIndex].text, language)}{question.options[optionIndex].image && <img className="option-image" src={getGoogleDriveImageUrl(question.options[optionIndex].image)} alt="Option" onError={(e) => (e.currentTarget.style.display = 'none')} />}</span></div>)}</div>;
}

function Shell({ children, language, setLanguage, t }: { children: React.ReactNode; language: Language; setLanguage: (language: Language) => void; t: typeof labels.en }) {
  return <div className="app"><header className="header"><div className="header-inner"><a className="brand" href="/"><div className="brand-mark">🏛️</div><div><h1>Balady Exam</h1><p>{t.subtitle}</p></div></a><div className="controls"><div className="lang-switch">{(['en', 'bn', 'ar'] as Language[]).map((item) => <button key={item} className={language === item ? 'active' : ''} onClick={() => setLanguage(item)}>{item.toUpperCase()}</button>)}</div><a className="home-button" href="/admin">Admin</a></div></div></header><main className="main">{children}</main></div>;
}
