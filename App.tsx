
import React, { useState, useEffect } from 'react';
import { AppState, ReadingPlan, ReadingDay, ThemeMode } from './types';
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
import { supabase } from './services/supabaseClient';

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

  const [activePlanPdf, setActivePlanPdf] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        handleUserData(session.user.id, session.user.email || '');
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        handleUserData(session.user.id, session.user.email || '');
      } else if (event === 'SIGNED_OUT') {
        setState(prev => ({ ...prev, currentUser: null, currentView: 'auth', activePlanId: null }));
        setDbError(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

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

  const handleUserData = async (userId: string, email: string) => {
    try {
      setDbError(null);
      const { data, error } = await supabase
        .from('reading_plans')
        .select('*')
        .eq('user_id', userId)
        .order('last_accessed', { ascending: false });

      if (error) {
        const msg = error.message || "Erro desconhecido";
        if (msg.includes('reading_plans') || error.code === 'PGRST116' || msg.includes('cache')) {
          setDbError("Erro de Banco: Verifique se você executou o SQL de criação das tabelas e permissões (RLS) no console do Supabase.");
        } else {
          setDbError(`Erro no banco de dados: ${msg}`);
        }
        
        setState(prev => ({ 
          ...prev, 
          currentUser: { id: userId, email, plans: [] }, 
          currentView: 'library' 
        }));
        return;
      }

      const plans: ReadingPlan[] = (data || []).map(item => ({
        id: item.id,
        fileName: item.file_name,
        originalFileName: item.original_file_name,
        totalPages: item.total_pages,
        days: item.days,
        currentDayIndex: item.current_day_index,
        lastAccessed: item.last_accessed,
        pdfData: ""
      }));

      setState(prev => ({ 
        ...prev, 
        currentUser: { id: userId, email, plans }, 
        currentView: 'library' 
      }));
    } catch (e: any) {
      setDbError("Falha crítica ao conectar com o Supabase.");
    }
  };

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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !state.pendingPdf) {
      setDbError("Sessão expirada. Faça login novamente.");
      return;
    }

    const userId = session.user.id;
    const planId = crypto.randomUUID();
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

    const newPlanData = {
      id: planId,
      user_id: userId,
      file_name: state.pendingPdf.name.replace('.pdf', ''),
      original_file_name: state.pendingPdf.name,
      total_pages: finalPagesCount,
      days: days,
      current_day_index: 0,
      last_accessed: Date.now()
    };

    const { error } = await supabase.from('reading_plans').insert([newPlanData]);
    
    if (error) {
      if (error.message.includes('row-level security')) {
        setDbError("Erro de Permissão (RLS): Você precisa habilitar as políticas de INSERT no console do Supabase para o seu novo projeto.");
      } else {
        setDbError(`Erro ao salvar no Supabase: ${error.message}`);
      }
      return;
    }

    await savePDF(planId, finalPdfData);

    const newPlan: ReadingPlan = {
      ...newPlanData,
      fileName: newPlanData.file_name,
      originalFileName: newPlanData.original_file_name,
      totalPages: newPlanData.total_pages,
      currentDayIndex: newPlanData.current_day_index,
      lastAccessed: newPlanData.last_accessed,
      pdfData: ""
    };

    setState(prev => ({
      ...prev,
      currentUser: prev.currentUser ? { ...prev.currentUser, plans: [newPlan, ...prev.currentUser.plans] } : null,
      activePlanId: newPlan.id,
      currentView: 'dashboard',
      pendingPdf: null
    }));
  };

  const syncPlanToSupabase = async (plan: ReadingPlan) => {
    if (!state.currentUser) return;
    const { error } = await supabase
      .from('reading_plans')
      .update({
        file_name: plan.fileName,
        current_day_index: plan.currentDayIndex,
        days: plan.days,
        last_accessed: Date.now()
      })
      .eq('id', plan.id);
    
    if (error) setDbError(`Erro de sincronização: ${error.message}`);
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
        onLogout={async () => await supabase.auth.signOut()}
        activePlan={activePlanMetadata}
        theme={state.theme}
        onThemeChange={(t) => setState(prev => ({ ...prev, theme: t }))}
      />
      
      {dbError && (
        <div className="container mx-auto px-4 mt-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl flex items-start gap-3 shadow-lg animate-in slide-in-from-top-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div className="flex-grow">
              <p className="text-red-800 dark:text-red-300 font-bold text-sm">Atenção Necessária</p>
              <p className="text-red-700 dark:text-red-400 text-xs mt-1">{dbError}</p>
              <div className="flex gap-2 mt-3">
                <button 
                  onClick={() => handleUserData(state.currentUser?.id || '', state.currentUser?.email || '')}
                  className="text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 px-3 py-1.5 rounded-md hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
                >
                  Tentar reconectar
                </button>
                <button 
                  onClick={() => setDbError(null)}
                  className="text-[10px] font-bold uppercase tracking-wider bg-white/50 dark:bg-white/10 text-red-700 dark:text-red-200 px-3 py-1.5 rounded-md hover:bg-white/80 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        {state.currentView === 'auth' && !state.currentUser && (
          <Auth onLogin={handleUserData} />
        )}
        
        {state.currentView === 'library' && state.currentUser && (
          <Library 
            plans={state.currentUser.plans} 
            onSelectPlan={(id) => setState(prev => ({ ...prev, activePlanId: id, currentView: 'dashboard' }))} 
            onUpload={handleFileUpload}
            onDeletePlan={async (id) => {
              if (confirm("Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.")) {
                await deletePDF(id);
                const { error } = await supabase.from('reading_plans').delete().eq('id', id);
                if (error) setDbError(`Erro ao deletar: ${error.message}`);
                
                setState(prev => ({ 
                  ...prev, 
                  currentUser: prev.currentUser ? { ...prev.currentUser, plans: prev.currentUser.plans.filter(p => p.id !== id) } : null,
                  activePlanId: prev.activePlanId === id ? null : prev.activePlanId
                }));
              }
            }}
            onUpdateTitle={(id, title) => {
              if (!state.currentUser) return;
              const updatedPlans = state.currentUser.plans.map(p => {
                if (p.id === id) {
                  const updated = { ...p, fileName: title };
                  syncPlanToSupabase(updated);
                  return updated;
                }
                return p;
              });
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
              const updatedPlans = state.currentUser.plans.map(p => {
                if (p.id === activePlanMetadata.id) {
                  const updated = { ...p, fileName: title };
                  syncPlanToSupabase(updated);
                  return updated;
                }
                return p;
              });
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
                alert("Erro ao gerar quiz. Verifique sua chave de API Gemini.");
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
                  const updatedPlan = { ...p, days: updatedDays, currentDayIndex: nextIndex };
                  syncPlanToSupabase(updatedPlan);
                  return updatedPlan;
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
        © {new Date().getFullYear()} MindFlow - Cloud Sync Powered by Supabase
      </footer>
    </div>
  );
};

export default App;
