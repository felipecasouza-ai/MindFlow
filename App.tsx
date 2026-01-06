
import React, { useState, useEffect } from 'react';
import { AppState, ReadingPlan, ReadingDay, User, ThemeMode, PendingPdf } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Reader from './components/Reader';
import Quiz from './components/Quiz';
import Stats from './components/Stats';
import Auth from './components/Auth';
import Library from './components/Library';
import PageSelector from './components/PageSelector';
import { generateQuiz } from './services/geminiService';
import { savePDF, getPDF, deletePDF } from './services/dbService';

const PDF_JS_VERSION = '3.11.174';
const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
if (pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.js`;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const savedTheme = localStorage.getItem('mindflow_theme') as ThemeMode || 'system';
    return {
      currentUser: null,
      activePlanId: null,
      currentView: 'auth',
      isGeneratingQuiz: false,
      currentQuiz: null,
      theme: savedTheme,
      pendingPdf: null,
      lastSessionTime: 0
    };
  });

  // Hydrated PDF data for the active plan
  const [activePlanPdf, setActivePlanPdf] = useState<string | null>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (theme: ThemeMode) => {
      let isDark = theme === 'dark';
      if (theme === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      isDark ? root.classList.add('dark') : root.classList.remove('dark');
    };
    applyTheme(state.theme);
    localStorage.setItem('mindflow_theme', state.theme);
  }, [state.theme]);

  // Persist users to localStorage WITHOUT the heavy pdfData
  useEffect(() => {
    if (state.currentUser) {
      const allUsers = JSON.parse(localStorage.getItem('mindflow_users') || '{}');
      
      // Strip pdfData from each plan before saving to localStorage to avoid QuotaExceededError
      const strippedUser = {
        ...state.currentUser,
        plans: state.currentUser.plans.map(p => ({ ...p, pdfData: "" }))
      };
      
      allUsers[state.currentUser.username] = strippedUser;
      try {
        localStorage.setItem('mindflow_users', JSON.stringify(allUsers));
      } catch (e) {
        console.error("Critical error saving to localStorage:", e);
        alert("Erro ao salvar dados. Tente remover alguns planos antigos.");
      }
    }
  }, [state.currentUser]);

  // Hydrate PDF data when activePlanId changes
  useEffect(() => {
    const loadActivePdf = async () => {
      if (state.activePlanId) {
        const data = await getPDF(state.activePlanId);
        setActivePlanPdf(data);
      } else {
        setActivePlanPdf(null);
      }
    };
    loadActivePdf();
  }, [state.activePlanId]);

  const handleLogin = (username: string) => {
    const allUsers = JSON.parse(localStorage.getItem('mindflow_users') || '{}');
    setState(prev => ({ 
      ...prev, 
      currentUser: allUsers[username] || { username, plans: [] }, 
      currentView: 'library' 
    }));
  };

  const handleFileUpload = async (file: File) => {
    if (!state.currentUser) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      const pdfjs = (window as any)['pdfjs-dist/build/pdf'];
      const loadingTask = pdfjs.getDocument({ data: atob(result.split(',')[1]) });
      const pdf = await loadingTask.promise;
      
      setState(prev => ({
        ...prev,
        currentView: 'page-selector',
        pendingPdf: {
          name: file.name,
          data: result,
          totalPages: pdf.numPages
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const finalizePlan = async (finalPdfData: string, finalPagesCount: number) => {
    if (!state.currentUser || !state.pendingPdf) return;

    const planId = crypto.randomUUID();
    
    // Save heavy data to IndexedDB
    await savePDF(planId, finalPdfData);

    const pagesPerDay = 10;
    const totalDays = Math.ceil(finalPagesCount / pagesPerDay);
    const days: ReadingDay[] = [];
    
    for (let i = 0; i < totalDays; i++) {
      days.push({ 
        dayNumber: i + 1, 
        startPage: i * pagesPerDay + 1, 
        endPage: Math.min((i + 1) * pagesPerDay, finalPagesCount), 
        isCompleted: false 
      });
    }

    const newPlan: ReadingPlan = {
      id: planId,
      fileName: state.pendingPdf.name.replace('.pdf', ''),
      originalFileName: state.pendingPdf.name,
      totalPages: finalPagesCount,
      days,
      currentDayIndex: 0,
      pdfData: "", // Empty in state/localStorage, fetched from DB when needed
      lastAccessed: Date.now()
    };

    setState(prev => ({
      ...prev,
      currentUser: prev.currentUser ? { ...prev.currentUser, plans: [newPlan, ...prev.currentUser.plans] } : null,
      activePlanId: newPlan.id,
      currentView: 'dashboard',
      pendingPdf: null
    }));
  };

  const activePlanMetadata = state.currentUser?.plans.find(p => p.id === state.activePlanId) || null;
  const activePlan: ReadingPlan | null = activePlanMetadata && activePlanPdf 
    ? { ...activePlanMetadata, pdfData: activePlanPdf } 
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Header 
        onViewChange={(v) => setState(prev => ({ ...prev, currentView: v as any }))} 
        user={state.currentUser}
        onLogout={() => setState(prev => ({ ...prev, currentUser: null, activePlanId: null, currentView: 'auth' }))}
        activePlan={activePlanMetadata}
        theme={state.theme}
        onThemeChange={(t) => setState(prev => ({ ...prev, theme: t }))}
      />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        {state.currentView === 'auth' && <Auth onLogin={handleLogin} />}
        
        {state.currentView === 'library' && state.currentUser && (
          <Library 
            plans={state.currentUser.plans} 
            onSelectPlan={(id) => setState(prev => ({ ...prev, activePlanId: id, currentView: 'dashboard' }))} 
            onUpload={handleFileUpload}
            onDeletePlan={(id) => {
              deletePDF(id);
              setState(prev => ({ 
                ...prev, 
                currentUser: prev.currentUser ? { ...prev.currentUser, plans: prev.currentUser.plans.filter(p => p.id !== id) } : null,
                activePlanId: prev.activePlanId === id ? null : prev.activePlanId
              }));
            }}
            onUpdateTitle={(id, title) => {
              if (!state.currentUser) return;
              const updatedPlans = state.currentUser.plans.map(p => p.id === id ? { ...p, fileName: title } : p);
              setState(prev => ({ ...prev, currentUser: prev.currentUser ? { ...prev.currentUser, plans: updatedPlans } : null }));
            }}
          />
        )}

        {state.currentView === 'page-selector' && state.pendingPdf && (
          <PageSelector 
            pdfData={state.pendingPdf.data}
            fileName={state.pendingPdf.name}
            onConfirm={finalizePlan}
            onCancel={() => setState(prev => ({ ...prev, currentView: 'library', pendingPdf: null }))}
          />
        )}

        {state.currentView === 'dashboard' && activePlanMetadata && (
          <Dashboard 
            plan={activePlanMetadata} 
            onStartReading={() => setState(prev => ({ ...prev, currentView: 'reader' }))}
            onUpdateTitle={(title) => {
              if (!state.currentUser) return;
              const updatedPlans = state.currentUser.plans.map(p => p.id === activePlanMetadata.id ? { ...p, fileName: title } : p);
              setState(prev => ({ ...prev, currentUser: prev.currentUser ? { ...prev.currentUser, plans: updatedPlans } : null }));
            }}
          />
        )}
        
        {state.currentView === 'reader' && activePlan && (
          <Reader 
            pdfData={activePlan.pdfData} 
            currentDay={activePlan.days[activePlan.currentDayIndex]} 
            onDayComplete={async (text, timeSpent) => {
              setState(prev => ({ ...prev, isGeneratingQuiz: true, currentView: 'quiz', lastSessionTime: timeSpent }));
              try {
                const quiz = await generateQuiz(text);
                setState(prev => ({ 
                  ...prev, 
                  currentQuiz: quiz, 
                  isGeneratingQuiz: false 
                }));
              } catch (e) {
                console.error(e);
                alert("Erro ao gerar quiz. Verifique sua conexão ou chave de API.");
                setState(prev => ({ ...prev, isGeneratingQuiz: false, currentView: 'dashboard' }));
              }
            }}
            onClose={() => setState(prev => ({ ...prev, currentView: 'dashboard' }))}
          />
        )}

        {state.currentView === 'quiz' && (
          <Quiz 
            questions={state.currentQuiz} 
            isLoading={state.isGeneratingQuiz} 
            onFinish={(score) => {
              if (!state.currentUser || !state.activePlanId) return;

              const updatedPlans = state.currentUser.plans.map(p => {
                if (p.id === state.activePlanId) {
                  const updatedDays = [...p.days];
                  updatedDays[p.currentDayIndex] = { 
                    ...updatedDays[p.currentDayIndex], 
                    isCompleted: true, 
                    quizScore: score,
                    timeSpentSeconds: state.lastSessionTime
                  };
                  const nextIndex = p.currentDayIndex + 1 < p.days.length ? p.currentDayIndex + 1 : p.currentDayIndex;
                  return { ...p, days: updatedDays, currentDayIndex: nextIndex };
                }
                return p;
              });

              setState(prev => ({ 
                ...prev, 
                currentUser: prev.currentUser ? { ...prev.currentUser, plans: updatedPlans } : null, 
                currentView: 'dashboard', 
                currentQuiz: null,
                lastSessionTime: 0
              }));
            }} 
            onCancel={() => setState(prev => ({ ...prev, currentView: 'dashboard', lastSessionTime: 0 }))}
          />
        )}

        {state.currentView === 'stats' && activePlanMetadata && <Stats plan={activePlanMetadata} />}
      </main>

      <footer className="py-6 text-center text-slate-500 dark:text-slate-400 text-sm border-t border-slate-200 dark:border-slate-800">
        © {new Date().getFullYear()} MindFlow - Leitura Inteligente com Gemini AI
      </footer>
    </div>
  );
};

export default App;
