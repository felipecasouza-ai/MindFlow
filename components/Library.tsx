
import React, { useState } from 'react';
import { ReadingPlan } from '../types';

interface LibraryProps {
  plans: ReadingPlan[];
  onSelectPlan: (id: string) => void;
  onUpload: (file: File) => void;
  onDeletePlan: (id: string) => void;
  onUpdateTitle: (id: string, newTitle: string) => void;
  userEmail?: string;
}

const Library: React.FC<LibraryProps> = ({ plans, onSelectPlan, onUpload, onDeletePlan, onUpdateTitle, userEmail }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const isAdmin = userEmail === 'admin@mindflow.com';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        alert("Por favor, envie apenas arquivos no formato PDF.");
        return;
      }
      onUpload(file);
    }
  };

  const startEditing = (plan: ReadingPlan) => {
    setEditingId(plan.id);
    setTempTitle(plan.fileName);
  };

  const saveTitle = () => {
    if (editingId && tempTitle.trim()) {
      onUpdateTitle(editingId, tempTitle.trim());
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 font-heading">
            {isAdmin ? 'Visualizando sua Biblioteca' : 'Minha Biblioteca'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Você tem {plans.length} {plans.length === 1 ? 'livro sendo lido' : 'livros na coleção'}.</p>
        </div>
        
        {!isAdmin && (
          <label className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            Adicionar PDF
            <input 
              type="file" 
              accept="application/pdf" 
              className="hidden" 
              onChange={handleFileChange} 
            />
          </label>
        )}
      </div>

      {plans.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-slate-300 dark:text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Sua estante está vazia</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            {isAdmin ? 'Adicione um PDF em uma conta de usuário normal para ver conteúdo aqui.' : 'Envie um arquivo PDF para começar a acompanhar seu progresso diário.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const completed = plan.days.filter(d => d.isCompleted).length;
            const progress = Math.round((completed / plan.days.length) * 100);
            const isEditing = editingId === plan.id;
            
            return (
              <div 
                key={plan.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl dark:hover:shadow-indigo-900/10 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); startEditing(plan); }}
                        className="text-slate-300 dark:text-slate-600 hover:text-indigo-500 p-2 transition-colors"
                        title="Editar nome"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeletePlan(plan.id); }}
                        className="text-slate-300 dark:text-slate-600 hover:text-red-500 p-2 transition-colors"
                        title="Remover"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                  
                  {isEditing ? (
                    <input 
                      autoFocus
                      type="text"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onBlur={saveTitle}
                      onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                      className="w-full text-lg font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border-2 border-indigo-500 focus:outline-none mb-2"
                    />
                  ) : (
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 line-clamp-2 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {plan.fileName}
                    </h3>
                  )}
                  
                  <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 mb-6">
                    <span className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {plan.days.length} dias
                    </span>
                    <span className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                      {plan.totalPages} págs
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>Progresso</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 dark:bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => onSelectPlan(plan.id)}
                    className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    Retomar Leitura
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Library;
