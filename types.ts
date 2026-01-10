
export interface ReadingDay {
  dayNumber: number;
  startPage: number;
  endPage: number;
  isCompleted: boolean;
  quizScore?: number;
  timeSpentSeconds?: number;
  quiz?: QuizQuestion[];
  userAnswers?: number[]; // Novo: armazena os índices das respostas escolhidas
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface MindMapNode {
  label: string;
  children?: MindMapNode[];
}

export interface StudyMaterials {
  summary: string;
  mindMap: MindMapNode;
  infographic: {
    icon: string;
    title: string;
    description: string;
  }[];
}

export interface ReadingPlan {
  id: string;
  fileName: string; 
  originalFileName: string; 
  totalPages: number;
  days: ReadingDay[];
  currentDayIndex: number;
  pdfData: string;
  lastAccessed: number;
  storagePath?: string;
  user_id?: string;
}

export interface User {
  id: string;
  email: string;
  plans: ReadingPlan[];
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface PendingPdf {
  name: string;
  data: string;
  totalPages: number;
  fileBlob?: Blob;
}

export interface AppState {
  currentUser: User | null;
  activePlanId: string | null;
  currentView: 'auth' | 'library' | 'dashboard' | 'reader' | 'quiz' | 'stats' | 'page-selector' | 'admin' | 'settings';
  isGeneratingQuiz: boolean;
  currentQuiz: QuizQuestion[] | null;
  theme: ThemeMode;
  pendingPdf: PendingPdf | null;
  lastSessionTime?: number;
  quizReviewMode?: boolean; // Novo: controla se estamos apenas visualizando um quiz feito
  reviewAnswers?: number[]; // Novo: respostas do usuário para o modo revisão
}
