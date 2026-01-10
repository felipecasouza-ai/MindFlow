
import React, { useState, useEffect } from 'react';
import { AppState, ReadingPlan, ReadingDay, ThemeMode, QuizQuestion } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Reader from './components/Reader';
import Quiz from './components/Quiz';
import Stats from './components/Stats';
import Auth from './components/Auth';
import Library from './components/Library';
import PageSelector from './components/PageSelector';
import AdminPanel from './components/AdminPanel';
import Settings from './components/Settings';
import { generateQuiz } from './services/geminiService';
import { savePDF, getPDF, deletePDF } from './services/dbService';
import { supabase } from './services/supabaseClient';

const PDF_JS_VERSION = '3.11.174';
const ADMIN_EMAIL = 'admin@mindflow.com';

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
      lastSessionTime: 0,
      quizReviewMode: false,
      reviewAnswers: []
    };
  });

  const [activePlanPdf, setActivePlanPdf] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [backgroundGenStatus, setBackgroundGenStatus] = useState<Record<string, { current: number, total: number }>>({});

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

  useEffect(() => {
    const loadPdf = async () => {
      if (state.activePlanId) {
        let data = await getPDF(state.activePlanId);
        if (!data) {
          const plan = state.currentUser?.plans.find(p => p.id === state.activePlanId);
          if (plan?.storagePath) {
            setIsCloudSyncing(true);
            try {
              const { data: blob, error } = await supabase.storage.from('pdfs').download(plan.storagePath);
              if (error) throw error;
              const reader = new FileReader();
              const base64Data = await new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              if (base64Data) {
                await savePDF(state.activePlanId, base64Data);
                data = base64Data;
              }
            } catch (e) { console.error("Error downloading PDF:", e); }
            finally { setIsCloudSyncing(false); }
          }
        }
        setActivePlanPdf(data);
      } else { setActivePlanPdf(null); }
    };
    loadPdf();
  }, [state.activePlanId, state.currentUser]);

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
        setState(prev => ({ ...prev, currentUser: { id: userId, email, plans: [] }, currentView: email === ADMIN_EMAIL ? 'admin' : 'library' }));
        return;
      }

      const plans: ReadingPlan[] = (data || []).map(item => ({
        id: item.id,
        fileName: item.file_name,
        originalFileName: item.original_file_name,
        totalPages: item.total_pages,
        days: item.days,
        currentDayIndex: item.current_day_index,
        lastAccessed: typeof item.last_accessed === 'number' ? item.last_accessed : Number(item.last_accessed) || Date.now(),
        storagePath: item.storage_path,
        pdfData: ""
      }));

      setState(prev => ({ 
        ...prev, 
        currentUser: { id: userId, email, plans }, 
        currentView: email === ADMIN_EMAIL ? 'admin' : 'library' 
      }));
    } catch (e) { setDbError("Falha na conexão."); }
  };

  const processQuizzesInBackground = async (planId: string, pdfData: string, days: ReadingDay[], bookTitle: string) => {
    setBackgroundGenStatus(prev => ({ ...prev, [planId]: { current: 0, total: days.length } }));
    
    const pdfjs = (window as any)['pdfjs-dist/build/pdf'];
    const binaryString = atob(pdfData.split(',')[1]);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    
    const loadingTask = pdfjs.getDocument({ 
      data: bytes,
      cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_JS_VERSION}/cmaps/`,
      cMapPacked: true,
    });
    
    const pdfDoc = await loadingTask.promise;

    for (let i = 0; i < days.length; i++) {
      try {
        let dayText = "";
        for (let pNum = days[i].startPage; pNum <= days[i].endPage; pNum++) {
          const page = await pdfDoc.getPage(pNum);
          const content = await page.getTextContent();
          
          // Extração robusta igual ao Reader
          const strings = content.items
            .map((item: any) => item.str || "")
            .filter((s: string) => s.trim().length > 0);
            
          dayText += strings.join(" ") + "\n\n";
        }

        const trimmedText = dayText.trim();
        console.log(`[Worker] Dia ${i+1}: ${trimmedText.length} caracteres extraídos.`);

        if (trimmedText.length < 50) {
          console.warn(`[Worker] Texto insuficiente para o dia ${i+1}. Tentando extração alternativa...`);
          // Tentar sem filtros agressivos
          const rawContent = await Promise.all(
            Array.from({ length: days[i].endPage - days[i].startPage + 1 }, (_, idx) => 
              pdfDoc.getPage(days[i].startPage + idx).then((p: any) => p.getTextContent())
            )
          );
          const altText = rawContent.map((c: any) => c.items.map((it: any) => it.str).join(" ")).join("\n");
          if (altText.trim().length < 50) continue;
        }

        const quiz = await generateQuiz(trimmedText, bookTitle);

        const { data: latestPlan } = await supabase.from('reading_plans').select('days').eq('id', planId).single();
        if (latestPlan) {
          const serverDays = [...latestPlan.days];
          serverDays[i].quiz = quiz;
          await supabase.from('reading_plans').update({ days: serverDays }).eq('id', planId);
          setState(prev => {
            if (!prev.currentUser) return prev;
            const updatedPlans = prev.currentUser.plans.map(p => {
              if (p.id === planId) {
                const localDays = [...p.days];
                localDays[i].quiz = quiz;
                return { ...p, days: localDays };
              }
              return p;
            });
            return { ...prev, currentUser: { ...prev.currentUser, plans: updatedPlans } };
          });
        }
        setBackgroundGenStatus(prev => ({ ...prev, [planId]: { current: i + 1, total: days.length } }));
        
        // Pequena pausa para não sobrecarregar a API
        await new Promise(r => setTimeout(r, 1000));

      } catch (err) { console.error(`Erro no quiz do dia ${i+1}:`, err); }
    }
    setTimeout(() => {
      setBackgroundGenStatus(prev => {
        const next = { ...prev };
        delete next[planId];
        return next;
      });
    }, 5000);
  };

  const handleFileUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target?.result as string;
      const pdfjs = (window as any)['pdfjs-dist/build/pdf'];
      try {
        const binaryString = atob(data.split(',')[1]);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const loadingTask = pdfjs.getDocument({ 
          data: bytes,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_JS_VERSION}/cmaps/`,
          cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        setState(prev => ({ ...prev, currentView: 'page-selector', pendingPdf: { name: file.name, data: data, totalPages: pdf.numPages, fileBlob: file } }));
      } catch (err) { alert("Erro ao carregar PDF."); }
    };
    reader.readAsDataURL(file);
  };

  const finalizePlan = async (finalPdfData: string, finalPagesCount: number, calculatedDays: ReadingDay[]) => {
    if (!state.currentUser || !state.pendingPdf) return;
    setIsCloudSyncing(true);
    const bookTitle = state.pendingPdf.name.replace('.pdf', '');
    try {
      const planId = crypto.randomUUID();
      const storagePath = `${state.currentUser.id}/${planId}.pdf`;
      const response = await fetch(finalPdfData);
      const blob = await response.blob();
      await supabase.storage.from('pdfs').upload(storagePath, blob);
      const timestamp = Date.now();
      const newPlanData = {
        id: planId,
        user_id: state.currentUser.id,
        user_email: state.currentUser.email,
        file_name: bookTitle,
        original_file_name: state.pendingPdf.name,
        total_pages: finalPagesCount,
        days: calculatedDays,
        current_day_index: 0,
        last_accessed: timestamp,
        storage_path: storagePath
      };
      await supabase.from('reading_plans').insert([newPlanData]);
      await savePDF(planId, finalPdfData);
      const newPlan: ReadingPlan = { ...newPlanData, fileName: newPlanData.file_name, originalFileName: newPlanData.original_file_name, totalPages: newPlanData.total_pages, currentDayIndex: newPlanData.current_day_index, lastAccessed: timestamp, storagePath: storagePath, pdfData: "" };
      setState(prev => ({ ...prev, currentUser: prev.currentUser ? { ...prev.currentUser, plans: [newPlan, ...prev.currentUser.plans] } : null, activePlanId: newPlan.id, currentView: 'dashboard', pendingPdf: null }));
      processQuizzesInBackground(planId, finalPdfData, calculatedDays, bookTitle);
    } catch (e: any) { alert(`Erro: ${e.message}`); }
    finally { setIsCloudSyncing(true); setTimeout(() => setIsCloudSyncing(false), 2000); }
  };

  const syncPlanToSupabase = async (plan: ReadingPlan) => {
    if (!state.currentUser) return;
    await supabase.from('reading_plans').update({ file_name: plan.fileName, current_day_index: plan.currentDayIndex, days: plan.days, last_accessed: Date.now() }).eq('id', plan.id);
  };

  const activePlanMetadata = state.currentUser?.plans.find(p => p.id === state.activePlanId) || null;
  const activePlan: ReadingPlan | null = activePlanMetadata && activePlanPdf 
    ? { ...activePlanMetadata, pdfData: activePlanPdf } 
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Header onViewChange={(v) => setState(prev => ({ ...prev, currentView: v as any }))} user={state.currentUser} onLogout={async () => await supabase.auth.signOut()} activePlan={activePlanMetadata} theme={state.theme} onThemeChange={(t) => setState(prev => ({ ...prev, theme: t }))} />
      {isCloudSyncing && <div className="bg-indigo-600 text-white text-[10px] font-bold py-1 px-4 text-center animate-pulse uppercase tracking-widest fixed top-0 left-0 right-0 z-[100]">Sincronizando com a nuvem...</div>}
      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        {state.currentView === 'auth' && !state.currentUser && <Auth onLogin={handleUserData} />}
        {state.currentView === 'admin' && state.currentUser?.email === ADMIN_EMAIL && <AdminPanel />}
        {state.currentView === 'settings' && state.currentUser && <Settings onClose={() => setState(prev => ({ ...prev, currentView: 'library' }))} />}
        {state.currentView === 'library' && state.currentUser && (
          <Library 
            plans={state.currentUser.plans} 
            onSelectPlan={(id) => setState(prev => ({ ...prev, activePlanId: id, currentView: 'dashboard' }))} 
            onUpload={handleFileUpload} 
            userEmail={state.currentUser.email} 
            onDeletePlan={async (id) => {
              if (confirm("Excluir plano?")) {
                const plan = state.currentUser?.plans.find(p => p.id === id);
                if (plan?.storagePath) await supabase.storage.from('pdfs').remove([plan.storagePath]);
                await deletePDF(id);
                await supabase.from('reading_plans').delete().eq('id', id);
                setState(prev => ({ ...prev, currentUser: prev.currentUser ? { ...prev.currentUser, plans: prev.currentUser.plans.filter(p => p.id !== id) } : null, activePlanId: prev.activePlanId === id ? null : prev.activePlanId }));
              }
            }}
            onUpdateTitle={(id, title) => {
              if (!state.currentUser) return;
              const updatedPlans = state.currentUser.plans.map(p => {
                if (p.id === id) { const updated = { ...p, fileName: title }; syncPlanToSupabase(updated); return updated; }
                return p;
              });
              setState(prev => ({ ...prev, currentUser: prev.currentUser ? { ...prev.currentUser, plans: updatedPlans } : null }));
            }}
          />
        )}
        {state.currentView === 'page-selector' && state.pendingPdf && <PageSelector pdfData={state.pendingPdf.data} fileName={state.pendingPdf.name} onConfirm={finalizePlan} onCancel={() => setState(prev => ({ ...prev, currentView: 'library', pendingPdf: null }))} />}
        {state.currentView === 'dashboard' && activePlanMetadata && (
          <Dashboard 
            plan={activePlanMetadata} 
            backgroundStatus={backgroundGenStatus[activePlanMetadata.id]} 
            onStartReading={() => setState(prev => ({ ...prev, currentView: 'reader' }))}
            onReviewQuiz={(dayIdx) => {
              const day = activePlanMetadata.days[dayIdx];
              if (day.quiz && day.userAnswers) {
                setState(prev => ({ 
                  ...prev, 
                  currentQuiz: day.quiz!, 
                  reviewAnswers: day.userAnswers, 
                  quizReviewMode: true, 
                  currentView: 'quiz' 
                }));
              }
            }}
            onUpdateTitle={(title) => {
              if (!state.currentUser) return;
              const updatedPlans = state.currentUser.plans.map(p => {
                if (p.id === activePlanMetadata.id) { const updated = { ...p, fileName: title }; syncPlanToSupabase(updated); return updated; }
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
              const existingQuiz = activePlan.days[activePlan.currentDayIndex].quiz;
              if (existingQuiz && existingQuiz.length > 0) {
                setState(prev => ({ ...prev, currentQuiz: existingQuiz, quizReviewMode: false, currentView: 'quiz', lastSessionTime: timeSpent }));
              } else {
                setState(prev => ({ ...prev, isGeneratingQuiz: true, quizReviewMode: false, currentView: 'quiz', lastSessionTime: timeSpent }));
                try {
                  console.log(`[Reader] Enviando ${text.length} caracteres para gerar quiz.`);
                  const quiz = await generateQuiz(text, activePlan.fileName);
                  setState(prev => ({ ...prev, currentQuiz: quiz, isGeneratingQuiz: false }));
                } catch (e) { alert("Erro no quiz. Tente novamente."); setState(prev => ({ ...prev, isGeneratingQuiz: false, currentView: 'dashboard' })); }
              }
            }}
            onClose={() => setState(prev => ({ ...prev, currentView: 'dashboard' }))}
          />
        )}
        {state.currentView === 'quiz' && (
          <Quiz 
            questions={state.currentQuiz} 
            isLoading={state.isGeneratingQuiz} 
            reviewMode={state.quizReviewMode}
            initialAnswers={state.reviewAnswers}
            onFinish={async (score, answers) => {
              if (!state.currentUser || !state.activePlanId) return;
              const planId = state.activePlanId;
              const lastTime = state.lastSessionTime || 0;
              let finalUpdatedPlan: ReadingPlan | null = null;
              setState(prev => {
                if (!prev.currentUser) return prev;
                const updatedPlans = prev.currentUser.plans.map(p => {
                  if (p.id === planId) {
                    const updatedDays = [...p.days];
                    updatedDays[p.currentDayIndex] = { ...updatedDays[p.currentDayIndex], isCompleted: true, quizScore: score, timeSpentSeconds: lastTime, userAnswers: answers };
                    const nextIndex = p.currentDayIndex + 1 < p.days.length ? p.currentDayIndex + 1 : p.currentDayIndex;
                    finalUpdatedPlan = { ...p, days: updatedDays, currentDayIndex: nextIndex };
                    return finalUpdatedPlan;
                  }
                  return p;
                });
                return { ...prev, currentUser: { ...prev.currentUser, plans: updatedPlans }, currentView: 'dashboard', currentQuiz: null, lastSessionTime: 0, quizReviewMode: false, reviewAnswers: [] };
              });
              if (finalUpdatedPlan) await syncPlanToSupabase(finalUpdatedPlan);
            }} 
            onCancel={() => setState(prev => ({ ...prev, currentView: 'dashboard', lastSessionTime: 0, quizReviewMode: false, reviewAnswers: [] }))}
          />
        )}
        {state.currentView === 'stats' && activePlanMetadata && <Stats plan={activePlanMetadata} />}
      </main>
      <footer className="py-6 text-center text-slate-500 dark:text-slate-400 text-sm border-t border-slate-200 dark:border-slate-800">© {new Date().getFullYear()} MindFlow - Cloud Storage Powered by Supabase</footer>
    </div>
  );
};

export default App;
