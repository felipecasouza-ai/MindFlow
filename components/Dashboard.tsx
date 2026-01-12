
import React, { useState } from 'react';
import { ReadingPlan } from '../types';

interface DashboardProps {
  plan: ReadingPlan;
  onStartReading: () => void;
  onReviewQuiz: (dayIdx: number) => void;
  onUpdateTitle: (newTitle: string) => void;
  onJumpToDay: (dayIdx: number) => void;
  backgroundStatus?: { current: number, total: number };
}

const Dashboard: React.FC<DashboardProps> = ({ 
  plan, 
  onStartReading, 
  onReviewQuiz, 
  onUpdateTitle, 
  onJumpToDay,
  backgroundStatus
}) => {
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
        
        <div className="flex gap-2">
           {backgroundStatus && (
             <div className="bg-indigo-50 dark:bg-indigo-950/40 px-4 py-2 rounded-2xl flex items-center gap-3 border border-indigo-100 dark:border-indigo-900/30">
               <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Inteligência Artificial</span>
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Preparando Quizzes: {backgroundStatus.current}/{backgroundStatus.total}</span>
               </div>
             </div>
           )}
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
              const isCompleted = day.isCompleted;
              const isCurrent = idx === plan.currentDayIndex;
              const hasQuiz = day.quiz && day.quiz.length > 0;
              
              return (
                <div 
                  key={day.dayNumber}
                  onClick={() => onJumpToDay(idx)}
                  className={`p-4 rounded-3xl border flex flex-col items-center justify-center gap-1 transition-all relative group cursor-pointer h-32 ${
                    isCompleted 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:scale-[1.03]' 
                      : isCurrent
                      ? 'bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/30 scale-105' 
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                    {isCompleted && (
                      <>
                        <div className="bg-emerald-500 text-white p-0.5 rounded-full z-10">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <button 
                          onClick={(e) => {
                              e.stopPropagation();
                              onReviewQuiz(idx);
                          }}
                          className="bg-white dark:bg-slate-800 p-1.5 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 z-20"
                          title="Rever Quiz"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                        </button>
                      </>
                    )}
                    {!isCompleted && hasQuiz && (
                      <div className="bg-indigo-400 text-white p-0.5 rounded-full shadow-sm animate-pulse" title="Quiz disponível">
                         <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="M2 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M12 18v4"/><path d="m19.07 19.07-2.83-2.83"/><path d="M18 12h4"/><path d="m19.07 4.93-2.83 2.83"/></svg>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] uppercase font-bold opacity-70">Dia</span>
                  <span className="text-3xl font-bold font-heading">{day.dayNumber}</span>
                  
                  {isCompleted ? (
                    <span className="text-[9px] font-black uppercase mt-1 opacity-60 tracking-wider">Finalizado</span>
                  ) : (
                    <span className="text-[8px] font-bold uppercase opacity-40 tracking-tighter">{hasQuiz ? 'Pronto para ler' : 'Processando'}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl flex flex-col justify-between h-full relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700" />
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-2 font-heading">Meta Selecionada</h3>
            <p className="opacity-90 text-lg mb-6 leading-relaxed">
              {currentDay.isCompleted ? (
                <span>Você já concluiu o Dia {currentDay.dayNumber}. <br/>Deseja ler novamente as páginas <span className="font-bold underline text-white">{currentDay.startPage}-{currentDay.endPage}</span>?</span>
              ) : (
                <span>Você está no Dia {currentDay.dayNumber}. <br/>Leia das páginas <span className="font-bold underline text-white">{currentDay.startPage}</span> até <span className="font-bold underline text-white">{currentDay.endPage}</span>.</span>
              )}
            </p>
          </div>
          
          <button 
            onClick={onStartReading}
            className="w-full bg-white text-indigo-600 font-bold py-4 px-6 rounded-2xl hover:bg-slate-50 transition-all hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 relative z-10"
          >
            {currentDay.isCompleted ? 'Reler Conteúdo' : 'Começar a Ler Agora'}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
