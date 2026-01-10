
import React, { useState } from 'react';
import { ReadingPlan } from '../types';

interface DashboardProps {
  plan: ReadingPlan;
  onStartReading: () => void;
  onReviewQuiz: (dayIdx: number) => void; // Novo: Handler para revisar quiz
  onUpdateTitle: (newTitle: string) => void;
  backgroundStatus?: { current: number, total: number };
}

const Dashboard: React.FC<DashboardProps> = ({ plan, onStartReading, onReviewQuiz, onUpdateTitle, backgroundStatus }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(plan.fileName);

  const currentDay = plan.days[plan.currentDayIndex];
  const progressPercent = Math.round((plan.days.filter(d => d.isCompleted).length / plan.days.length) * 100);

  const handleSave = () => {
    if (tempTitle.trim()) {
      onUpdateTitle(tempTitle.trim());
      setIsEditing(false);
    }
  };

  const quizzesReady = plan.days.filter(d => d.quiz && d.quiz.length > 0).length;
  const quizzesTotal = plan.days.length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex-grow">
          {isEditing ? (
            <div className="flex items-center gap-2 w-full max-w-xl">
              <input 
                autoFocus
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="text-3xl font-bold text-slate-800 dark:text-slate-100 bg-transparent border-b-2 border-indigo-500 focus:outline-none w-full"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 group">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 leading-tight">{plan.fileName}</h2>
              <button 
                onClick={() => setIsEditing(true)}
                className="p-2 text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all"
                title="Editar título"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              </button>
            </div>
          )}
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 mt-2">
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              {plan.totalPages} páginas
            </span>
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {plan.days.length} dias
            </span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-1 min-w-[140px]">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Inteligência</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-black ${quizzesReady === quizzesTotal ? 'text-emerald-500' : 'text-indigo-500 animate-pulse'}`}>
              {backgroundStatus ? backgroundStatus.current : quizzesReady}
            </span>
            <span className="text-slate-400 font-bold">/ {quizzesTotal}</span>
          </div>
          <p className="text-[10px] text-slate-500 font-bold">Quizzes prontos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-heading">Sua Jornada</h3>
            <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-4 py-1 rounded-full font-bold text-sm">
              {progressPercent}% concluído
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {plan.days.map((day, idx) => {
              const hasQuiz = day.quiz && day.quiz.length > 0;
              const hasUserAnswers = day.userAnswers && day.userAnswers.length > 0;
              const isCurrent = idx === plan.currentDayIndex && !day.isCompleted;
              
              return (
                <div 
                  key={day.dayNumber}
                  onClick={() => day.isCompleted && hasQuiz && hasUserAnswers && onReviewQuiz(idx)}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all relative group cursor-pointer ${
                    day.isCompleted 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:scale-[1.03]' 
                      : isCurrent
                      ? 'bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/30 scale-105' 
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <div className="absolute top-2 right-2">
                    {day.isCompleted ? (
                      <div className="flex flex-col items-end gap-1">
                        <div className="bg-emerald-500 text-white p-0.5 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        {hasUserAnswers && (
                          <div className="bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 p-1 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0" title="Ver Quiz">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                          </div>
                        )}
                      </div>
                    ) : hasQuiz ? (
                      <div title="Quiz pronto">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`${isCurrent ? 'text-indigo-200' : 'text-indigo-400 animate-pulse'}`}><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
                      </div>
                    ) : null}
                  </div>

                  <span className="text-xs uppercase font-bold opacity-70">Dia</span>
                  <span className="text-2xl font-bold">{day.dayNumber}</span>
                  {day.isCompleted && (
                    <span className="text-[10px] font-black uppercase mt-1 opacity-60">Finalizado</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl flex flex-col justify-between h-full relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700" />
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-2 font-heading">Meta de Hoje</h3>
            <p className="opacity-90 text-lg mb-6 leading-relaxed">
              Você está no Dia {currentDay.dayNumber}. <br/>
              Leia das páginas <span className="font-bold underline text-white">{currentDay.startPage}</span> até <span className="font-bold underline text-white">{currentDay.endPage}</span>.
            </p>
          </div>
          
          <button 
            onClick={onStartReading}
            className="w-full bg-white text-indigo-600 font-bold py-4 px-6 rounded-2xl hover:bg-slate-50 transition-all hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 relative z-10"
          >
            Começar a Ler Agora
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
