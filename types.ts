
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

// MindMapNode defines the recursive structure for the mind map visualization
export interface MindMapNode {
  label: string;
  children?: MindMapNode[];
}

// StudyMaterials consolidates AI-generated content for daily review
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
  storagePath?: string; // Novo campo para o caminho no Supabase Storage
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
  fileBlob?: Blob; // Guardar o blob original para upload eficiente
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
