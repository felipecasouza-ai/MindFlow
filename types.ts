
export interface ReadingDay {
  dayNumber: number;
  startPage: number;
  endPage: number;
  isCompleted: boolean;
  quizScore?: number;
  timeSpentSeconds?: number;
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

export interface InfographicItem {
  icon: string;
  title: string;
  description: string;
}

export interface StudyMaterials {
  summary: string;
  mindMap: MindMapNode;
  infographic: InfographicItem[];
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
}

export interface AppState {
  currentUser: User | null;
  activePlanId: string | null;
  currentView: 'auth' | 'library' | 'dashboard' | 'reader' | 'quiz' | 'stats' | 'page-selector';
  isGeneratingQuiz: boolean;
  currentQuiz: QuizQuestion[] | null;
  theme: ThemeMode;
  pendingPdf: PendingPdf | null;
  lastSessionTime?: number;
}
