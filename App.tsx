
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
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  useEffect(() => {
    const pdfjs = (window as any)['pdfjs-dist/build/pdf'];
    if (pdfjs) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.js`;
    }
  }, []);

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
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = state.theme === 'dark' || (state.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    isDark ? root.classList.add('dark') : root.classList.remove('dark');
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
        setDbError(`Erro no banco: ${error.message}`);
        setState(prev => ({ ...prev, currentUser: { id: userId, email, plans: [] }, currentView: 'library' }));
        return;
      }

      const plans: ReadingPlan[] = (data || []).map(item => ({
        id: item.id,
        fileName: item.file_name,
        originalFileName: item.original_file_name,
        totalPages: item.total_pages,
        days: item.days,
        currentDayIndex: item.current_day_index,
        lastAccessed: new Date(item.last_accessed).getTime(),
        storagePath: item.storage_path,
        pdfData: ""
      }));

      setState(prev => ({ ...prev, currentUser: { id: userId, email, plans }, currentView: 'library' }));
    } catch (e) {
      setDbError("Falha na conexão.");
    }
  };

  useEffect(() => {
    const loadActivePdf = async () => {
      if (!state.activePlanId) {
        setActivePlanPdf(null);
        return;
      }

      let data = await getPDF(state.activePlanId);
      
      if (!data) {
        const plan = state.currentUser?.plans.find(p => p.id === state.activePlanId);
        if (plan?.storagePath) {
          setIsCloudSyncing(true);
          try {
            const { data: blob, error } = await supabase.storage.from('pdfs').download(plan.storagePath);
            if (error) throw error;
            
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64data = reader.result as string;
              await savePDF(state.activePlanId!, base64data);
              setActivePlanPdf(base64data);
              setIsCloudSyncing(false);
            };
            reader.readAsDataURL(blob);
            return;
          } catch (e) {
            console.error("Erro ao baixar da nuvem:", e);
            setIsCloudSyncing(false);
          }
        }
      }
      
      setActivePlanPdf(data);
    };
    loadActivePdf();
  }, [state.activePlanId, state.currentUser]);

  const handleFileUpload = async (file: File) => {
    if (!state.currentUser) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      const pdfjs = (window as any)['pdfjs-dist/build/pdf'];
      
      try {
        const binary = atob(result.split(',')[1]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        
        const loadingTask = pdfjs.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        
        setState(prev => ({
          ...prev,
          currentView: 'page-selector',
          pendingPdf: {
            name: file.name,
            data: result,
            totalPages: pdf.numPages,
            fileBlob: file
          }
        }));
      } catch (err) {
        alert("Erro ao ler o PDF.");
      }
    };
    reader.readAsDataURL(file);
  };

  const finalizePlan = async (finalPdfData: string, finalPagesCount: number) => {
    if (!state.currentUser || !state.pendingPdf) return;
    setIsCloudSyncing(true);

    try {
      const planId = crypto.randomUUID();
      const storagePath = `${state.currentUser.id}/${planId}.pdf`;

      const response = await fetch(finalPdfData);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage.from('pdfs').upload(storagePath, blob);
      if (uploadError) throw uploadError;

      const pagesPerDay = 10;
      const totalDays = Math.ceil(finalPagesCount / pagesPerDay);
      const days: ReadingDay[] = Array.from({ length: totalDays }, (_, i) => ({
        dayNumber: i + 1,
        startPage: i * pagesPerDay + 1,
        endPage: Math.min((i + 1) * pagesPerDay, finalPagesCount),
        isCompleted: false
      }));

      const newPlanData = {
        id: planId,
        user_id: state.currentUser.id,
        file_name: state.pendingPdf.name.replace('.pdf', ''),
        original_file_name: state.pendingPdf.name,
        total_pages: finalPagesCount,
        days: days,
        current_day_index: 0,
        last_accessed: new Date().toISOString(),
        storage_path: storagePath
      };

      const { error: dbError } = await supabase.from('reading_plans').insert([newPlanData]);
      if (dbError) {
        if (dbError.message.includes("storage_path")) {
          throw new Error("A coluna 'storage_path' não foi encontrada na sua tabela. No Supabase, execute: ALTER TABLE reading_plans ADD COLUMN storage_path TEXT;");
        }
        throw dbError;
      }

      await savePDF(planId, finalPdfData);

      const newPlan: ReadingPlan = {
        ...newPlanData,
        fileName: newPlanData.file_name,
        originalFileName: newPlanData.original_file_name,
        totalPages: newPlanData.total_pages,
        currentDayIndex: newPlanData.current_day_index,
        lastAccessed: Date.now(),
        storagePath: storagePath,
        pdfData: ""
      };

      setState(prev => ({
        ...prev,
        currentUser: prev.currentUser ? { ...prev.currentUser, plans: [newPlan, ...prev.currentUser.plans] } : null,
        activePlanId: newPlan.id,
        currentView: 'dashboard',
        pendingPdf: null
      }));
    } catch (e: any) {
      alert(`Erro ao sincronizar: ${e.message}`);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const syncPlanToSupabase = async (plan: ReadingPlan) => {
    if (!state.currentUser) return;
    await supabase
      .from('reading_plans')
      .update({
        file_name: plan.fileName,
        current_day_index: plan.currentDayIndex,
        days: plan.days,
        last_accessed: new Date().toISOString()
      })
      .eq('id', plan.id);
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
      
      {isCloudSyncing && (
        <div className="bg-indigo-600 text-white text-[10px] font-bold py-1 px-4 text-center animate-pulse uppercase tracking-widest">
          Sincronizando com a nuvem...
        </div>
      )}

      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        {state.currentView === 'auth' && !state.currentUser && <Auth onLogin={handleUserData} />}
        
        {state.currentView === 'library' && state.currentUser && (
          <Library 
            plans={state.currentUser.plans} 
            onSelectPlan={(id) => setState(prev => ({ ...prev, activePlanId: id, currentView: 'dashboard' }))} 
            onUpload={handleFileUpload}
            onDeletePlan={async (id) => {
              if (confirm("Excluir plano da nuvem?")) {
                const plan = state.currentUser?.plans.find(p => p.id === id);
                if (plan?.storagePath) {
                  await supabase.storage.from('pdfs').remove([plan.storagePath]);
                }
                await deletePDF(id);
                await supabase.from('reading_plans').delete().eq('id', id);
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
            onStartReading={() => {
              if (!activePlanPdf && !isCloudSyncing) {
                alert("Aguarde o download do arquivo da nuvem...");
                return;
              }
              setState(prev => ({ ...prev, currentView: 'reader' }));
            }}
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
                setState(prev => ({ ...prev, currentQuiz: quiz, isGeneratingQuiz: false }));
              } catch (e) {
                alert("Erro no quiz.");
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
                  updatedDays[p.currentDayIndex] = { ...updatedDays[p.currentDayIndex], isCompleted: true, quizScore: score, timeSpentSeconds: state.lastSessionTime };
                  const nextIndex = p.currentDayIndex + 1 < p.days.length ? p.currentDayIndex + 1 : p.currentDayIndex;
                  const updatedPlan = { ...p, days: updatedDays, currentDayIndex: nextIndex };
                  syncPlanToSupabase(updatedPlan);
                  return updatedPlan;
                }
                return p;
              });
              setState(prev => ({ ...prev, currentUser: prev.currentUser ? { ...prev.currentUser, plans: updatedPlans } : null, currentView: 'dashboard', currentQuiz: null, lastSessionTime: 0 }));
            }} 
            onCancel={() => setState(prev => ({ ...prev, currentView: 'dashboard', lastSessionTime: 0 }))}
          />
        )}

        {state.currentView === 'stats' && activePlanMetadata && <Stats plan={activePlanMetadata} />}
      </main>

      <footer className="py-6 text-center text-slate-500 dark:text-slate-400 text-sm border-t border-slate-200 dark:border-slate-800">
        © {new Date().getFullYear()} MindFlow - Cloud Storage Powered by Supabase
      </footer>
    </div>
  );
};

export default App;
