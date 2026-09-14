'use client';

import { useEffect, useMemo, useState } from 'react';
import { listQuestions, textForLanguage } from '../lib/firestore';
import { getGoogleDriveImageUrl } from '../lib/drive';
import { CircularLoader } from '../components/CircularLoader';
import type { Language, Question } from '../lib/types';

const labels = {
  en: { subtitle: 'Food Safety Practice Test', home: 'Home', title: 'Balady Food Safety Official Practice Exam', desc: 'Complete self-assessment exam covering municipal food safety, HACCP management, personal hygiene, and hazard control regulations.', total: 'Total Questions', time: 'Time Allocation', minute: '1 Min / Q', pass: 'Passing Mark', start: 'Start Timed Practice Exam', question: 'Question', timer: 'Timer:', previous: 'Previous', next: 'Next', submit: 'Submit Exam', loading: 'Loading questions from Firebase...', empty: 'No questions have been added yet.' },
  bn: { subtitle: 'খাদ্য নিরাপত্তা অনুশীলন পরীক্ষা', home: 'হোম', title: 'বলদিয়া খাদ্য নিরাপত্তা অফিসিয়াল অনুশীলন পরীক্ষা', desc: 'পৌর খাদ্য নিরাপত্তা, HACCP ব্যবস্থাপনা, ব্যক্তিগত পরিচ্ছন্নতা এবং ঝুঁকি নিয়ন্ত্রণের সম্পূর্ণ মূল্যায়ন।', total: 'মোট প্রশ্ন', time: 'সময় বরাদ্দ', minute: '১ মিনিট / প্রশ্ন', pass: 'উত্তীর্ণের নম্বর', start: 'সময়ভিত্তিক অনুশীলন পরীক্ষা শুরু করুন', question: 'প্রশ্ন', timer: 'অবশিষ্ট সময়:', previous: 'পূর্ববর্তী', next: 'পরবর্তী', submit: 'পরীক্ষা জমা দিন', loading: 'Firebase থেকে প্রশ্ন লোড হচ্ছে...', empty: 'এখনও কোনো প্রশ্ন যোগ করা হয়নি।' },
  ar: { subtitle: 'اختبار تدريبي لسلامة الأغذية', home: 'الرئيسية', title: 'اختبار ممارسة سلامة الأغذية الرسمي للبلدية', desc: 'اختبار شامل يغطي سلامة الأغذية البلدية ونظام الهاسب والنظافة الشخصية ومراقبة المخاطر.', total: 'إجمالي الأسئلة', time: 'الوقت المخصص', minute: 'دقيقة / سؤال 1', pass: 'درجة النجاح', start: 'بدء الاختبار التدريبي المؤقت', question: 'السؤال', timer: 'الوقت المتبقي:', previous: 'السابق', next: 'التالي', submit: 'إرسال الاختبار', loading: 'جار تحميل الأسئلة من Firebase...', empty: 'لم تتم إضافة أسئلة بعد.' },
};

