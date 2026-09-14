export type Language = 'en' | 'bn' | 'ar';

export type LocalizedText = {
  en: string;
  bn: string;
  ar: string;
};

export type QuestionOption = {
  text: LocalizedText;
  image?: string;
};

export type Question = {
  id: string;
  question: LocalizedText;
  questionImage?: string;
  options: QuestionOption[];
  correctAnswer?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};
