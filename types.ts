export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  FILL_IN_BLANK = 'fill_in_blank',
  SHORT_ANSWER = 'short_answer',
  MATCHING = 'matching',
  SEQUENCING = 'sequencing'
}

export interface UploadedFile {
  id: string;
  name: string;
  base64: string;
  mimeType: string;
}

export interface QuizConfig {
  documents: UploadedFile[];
  numQuestions: number;
  selectedTypes: QuestionType[];
  autoDetect: boolean;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  customInstructions?: string;
  timeLimit: number; // 0 means unlimited
}

export interface Question {
  id: number;
  type: QuestionType;
  text: string;
  options?: string[]; // For MCQ
  correctAnswer?: string; // Hidden from user during quiz
  // New fields for complex types
  matchingPairs?: { left: string; right: string }[]; 
  sequencingItems?: string[]; // The items in the CORRECT order
}

export interface UserAnswer {
  questionId: number;
  answer: string;
}

export interface GradedQuestion extends Question {
  userAnswer: string;
  isCorrect: boolean;
  score: number; // 0 to 1
  explanation: string;
  aiCorrection: string; // The specific correction or "Correct"
}

export interface QuizResult {
  totalScore: number;
  maxScore: number;
  gradedQuestions: GradedQuestion[];
  overallFeedback: string;
}

export type AppState = 'UPLOAD' | 'GENERATING' | 'QUIZ' | 'GRADING' | 'RESULTS';