export default function HomePage() {
  const [language, setLanguage] = useState<Language>('bn');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [screen, setScreen] = useState<'start' | 'quiz' | 'result'>('start');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const t = labels[language];

  useEffect(() => {
    listQuestions().then((items) => {
      setQuestions(items);
      setAnswers(new Array(items.length).fill(null));
      setSeconds(items.length * 60);
    }).catch(() => setError('Unable to load questions. Check Firebase configuration.')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (screen !== 'quiz' || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [screen, seconds]);

  useEffect(() => {
    if (screen === 'quiz' && seconds === 0 && questions.length) setScreen('result');
  }, [screen, seconds, questions.length]);

  const currentQuestion = questions[current];
  const progress = questions.length ? ((current + 1) / questions.length) * 100 : 0;
  const score = useMemo(() => answers.reduce<number>((total, answer, index) => total + (answer !== null && answer === questions[index]?.correctAnswer ? 1 : 0), 0), [answers, questions]);
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');

  function switchLanguage(next: Language) {
    setLanguage(next);
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
  }

  function startQuiz() {
    setAnswers(new Array(questions.length).fill(null));
    setCurrent(0);
    setSeconds(questions.length * 60);
    setScreen('quiz');
  }

  if (loading) return <Shell language={language} setLanguage={switchLanguage} t={t}><div className="panel start-panel"><CircularLoader label={t.loading} /></div></Shell>;
  if (error) return <Shell language={language} setLanguage={switchLanguage} t={t}><div className="panel start-panel"><div className="notice error">{error}</div></div></Shell>;
  if (!questions.length) return <Shell language={language} setLanguage={switchLanguage} t={t}><div className="panel start-panel"><div className="icon-box">!</div><p>{t.empty}</p><a className="admin-link" href="/admin">Admin Panel</a></div></Shell>;

  return <Shell language={language} setLanguage={switchLanguage} t={t}>
    {screen === 'start' && <div className="panel start-panel">
      <div className="icon-box">✓</div><h2>{t.title}</h2><p className="subtitle">{t.desc}</p>
      <div className="stats"><div className="stat"><small>{t.total}</small><strong>{questions.length}</strong></div><div className="stat"><small>{t.time}</small><strong>{t.minute}</strong></div><div className="stat"><small>{t.pass}</small><strong>70%</strong></div></div>
      <button className="primary" onClick={startQuiz}>{t.start} →</button>
    </div>}
    {screen === 'quiz' && currentQuestion && <div className="panel quiz-panel">
      <div className="quiz-top"><div><span className="badge">{t.question}</span> <span className="counter">{current + 1} / {questions.length}</span></div><div className="timer">◷ {t.timer} {minutes}:{remainder}</div><div className="progress"><span style={{ width: `${progress}%` }} /></div></div>
      <div className="quiz-body"><h3>{current + 1}. {textForLanguage(currentQuestion.question, language)}</h3>{currentQuestion.questionImage && <img className="question-image" src={getGoogleDriveImageUrl(currentQuestion.questionImage)} alt="Question" onError={(e) => (e.currentTarget.style.display = 'none')} />}
        <div className="options">{currentQuestion.options.map((option, index) => <button key={index} className={`option ${answers[current] === index ? 'selected' : ''}`} onClick={() => setAnswers((old) => old.map((answer, item) => item === current ? index : answer))}><span className="option-key">{String.fromCharCode(65 + index)}</span><span>{textForLanguage(option.text, language)}{option.image && <img className="option-image" src={getGoogleDriveImageUrl(option.image)} alt="Option" onError={(e) => (e.currentTarget.style.display = 'none')} />}</span></button>)}</div>
      </div><div className="quiz-footer"><button className="secondary" disabled={current === 0} onClick={() => setCurrent((value) => value - 1)}>← {t.previous}</button><button className="primary" onClick={() => current === questions.length - 1 ? setScreen('result') : setCurrent((value) => value + 1)}>{current === questions.length - 1 ? t.submit : t.next} →</button></div>
    </div>}
    {screen === 'result' && <div className="panel result-panel"><div className="icon-box">✓</div><h2>{score >= questions.length * .7 ? 'Congratulations! You Passed' : 'Test Not Passed'}</h2><p className="subtitle">{score} correct out of {questions.length} questions.</p><button className="primary" onClick={startQuiz}>Retry Test</button></div>}
  </Shell>;
}

function Shell({ children, language, setLanguage, t }: { children: React.ReactNode; language: Language; setLanguage: (language: Language) => void; t: typeof labels.en }) {
  return <div className="app"><header className="header"><div className="header-inner"><div className="brand"><div className="brand-mark">🏛️</div><div><h1>Balady Exam</h1><p>{t.subtitle}</p></div></div><div className="controls"><div className="lang-switch">{(['en', 'bn', 'ar'] as Language[]).map((item) => <button key={item} className={language === item ? 'active' : ''} onClick={() => setLanguage(item)}>{item.toUpperCase()}</button>)}</div><a className="home-button" href="/admin">Admin</a></div></div></header><main className="main">{children}</main></div>;
}
